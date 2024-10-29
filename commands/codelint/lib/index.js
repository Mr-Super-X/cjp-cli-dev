"use strict";

// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const {
  fse,
  spawnAsync,
  prompt,
  isBoolean,
  CLI_NAME,
} = require("@cjp-cli-dev/utils"); // 工具方法

const COMMAND_NAME = "codelint"; // 命令名称
const CWD = process.cwd(); // 当前进程执行所在目录
const HUSKY_DIR = ".husky"; // husky安装目录

const VERSION_STABLE = "eslint@8.49.0";
const VERSION_LATEST = "eslint@latest";

/**
 * 实现一键安装eslint、prettier、lint-staged，解决eslint、prettier冲突问题，优先prettier，支持只校验暂存区代码
 * 1.检查当前项目是否为node项目
 * 2.检查当前项目是否安装eslint/prettier
 * 3.安装eslint、prettier、lint-staged，生成默认配置
 * 4.检查用户是否安装husky，如果有则调用cjp-cli-dev husky --add pre-commit "npx lint-staged"添加校验
 * 5.安装完成，提示用法和帮助文档
 */
class CodelintCommand extends Command {
  init() {
    this.options = this._args[0] || {};
    this.commandOptions = this._args[1].options || [];
    this.projectInfo = null;
    this.hasEslint = null;
    this.eslintVersion = null;
    this.codelintPackages = null;
    // debug模式下输出以下变量
    log.verbose("options", this.options);
    log.verbose("commandOptions", this.commandOptions);
  }
  async exec() {
    try {
      // 准备工作
      await this.prepare();
      // 检查当前项目中是否安装eslint
      await this.checkEslint();

      // 命令选项策略
      const optionStrategy = {
        // --install
        install: async () => {
          // 检查并生成相关版本安装包信息
          await this.checkCodelintVersion();
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
    log.info("开始安装codelint功能");
    log.verbose("hasEslint", this.hasEslint);

    const installSetup = async () => {
      // 4. 执行安装命令
      await this.execInstallPackages();
      // 4.1 生成eslint/prettier配置
      await this.createCodelintConfig();
      // 4.2 检查husky安装情况，添加lint-staged配置
      await this.checkHusky();
    };

    // 包存在则认为已安装相关包
    if (this.hasEslint) {
      const reinstall = await this.getConfirmReinstall();
      if (reinstall) {
        await installSetup();
      } else {
        log.notice("已取消安装codelint");
      }
    } else {
      await installSetup();
    }

    log.success(
      `codelint安装完成\n\n功能说明：对代码规范进行统一校验，解决eslint和prettier冲突，优先使用prettier格式化代码\n\n查阅官方帮助文档：\neslint：https://eslint.cn/\nprettier：https://www.prettier.cn/docs/options.html`
    );
  }

  // 检查husky安装情况，添加lint-staged配置
  async checkHusky() {
    log.info("检查husky安装情况");

    const huskyPath = path.resolve(CWD, HUSKY_DIR);

    // 判断是否安装husky
    if (fs.existsSync(huskyPath)) {
      log.success("当前项目已安装husky");
      log.info("添加lint-staged配置");
      const preCommitFile = path.resolve(CWD, HUSKY_DIR, "pre-commit");
      const huskyConfigContent = fse.readFileSync(preCommitFile, "utf8");
      // 检查是否已添加lint-staged
      if (huskyConfigContent.includes("lint-staged")) {
        log.notice("lint-staged配置已存在，无需再次添加");
      } else {
        const result = await spawnAsync(
          CLI_NAME,
          ["husky", "--add", "pre-commit", "npx lint-staged"],
          {
            stdio: "inherit",
            cwd: CWD,
          }
        );
        if (result === 0) {
          log.success("添加lint-staged配置成功");
        }
      }
    } else {
      log.notice(
        `当前项目未安装husky，您可以执行以下命令快速安装husky：\n\n- 安装husky：${CLI_NAME} husky --install\n- 添加lint-staged：${CLI_NAME} husky --add pre-commit "npx lint-staged"`
      );
    }
  }

  // 执行安装包程序
  async execInstallPackages() {
    if (!this.eslintVersion) {
      throw new Error("eslint安装版本不能为空");
    }
    log.info(`执行 npm install -D 安装依赖`);
    log.verbose("安装命令", `npm install -D ${this.codelintPackages}`);

    const moreOpts = this.codelintPackages.split(" ");
    const result = await spawnAsync("npm", ["install", "-D", ...moreOpts], {
      stdio: "inherit",
      cwd: CWD,
    });

    if (result === 0) {
      log.success("安装codelint依赖成功");
    }

    const pkgPath = path.join(CWD, "package.json");
    // 拿到package.json并返回json
    const projectInfo = fse.readJsonSync(pkgPath);
    // 安装完成写入新的依赖后，更新projectInfo
    this.projectInfo = projectInfo;
  }

  // 创建默认配置
  async createCodelintConfig() {
    log.info("开始生成codelint默认配置");

    // 从命令所在路径中获取配置模板
    let eslintTemplateFile;
    let filename;
    let lintStagedContent;
    if (this.eslintVersion === VERSION_STABLE) {
      filename = ".eslintrc.js";
      eslintTemplateFile = path.join(__dirname, "template", filename);
      lintStagedContent = `module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.json': ['prettier --write'],
  '*.vue': ['eslint --fix', 'prettier --write'],
  '*.{scss,less,styl,html}': ['prettier --write'],
  '*.md': ['prettier --write'],
}`;
    } else {
      filename = "eslint.config.mjs";
      eslintTemplateFile = path.join(__dirname, "template", filename);
      // eslint 8.53.0 起，将弃用代码风格相关规则，统一使用prettier方式格式化代码
      lintStagedContent = `module.exports = {
  '*.{js,jsx,ts,tsx}': ['prettier --write'],
  '*.json': ['prettier --write'],
  '*.vue': ['prettier --write'],
  '*.{scss,less,styl,html}': ['prettier --write'],
  '*.md': ['prettier --write'],
}`;
    }
    const prettierTemplateFile = path.join(
      __dirname,
      "template",
      ".prettierrc.js"
    );
    // 目标文件
    const eslintTargetFile = path.resolve(CWD, filename);
    const prettierTargetFile = path.resolve(CWD, ".prettierrc.js");
    const lintStagedTargetFile = path.resolve(CWD, "lint-staged.config.js");

    log.verbose("eslintTemplateFile", eslintTemplateFile);
    log.verbose("prettierTemplateFile", prettierTemplateFile);
    log.verbose("eslintTargetFile", eslintTargetFile);
    log.verbose("prettierTargetFile", prettierTargetFile);

    // 拷贝模板文件到当前项目中
    fse.copyFileSync(eslintTemplateFile, eslintTargetFile);
    fse.copyFileSync(prettierTemplateFile, prettierTargetFile);

    // 生成lint-staged配置文件
    fs.writeFileSync(lintStagedTargetFile, lintStagedContent);

    log.success("生成codelint默认配置成功", `=> ${filename}`);
    log.success("生成codelint默认配置成功", "=> .prettierrc.js");
    log.success("生成codelint默认配置成功", "=> lint-staged.config.js");
  }

  // 检查用户选择版本生成可用的相关版本安装包
  async checkCodelintVersion() {
    log.info("开始生成相关依赖信息");
    const eslintVersion = await this.getEslintVersion();
    this.eslintVersion = eslintVersion;

    let codelintPackages = "";
    // 生成匹配的安装包信息，没匹配上就是最新版
    if (eslintVersion === VERSION_STABLE) {
      codelintPackages = `${VERSION_STABLE} eslint-config-prettier@9.1.0 eslint-plugin-prettier@5.2.1 @babel/eslint-parser@7.25.9 prettier@3.3.3 lint-staged@13.2.3`;
    } else {
      codelintPackages = `${VERSION_LATEST} @eslint/js@latest @globals eslint-config-prettier@latest eslint-plugin-prettier@latest prettier@latest lint-staged@latest`;
    }

    log.verbose("codelintPackages", codelintPackages);
    log.success("生成相关依赖信息成功");

    this.codelintPackages = codelintPackages; // 缓存到this中
    return codelintPackages;
  }

  // 询问要安装的版本
  async getEslintVersion() {
    const { eslintVersion } = await prompt({
      type: "list",
      name: "eslintVersion",
      message: "您希望安装什么版本的eslint？",
      default: "",
      choices: [
        {
          name: "稳定版（node <= 16版本推荐）",
          value: VERSION_STABLE,
        },
        {
          name: "最新版（node >= 18版本推荐）",
          value: VERSION_LATEST,
        },
      ],
    });

    return eslintVersion;
  }

  async getConfirmReinstall() {
    const { reinstall } = await prompt({
      type: "confirm",
      name: "reinstall",
      message: "当前项目中eslint相关依赖已存在，是否需要重新安装？",
      default: false,
    });

    return reinstall;
  }

  async checkEslint() {
    log.info("检查当前项目中是否已安装eslint");
    let { devDependencies } = this.projectInfo;
    log.verbose("devDependencies", devDependencies);

    // 初始化devDependencies
    if (!devDependencies) {
      devDependencies = {};
    }

    // 包存在则认为已安装相关包
    if (devDependencies["eslint"]) {
      log.success("当前项目中已安装eslint");
      this.hasEslint = true;
      return true;
    } else {
      log.success("当前项目中未安装eslint");
      this.hasEslint = false;
      return false;
    }
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
}

function init(args) {
  return new CodelintCommand(args);
}

module.exports = init;
module.exports.CodelintCommand = CodelintCommand;
