"use strict";

// 第三方库
const colors = require("colors/safe"); // 用于给log信息添加颜色
// 自建库
const log = require("@cjp-cli-dev/log");
const { semver } = require("@cjp-cli-dev/utils"); // 工具方法

// 全局变量
const LOWEST_NODE_VERSION = "16.0.0";

/**
 * 核心命令的父类
 * commands/目录下所有的包都需要继承该父类
 * 父类中执行了一些预检查功能，如检查当前node版本是否合规、子类中必要方法是否定义
 * 并将命令和参数进行和初始化解析，提供给所有的子类进行使用，子类可以调用this._args获取解析好的参数
 */
class Command {
  constructor(args) {
    log.verbose("Command constructor args：", args);
    if (!args) {
      throw new Error("参数不能为空");
    }
    if (!Array.isArray(args)) {
      throw new Error("参数格式必须是Array");
    }
    if (args.length < 1) {
      throw new Error("参数列表不能为空");
    }
    this._args = args;

    let chain = Promise.resolve();
    chain = chain.then(() => this.checkNodeVersion());
    chain = chain.then(() => this.initArgs());
    chain = chain.then(() => this.init());
    chain = chain.then(() => this.exec());

    // 监听所有的异常
    chain.catch((err) => {
      log.error(err.message);
    });
  }

  // 初始化参数对象
  initArgs() {
    this._cmd = this._args[this._args.length - 1];
    this._otherArgs = this._args.slice(0, this._args.length - 1);
  }

  // 检查node版本是否符合要求
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

  // 定义子类必须要实现的方法，强提醒，不定义则报错
  init() {
    throw new Error("子类中 init 方法必须实现！在该方法中执行子类的一些初始化步骤");
  }

  // 定义子类必须要实现的方法，强提醒，不定义则报错
  exec() {
    throw new Error("子类中 exec 方法必须实现！在该方法中执行子类的详细步骤");
  }
}

module.exports = Command;
