const inquirer = require("inquirer"); // 用于终端交互

// https://www.npmjs.com/package/inquirer/v/8.2.4
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
