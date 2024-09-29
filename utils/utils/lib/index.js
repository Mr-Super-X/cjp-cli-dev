"use strict";

// 自建库
const semver = require("./semver"); // 用于判断版本号
const fse = require("./fs-extra"); // 更方便的文件操作
const ejs = require("./ejs"); // 渲染ejs模板
const spinners = require("./spinner"); // 终端loading
const pathExists = require("./path-exists"); // 检查路径是否存在
const { glob } = require("./glob"); // 用 shell 使用的模式匹配文件
const { prompt } = require("./inquirer"); // 用于终端询问式交互
const { spawn, spawnAsync } = require("./spawn"); // 执行耗时命令任务
const { readFile, writeFile } = require("./file"); // 自定义读写文件方法
const { isObject, sleep } = require("./util"); // 其它工具方法
const {
  DEFAULT_CLI_HOME,
  DEPENDENCIES_CACHE_DIR,
  TEMPLATE_CACHE_DIR,
} = require("./cli-const"); // 脚手架所使用的一些公共常量配置

module.exports = {
  isObject,
  spinners,
  sleep,
  spawn,
  spawnAsync,
  readFile,
  writeFile,
  prompt,
  pathExists,
  semver,
  fse,
  glob,
  ejs,
  DEFAULT_CLI_HOME,
  TEMPLATE_CACHE_DIR,
  DEPENDENCIES_CACHE_DIR,
};
