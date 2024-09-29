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

module.exports = {
  isObject,
  sleep,
}