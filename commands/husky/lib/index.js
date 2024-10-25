"use strict";

// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const { fse, spawnAsync, prompt, CLI_NAME } = require("@cjp-cli-dev/utils"); // 工具方法

const GIT_ROOT_DIR = ".git"; // git根目录
const HUSKY_ROOT_DIR = ".husky"; // git根目录
const COMMAND_NAME = "husky"; // 命令名称
const CWD = process.cwd(); // 当前项目目录

const ADD_HOOK_MODE_8 = "npx";
const ADD_HOOK_MODE_LATEST = "echo";

// 不同版本的策略
const huskyVersionStrategy = {
  // 8.x版本
  "husky@8.0.3": {
    initCmd: "npx husky install", // 初始化命令
    prepare: "husky install", // package.json scripts prepare
    addHookMode: "npx", // 添加hook的方式（不同版本有差异）
  },
  // 新版
  "husky@latest": {
    initCmd: "npx husky init", // 初始化命令
    prepare: "husky init", // package.json scripts prepare
    addHookMode: "echo", // 添加hook的方式（不同版本有差异）
  },
};

/**
 * 实现install、add、set参数，支持快速安装husky，添加、设置hooks
 * 1. 检查当前项目是否为node项目
 * 2. 检查当前目录是否为git仓库，如果是则继续，如果不是则执行git init命令初始化
 * 3. 检查当前项目是否安装husky
 * 4. 生成husky版本选项（暂时支持8和最新版本）
 * 5. 安装对应版本到当前项目，修改package.json scripts，生成默认hook脚本
 * 6. 安装完成，提示用法和帮助文档
 */
