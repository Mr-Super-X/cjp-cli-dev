"use strict";

// 内置库
const os = require("os"); // 用于获取系统信息
const path = require("path"); // 用于获取路径
const { exec } = require("child_process");
// 第三方库
const semver = require("semver"); // 用于比对各种版本号
const colors = require("colors/safe"); // 用于给log信息添加颜色
const dotenv = require("dotenv"); // 用于将环境变量从 .env 文件加载到 process.env 中
const commander = require("commander"); // 用于解析输入命令和参数
const minimist = require("minimist"); // 用于解析输入参数
const pathExists = require("path-exists").sync; // 用于检查路径是否存在
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格
const init = require("@cjp-cli-dev/init"); // 用于初始化项目
const { getNpmSemverVersion } = require("@cjp-cli-dev/get-npm-info"); // 用于获取npm包信息
const pkg = require("../package.json");
const constant = require("./const");

// 全局变量
const homedir = os.homedir(); // 用户主目录
const program = new commander.Command();

module.exports = core;

async function core() {
  try {
    // 1. 检查包版本
    checkPkgVersion();
    // 2. 检查node版本
    checkNodeVersion();
    // 3. 检查root用户，如果是root用户则尝试切换为普通用户，解决因权限提示带来的各种问题
    checkRoot();
    // 4. 检查用户主目录
    checkUserHome();
    // 5. 检查输入参数
    // checkInputArgs();
    // 6. 检查环境变量
    checkEnv();
    // 7. 检查是否有全局更新
    await checkGlobalUpdate();
    // 8. 注册commander命令
    registerCommander();
    // log.verbose('debug', '测试debug')
  } catch (e) {
    log.error(e.message);
  }
}

// commander文档：https://www.npmjs.com/package/commander
function registerCommander() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false);

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(init);

  // 高级功能：监听debug事件，开启debug模式
  program.on("option:debug", function () {
    // 获取所有的参数
    const options = program.opts();
    if (options.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 高级功能：对未知命令进行监听
  program.on("command:*", function (cmdObj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    log.error(colors.red("未知命令：" + cmdObj[0]));
    if (availableCommands.length > 0) {
      log.error(
        colors.red("请使用以下可用命令：\n" + availableCommands.join("\n"))
      );
    }
  });

  // 解析输出参数
  program.parse(process.argv);

  // 没有输入参数的时候输出帮助文档（注意：需要parse之后调用，否则program.args拿不到输入内容）
  // if (program.args && program.args.length < 1) {
  //   program.outputHelp();
  //   // 美化，输出一行空格
  //   console.log();
  // }
}

async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用npm API，获取所有版本号（过程封装在@cjp-cli-dev/get-npm-info中）
  // 3. 找到最新的版本号，并与当前版本号进行对比
  // 4. 如果有新版本，则提示用户更新
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      "更新提示",
      colors.yellow(
        `检测到npm包 ${npmName} 有新版本，当前安装版本为：${lastVersion}，最新版本为：${lastVersion}，请在终端手动输入 npm install ${npmName} -g 命令进行更新`
      )
    );
  }
}

function checkEnv() {
  const dotenvPath = path.resolve(homedir, ".env");
  if (pathExists(dotenvPath)) {
    const config = dotenv.config({
      path: dotenvPath,
    });
    log.verbose("当前环境变量：", config);
  }
}

function checkInputArgs() {
  // 只要第二个之后的参数，如：node xxx.js --debug，只拿--debug，返回值为一个对象
  const args = minimist(process.argv.slice(2));
  // 解析参数
  checkArgs(args);
}

// 解析参数，如果开启debug则输出调试信息，如：cjp-cli-dev --debug
function checkArgs(args) {
  if (args.debug) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  // 动态修改level，这一步必须要有，否则由于执行顺序问题，应该要将checkInputArgs()调用放在const log = require("@cjp-cli-dev/log")之前才会生效
  log.level = process.env.LOG_LEVEL;
}

function checkUserHome() {
  // 获取用户主目录
  const userHome = homedir;
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前系统用户主目录不存在！"));
  }
}

function checkRoot() {
  // 如果是root用户，会自动降级为普通用户
  const rootCheck = require("root-check");
  rootCheck();

  // 使用whoami命令获取当前用户
  // exec("whoami", (error, stdout, stderr) => {
  //   if (error) {
  //     log.error(`exec error: ${error}`);
  //     return;
  //   }
  //   if (stderr) {
  //     log.error(`stderr: ${stderr}`);
  //     return;
  //   }
  //   // 检查stdout是否包含'root'
  //   if (stdout.trim() === "root") {
  //     log.info("Running as root user.");
  //   } else {
  //     log.info(`Running as ${stdout.trim()} user.`);
  //   }
  // });
}

function checkNodeVersion() {
  // 1. 获取当前node版本号
  const currentVersion = process.version;
  // 2. 比对最低版本号
  const lowestVersion = constant.LOWEST_NODE_VERSION;

  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(
      colors.red(`cjp-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`)
    );
  }
}

function checkPkgVersion() {
  log.info("cli", pkg.version);
}
