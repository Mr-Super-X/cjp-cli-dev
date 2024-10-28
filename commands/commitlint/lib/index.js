"use strict";

// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const {
  semver,
  fse,
  spawnAsync,
  prompt,
  isBoolean,
  CLI_NAME,
} = require("@cjp-cli-dev/utils"); // 工具方法

const COMMAND_NAME = "commitlint"; // 命令名称
const CWD = process.cwd(); // 当前进程执行所在目录

const VERSION_STABLE = "stable"; // 稳定版（node <= 16版本推荐）
const VERSION_LATEST = "latest"; // 最新版（node >= 18版本推荐）

class CommitlintCommand extends Command {
  init() {
    this.options = this._args[0] || {};
    this.commandOptions = this._args[1].options || [];
    this.projectInfo = null;
    this.hasCommitlint = null;
    this.commitlintPackages = null;
    // debug模式下输出以下变量
    log.verbose("options", this.options);
    log.verbose("commandOptions", this.commandOptions);
  }
  async exec() {
    try {
      // 准备工作
      await this.prepare();
      // 检查当前项目中是否安装commitlint
      await this.checkCommitlint();

      // 命令选项策略
      const optionStrategy = {
        // --install
        install: async () => {
          // 检查node版本，获取对应版本可用package信息
          await this.checkCurrentNodeVersion();
          // 安装相关包
          await this.installPackage();
        },
        uninstall: async () => {
          // TODO 后续增加卸载功能
        },
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
    log.info("开始安装commitlint功能相关依赖");
    log.verbose("hasCommitlint", this.hasCommitlint);

    const installSetup = async () => {
      // 3. 执行安装命令
      await this.execInstallPackages();
      // 3.1 生成commitlint、汉化commitizen配置
      await this.createCommitlintConfig();
      // 3.2 修改scripts，添加配置
      await this.modifyPackageScripts();
    };

    // 包存在则认为已安装相关包
    if (this.hasCommitlint) {
      const reinstall = await this.getConfirmReinstall();
      if (reinstall) {
        await installSetup();
      } else {
        log.notice("已取消安装commitlint功能");
      }
    } else {
      await installSetup();
    }

    log.success(
      `commitlint功能安装完成\n\n功能说明：对提交信息进行Angular规范限制，同时提供了汉化版的终端cz交互工具，可通过命令快捷选择提交类型和输入提交信息\n\n您可以通过以下方式进行使用：\n\nnpm run commit（快捷暂存代码）\nnpm run push（快捷推送代码）\n\n查阅官方帮助文档：https://github.com/commitizen/cz-cli`
    );
  }

  // 修改package.json脚本配置
  async modifyPackageScripts() {
    log.info("开始为当前项目package.json添加汉化commitizen相关scripts配置");

    let { scripts, config } = this.projectInfo;

    // 当前package.json中没有script属性
    if (!scripts) {
      scripts = {};
    }

    // 当前package.json中没有config属性
    if (!config) {
      config = {};
    }

    // 添加commitizen相关命令
    scripts = {
      ...scripts,
      commit: "git add . && cz", // 快捷命令 - 暂存
      push: "git add . && cz && git push", // 快捷命令 - 推送
    };

    // 为当前项目添加汉化commitizen配置
    config = {
      ...config,
      commitizen: {
        path: "./node_modules/cz-customizable",
      },
      "cz-customizable": {
        config: "./.cz-config.js",
      },
    };

    // 为当前项目添加配置
    this.projectInfo.scripts = scripts;
    this.projectInfo.config = config;
    log.verbose("projectInfo", this.projectInfo);
    // 写入配置
    const targetFile = path.resolve(CWD, "package.json");
    fse.writeFileSync(targetFile, JSON.stringify(this.projectInfo, null, 2));
    log.success("添加汉化commitizen配置成功");
  }

  // 生成工具配置
  async createCommitlintConfig() {
    log.info("开始生成commitlint、汉化commitizen工具配置");
    // 从命令所在路径中获取配置模板
    const commitlintTemplateFile = path.join(
      __dirname,
      "template",
      ".commitlintrc.js"
    );
    const commitizenTemplateFile = path.join(
      __dirname,
      "template",
      ".cz-config.js"
    );
    // 目标文件
    const commitlintTargetFile = path.resolve(CWD, ".commitlintrc.js");
    const commitizenTargetFile = path.resolve(CWD, ".cz-config.js");

    log.verbose("commitlintTargetFile", commitlintTargetFile);
    log.verbose("commitizenTemplateFile", commitizenTemplateFile);
    log.verbose("commitlintTargetFile", commitlintTargetFile);
    log.verbose("commitizenTargetFile", commitizenTargetFile);

    // 拷贝模板文件到当前项目中
    fse.copyFileSync(commitlintTemplateFile, commitlintTargetFile);
    fse.copyFileSync(commitizenTemplateFile, commitizenTargetFile);
    log.success("生成commitlint配置成功", "=> .commitlintrc.js");
    log.success("生成汉化commitizen工具配置成功", "=> .cz-config.js");
  }

  // 执行安装包程序
  async execInstallPackages() {
    if (!this.commitlintPackages) {
      throw new Error("commitlint功能相关依赖和版本不能为空");
    }
    log.info(`执行 npm install -D 安装依赖`);
    log.verbose("安装命令", `npm install -D ${this.commitlintPackages}`);
    const cmdOptions = this.commitlintPackages.split(" "); // 通过空格切分数组作为命令参数
    const result = await spawnAsync("npm", ["install", "-D", ...cmdOptions], {
      stdio: "inherit",
      cwd: CWD,
    });

    if (result === 0) {
      log.success("安装commitlint相关依赖成功");
    }
  }

  async getConfirmReinstall() {
    const { reinstall } = await prompt({
      type: "confirm",
      name: "reinstall",
      message: "当前项目中commitlint相关依赖已存在，是否需要重新安装？",
      default: false,
    });

    return reinstall;
  }

  // 检查node版本生成可用的commitlint相关版本安装包
  async checkCurrentNodeVersion() {
    // 当前安装的node版本
    const currentVersion = process.version;
    log.info("检查系统当前node版本", currentVersion);

    // 获取版本号的主版本号部分
    const majorVersion = semver.major(currentVersion);

    // 配置不同版本可用的commitlint相关包
    const versionStrategy = {
      // 主版本号为16，返回可用包版本信息
      16: () => {
        return "@commitlint/cli@17.6.7 @commitlint/config-conventional@17.6.7 commitizen@4.3.0 commitlint-config-cz@0.13.3 cz-customizable@7.0.0";
      },
      // 主版本号为18，返回可用包版本信息
      18: () => {
        return "@commitlint/cli@19.5.0 @commitlint/config-conventional@19.5.0 commitizen@4.3.1 commitlint-config-cz@0.13.3 cz-customizable@7.2.1";
      },
    };

    let commitlintPackages = "";
    // 生成匹配的版本
    if (versionStrategy[majorVersion]) {
      commitlintPackages = versionStrategy[majorVersion]();
    } else {
      // 如果没匹配到，安装默认最新版
      commitlintPackages =
        "@commitlint/cli@latest @commitlint/config-conventional@latest commitizen@latest commitlint-config-cz@latest cz-customizable@latest";
    }

    log.verbose("commitlintPackages", commitlintPackages);
    log.success("检查node版本通过，已生成当前版本匹配的commitlint相关依赖信息");

    this.commitlintPackages = commitlintPackages; // 缓存到this中
    return commitlintPackages;
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
    const requireKeys = ["install"];

    // 检查是否没传参数
    function checkKeys(keys, obj) {
      let result = false;

      keys.forEach((key) => {
        if (isBoolean(obj[key]) && obj[key] === true) {
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
        `请指定参数，支持以下参数：\n\n${commandOptions
          .map((option) => `['${option.flag}'：${option.description}]`)
          .join(
            "\n"
          )}\n\n您可以输入 ${CLI_NAME} ${COMMAND_NAME} -h 查看使用帮助`
      );
      process.exit(1);
    }
  }

  // 检查是否已安装commitlint
  async checkCommitlint() {
    log.info("检查当前项目中是否已安装commitlint");
    const { devDependencies } = this.projectInfo;
    log.verbose("devDependencies", devDependencies);

    // 包存在则认为已安装相关包
    if (devDependencies["@commitlint/cli"]) {
      log.success("当前项目中已安装commitlint");
      this.hasCommitlint = true;
      return true;
    } else {
      log.success("当前项目中未安装commitlint");
      this.hasCommitlint = false;
      return false;
    }
  }
}

function init(args) {
  return new CommitlintCommand(args);
}

module.exports = init;
module.exports.CommitlintCommand = CommitlintCommand;
