const inquirer = require("inquirer"); // 用于终端交互

/**
 * 提取到一个地方更方便管理统一版本
 * @link https://www.npmjs.com/package/inquirer/v/8.2.4
 * @param {*} options
 * @returns
 */
async function prompt(options = {}) {
  try {
    return await inquirer.prompt(options);
  } catch (error) {
    throw error;
  }
}

module.exports = {
  prompt,
};
