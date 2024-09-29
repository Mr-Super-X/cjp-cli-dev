"use strict";

// 第三方库
const Spinner = require("cli-spinner").Spinner; // 终端loading工具
const cSpawn = require("cross-spawn"); // 用来解决node内置的spawn在windows上运行路径解析错误问题
// 内置库
const fs = require("fs");
// const cp = require("child_process");
// 自建库
const semver = require('./semver'); // 用于判断版本号
const fse = require('./fs-extra'); // 更方便的文件操作
const pathExists = require('./path-exists'); // 检查路径是否存在
const { prompt } = require("./inquirer"); // 用于终端询问式交互

/**
 * 判断是否是Object
 * @param {*} o 待判断的对象
 * @returns {boolean}
 */
function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

/**
 * 终端加载动画
 * @param {*} message 提示文字
 * @param {*} spinnerString 加载动画
 * @returns
 */
function spinners(message = "加载中...", spinnerString = "|/-\\") {
  const spinner = new Spinner(message + " %s");
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

/**
 * 睡眠函数
 * @param {*} timeout Number 默认值 1000ms
 * @returns promise
 */
function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

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

/**
 * 读文件
 * @param {*} path 文件路径
 * @param {*} options 参数配置，支持toJson
 * @returns
 */
function readFile(path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    if (buffer) {
      if (options.toJson) {
        return buffer.toJson();
      } else {
        return buffer.toString();
      }
    }
  }

  return null;
}

/**
 * 写文件
 * @param {*} path 写入路径
 * @param {*} data 写入的数据是什么
 * @param {*} param2 参数配置，支持rewrite覆盖写入
 * @returns
 */
function writeFile(path, data, { rewrite = true } = {}) {
  if (fs.existsSync(path)) {
    if (rewrite) {
      fs.writeFileSync(path, data);
      return true;
    }

    return false;
  } else {
    fs.writeFileSync(path, data);
    return true;
  }
}

module.exports = {
  isObject,
  spinners,
  sleep,
  spawn,
  spawnAsync,
  readFile,
  writeFile,
  prompt,
  semver,
  fse,
  pathExists
};
