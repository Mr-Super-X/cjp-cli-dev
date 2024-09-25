"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const pathExists = require("path-exists").sync; // 用于判断路径是否存在
const fse = require("fs-extra"); // 用于清空文件夹
const ejs = require("ejs"); // 用于渲染ejs模板
const { glob } = require("glob"); // 用于shell模式匹配文件
// 内置库
const path = require("path");
const os = require("os");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");
const { spinners, sleep } = require("@cjp-cli-dev/utils");

// 页面模板（尽量提供高质量模板）
const PAGE_TEMPLATE = [
  {
    name: "vue3首页模板",
    npmName: "cjp-cli-dev-template-vue3-template-page", // 需要先将这个包发到npm上
    version: "1.0.0",
    targetPath: "src/views/home", // 要拷贝的文件目录
    ignore: ['**/**.png']
  },
];

const USER_HOME = os.homedir(); // 用户主目录

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
    await this.installTemplate();
    // 4.合并页面模板依赖
    // 5.安装完成
  }

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
            const result = await ejs.renderFile(filePath, {
              name: pageName.toLocaleLowerCase(),
            }, {});
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
