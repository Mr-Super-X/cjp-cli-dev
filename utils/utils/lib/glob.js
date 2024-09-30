const { glob } = require("glob"); // 用 shell 使用的模式匹配文件

// 导出ejs默认ignore配置（当前项目是通过glob来匹配出文件，并交给ejs渲染，因此在这里导出默认配置）
const EJS_DEFAULT_IGNORE = ["**/node_modules/**", "**/**.png", "**/**.jpg"];

/**
 * 提取到一个地方更方便管理统一版本
 * @link https://www.npmjs.com/package/glob/v/10.4.5
 */
module.exports = {
  glob,
  EJS_DEFAULT_IGNORE,
};
