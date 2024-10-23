const cp = require("child_process");

/**
 * 判断是否是Object
 * @param {*} o 待判断的对象
 * @returns {boolean}
 */
function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
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
 * 判断命令是否可用
 * @param {string} command 待检查的命令
 * @example
 * const result = await isCommandAvailable('node')
 * const result = await isCommandAvailable('git-flow')
 * @returns {Promise<string>}
 */
function isCommandAvailable(command) {
  return new Promise((resolve, reject) => {
    cp.exec(`which ${command}`, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(new Error(`命令 '${command}' 不可用或发生错误`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

module.exports = {
  isObject,
  isCommandAvailable,
  sleep,
}