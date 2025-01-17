"use strict";

const log = require("npmlog");

// 对level进行定制，npmlog默认level为info，值为2000，也就是说低于2000的level不会被执行，这里我们定义为环境变量，之后可以通过参数来控制
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

// 对heading进行定制，可以给输出信息加上前缀
log.heading = "cjp-cli-dev 脚手架";
log.headingStyle = { fg: "white", bg: "green" };

// 对log方法进行定制，如log.success('test', 'success...')
log.addLevel("success", 2000, { fg: "green", bg: "", bold: true }); // 自定义success日志
log.addLevel('notice', 2000, { fg: 'blue', bg: 'black' }) // 自定义notice日志

module.exports = log;