class HuskyCommand extends Command {
  init() {
    this.options = this._args[0] || {};
    this.commandOptions = this._args[1].options || [];
    this.projectInfo = null;
    this.hasHusky = null;
    this.huskyVersion = null;
    // debug模式下输出以下变量
    log.verbose("options", this.options);
    log.verbose("commandOptions", this.commandOptions);
  }
  async exec() {
    try {
      // 准备工作
      await this.prepare();
      // 检查当前项目是否为git仓库
      await this.checkIsGitRepo();
      // 检查当前项目中是否安装husky
      await this.checkHusky();

      // 命令选项策略
      const optionStrategy = {
        // --install
        install: async () => {
          // 获取安装版本
          const huskyVersion = await this.getHuskyVersion();
          this.huskyVersion = huskyVersion;
          // 安装husky
          await this.installPackage();
        },
        // --add
        add: async () => {},
        // --set
        set: async () => {},
      };

      // 遍历options，找到为true且在命令选项策略中的方法进行调用
      Object.keys(this.options).forEach(async (key) => {
        if (this.options[key] && optionStrategy[key]) {
          await optionStrategy[key]();
        }
      });
    } catch (err) {
      log.error(err.message);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  async installPackage() {
    log.info("开始安装husky");
    log.verbose("hasHusky", this.hasHusky);

    const installSetup = async () => {
      // 4. 执行安装命令
      await this.execInstallPackages();
      // 4.1 生成.release-it.json配置
      await this.createHuskyConfig();
      // 4.2 修改scripts，添加配置
      await this.modifyPackageScripts();
      // 4.4 默认添加pre-commit和commit-msg两个hook，为脚手架commitlint命令做铺垫
      await this.addDefaultHooks();
    };

    // 包存在则认为已安装相关包
    if (this.hasHusky) {
      const reinstall = await this.getConfirmReinstall();
      if (reinstall) {
        await installSetup();
      } else {
        log.notice("已取消安装husky");
      }
    } else {
      await installSetup();
    }

    log.success(
      `husky安装完成\n\n功能说明：创建Git Hook脚本，可以用来执行一些自动化功能，如：代码风格检查、单元测试、校验提交格式等\n\n您可以通过以下方式进行使用：\n\n方式一：通过脚手架命令运行\n\n${CLI_NAME} ${COMMAND_NAME} --add（示例：1.0.0 => 1.0.1）\n${CLI_NAME} ${COMMAND_NAME} --minor（示例：1.0.0 => 1.1.0）\n${CLI_NAME} ${COMMAND_NAME} --major（示例：1.0.0 => 2.0.0）\n\n方式二：通过npm运行\n\nnpm run release:patch（示例：1.0.0 => 1.0.1）\nnpm run release:minor（示例：1.0.0 => 1.1.0）\nnpm run release:major（示例：1.0.0 => 2.0.0）\n\n查阅官方帮助文档：https://github.com/release-it/release-it`
    );
  }

  // 执行安装包程序
  async execInstallPackages() {
    if (!this.huskyVersion) {
      throw new Error("husky安装版本不能为空");
    }
    log.info(`执行 npm install -D 安装依赖`);
    log.verbose("安装命令", `npm install -D ${this.huskyVersion}`);

    const result = await spawnAsync(
      "npm",
      ["install", "-D", this.huskyVersion],
      {
        stdio: "inherit",
        cwd: CWD,
      }
    );

    if (result === 0) {
      log.success("安装husky依赖成功");
    }
  }

  // 创建husky配置
  async createHuskyConfig() {
    log.info("开始初始化husky");

    // 执行匹配的初始化策略，没匹配到默认用最新方式
    const cmd = huskyVersionStrategy[this.huskyVersion]
      ? huskyVersionStrategy[this.huskyVersion].initCmd.split(" ")
      : huskyVersionStrategy["husky@latest"].initCmd.split(" ");

    const firstCmd = cmd[0];
    const cmdArgs = cmd.slice(1);

    log.verbose("执行初始化命令", `${firstCmd} ${cmdArgs.join(" ")}`);
    await spawnAsync(firstCmd, cmdArgs, {
      stdio: "inherit",
      cwd: CWD,
    });

    log.success("初始化husky成功");
  }

  // 修改package.json脚本配置
  async modifyPackageScripts() {
    log.info("开始为当前项目package.json添加husky相关scripts配置");

    // 获取更新后的package.json
    const pkgPath = path.join(CWD, "package.json");
    // 拿到package.json并返回json
    const projectInfo = fse.readJsonSync(pkgPath);
    // 更新项目缓存信息
    this.projectInfo = projectInfo;

    let { scripts } = this.projectInfo;

    // 当前package.json中没有script属性
    if (!scripts) {
      scripts = {};
    }

    // 执行匹配的初始化策略，没匹配到默认用最新方式
    const prepare = huskyVersionStrategy[this.huskyVersion]
      ? huskyVersionStrategy[this.huskyVersion].prepare
      : huskyVersionStrategy["husky@latest"].prepare;

    // 检查prepare是否存在，存在则在当前prepare基础上再拼一个新的husky命令
    if (scripts.prepare) {
      // 检查prepare中是否已经设置husky初始化命令，进行替换
      const prepareArr = scripts.prepare.split("&&"); // 先切分成数组，替换对应项再还原
      const huskyInitIndex = prepareArr.findIndex((item) =>
        item.trim().startsWith("husky")
      );
      if (huskyInitIndex !== -1) {
        // 美化格式，不在开头位置默认添加前后空格
        const beautifulPrepare =
          huskyInitIndex !== 0 ? ` ${prepare} ` : prepare;
        prepareArr[huskyInitIndex] = beautifulPrepare;
        scripts.prepare = prepareArr.join("&&");
      } else {
        scripts.prepare = scripts.prepare + "&& " + prepare;
      }
    } else {
      // 添加husky相关命令
      scripts = {
        ...scripts,
        prepare, // install pkg时自动触发husky初始化
      };
    }

    // 为当前项目添加script配置
    this.projectInfo.scripts = scripts;
    log.verbose("projectInfo", this.projectInfo);
    // 写入配置
    const targetFile = path.resolve(CWD, "package.json");
    fse.writeFileSync(targetFile, JSON.stringify(this.projectInfo, null, 2));
    log.success("添加husky prepare scripts成功");
  }

  // 添加默认hook - 为脚手架commitlint命令做铺垫
  async addDefaultHooks() {
    // 添加pre-commit hook
    // 添加commit-msg hook
    const defaultHooks = ["pre-commit", "commit-msg"];
    log.info("开始生成默认Git Hook脚本", defaultHooks);

    // 匹配不同版本生成规则，匹配不上用最新
    const addHookMode = huskyVersionStrategy[this.huskyVersion]
      ? huskyVersionStrategy[this.huskyVersion].addHookMode
      : huskyVersionStrategy["husky@latest"].addHookMode;

    const execSpawn = async (firstCmd, cmdOpts, spawnOptions = {}) => {
      await spawnAsync(firstCmd, cmdOpts, {
        stdio: "inherit",
        cwd: CWD,
        ...spawnOptions,
      });
    };

    // 清空文件
    const preCommitFile = path.resolve(HUSKY_ROOT_DIR, "pre-commit");
    const commitMsgFile = path.resolve(HUSKY_ROOT_DIR, "commit-msg");
    fs.existsSync(preCommitFile) && fs.unlinkSync(preCommitFile);
    fs.existsSync(commitMsgFile) && fs.unlinkSync(commitMsgFile);

    if (addHookMode === ADD_HOOK_MODE_8) {
      const defaultPreCommit = "npx lint-staged";
      // 执行npx husky add .husky/pre-commit "npx lint-staged"
      await execSpawn(ADD_HOOK_MODE_8, [
        "husky",
        "add",
        ".husky/pre-commit",
        defaultPreCommit,
      ]);

      const defaultCommitMsg = "npx --no-install commitlint --edit ${1}";
      // 执行npx husky add .husky/commit-msg "npx --no-install commitlint --edit \$\{1\}"
      await execSpawn(ADD_HOOK_MODE_8, [
        "husky",
        "add",
        ".husky/commit-msg",
        defaultCommitMsg,
      ]);
    }

    if (addHookMode === ADD_HOOK_MODE_LATEST) {
      const defaultPreCommit = "npx lint-staged";
      // 执行echo "npx lint-staged" > .husky/pre-commit
      await execSpawn(
        ADD_HOOK_MODE_LATEST,
        [defaultPreCommit, ">", ".husky/pre-commit"],
        {
          shell: true, // shell模式才能兼容该输出命令
        }
      );

      const defaultCommitMsg = "npx --no-install commitlint --edit ${1}";
      // 执行echo "npx --no-install commitlint --edit \$\{1\}" > .husky/commit-msg
      await execSpawn(
        ADD_HOOK_MODE_LATEST,
        [defaultCommitMsg, ">", ".husky/commit-msg"],
        {
          shell: true, // shell模式才能兼容该输出命令
        }
      );
    }

    log.success(`生成默认Git Hook：${defaultHooks} 脚本成功`);
  }

  async prepare() {
    // 检查必传参数
    await this.checkRequiredKeys();

    // 1. 确认项目是否为npm项目
    const projectPath = CWD;
    const pkgPath = path.join(projectPath, "package.json");
    log.verbose("package.json路径", pkgPath);
    if (!fs.existsSync(pkgPath)) {
      throw new Error("package.json不存在！这不是一个标准的node项目");
    }

    // 2. 拿到package.json并返回json
    const projectInfo = fse.readJsonSync(pkgPath);

    log.verbose("projectInfo", projectInfo);
    this.projectInfo = projectInfo;
    return projectInfo;
  }

  // 检查必传参数
  async checkRequiredKeys() {
    const requireKeys = ["install", "add", "set"];

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
    const commandOptions = this.commandOptions.map((item) => ({
      flag: item.flags,
      description: item.description,
    }));

    if (!checkKeys(requireKeys, this.options)) {
      log.warn(
        `请指定参数确认您想清除的内容，支持以下参数：\n\n${commandOptions
          .map((option) => `['${option.flag}'：${option.description}]`)
          .join(
            "\n"
          )}\n\n您可以输入 ${CLI_NAME} ${COMMAND_NAME} -h 查看使用帮助`
      );
      process.exit(1);
    }
  }

  async getConfirmReinstall() {
    const { reinstall } = await prompt({
      type: "confirm",
      name: "reinstall",
      message: "当前项目已安装husky，是否需要重新安装？",
      default: false,
    });

    return reinstall;
  }

  // 询问要安装的版本
  async getHuskyVersion() {
    const { huskyVersion } = await prompt({
      type: "list",
      name: "huskyVersion",
      message: "您希望安装什么版本的husky？",
      default: "",
      choices: [
        {
          name: "8.x版本（node <= 16版本推荐）",
          value: "husky@8.0.3",
        },
        {
          name: "最新版（node >= 18版本推荐）",
          value: "husky@latest",
        },
      ],
    });

    return huskyVersion;
  }

  // 检查是否已安装husky
  async checkHusky() {
    log.info(`检查 ${HUSKY_ROOT_DIR} 目录是否存在`);
    const huskyPath = path.resolve(CWD, HUSKY_ROOT_DIR);
    if (fs.existsSync(huskyPath)) {
      log.success("当前项目中已安装husky");
      this.hasHusky = true;
      return true;
    } else {
      log.success("当前项目中未安装husky");
      this.hasHusky = false;
      return false;
    }
  }

  // 检查是不是一个git仓库
  async checkIsGitRepo() {
    log.info(`检查 ${GIT_ROOT_DIR} 目录是否存在`);
    const gitPath = path.resolve(CWD, GIT_ROOT_DIR);
    if (!fs.existsSync(gitPath)) {
      log.warn(`检测到 ${GIT_ROOT_DIR} 目录不存在，当前项目不是一个git仓库`);

      await this.initGitRepo();
    } else {
      log.success(`检测到 ${GIT_ROOT_DIR} 目录存在，当前项目是一个git仓库`);
    }
  }

  async initGitRepo() {
    log.info("自动执行 git init 命令初始化为git仓库");
    await spawnAsync("git", ["init"], {
      stdio: "inherit",
      cwd: CWD,
    });
    log.success(
      "git init初始化成功，稍后您可以执行 git remote add origin 手动关联远程仓库"
    );
  }
}

function init(args) {
  return new HuskyCommand(args);
}

module.exports = init;
module.exports.HuskyCommand = HuskyCommand;
