#! /usr/bin/env node

// 第三方库
const importLocal = require("import-local"); // 优先使用本地模块，避免和全局模块产生冲突
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格

// 如果执行命令所在项目的node_modules中安装了cjp-cli-dev脚手架，则importLocal(__filename)返回true
if (importLocal(__filename)) {
  log.info("当前项目中已安装 cjp-cli-dev 脚手架，正在使用本地版本");
} else {
  // process.argv.slice(2)表示获取命令第二个参数后面的所有参数
  // 如：cjp-cli-dev publish --buildCmd "npm run build" => ["--build", "npm run build"]
  require("../lib")(process.argv.slice(2));
}
