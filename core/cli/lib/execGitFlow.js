// 第三方库
const simpleGit = require("simple-git"); // 用于在node程序中运行git
// 内置库
const os = require("os");
const fs = require("fs");
const path = require("path");
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格
const {
  prompt,
  spawnAsync,
  isCommandAvailable,
  CLI_NAME,
} = require("@cjp-cli-dev/utils"); // 工具方法

const GIT_ROOT_DIR = ".git"; // git根目录
const CWD = process.cwd(); // 当前项目目录
const git = simpleGit(CWD);

/**
 * 初始化git flow分支模型命令
 * 1. 检查用户是否已安装git-flow（windows安装git自带，macOS返回安装链接），提示并等待用户安装完成按回车继续
 * 2. 检查当前目录是否为git仓库，如果是则继续，如果不是则执行git init命令初始化
 * 3. 判断force不存在，检查是否已经初始化过git flow，如果是则终止执行，否则继续
 * 4. 用户选择使用默认git flow分支模型还是自定义分支模型
 * 4.1. 选择默认，执行git flow init -d初始化默认分支模型（master/develop/release/feature/hotfix/bugfix/support...）
 * 4.2. 选择自定义，执行git flow init让用户输入自定义分支模型
 * 4.3. 完成git flow分支模型初始化
 * @param {*} options command参数
 * @param {*} command command实例
 */
module.exports = async function (options, command) {
  // 获取参数
  const { force } = options;
  log.verbose("force", force);

  // 1. 检查是否安装git-flow工具
  await checkGitFlowTool();
  // 2. 检查是否为git仓库
  await checkIsGitRepo();
  // 3. 检查是否已初始化过git flow
  await checkGitFlowIsInit(force);
  // 4. 初始化git flow分支模型
  await initGitFlow(force);
};

// 检查是不是一个git仓库
async function checkIsGitRepo() {
  log.info(`检查 ${GIT_ROOT_DIR} 目录是否存在`);
  const gitPath = path.resolve(CWD, GIT_ROOT_DIR);
  if (!fs.existsSync(gitPath)) {
    log.warn(`检测到 ${GIT_ROOT_DIR} 目录不存在，当前项目不是一个git仓库`);

    await initGitRepo();
  } else {
    log.success(`检测到 ${GIT_ROOT_DIR} 目录存在，当前项目是一个git仓库`);
  }
}

async function initGitRepo() {
  log.info("自动执行 git init 命令初始化为git仓库");
  await git.init(CWD);
  log.success(
    "git init初始化成功，稍后您可以执行 git remote add origin 手动关联远程仓库"
  );
}

// 检查是否已初始化过git flow
async function checkGitFlowIsInit(force) {
  log.info("检查是否已初始化 git flow 分支模型");
  // force不存在则检查，否则跳过
  if (!force) {
    const result = await spawnAsync("git", ["flow", "config", "list"]);

    if (result === 0) {
      log.warn(`当前项目已经初始化过 git flow 分支模型，如您需要强制重新初始化，请指定--force参数\n\n示例：${CLI_NAME} init-git-flow --force`);
      process.exit(0);
    } else {
      log.success("检查通过，当前项目未初始化 git flow分支模型");
    }
  } else {
    log.notice("您已指定 force 参数，即将强制初始化");
  }
}

// 检查是否安装git-flow工具
async function checkGitFlowTool() {
  log.info("检查是否安装 git-flow 工具");
  const platform = os.platform();
  log.verbose("platform", platform);

  const result = await isCommandAvailable("git-flow").catch((e) => {});

  // 平台策略
  const strategy = {
    // window系统
    win32: () => {
      // 一般安装git自带git-flow工具，如果没有则提示用户安装
      log.notice(
        "您需要先安装 git-flow 工具，请前往以下链接找到对应系统的安装方法并执行 \nhttps://github.com/nvie/gitflow/wiki/Installation"
      );
      process.exit(0);
    },
    // macOS系统
    darwin: () => {
      log.notice(
        `您需要先安装 git-flow 工具，可通过以下方式安装：\n\n1.安装Homebrew（如果你还没有安装）：\n/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"\n\n2.使用Homebrew安装git-flow：\nbrew install git-flow\n\n帮助文档链接：https://github.com/nvie/gitflow/wiki/Installation\n`
      );
      process.exit(0);
    },
  };

  if (!result) {
    if (strategy[platform]) {
      strategy[platform]();
    } else {
      log.error("当前操作系统暂不支持");
      process.exit(0);
    }
  } else {
    log.success("检查通过，您已安装 git-flow 工具");
  }
}

// 初始化git flow分支模型
async function initGitFlow(force) {
  log.info(
    `git flow初始化模式说明：\n\n默认git flow分支模型：\n1.当前git仓库没有创建分支，将使用默认 [master/develop/release/feature/hotfix/bugfix/support...] 模型，会自动创建master和develop分支，并设置其它分支前缀\n2.当前git仓库已创建分支如main、dev分支，会自动将main作为生产分支，dev作为开发分支，并设置其它分支默认前缀\n\n自定义git flow分支模型：\n1.当前仓库没有创建分支，会提示输入各个分支自定义名称\n2.当前仓库已创建分支如main、dev分支，则在输入生产分支时仅可输入main，输入开发分支时仅可输入dev，其它分支无限制\n\n`
  );
  const mode = await getGitFlowMode();

  const strategy = {
    default: async () => {
      // 执行git flow init -d初始化默认分支模型
      return initDefaultGitFlow(force);
    },
    custom: async () => {
      // 执行git flow init让用户输入自定义分支模型
      return initCustomGitFlow(force);
    },
  };

  // 执行git flow init
  strategy[mode] && (await strategy[mode]());

  // 等待完成后输出
  log.success(
    "git flow 分支模型初始化完成，您可查看官方教程获取更多使用帮助：https://github.com/nvie/gitflow"
  );
}

// 默认初始化
async function initDefaultGitFlow(force) {
  log.info("开始初始化默认 git flow分支模型");
  const forceOption = force ? "-f" : "";
  log.verbose("init命令", `git flow init -d ${forceOption}`);
  const result = await spawnAsync("git", ["flow", "init", "-d", forceOption], {
    stdio: "inherit",
    cwd: CWD,
  });
  if (result === 0) {
    log.success("默认 git flow分支模型 初始化成功");
  }
}

// 自定义初始化
async function initCustomGitFlow(force) {
  log.info("开始初始化自定义 git flow分支模型");
  const forceOption = force ? "-f" : "";
  log.verbose("init命令", `git flow init -d ${forceOption}`);
  const result = await spawnAsync("git", ["flow", "init", forceOption], {
    stdio: "inherit",
    cwd: CWD,
  });
  if (result === 0) {
    log.success("自定义 git flow分支模型 初始化成功");
  }
}

async function getGitFlowMode() {
  // 获取git flow分支模型
  const { mode } = await prompt([
    {
      type: "list",
      name: "mode",
      message: "请选择git flow分支模型创建方式",
      default: "default", // 默认使用默认分支模型
      choices: [
        {
          name: "默认分支模型（master/develop/release/feature/hotfix/bugfix/support...）",
          value: "default",
        },
        {
          name: "自定义分支模型（稍后需要您输入自定义分支名称）",
          value: "custom",
        },
      ],
    },
  ]);

  return mode;
}
