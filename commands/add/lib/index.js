"use strict";

// TODO 优化点：将使用次数大于等于三次的库封装到utils包中
// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const pathExists = require("path-exists").sync; // 用于判断路径是否存在
const fse = require("fs-extra"); // 用于清空文件夹
const ejs = require("ejs"); // 用于渲染ejs模板
const semver = require("semver"); // 用于判断版本号
const readPkgUp = require("read-pkg-up"); // 用于查找根目录下的package.json
const { glob } = require("glob"); // 用于shell模式匹配文件
// 内置库
const path = require("path");
const os = require("os");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");
const { spinners, sleep, spawnAsync } = require("@cjp-cli-dev/utils");

// TODO 优化方向1、在MongoDB中配置模板，这里通过接口获取
// TODO 优化方向2、可以指定本地代码模板
// 页面模板（尽量提供高质量模板）
const PAGE_TEMPLATE = [
  {
    name: "vue3首页模板",
    npmName: "cjp-cli-dev-template-vue3-template-page", // 需要先将这个包发到npm上
    version: "latest",
    targetPath: "src/views/home", // 要拷贝的文件目录
    ignore: ["**/**.png"], // ejs忽略的内容
  },
];

// TODO 优化方向1、在MongoDB中配置模板，这里通过接口获取
// TODO 优化方向2、可以指定本地代码模板
// 代码片段模板
const SECTION_TEMPLATE = [
  {
    name: "vue3代码片段模板1",
    npmName: "cjp-cli-dev-template-vue3-section", // 需要先将这个包发到npm上
    version: "latest",
    targetPath: "./", // 要拷贝的文件目录
  },
  {
    name: "vue3代码片段模板2",
    npmName: "cjp-cli-dev-template-vue3-section-template", // 需要先将这个包发到npm上
    version: "latest",
    targetPath: "src/", // 要拷贝的文件目录
  },
];

const VUE2_NORMAL_STYLE = "vue2"; // vue2 标准选项式风格
const VUE3_SETUP_STYLE = "vue3Setup"; // vue3 <script setup>风格
const VUE3_NORMAL_STYLE = "vue3"; // vue3 标准组合式风格

// vue版本风格选择
const VUE_VERSION_STYLE_CHOICES = [
  {
    name: "vue2 标准选项式风格",
    value: VUE2_NORMAL_STYLE,
  },
  {
    name: "vue3 <script setup>风格",
    value: VUE3_SETUP_STYLE,
  },
  {
    name: "vue3 标准组合式风格",
    value: VUE3_NORMAL_STYLE,
  },
];

const ADD_MODE_SECTION = "section";
const ADD_MODE_PAGE = "page";

const USER_HOME = os.homedir(); // 用户主目录

function objectToArray(o) {
  const arr = [];
  Object.keys(o).forEach((key) => {
    arr.push({
      key,
      value: o[key],
    });
  });

  return arr;
}

function arrayToObject(a) {
  const obj = {};
  a.forEach((item) => {
    obj[item.key] = item.value;
  });

  return obj;
}

function dependenciesDiff(templateDepArr, targetDepArr) {
  const result = [...targetDepArr];
  templateDepArr.forEach((templateDep) => {
    // 找出重复的依赖
    const duplicatedDep = targetDepArr.find(
      (targetDep) => templateDep.key === targetDep.key
    );

    // 场景一：模板中存在依赖，项目中不存在（拷贝依赖）
    // 将不重复的依赖push到目标dependencies中
    if (!duplicatedDep) {
      log.info("检测到新的依赖：", templateDep);
      result.push(templateDep);
    } else {
      log.info("检测到重复依赖：", duplicatedDep);

      // 场景二：模板中存在依赖，项目中也存在（不会拷贝依赖，但是在脚手架中给予提示，让开发者手动处理）
      // 对版本的上限进行比较，上限不一样就提示
      const templateRange = semver.validRange(templateDep.value).split("<")[1];
      const targetRange = semver.validRange(duplicatedDep.value).split("<")[1];
      if (templateRange !== targetRange) {
        log.warn(
          `${templateDep.key} 依赖冲突 \n模板依赖版本：${templateDep.value} \n本地依赖版本：${duplicatedDep.value} \n请手动处理冲突依赖版本为您希望使用的版本`
        );
      }
    }
  });
  return result;
}

