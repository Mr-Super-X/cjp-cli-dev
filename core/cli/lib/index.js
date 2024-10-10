"use strict";

// 内置库
const fs = require("fs"); // 用于文件操作
const os = require("os"); // 用于获取系统信息
const path = require("path"); // 用于获取路径
// 第三方库
const colors = require("colors/safe"); // 用于给log信息添加颜色
const dotenv = require("dotenv"); // 用于将环境变量从 .env 文件加载到 process.env 中
const commander = require("commander"); // 用于解析输入命令和参数
const rootCheck = require("root-check"); // 用于降级root用户，解决权限导致的问题
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格
const getCommandRandomFunnyQuote = require("@cjp-cli-dev/log/lib/commandFunnyQuote"); // 生成错误命令搞笑语录
const exec = require("@cjp-cli-dev/exec"); // 用于执行动态初始化命令
const { getNpmSemverVersion } = require("@cjp-cli-dev/get-npm-info"); // 用于获取npm包信息
const {
  pathExists,
  prompt,
  semver,
  fse,
  CLI_NAME,
  DEFAULT_CLI_HOME,
  DEPENDENCIES_CACHE_DIR,
} = require("@cjp-cli-dev/utils"); // 工具方法
const pkg = require("../package.json");

// 全局变量
const homedir = os.homedir(); // 用户主目录
const program = new commander.Command();

module.exports = cli;

async function cli() {
  try {
    // 进入cli准备阶段
    await prepare();
    // 注册commander命令
    registerCommander();
  } catch (e) {
    log.error(e);
    // debug模式下打印执行栈
    if (process.env.LOG_LEVEL === "verbose") {
      console.log(e);
    }
  }
}

/**
 * 注册命令
 * commander文档：https://www.npmjs.com/package/commander
 */
