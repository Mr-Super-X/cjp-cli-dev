"use strict";

// 第三方库
const semver = require("semver"); // 用于比对各种版本号
const colors = require("colors/safe"); // 用于给log信息添加颜色
// 自建库
const log = require("@cjp-cli-dev/log");

// 全局变量
const LOWEST_NODE_VERSION = "16.0.0";

class Command {
  constructor(args) {
    log.verbose('Command constructor args：', args)
    if(!args) {
      throw new Error("参数不能为空")
    }
    if(!Array.isArray(args)) {
      throw new Error("参数格式必须是Array")
    }
    if(args.length < 1) {
      throw new Error("参数列表不能为空")
    }
    this._args = args;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());

      // 监听所有的异常
      chain.catch((err) => {
        log.error(err.message)
      });
    });
  }

  initArgs() {
    this._cmd = this._args[this._args.length - 1];
    this._otherArgs = this._args.slice(0, this._args.length - 1)
  }

  checkNodeVersion() {
    // 1. 获取当前node版本号
    const currentVersion = process.version;
    // 2. 比对最低版本号
    const lowestVersion = LOWEST_NODE_VERSION;

    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`cjp-cli-dev 需要安装 v${lowestVersion} 以上版本的 Node.js`)
      );
    }
  }

  init() {
    throw new Error("init必须实现！");
  }

  exec() {
    throw new Error("exec必须实现！");
  }
}

module.exports = Command;