// 监听全局promise未捕获的错误
process.on("unhandledRejection", (err) => {
  console.log(err);
});

class AddCommand extends Command {
  init() {
    // 获取add命令后面的参数
    this.templateName = this._args[0] || "";
    this.force = this._args[1].force || false;
    // debug模式下输出以下变量
    log.verbose("templateName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    // 代码片段（区块）：以源码形式拷贝的vue组件
    // 选择复用方式
    // 如果选择复用代码片段，步骤非常复杂，详情查看installSection方法中代码注释
    // 如果选择复用页面模板，会提示选择可复用的模板，然后提示输入文件夹/文件名，然后自动拷贝模板代码到当前目录，检查合并依赖并安装依赖
    this.addMode = await this.getAddMode();
    if (this.addMode === ADD_MODE_SECTION) {
      // 选择复用代码片段模板
      await this.installSectionTemplate();
    } else {
      // 选择复用页面模板
      await this.installPageTemplate();
    }
  }

  // 安装代码片段模板
  async installSectionTemplate() {
    log.info("开始安装代码片段...");
    // 1.获取页面安装文件夹路径
    this.dir = process.cwd();
    // 2.选择代码片段
    this.sectionTemplate = await this.getTemplate(ADD_MODE_SECTION);
    // 3.安装代码片段
    // 3.1.预检查：是否有重名目录
    await this.prepare(ADD_MODE_SECTION);
    // 3.2.下载代码片段模板至缓存目录
    await this.downloadTemplate(ADD_MODE_SECTION);
    // 3.3.将代码片段模板拷贝至指定目录
    // 4.合并代码片段模板依赖
    // 5.代码片段模板安装完成
    await this.installSection();
    log.success("代码片段安装完成");
  }

  // 安装页面模板
  async installPageTemplate() {
    log.info("开始安装页面模板...");
    // 1.获取页面安装文件夹路径
    this.dir = process.cwd();
    // 2.选择页面模板
    this.pageTemplate = await this.getTemplate(ADD_MODE_PAGE);
    // 3.安装页面模板
    // 3.1.预检查：是否有重名目录
    await this.prepare(ADD_MODE_PAGE);
    // 3.2.下载页面模板至缓存目录
    await this.downloadTemplate(ADD_MODE_PAGE);
    // 3.3.将页面模板拷贝至指定目录
    // 4.合并页面模板依赖
    // 5.页面模板安装完成
    await this.installTemplate();
    log.success("页面模板安装完成");
  }

  // 询问添加模式
  async getAddMode() {
    const { addMode } = await inquirer.prompt({
      type: "list",
      name: "addMode",
      message: "请选择代码复用模式：",
      default: "",
      choices: [
        { name: "复用页面模板", value: ADD_MODE_PAGE },
        { name: "复用代码片段", value: ADD_MODE_SECTION },
      ],
    });

    return addMode;
  }

  // 获取代码行号
  async getLineNumber() {
    const { lineNumber } = await inquirer.prompt({
      type: "input",
      name: "lineNumber",
      message: "请问您想在哪一行插入代码片段？（行号下标从0开始）",
      default: "",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("请输入您要插入的行数");
          return;
        }
        if (!(value >= 0 && Math.floor(value) === Number(value))) {
          done("插入行数必须是正整数");
          return;
        }
        done(null, true);
      },
    });

