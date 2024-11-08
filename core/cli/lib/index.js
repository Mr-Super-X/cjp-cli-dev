"use strict";

// 内置库
const os = require("os"); // 用于获取系统信息
const path = require("path"); // 用于获取路径
// 第三方库
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
  semver,
  colors,
  CLI_NAME,
  DEFAULT_CLI_HOME,
} = require("@cjp-cli-dev/utils"); // 工具方法
const pkg = require("../package.json"); // 脚手架package.json
const execClean = require("./execClean"); // 执行清除缓存命令

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
      "前端工程化统一研发脚手架，支持以下功能：\n\n1. init：快速创建各种项目或组件模板，包括默认项目模板创建、自定义项目模板创建、组件库模板创建、模板自动安装和启动。\n2. publish：一键发布项目或组件库，包括测试发布和正式发布、自动在代码托管平台创建仓库、Git Flow自动化、自动构建、自动发布。 支持项目云构建、云发布（采用Redis管理构建任务数据，发布完成自动清除Redis缓存）、静态资源上传OSS、自动Git Flow分支管理、自动同步代码、自动创建版本Tag。 \n3. add：支持快速添加组件代码片段模板、标准页面模板、自定义页面模板到本地项目。其中组件支持自动写入代码到指定位置，自动导入并注册局部组件等。\n4. rollback：支持快速回滚生产版本，支持回滚master分支到指定release tag，自动本地构建回滚版本。\n5. husky：支持快速为项目安装可用的Git Hooks配置工具，兼容稳定版和最新版。\n6. codelint：支持快速为项目安装统一代码规范和代码格式校验工具，支持仅校验暂存文件，包含eslint、prettier、lint-staged功能，优先使用prettier美化和格式化代码。\n7. commitlint：支持快速为项目安装统一提交信息规范校验工具，使用Angular提交规范，配套汉化版终端交互工具，终端调用命令选择规范提交类型和输入提交信息。\n8. release：支持快速自动升级项目版本，自动生成git变更记录文档。\n9. gitflow：支持快速为项目创建Git Flow分支模型，自动检查系统是否安装对应工具并返回帮助文档。\n10. delete-branch：支持快速删除本地和远端分支，可多选删除。\n11. clean：支持清除脚手架依赖缓存或全部缓存文件。\n12. resume：支持创建markdown简历，提供前端简历模板，支持导出one-light主题样式PDF。\n13. server：通过express启动本地页面预览服务，支持http请求代理，支持代理多个服务器。"
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
    .description("创建标准项目模板、自定义项目模板、组件库模板")
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
    .option("-bc, --buildCmd <buildCmd>", "指定自定义构建命令", "npm run build")
    .option("-prod, --production", "是否正式发布", false)
    .option("-cnd, --componentNoDb", "发布组件库信息不写入数据库", false)
    .option("-ncb, --noCloudBuild", "发布项目不开启云构建", false)
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
    .description("添加组件代码片段模板、页面标准模板、自定义页面模板")
    .option("-reg, --registry <registry>", "指定npm源地址", "")
    .action(exec);

  // 回滚版本
  program
    .command("rollback")
    .description("回滚生产版本代码")
    // 命令中间有空格需使用引号包裹
    .option("-bc, --buildCmd <buildCmd>", "指定自定义构建命令", "npm run build")
    .action(exec);

  // 项目Git Hooks脚本配置
  program
    .command("husky")
    .description("Git Hooks脚本配置工具")
    .option("-i, --install", "为当前项目安装husky功能", false)
    // option支持传递多个值，用...表示，接收的内容为数组格式
    .option("-a, --add <hook...>", "添加新的Git Hook脚本", [])
    .option("-s, --set <hook...>", "设置Git Hook脚本内容", [])
    .action(exec);

  // 代码规范校验工具
  program
    .command("codelint")
    .description("创建统一代码规范")
    .option("-i, --install", "为项目安装代码规范校验工具", false)
    .action(exec);

  // 提交规范校验工具
  program
    .command("commitlint")
    .description(
      "创建统一提交规范"
    )
    .option("-i, --install", "为项目安装Git提交信息Angular规范校验工具", false)
    .action(exec);

  // 升级版本&自动生成CHANGELOG.md
  program
    .command("release")
    .description("自动升级项目版本、自动生成Git版本变更记录文档")
    .option("-i, --install", "为当前项目安装release-it功能", false)
    .option("-pa, --patch", "自动升级patch版本，示例：1.0.0 => 1.0.1", false)
    .option("-mi, --minor", "自动升级minor版本，示例：1.0.0 => 1.1.0", false)
    .option("-ma, --major", "自动升级major版本，示例：1.0.0 => 2.0.0", false)
    .action(exec);

  // 初始化Git Flow分支模型
  program
    .command("gitflow")
    .description("初始化Git Flow分支模型")
    .option("-i, --install", "为当前项目初始化Git Flow分支模型", false)
    .option("-f, --force", "是否强制初始化分支模型", false)
    .action(exec);

  // 快速删除本地和远程分支
  program
    .command("delete-branch [branchName]")
    .description("删除本地和远程分支")
    .option("-f, --force", "是否强制删除分支", false)
    .option("-m, --multiple", "是否删除多个分支", false)
    .action(exec);

  // 创建简历
  program
    .command("resume")
    .description("创建markdown简历，支持转为PDF")
    .option("-i, --install", "下载markdown简历模板", false)
    .option("-e, --export", "将markdown简历转为PDF", false)
    .option("-rcp, --resetChromePath", "重置chrome浏览器安装路径缓存", false)
    .action(exec);

  // 静态资源预览服务
  program
    .command("server")
    .description("启动本地静态资源托管服务，支持配置http请求代理")
    .option("-p, --port <port>", "指定启动服务的端口", 3000)
    .action(exec);

  // 清除缓存
  program
    .command("clean")
    .description("清空脚手架缓存文件")
    .option("-a, --all", "清空全部缓存", false)
    .option("-d, --dep", "仅清空依赖缓存", false)
    .action((options, command) => {
      execClean(options, command);
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
            `\n\n您可以输入 [脚手架 具体命令 --help] 查看命令使用帮助，如：\n${CLI_NAME} -h\n${CLI_NAME} <command> --help`
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
        `检测到脚手架有新版本：${lastVersion}，请运行 npm install -g ${npmName} 命令进行更新`
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
