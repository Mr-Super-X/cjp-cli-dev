// 第三方库
const Spinner = require("cli-spinner").Spinner; // 终端loading工具

/**
 * 终端加载动画
 * @link https://www.npmjs.com/package/cli-spinner
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

module.exports = spinners;