    return lineNumber;
  }

  async getCodeFile(choices) {
    const { codeFile } = await inquirer.prompt({
      type: "list",
      name: "codeFile",
      message: "请选择要插入代码片段到哪个源码文件：",
      default: "",
      choices,
    });

    return codeFile;
  }

  // 获取vue不同版本编码风格选项
  async getVueVersionStyle(choices) {
    const { vueVersionStyle } = await inquirer.prompt({
      type: "list",
      name: "vueVersionStyle",
      message: "请选择 Vue.js 版本：",
      default: VUE3_SETUP_STYLE, // 默认vue3 script setup风格
      choices: choices || VUE_VERSION_STYLE_CHOICES,
    });

    return vueVersionStyle;
  }

  // 安装代码片段
  async installSection() {
    // 1.选择要把代码片段插入到哪个源码文件
    // 读取当前目录下的所有源码文件
    let files = fs
      .readdirSync(this.dir, { withFileTypes: true }) // withFileTypes能读取出文件夹和文件类型
      .map((file) => (file.isFile() ? file.name : null)) // 排除文件夹类型
      .filter((_) => _) // 过滤为null的选项
      .map((file) => ({ name: file, value: file })); // 生成选项

    if (files.length === 0) {
      throw new Error("当前目录下没找到可供选择的源码文件！");
    }

    const codeFile = await this.getCodeFile(files);

    // 2.需要用户输入插入行数
    const lineNumber = await this.getLineNumber();
    log.verbose("用户选择的源码文件", codeFile);
    log.verbose("要插入的行号下标", lineNumber);

    // 3.对源码文件进行分割（把代码以行为单位分割成数组）
    const codeFilePath = path.resolve(this.dir, codeFile);
    const codeLines = fs.readFileSync(codeFilePath, "utf-8").split("\n");
    log.verbose("源码文件内容数组：插入代码片段前", codeLines);

    // 4.选择代码插入的风格，vue2和vue3有差异
    const vueVersionStyle = await this.getVueVersionStyle();
    log.verbose("用户选择的vue编码风格", vueVersionStyle);

    // 5.以组件形式插入代码片段到分割好的代码数组中
    const componentName = this.sectionTemplate.sectionName;
    codeLines.splice(lineNumber, 0, `  <${componentName} />`);

    // 6.插入代码片段的import语句
    // 找到源码中script的位置（去除头尾空格，防止不规范编写导致找不到）
    const scriptIndex = codeLines.findIndex(
      (linCode) => linCode.replace(/\s/g, "") === "<script>"
    );

    if (scriptIndex === -1) {
      throw new Error(`在 ${codeFile} 源码中找不到 <script> 标签！`);
    }

    // 测试代码
    // console.log('<script>'.replace(/\s/g, "") === "<script>")
    // console.log(' <script>'.replace(/\s/g, "") === "<script>")
    // console.log('<script> '.replace(/\s/g, "") === "<script>")
    // console.log('  <script> '.replace(/\s/g, "") === "<script>")
    // 向script中插入import导入语句，路径为当前目录下components/输入的片段名/index.vue
    // TODO 后续优化，为用户提供按需导入还是直接导入选择
    codeLines.splice(
      scriptIndex + 1,
      0,
      `import ${componentName} from './components/${componentName}/index.vue'`
    );
    // 8.如果是vue2或者是vue3标准模板，需要额外添加components选项来注册局部组件，vue3 script setup模式不需要
    if ([VUE2_NORMAL_STYLE, VUE3_NORMAL_STYLE].includes(vueVersionStyle)) {
      // 找到 export default {} 的位置
      const exportIndex = codeLines.findIndex((line) =>
        line.trim().startsWith("export default")
      );

      if (exportIndex === -1) {
        throw new Error(`在 ${codeFile} 源码中没有找到 export default`);
      }

      log.verbose("源码文件中export default位置：", `第 ${exportIndex + 1} 行`);

      // 找到 components: { 的位置
      let componentsIndex = codeLines.findIndex((line) =>
        /components\s*\:\s*\{[^}]*/.test(line)
      );
      log.verbose(
        "源码文件中components属性位置",
        componentsIndex === -1
          ? "未找到components属性配置"
          : `第 ${componentsIndex + 1} 行`
      );

      // 测试代码
      // console.log('  components:{'.replace(/\s/g, "") === "components:{")
      // console.log('  components : {'.replace(/\s/g, "") === "components:{")
      // console.log('  components :{'.replace(/\s/g, "") === "components:{")
      // console.log(' components : { '.replace(/\s/g, "") === "components:{")

      // 如果没有找到 components 则创建一个components属性并插入到export default { 的下一行
      if (componentsIndex === -1) {
        // 插入 components: {}, 逗号不能少，因为不确定后面会不会有内容
        codeLines.splice(
          exportIndex + 1,
          0,
          `  components: { ${componentName}, },`
        );
      } else {
        // 如果找到了 components:{，判断components是不是写成了一行如components: {xxx}
        // 如果是，在当前这一行的结尾处插入内容。
        // 如果有换行，则在当前这一行后面一行插入内容。
        // 测试代码
        // console.log(/components\s*\:\s*\{[^}]*\}/.test("components: { a: 1    }"));
        // console.log(
        //   /components\s*\:\s*\{[^}]*\}/.test("components: {a: 1, b: {}}")
        // );

        // 处理不同写法的问题
        // components: {a: 1}
        // components: {
        //    a: 1
        // }

        // 匹配components是不是写成了一行
        const componentsLineCode = codeLines[componentsIndex];
        if (/components\s*\:\s*\{[^}]*\}/.test(componentsLineCode)) {
          // 没换行则在components:{的结束符号}之前插入代码片段名
          // 通过寻找最后一个 } 的位置来确定插入点
          const closingBraceIndex = componentsLineCode.indexOf("}");
          if (closingBraceIndex !== -1) {
            // 在 } 前面插入组件名称
            // 生成新的一行字符，规则为保留原来的代码到closingBraceIndex标记点，然后加上自己的代码片段，再加上 }
            const updatedCode = `${componentsLineCode.slice(
              0,
              closingBraceIndex
            )} ${componentName},${componentsLineCode.slice(closingBraceIndex)}`;
            // 将新的内容更新到codeLines对应下标位置
            codeLines[componentsIndex] = updatedCode;
          }
        } else {
          // 如果有换行，则在匹配到的componentsIndex的下一行注册代码片段名称（空格是为了对齐格式，不一定准确），并以逗号结尾
          codeLines.splice(componentsIndex + 1, 0, `    ${componentName},`);
        }
      }
    }
    log.verbose("源码文件内容数组：插入代码片段后", codeLines);
    // 9. 将代码还原为字符串并写入到源码文件中
    const codeContent = codeLines.join("\n");
    fs.writeFileSync(codeFilePath, codeContent);
    log.success(`代码片段已成功写入当前路径下的源码文件 ${codeFile}`);
    log.success(
      `已将 ${componentName} 写入源码第 ${
        Number(lineNumber) + 1
      } 行，自动import导入 ${componentName} ，自动局部注册components，可能会有一些代码格式问题需要您手动对齐`
    );

    // 10.将代码片段目录拷贝到当前目录 ./components/代码片段名/ 中
    fse.ensureDirSync(this.targetPath); // 确保文件夹存在，不存在自动创建
    // 拿到模板路径
    const templatePath = path.resolve(
      this.sectionTemplatePackage.cacheFilePath,
      "template",
      this.sectionTemplate.targetPath
    );
    // 拿到目标路径
    const targetPath = this.targetPath;
    log.verbose("templatePath", templatePath);
    log.verbose("targetPath", targetPath);

    // 拷贝模板到目标路径
    fse.copySync(templatePath, targetPath);
    log.verbose(`代码片段模板已拷贝到 ${targetPath}`);
  }

  // 安装页面模板
  async installTemplate() {
    log.verbose("pageTemplate", this.pageTemplate);
    // 拿到模板路径
    const templatePath = path.resolve(
      this.pageTemplatePackage.cacheFilePath,
      "template",
      this.pageTemplate.targetPath
    );
    // 如果要拷贝的模板不存在，就不用继续往下执行了
    if (!pathExists(templatePath)) {
      throw new Error(`页面模板不存在！请检查文件：${templatePath}`);
    }
    // 拿到目标路径
    const targetPath = this.targetPath;
    log.verbose("templatePath", templatePath);
    log.verbose("targetPath", targetPath);
    // 确保这两个路径存在（不存在也会自动创建）
    fse.ensureDirSync(templatePath);
    fse.ensureDirSync(targetPath);
    // 将模板路径的所有文件拷贝到目标路径中
    fse.copySync(templatePath, targetPath);
    // 使用ejs渲染目标路径中的文件
    await this.ejsRender({ targetPath });
    // 如果拷贝的模板中有依赖外部node_modules包，需要检查和合并依赖
    // 合并依赖完成后自动帮用户重新安装依赖
    await this.mergeDependencies({ templatePath, targetPath });
  }

  // 使用ejs渲染模板
  async ejsRender(options = {}) {
    const { pageName } = this.pageTemplate;
    const { targetPath, ignore } = options;

    try {
      // 获取匹配的文件
      const files = await glob("**", {
        cwd: targetPath,
        ignore: ignore || "**/node_modules/**", // 忽略内容
        nodir: true, // 不要文件夹
        dot: true, // 包含隐藏文件
      });

      if (!files || files.length === 0) {
        throw new Error("glob没有匹配到文件");
      }

      // 遍历文件并渲染 EJS 模板
      await Promise.all(
        files.map(async (file) => {
          // 获取文件真实路径
          const filePath = path.join(targetPath, file);
          try {
            // 第二个参数是ejs渲染所需要的变量，如 <%= name %>
            const result = await ejs.renderFile(
              filePath,
              {
                name: pageName.toLocaleLowerCase(),
              },
              {}
            );
            // 写入渲染后的结果
            fse.writeFileSync(filePath, result);
          } catch (err) {
            throw new Error(`EJS 渲染文件 ${filePath} 出错: ${err.message}`);
          }
        })
      );
    } catch (err) {
      // 捕获并处理所有错误
      log.error("ejsRender 执行出错：", err.message);
      throw err; // 抛出错误，以便外部调用处理
    }
  }

  // 异步执行命令
  async execCommand(command, cwd) {
    let result;
    if (!command) {
      throw new Error("命令不存在！");
    }
    // npm install => ['npm', 'install']
    const commandArr = command.split(" ");
    const cmd = commandArr[0];
    const args = commandArr.slice(1);
    result = await spawnAsync(cmd, args, { stdio: "inherit", cwd });

    if (result !== 0) {
      throw new Error(`${command} 命令执行失败！`);
    }
    return result;
  }

  // 如果拷贝的模板中有依赖外部node_modules包，需要检查和合并依赖
  async mergeDependencies(options) {
    log.info("开始检查和合并依赖...");
    // 处理依赖合并问题
    // 场景一：模板中存在依赖，项目中不存在（拷贝依赖）
    // 场景二：模板中存在依赖，项目中也存在（不会拷贝依赖，但是在脚手架中给予提示，让开发者手动处理）
    const { templatePath, targetPath } = options;
    // 获取package.json readPkgUp.sync会返回{ packageJson, path }
    const templatePkg = readPkgUp.sync({
      cwd: templatePath,
      normalize: false,
    });
    const targetPkg = readPkgUp.sync({
      cwd: targetPath,
      normalize: false,
    });

    // 获取依赖dependencies
    const templateDependencies = templatePkg.packageJson.dependencies || {};
    const targetDependencies = targetPkg.packageJson.dependencies || {};
    log.verbose("模板依赖", templateDependencies);
    log.verbose("目标依赖", targetDependencies);

    // 将对象转化为数组
    const templateDependenciesArr = objectToArray(templateDependencies);
    const targetDependenciesArr = objectToArray(targetDependencies);

    // 实现dependencies的diff
    const newDependencies = dependenciesDiff(
      templateDependenciesArr,
      targetDependenciesArr
    );
    log.verbose("合并后的依赖", newDependencies);
    // 将合并后的依赖写入到目标路径的package.json中dependencies里
    targetPkg.packageJson.dependencies = arrayToObject(newDependencies);
    fse.writeJsonSync(targetPkg.path, targetPkg.packageJson, { spaces: 2 }); // 写入package.json并给两个字符的缩进

    // 帮用户合并完依赖之后也自动帮用户安装好依赖（安装路径为当前项目package.json所在目录，通过path.dir来获得）
    log.info("开始安装模板所需依赖...");
    await this.execCommand("npm install", path.dirname(targetPkg.path));
    log.success("模板所需依赖安装完成");

    log.success("依赖合并成功");
  }

  async prepare(addMode = ADD_MODE_PAGE) {
    const name =
      addMode === ADD_MODE_PAGE
        ? this.pageTemplate.pageName
        : this.sectionTemplate.sectionName;
    // 生成最终拷贝路径
    if (addMode === ADD_MODE_PAGE) {
      this.targetPath = path.resolve(this.dir, name);
    } else {
      this.targetPath = path.resolve(this.dir, "components", name);
    }
    if (pathExists(this.targetPath)) {
      const msg = addMode === ADD_MODE_PAGE ? name : "/components/" + name;
      throw new Error(`当前路径中 ${msg} 文件夹已存在`);
    }
  }

  async downloadTemplate(addMode = ADD_MODE_PAGE) {
    // 缓存文件夹
    const targetPath = path.resolve(USER_HOME, ".cjp-cli-dev", "template");
    // 缓存真实路径
    const storeDir = path.resolve(
      USER_HOME,
      ".cjp-cli-dev",
      "template",
      "node_modules"
    );

    // 生成Package对象
    const template =
      addMode === ADD_MODE_PAGE ? this.pageTemplate : this.sectionTemplate;
    const { npmName, version } = template;
    const templatePackage = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });

    let spinner; // 加载动画
    let successMsg; // 成功信息
    const title = addMode === ADD_MODE_PAGE ? "页面" : "代码片段";

    try {
      // 模板是否存在
      if (!(await templatePackage.exists())) {
        spinner = spinners(`正在下载${title}模板...`);
        await sleep();
        // 下载模板
        await templatePackage.install();
        successMsg = `下载${title}模板成功`;
      } else {
        spinner = spinners(`正在更新${title}模板...`);
        await sleep();
        // 更新模板
        await templatePackage.update();
        successMsg = `更新${title}模板成功`;
      }
    } catch (error) {
      throw error;
    } finally {
      // 只要完成就停止加载动画
      spinner.stop(true);
      // 完成后下载文件存在且有成功信息
      if ((await templatePackage.exists()) && successMsg) {
        // 输出成功信息
        log.success(successMsg);
        // 将包信息存入this
        if (addMode === ADD_MODE_PAGE) {
          this.pageTemplatePackage = templatePackage;
        } else {
          this.sectionTemplatePackage = templatePackage;
        }
      }
    }
  }

  async getTemplate(addMode = ADD_MODE_PAGE) {
    const title = addMode === ADD_MODE_PAGE ? "页面" : "代码片段";
    const templateData =
      addMode === ADD_MODE_PAGE ? PAGE_TEMPLATE : SECTION_TEMPLATE;

    const { templateName } = await inquirer.prompt({
      type: "list",
      name: "templateName",
      message: `请选择要添加的${title}模板：`,
      default: "",
      choices: this.createChoices(templateData),
    });
    // 2.1.输入名称
    const template = templateData.find((item) => item.npmName === templateName);
    if (!template) {
      throw new Error(`${title}模板不存在！`);
    }
    const { name } = await inquirer.prompt({
      type: "input",
      name: "name",
      message: `请输入${title}名称：`,
      default: "",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done(`请输入${title}名称`);
          return;
        }
        done(null, true);
      },
    });

    // 对文件名进行trim处理
    if (addMode === ADD_MODE_PAGE) {
      template.pageName = name.trim();
    } else {
      template.sectionName = name.trim();
    }

    return template;
  }

  // 创建选项
  createChoices(data) {
    return data.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }
}

function init(args) {
  return new AddCommand(args);
}

module.exports = init;
module.exports.AddCommand = AddCommand;
