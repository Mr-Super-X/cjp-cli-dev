"use strict";

// 内置库
const path = require("path");
// 自建库
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");
const { spawn, DEPENDENCIES_CACHE_DIR } = require("@cjp-cli-dev/utils");

// 全局变量
const SETTINGS = {
  // 配置表
  init: "@cjp-cli-dev/init",
  publish: "@cjp-cli-dev/publish",
  add: "@cjp-cli-dev/add",
};

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
  const cmdOpts = cmdObj.opts();
  log.verbose('命令参数', cmdOpts);
  // 获取命令对应的包名（可以放在服务端通过接口获取，这样可以扩展动态配置）
  const packageName = SETTINGS[cmdName];
  // 获取版本号，默认获取最新版本
  const packageVersion = "latest";

  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, DEPENDENCIES_CACHE_DIR);
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
  log.verbose('rootFile', rootFile);
  if (rootFile) {
    // 捕获异步throw err
    try {
      // 在当前进程中调用
      // require(rootFile).call(null, Array.from(arguments));

      // 在node子进程中调用，提升性能
      // spawn：适合耗时任务（比如npm install），持续输出日志
      // exec/execFile：适合开销小的任务，整个任务执行完毕后输出日志

      // 简化参数
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;

      // 子进程中执行代码
      // 将require转成动态字符串代码，再通过 node -e 来执行代码
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      // const nodePath = process.execPath; // 获取 node 可执行文件的路径
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit", // 将输出流交给父进程，可以看到执行动画和打印内容
      });
      child.on("error", (e) => {
        log.error("命令执行失败：", e.message);
        process.exit(e.code);
      });
      child.on("exit", (e) => {
        if (e === 0) {
          log.verbose("命令执行成功");
        } else {
          log.error("命令执行失败，退出码：", e);
        }
        process.exit(e);
      });
    } catch (err) {
      log.error(err);
    }
  }
}

module.exports = exec;
