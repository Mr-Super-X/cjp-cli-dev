'use strict';

// 第三方库
const Spinner = require('cli-spinner').Spinner;

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]'
}

/**
 * 终端加载动画
 * @param {*} message 提示文字
 * @param {*} spinnerString 加载动画
 * @returns
 */
function spinners(message = '加载中...', spinnerString = '|/-\\') {
  const spinner = new Spinner(message + ' %s')
  spinner.setSpinnerString(spinnerString)
  spinner.start()
  return spinner
}

/**
 * 睡眠函数
 * @param {*} timeout Number 默认值 1000
 * @returns promise
 */
function sleep(timeout = 1000) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

module.exports = {
  isObject,
  spinners,
  sleep,
};
