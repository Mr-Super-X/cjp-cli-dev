"use strict";

// 第三方库
const fse = require("fs-extra"); // 用于文件操作
// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Git = require("@cjp-cli-dev/git");
const log = require("@cjp-cli-dev/log");

class PublishCommand extends Command {
  init() {
    log.verbose("publish", this._args, this._cmd);

    const { refreshGitServer, refreshGitToken, refreshGitOwner } =
      this._args[0];

    // 保存用户输入的参数
    this.options = {
      refreshGitServer: refreshGitServer || false,
      refreshGitToken: refreshGitToken || false,
      refreshGitOwner: refreshGitOwner || false,
    };
  }

  async exec() {
    try {
      const startTime = new Date().getTime();
      // 1. 初始化检查
      this.prepare();
      // 2. git flow 自动化
      const git = new Git(this.projectInfo, this.options);
      await git.prepare(); // 自动化提交准备和代码仓库初始化
      await git.commit(); // 代码自动化提交
      // 3. 云构建和云发布
      const endTime = new Date().getTime();
      log.info("本次发布耗时：", Math.floor(endTime - startTime) / 1000 + "秒");
    } catch (err) {
      log.error(err);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  prepare() {
    // 1. 确认项目是否为npm项目
    const projectPath = process.cwd();
    const pkgPath = path.join(projectPath, "package.json");
    log.verbose("package.json路径：", pkgPath);
    if (!fs.existsSync(pkgPath)) {
      throw new Error("package.json不存在！");
    }
    // 2. 确认是否包含name、version、build命令
    const pkg = fse.readJsonSync(pkgPath);
    const { name, version, scripts } = pkg;
    log.verbose("package.json：", name, version, scripts);
    if (!name || !version || !scripts || !scripts.build) {
      throw new Error(
        "package.json信息不全，请检查是否存在name、version、scripts（需提供build命令）！"
      );
    }

    // 将项目信息缓存起来
    this.projectInfo = {
      name,
      version,
      dir: projectPath,
    };
  }
}

function init(args) {
  return new PublishCommand(args);
}

module.exports = init;
module.exports.PublishCommand = PublishCommand;
