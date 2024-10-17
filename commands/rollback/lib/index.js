"use strict";

// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Git = require("@cjp-cli-dev/git");
const log = require("@cjp-cli-dev/log");
const { fse } = require("@cjp-cli-dev/utils");

class RollbackCommand extends Command {
  init() {
    log.verbose("rollback", this._cmd, this._args);

    // rollback命令的参数
    const { buildCmd, sshUser, sshIp, sshPath } = this._args[0];

    // 保存用户输入的参数
    this.options = {
      buildCmd,
      sshUser,
      sshIp,
      sshPath,
    };

    log.verbose("options", this.options);
  }

  async exec() {
    try {
      const startTime = new Date().getTime();
      // 1. 准备工作
      await this.prepare();
      // 2. git 回滚自动化
      const git = new Git(this.projectInfo, this.options);
      await git.prepareRollback(); // 回滚前预检查
      await git.rollback(); // 执行回滚操作
      const endTime = new Date().getTime();
      log.info("本次回滚耗时：", Math.floor(endTime - startTime) / 1000 + "秒");
    } catch (err) {
      log.error(err.message);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  async prepare() {
    // 1. 确认项目是否为npm项目
    const projectPath = process.cwd();
    const pkgPath = path.join(projectPath, "package.json");
    log.verbose("package.json路径：", pkgPath);
    if (!fs.existsSync(pkgPath)) {
      throw new Error(
        "这不是一个标准的node项目，可能不是通过脚手架publish命令发布的"
      );
    }

    // 2. 确认是否包含name、version
    const pkg = fse.readJsonSync(pkgPath);
    const { name, version } = pkg;
    log.verbose("package.json：", name, version);
    if (!name || !version) {
      throw new Error("package.json信息不全，请检查是否存在name、version！");
    }

    // 将项目信息缓存起来
    this.projectInfo = {
      name,
      version,
      dir: projectPath,
    };

    log.verbose("projectInfo", this.projectInfo);
  }
}

function init(args) {
  return new RollbackCommand(args);
}

module.exports = init;
module.exports.RollbackCommand = RollbackCommand;
