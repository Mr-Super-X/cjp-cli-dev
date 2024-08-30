"use strict";

// 内置库
const path = require("path");
// 自建库
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");

// 全局变量
const SETTINGS = {
  // 配置表
  init: "@cjp-cli-dev/init",
};
const CACHE_DIR = "dependencies"; // 缓存路径

async function exec() {
  const homePath = process.env.CLI_HOME_PATH;
  let targetPath = process.env.CLI_TARGET_PATH;
  let storeDir = "";
  let pkg = null;
  // 在debug模式输出
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);

  const cmdObj = arguments[arguments.length - 1];
  // 获取命令名称
  const cmdName = cmdObj.name();
  // 获取命令参数
  // const cmdOpts = cmdObj.opts();
  // 获取命令对应的包名（可以放在服务端通过接口获取，这样可以扩展动态配置）
  const packageName = SETTINGS[cmdName];
  // 获取版本号，默认获取最新版本
  const packageVersion = "latest";

  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("new targetPath", targetPath);
    log.verbose("storeDir", storeDir);

    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });

    if (await pkg.exists()) {
      // 更新
      await pkg.update();
    } else {
      // 安装
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }

  // 找到入口执行文件并执行
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    // 在当前进程中调用
    require(rootFile).apply(null, arguments);
    // 在node子进程中调用，提升性能
    // spawn：适合耗时任务（比如npm install），持续输出日志
    // exec/execFile：适合开销小的任务，整个任务执行完毕后输出日志
  }
}

module.exports = exec;
