"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const pathExists = require("path-exists").sync; // 用于判断路径是否存在
const fse = require("fs-extra"); // 用于清空文件夹
const ejs = require("ejs"); // 用于渲染ejs模板
const readPkgUp = require("read-pkg-up"); // 用于查找根目录下的package.json
const { glob } = require("glob"); // 用于shell模式匹配文件
// 内置库
const path = require("path");
const os = require("os");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");
const { spinners, sleep, spawnAsync } = require("@cjp-cli-dev/utils");

// 页面模板（尽量提供高质量模板）
const PAGE_TEMPLATE = [
  {
    name: "vue3首页模板",
    npmName: "cjp-cli-dev-template-vue3-template-page", // 需要先将这个包发到npm上
    version: "latest",
    targetPath: "src/views/home", // 要拷贝的文件目录
    ignore: ["**/**.png"],
  },
];

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
  // 场景一：模板中存在依赖，项目中不存在（拷贝依赖）
  // 场景二：模板中存在依赖，项目中也存在（不会拷贝依赖，但是在脚手架中给予提示，让开发者手动处理）
  templateDepArr.forEach((templateDep) => {
    // 找出重复的依赖
    const duplicatedDep = targetDepArr.find(
      (targetDep) => templateDep.key === targetDep.key
    );

    // 将不重复的依赖push到目标dependencies中
    if (!duplicatedDep) {
      log.info("检测到新的依赖：", templateDep);
      result.push(templateDep);
    } else {
      log.info("检测到重复依赖：", duplicatedDep);
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
    // 1.获取页面安装文件夹路径
    this.dir = process.cwd();
    // 2.选择页面模板
    this.pageTemplate = await this.getPageTemplate();
    // 3.安装页面模板
    // 3.1.预检查：是否有重名目录
    await this.prepare();
    // 3.2.下载页面模板至缓存目录
    await this.downloadTemplate();
    // 3.3.将页面模板拷贝至指定目录
    // 4.合并页面模板依赖
    // 5.安装完成
    await this.installTemplate();
  }

  async installTemplate() {
    log.info("开始安装页面模板...");
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
    await this.mergeDependencies({ templatePath, targetPath });
    // 合并依赖完成后自动帮用户重新安装依赖
    log.success("页面模板安装完成");
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
    log.info('开始安装模板所需依赖...')
    await this.execCommand("npm install", path.dirname(targetPkg.path));
    log.success("模板所需依赖安装完成");

    log.success("依赖合并成功");
  }

  async prepare() {
    // 生成最终拷贝路径
    this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName);
    if (pathExists(this.targetPath)) {
      throw new Error(`当前路径中 ${this.pageTemplate.pageName} 文件夹已存在`);
    }
  }

  async downloadTemplate() {
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
    const { npmName, version } = this.pageTemplate;
    const pageTemplatePackage = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });

    let spinner; // 加载动画
    let successMsg; // 成功信息

    try {
      // 页面模板是否存在
      if (!(await pageTemplatePackage.exists())) {
        spinner = spinners("正在下载页面模板...");
        await sleep();
        // 下载页面模板
        await pageTemplatePackage.install();
        successMsg = "下载页面模板成功";
      } else {
        spinner = spinners("正在更新页面模板...");
        await sleep();
        // 更新页面模板
        await pageTemplatePackage.update();
        successMsg = "更新页面模板成功";
      }
    } catch (error) {
      throw error;
    } finally {
      // 只要完成就停止加载动画
      spinner.stop(true);
      // 完成后下载文件存在且有成功信息
      if ((await pageTemplatePackage.exists()) && successMsg) {
        // 输出成功信息
        log.success(successMsg);
        // 将包信息存入this
        this.pageTemplatePackage = pageTemplatePackage;
      }
    }
  }

  async getPageTemplate() {
    const { pageTemplateName } = await inquirer.prompt({
      type: "list",
      name: "pageTemplateName",
      message: "请选择要添加的页面模板：",
      default: "",
      choices: this.createChoices(),
    });
    // 2.1.输入页面名称
    const pageTemplate = PAGE_TEMPLATE.find(
      (item) => item.npmName === pageTemplateName
    );
    if (!pageTemplate) {
      throw new Error("页面模板不存在！");
    }
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: "请输入页面名称：",
      default: "",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("请输入页面名称");
          return;
        }
        done(null, true);
      },
    });
    // 对文件名进行trim处理
    pageTemplate.pageName = pageName.trim();

    return pageTemplate;
  }

  // 创建选项
  createChoices() {
    return PAGE_TEMPLATE.map((item) => ({
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
