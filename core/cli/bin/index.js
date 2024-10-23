#! /usr/bin/env node

// 第三方库
const importLocal = require("import-local"); // 优先使用本地模块，避免和全局模块产生冲突
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格

if (importLocal(__filename)) {
  log.info("正在使用 cjp-cli-dev 本地版本");
} else {
  require("../lib")(process.argv.slice(2));
}
