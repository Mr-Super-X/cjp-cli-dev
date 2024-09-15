// 白名单命令，不在此白名单中的命令都需要确认是否执行，防止用户插入风险操作，如：rm -rf等
const COMMAND_WHITELIST = [
  "npm", // Node.js的包管理工具
  "cnpm", // npm的中国镜像加速版
  "yarn", // 另一个流行的JavaScript包管理工具
  "pnpm", // 性能更优的npm替代品
  "node", // Node.js运行环境
];

module.exports = COMMAND_WHITELIST;
