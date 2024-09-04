"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const fse = require("fs-extra"); // 用于清空文件夹
const semver = require("semver"); // 用于判断版本号
// 内置库
const fs = require("fs");
const os = require("os");
const path = require("path");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");
const { spinners } = require("@cjp-cli-dev/utils");
const getProjectTemplate = require("./getProjectTemplate");

// 全局变量
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const userHome = os.homedir(); // 用户主目录

class InitCommand extends Command {
  init() {
    this.projectName = this._args[0] || "";
    this.force = this._args[1].force || false;
    // debug模式下输出以下变量
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      // 准备阶段完成结果为true才继续执行后续
      if (!projectInfo) return;
      // debug模式输出调试信息
      log.verbose("projectInfo", projectInfo);
      // 将项目信息保存到class中
      this.projectInfo = projectInfo;

      // 2. 下载模板
      await this.downloadTemplate();
      // 3. 安装模板
      await this.installTemplate();
    } catch (err) {
      log.error(err.message);
    }
  }

  async installTemplate() {
    // debug模式下输出模板信息
    log.verbose("templateInfo", this.templateInfo);
    log.verbose("npmPackage", this.npmPackage);

    if (!this.templateInfo) {
      throw new Error("模板信息不存在！");
    }

    // type不存在则默认给normal
    if (!this.templateInfo.type) {
      this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
    }

    // 分发type策略
    const typeStrategies = {
      // 标准安装
      [TEMPLATE_TYPE_NORMAL]: async () => {
        await this.installNormalTemplate();
      },
      // 自定义安装
      [TEMPLATE_TYPE_CUSTOM]: async () => {
        await this.installCustomTemplate();
      },
    };

    // 若type不存在，则抛出错误信息并终止
    if (!typeStrategies[this.templateInfo.type]) {
      throw new Error("无法识别模板类型！");
    }

    // 分发执行策略
    await typeStrategies[this.templateInfo.type]();
  }

  // 安装标准模板，例如安装vue-cli创建项目模板
  async installNormalTemplate() {
    log.verbose("安装标准模板");
    const spinner = spinners("正在安装模板...");
    try {
      console.log('H啊哈哈哈', this.npmPackage)
      // 拷贝模板代码到当前目录
      const templatePath = path.resolve(
        this.npmPackage.cacheFilePath,
        "template"
      );
      // 当前目录路径
      const targetPath = process.cwd();
      console.log(templatePath, targetPath)
      // 确保这两个目录都存在，如果不存在会自动创建
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      // 拷贝模板代码到当前目录
      fse.copySync(templatePath, targetPath);
      log.success('模板安装成功')
    } catch (err) {
      // 如果报错，抛出错误
      throw err;
    } finally {
      // 结束spinner
      spinner.stop(true);
    }
  }

  // 安装自定义模板，例如安装自己创建的项目模板
  async installCustomTemplate() {
    log.verbose("安装自定义模板");
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1. 通过eggjs搭建后端
    // 1.2. 通过npm存储项目模板
    // 1.3. 将项目模板存储到MongoDB
    // 1.4. 通过egg.js获取MongoDB中的模板数据并通过API返回模板

    // 读取模板
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );

    // 将模板信息存到this中
    this.templateInfo = templateInfo;

    // 生成包安装路径信息
    const targetPath = path.resolve(userHome, ".cjp-cli-dev", "template");
    const storeDir = path.resolve(
      userHome,
      ".cjp-cli-dev",
      "template",
      "node_modules",
    );
    const { npmName: packageName, version: packageVersion } = templateInfo;

    // 创建npm包实例
    const npmPackage = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });

    let spinner; // 加载动画
    let successMsg; // 成功信息

    // 捕获下载或更新的报错，将错误抛出，防止程序异常
    try {
      // 如果npm包不存在，则执行npm install，否则更新
      if (!(await npmPackage.exists())) {
        spinner = spinners("正在下载模板...");
        await npmPackage.install();
        successMsg = "下载模板成功";
      } else {
        spinner = spinners("正在更新模板...");
        await npmPackage.update();
        successMsg = "更新模板成功";
      }
    } catch (err) {
      // 如果执行报错，抛出错误
      throw err;
    } finally {
      // 只要完成就停止加载动画
      spinner.stop(true);
      // 完成后下载文件存在且有成功信息
      if ((await npmPackage.exists()) && successMsg) {
        // 输出成功信息
        log.success(successMsg);
        // 将包信息存入this
        this.npmPackage = npmPackage;
      }
    }
  }

  async prepare() {
    // 请求接口，判断项目模板是否存在，没有则中断执行
    const template = await getProjectTemplate();

    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }

    // 将模板保存到class中
    this.template = template;

    const localPath = process.cwd();

    // 1. 当前目录是否为空
    if (!this.ifDirIsEmpty(localPath)) {
      let ifContinue = true;

      // 没有输入--force参数时
      if (!this.force) {
        // 1.1. 询问是否继续创建
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false, // 默认不创建
            message: "当前文件夹不为空，是否继续创建项目？",
          })
        ).ifContinue;
      }

      // 1.2. 用户如果不确认继续，结束流程
      if (!ifContinue) return;

      // 2. 确认是否强制覆盖
      // 用户选择继续或者输入了--force参数
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmClean } = await inquirer.prompt({
          type: "confirm",
          name: "confirmClean",
          default: false,
          message: "是否确认清空当前目录下的所有文件？",
        });
        // 用户选择不确认，中断执行
        if (!confirmClean) return;

        // 用户选择确认，清空当前目录并继续
        fse.emptyDirSync(localPath);
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    let projectInfo = {};
    // 3. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择创建项目的类型：",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    // debug模式下输出
    log.verbose("创建项目的类型：", type);
    // 4. 获取项目基本信息
    const typeStrategies = {
      [TYPE_PROJECT]: async () => {
        const project = await inquirer.prompt([
          {
            type: "input",
            name: "projectName",
            default: "",
            message: "请输入项目名称：",
            validate: function (v) {
              const done = this.async();

              // 正则表达式说明：
              // [a-zA-Z] - 第一个字符必须是字母
              // [a-zA-Z0-9_-]{0,62} - 后面可以跟0到62个字母、数字、下划线或短横线
              // $        - 字符串结束
              // 注意：因为我们已经要求第一个字符不能是数字或短横线，所以这里{0,62}确保总长度不超过64个字符
              const regex = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

              setTimeout(() => {
                if (!(regex.test(v) && v.length >= 2 && v.length <= 64)) {
                  done(
                    `请输入合法的项目名称，要求如下：\n 1. 第一个字符必须是字母 \n 2. 输入的内容不少于2个字符，不超过64个字符 \n 3. 可以用横杠和下划线作为连接符`
                  );
                  return;
                }

                done(null, true);
              }, 0);
            },
            filter: function (v) {
              return v;
            },
          },
          {
            type: "input",
            name: "projectVersion",
            default: "1.0.0",
            message: "请输入项目版本号：",
            validate: function (v) {
              const done = this.async();

              setTimeout(() => {
                if (!!!semver.valid(v)) {
                  done(
                    `请输入合法的语义化版本号，如1.0.0、v1.0.0，可查阅：https://semver.org/lang/zh-CN/`
                  );
                  return;
                }

                done(null, true);
              }, 0);
            },
            filter: function (v) {
              return semver.valid(v) || v;
            },
          },
          {
            type: "list",
            name: "projectTemplate",
            message: "请选择所需的项目模板：",
            choices: this.createTemplateChoices(),
          },
        ]);
        projectInfo = {
          type,
          ...project,
        };
      },
      [TYPE_COMPONENT]: async () => {},
    };

    if (!typeStrategies[type]) {
      log.error("未找到创建项目的类型");
      return;
    }

    // 分发执行策略
    await typeStrategies[type]();

    // 返回项目基本信息
    return projectInfo;
  }

  createTemplateChoices() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  ifDirIsEmpty(localPath) {
    let files = fs.readdirSync(localPath);

    // 过滤掉隐藏文件和node_modules
    files = files.filter(
      (file) => !file.startsWith(".") && !["node_modules"].includes(file)
    );

    // 如果没有文件，返回true，表示目录为空
    return files && files.length === 0;
  }
}

function init(args) {
  return new InitCommand(args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
