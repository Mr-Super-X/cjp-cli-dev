"use strict";

// 第三方库
const Spinner = require("cli-spinner").Spinner;
// 内置库
const cp = require("child_process");
const fs = require("fs");

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
 * @param {*} timeout Number 默认值 1000
 * @returns promise
 */
function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

// 兼容windows和MacOS
function spawn(command, args, options) {
  const win32 = process.platform === "win32";

  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return cp.spawn(cmd, cmdArgs, options || {});
}

function spawnAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args, options);

    p.on("error", reject);
    p.on("exit", resolve);
  });
}

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
};