function registerCommander() {
  program
    // 程序名
    .name(Object.keys(pkg.bin)[0])
    // 提示这个工具怎么用
    .usage("<command> [options]")
    // 程序描述
    .description(
      "前端通用脚手架，支持以下功能：\n1.快速创建各种项目或组件模板，包括默认项目模板创建、自定义项目模板创建、组件库模板创建、模板自动安装和启动。\n2.发布项目或组件，包括测试发布和正式发布、自动在代码托管平台创建仓库、Git Flow自动化、自动构建、自动发布。 \n3.支持项目云构建、云发布（采用Redis管理构建任务数据，发布完成自动清除Redis缓存）、静态资源上传OSS、自动Git Flow分支管理、自动同步代码并创建版本Tag。 \n4.支持快速添加组件代码片段模板、页面标准模板、自定义页面模板到本地项目。其中组件支持自动写入代码到指定位置，自动导入并注册局部组件等。"
    )
    // 版本号
    .version(pkg.version)
    // option方法参数说明：1：参数简写和全写，后面加[]表示非必传，加<>表示必传，2：参数描述，3：默认值
    // 在program后调用option表示添加全局参数，在program.command后面调用option表示给当前命令添加参数
    // 支持debug模式
    .option("-dbg, --debug", "是否开启调试模式", false)
    // 支持指定本地调试文件路径
    .option("-tp, --targetPath <targetPath>", "指定本地调试文件路径", "");

  program
    .command("cjp")
    .description("输出作者信息")
    .action(() => {
      log.notice("欢迎使用", "cjp的前端工程脚手架工具");
      log.notice("作者介绍", "cjp@一名普通前端打工仔");
      log.notice("作者主页", "https://juejin.cn/user/237150241041912/posts");
      log.notice(
        "作者宣言",
        "世界上只有一种真正的英雄主义，那就是看清生活的真相后依然热爱生活。"
      );
    });

  // 初始化项目
  program
    .command("init [projectName]")
    .description("快速创建标准项目模板、自定义项目模板、组件库模板")
    .option("-reg, --registry <registry>", "指定npm源地址", "")
    .option("-f, --force", "是否强制初始化项目")
    .action(exec);

  // 发布项目
  program
    .command("publish")
    .description("项目云构建云发布、组件库自动构建并发布npm")
    .option("-rgs, --refreshGitServer", "更新Git托管平台", false)
    .option("-rgt, --refreshGitToken", "更新Git托管平台token", false)
    .option("-rgo, --refreshGitOwner", "更新Git仓库登录类型", false)
    // 命令中间有空格需使用引号包裹
    .option(
      "-bc, --buildCmd <buildCmd>",
      "指定自定义构建命令",
      "npm run build"
    )
    .option("-prod, --production", "是否正式发布", false)
    .option("-cnd, --componentNoDb", "发布组件信息不写入数据库", false)
    .option("-reg, --registry <registry>", "指定npm源地址", "")
    .option("-su, --sshUser <sshUser>", "指定模板服务器用户名", "")
    .option("-si, --sshIp <sshIp>", "指定模板服务器IP或域名", "")
    .option("-sp, --sshPath <sshPath>", "指定模板服务器上传路径", "")
    .action((...args) => {
      exec(...args); // 这种写法也可以
    });

  // 添加复用代码
  program
    .command("add [templateName]")
    .description("添加组件代码片段模板、页面标准模板、自定义页面模板到本地项目")
    .option("-reg, --registry <registry>", "指定npm源地址", "")
    .action(exec);

  // 清除缓存
  program
    .command("clean")
    .description("清空缓存文件")
    .option("-a, --all", "清空全部缓存", false)
    .option("-d, --dep", "仅清空依赖缓存", false)
    .action((options, command) => {
      const requireKeys = ["all", "dep"];

      // 检查是否没传参数
      function checkKeys(keys, obj) {
        let result = false;

        keys.forEach((key) => {
          if (obj[key] === true) {
            result = true;
          }
        });

        return result;
      }

      // 找出所需要的参数
      const commandOptions = command.options.map((item) => ({
        flag: item.flags,
        description: item.description,
      }));

      if (!checkKeys(requireKeys, options)) {
        log.warn(
          `请指定参数确认您想清除的内容，支持以下参数：\n\n${commandOptions
            .map((option) => `['${option.flag}'：${option.description}]`)
            .join(
              "\n"
            )}\n\n您可以输入 ${CLI_NAME} ${command.name()} -h 查看使用帮助`
        );
      }

      if (options.all) {
        cleanAll();
      } else if (options.dep) {
        cleanDep();
      }
    });

  // 高级功能：监听debug事件，开启debug模式
  program.on("option:debug", function () {
    // 获取所有的参数
    const options = program.opts();
    process.env.LOG_LEVEL = options.debug ? "verbose" : "info";
    log.level = process.env.LOG_LEVEL;
  });

  // 监听全局targetPath参数
  program.on("option:targetPath", function () {
    // 获取所有的参数
    const options = program.opts();
    // 更新环境变量
    process.env.CLI_TARGET_PATH = options.targetPath || "";
  });

  // 高级功能：对未知命令进行监听
  program.on("command:*", function (cmdObj) {
    const availableCommands = program.commands.map((cmd) => ({
      command: cmd.name(),
      description: cmd.description(),
    }));

    // 抽取一条搞笑语录
    log.error(colors.red(getCommandRandomFunnyQuote()));

    // 提醒可用命令
    if (availableCommands.length > 0) {
      log.error(
        colors.red(
          "请使用以下可用命令：\n\n" +
            availableCommands
              .map((item) => `[${item.command}: ${item.description}]`)
              .join("\n") +
            `\n\n您可以输入 [脚手架 具体命令 -h] 查看命令使用帮助，如：\n${CLI_NAME} -h\n${CLI_NAME} init --help`
        )
      );
    }
  });

  // 解析输出参数
  program.parse(process.argv);

  // 没有输入参数的时候输出帮助文档（注意：需要parse之后调用，否则program.args拿不到输入内容）
  if (program.args && program.args.length < 1) {
    program.outputHelp();
    // 美化，输出一行空格
    console.log();
  }
}

/**
 * cli准备阶段
 */
async function prepare() {
  // 1. 检查包版本
  checkCliVersion();
  // 2. 检查node版本（放到了models/command中）
  // checkNodeVersion();
  // 3. 检查root用户，如果是root用户则尝试切换为普通用户，解决因权限带来的各种问题
  checkRoot();
  // 4. 检查用户主目录
  checkUserHome();
  // 5. 检查输入参数
  // 6. 检查环境变量
  checkEnv();
  // 7. 检查脚手架最新版本
  await checkGlobalUpdate();
}

