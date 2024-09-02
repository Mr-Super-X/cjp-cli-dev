"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const fse = require("fs-extra"); // 用于清空文件夹
const semver = require("semver"); // 用于判断版本号
// 内置库
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");

// 全局变量
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

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
      if (projectInfo) {
        // debug模式输出调试信息
        log.verbose('projectInfo', projectInfo)
        // 2. 下载模板
        this.downloadTemplate()
        // 3. 安装模板
      }
    } catch (err) {
      log.error(err.message);
    }
  }

  downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1. 通过eggjs搭建后端
    // 1.2. 通过npm存储项目模板
    // 1.3. 将项目模板存储到MongoDB
    // 1.4. 通过egg.js获取MongoDB中的模板数据并通过API返回模板
  }

  async prepare() {
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
        if (confirmClean) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
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
              regex.test(v) && v.length >= 2 && v.length <= 64;

              setTimeout(() => {
                if (!regex.test(v)) {
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
            message: "请输入项目版本号",
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

  ifDirIsEmpty(localPath) {
    let files = fs.readdirSync(localPath);

    // 过滤掉隐藏文件和node_modules
    files = files.filter(
      (file) => !file.startsWith(".") && !["node_modules"].includes(file)
    );
    // 如果没有文件，返回true，表示目录为空
    return !files && files.length === 0;
  }

}

function init(args) {
  return new InitCommand(args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
