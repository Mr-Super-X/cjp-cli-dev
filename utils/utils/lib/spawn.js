// 第三方库
// https://www.npmjs.com/package/cross-spawn/v/7.0.3
const cSpawn = require("cross-spawn"); // 用来解决node内置的spawn在windows上运行路径解析错误问题
// 内置库
// const cp = require("child_process");

/**
 * 执行命令，兼容windows和MacOS等
 * @param {*} command 命令，如npm install
 * @param {*} args 命令后面的参数，如--registry
 * @param {*} options node参数配置，如stdio: "inherit"等等
 */
function spawn(command, args, options) {
  // 使用node child_process需要这样传参，然后使用，会导致commander参数options中如果有必传参无法继续执行
  // const win32 = process.platform === "win32";
  // const cmd = win32 ? "cmd" : command;
  // const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  // return cp.spawn(cmd, cmdArgs, options || {});

  // 使用cross-spawn可以解决跨平台兼容问题，且不会导致解析commander必传参数无法执行
  return cSpawn(command, args, options || {});
}

/**
 * 异步执行命令
 * @param {*} command 命令，如npm install
 * @param {*} args 命令后面的参数，如--registry
 * @param {*} options node参数配置，如stdio: "inherit"等等
 * @returns
 */
function spawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, options);

    p.on("error", reject);
    p.on("exit", resolve);
  });
}

module.exports = {
  spawn,
  spawnAsync,
}