async function checkGlobalUpdate() {
  // log.verbose(`检查 ${CLI_NAME} 最新版本`);
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用npm API，获取所有版本号（过程封装在@cjp-cli-dev/get-npm-info中）
  // 3. 找到最新的版本号，并与当前版本号进行对比
  // 4. 如果有新版本，则提示用户更新
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  // log.verbose("最新版本为", lastVersion);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      "更新提示",
      colors.yellow(
        `检测到npm包 ${npmName} 有新版本，当前安装版本为：${lastVersion}，最新版本为：${lastVersion}，请在终端手动输入 npm install ${npmName} -g 命令进行更新`
      )
    );
  }
}

// 检查用户主目录下的.env文件
function checkEnv() {
  // log.verbose("检查用户主目录下的.env文件");
  const dotenvPath = path.resolve(homedir, ".env");
  let config;
  // 确保目录存在，不存在自动创建
  if (pathExists(dotenvPath)) {
    // 注册用户主目录下的.env文件中的变量到process.env中
    config = dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
  // 兼容输出，防止当前用户目录下没有.env文件导致parsed属性为undefined
  // log.verbose("dotenv注入环境变量成功", config.parsed || config);
}

function createDefaultConfig() {
  // log.verbose("创建 cli 默认环境变量配置");
  const cliConfig = {
    home: homedir,
  };
  // process.env.CLI_HOME读的是用户主目录下的.env文件
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(homedir, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(homedir, DEFAULT_CLI_HOME);
  }

  // 将cli主目录挂在到环境变量上
  process.env.CLI_HOME_PATH = cliConfig.cliHome;

  // log.verbose("process.env.CLI_HOME_PATH", process.env.CLI_HOME_PATH);

  return cliConfig;
}

function checkUserHome() {
  // log.verbose("检查用户主目录");
  // 获取用户主目录
  const userHome = homedir;
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前系统用户主目录不存在！"));
  }
}

function checkRoot() {
  // log.verbose("检查是否root用户，如果是将尝试自动降级为普通用户，减少潜在安全风险");
  // root-check的主要作用是尝试使用root特权来降级进程的权限，并在失败时阻止访问。
  // 这通常用于安全敏感的操作，以确保这些操作不会以过高的权限运行，从而减少潜在的安全风险
  rootCheck();
}

function checkCliVersion() {
  log.info("cli版本", pkg.version);
}

async function getConfirmClean(msg) {
  // 二次确认
  const { confirmClean } = await prompt({
    type: "confirm",
    name: "confirmClean",
    default: false,
    message: msg,
  });

  return confirmClean;
}

// 清空所有缓存
async function cleanAll() {
  if (!fs.existsSync(process.env.CLI_HOME_PATH)) {
    log.warn("缓存路径不存在", process.env.CLI_HOME_PATH);
    return;
  }

  const confirmClean = await getConfirmClean(
    "确认要清除所有缓存吗？（注意：此操作将删除所有缓存数据）"
  );

  // 用户选择不确认，中断执行
  if (!confirmClean) return;
  log.info("开始清除所有缓存");
  fse.emptyDirSync(process.env.CLI_HOME_PATH);
  log.success("清除所有缓存成功", process.env.CLI_HOME_PATH);
}

// 清空依赖文件
async function cleanDep() {
  const depPath = path.resolve(
    process.env.CLI_HOME_PATH,
    DEPENDENCIES_CACHE_DIR
  );
  if (!fs.existsSync(depPath)) {
    log.success("依赖缓存路径不存在", depPath);
    return;
  }
  const confirmClean = await getConfirmClean(
    "确认要清除依赖缓存吗？（注意：此操作将删除所有依赖缓存数据）"
  );

  // 用户选择不确认，中断执行
  if (!confirmClean) return;
  log.info("开始清除依赖缓存文件");
  fse.emptyDirSync(depPath);
  log.success("清除依赖缓存文件成功", depPath);
}
