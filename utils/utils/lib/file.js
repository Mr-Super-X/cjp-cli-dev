// 内置库
const fs = require("fs");

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
  readFile,
  writeFile,
};