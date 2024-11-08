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

const COMMAND_NAME = "release"; // 命令名称
const CWD = process.cwd(); // 当前进程执行所在目录

/**
 * 添加release-it功能
 * 1. 检查当前项目是否node项目
 * 1.1. 检查是否安装release-it
 * 2. 检查node版本，生成可用的release-it相关包版本
 * 3. 安装release-it相关包到当前项目
 * 3.1. 生成.release-it.json配置
 * 3.2. 修改package.json添加scripts
 * 4. 安装完成，提示用法和帮助文档
 */
class ReleaseCommand extends Command {
  init() {
    this.options = this._args[0] || {};
    this.commandOptions = this._args[1].options || [];
    this.projectInfo = null;
    this.releaseItPackages = null;
    this.hasReleaseIt = null;
    // debug模式下输出以下变量
    log.verbose("options", this.options);
    log.verbose("commandOptions", this.commandOptions);
  }
  async exec() {
    try {
      // 准备工作
      await this.prepare();
      // 检查当前项目中是否安装release-it
      await this.checkReleaseIt();

      // 命令选项策略
      const optionStrategy = {
        // --install
        install: async () => {
          // 检查node版本，获取对应版本可用package信息
          await this.checkCurrentNodeVersion();
          // 安装release-it相关包
          await this.installPackage();
        },
        // --patch
        patch: async () => {
          await this.execRelease("patch");
        },
        // --minor
        minor: async () => {
          await this.execRelease("minor");
        },
        // --major
        major: async () => {
          await this.execRelease("major");
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

    // 检查必要字段
    const { version } = projectInfo;
    if (!version) {
      log.notice(`当前项目package.json中缺少version字段，自动为您创建该字段`);
      const v = await this.getVersion();
      projectInfo.version = v;
      // 将修改后的版本写入项目package.json中
      fse.writeJsonSync(pkgPath, projectInfo, { spaces: 2 });
    }

    log.verbose("projectInfo", projectInfo);
    this.projectInfo = projectInfo;
    return projectInfo;
  }

  // 获取version
  async getVersion() {
    const { version } = await prompt({
      type: "input",
      name: "version",
      message: "请输入新版本号：",
      validate: (input) => {
        if (!semver.valid(input)) {
          return "版本号不合法，请输入语义化版本号格式（x.y.z），如：1.0.0";
        }
        return true;
      },
    });

    return version;
  }

  // 检查是否已安装release-it
  async checkReleaseIt() {
    log.info("检查当前项目中是否已安装release-it");
    let { devDependencies } = this.projectInfo;
    log.verbose("devDependencies", devDependencies);

    // 初始化devDependencies
    if (!devDependencies) {
      devDependencies = {};
    }

    // 包存在则认为已安装相关包
    if (devDependencies["release-it"]) {
      log.success("当前项目中已安装release-it");
      this.hasReleaseIt = true;
      return true;
    } else {
      log.success("当前项目中未安装release-it");
      this.hasReleaseIt = false;
      return false;
    }
  }

  async installPackage() {
    log.info("开始安装release-it功能相关依赖");
    log.verbose("hasReleaseIt", this.hasReleaseIt);

    const installSetup = async () => {
      // 3. 执行安装命令
      await this.execInstallPackages();
      // 3.1 生成.release-it.json配置
      await this.createReleaseItConfig();
      // 3.2 修改scripts，添加配置
      await this.modifyPackageScripts();
    };

    // 包存在则认为已安装相关包
    if (this.hasReleaseIt) {
      const reinstall = await this.getConfirmReinstall();
      if (reinstall) {
        await installSetup();
      } else {
        log.notice("已取消安装release-it功能");
      }
    } else {
      await installSetup();
    }

    log.success(
      `release-it功能安装完成\n\n功能说明：执行对应命令后会自动修改package.json的version字段并生成git提交信息changelog版本记录文档\n\n您可以通过以下方式进行使用：\n\n方式一：通过脚手架命令运行\n\n${CLI_NAME} ${COMMAND_NAME} --patch（示例：1.0.0 => 1.0.1）\n${CLI_NAME} ${COMMAND_NAME} --minor（示例：1.0.0 => 1.1.0）\n${CLI_NAME} ${COMMAND_NAME} --major（示例：1.0.0 => 2.0.0）\n\n方式二：通过npm运行\n\nnpm run release:patch（示例：1.0.0 => 1.0.1）\nnpm run release:minor（示例：1.0.0 => 1.1.0）\nnpm run release:major（示例：1.0.0 => 2.0.0）\n\n查阅官方帮助文档：https://github.com/release-it/release-it`
    );
  }

  // 执行release-it
  async execRelease(option) {
    log.verbose("hasReleaseIt", this.hasReleaseIt);
    // 检查未安装release-it的情况
    if (this.hasReleaseIt === false) {
      throw new Error(
        `请先执行 ${CLI_NAME} ${COMMAND_NAME} --init 命令安装release-it功能`
      );
    }
    // 目前仅支持这三种命令参数
    const enumType = {
      patch: "patch",
      minor: "minor",
      major: "major",
    };

    const type = enumType[option];
    if (!type) {
      throw new Error(`不支持的参数：${option}`);
    }

    const { version } = this.projectInfo;

    log.info(
      `开始升级 ${option} 版本`,
      `${version} => ${semver.inc(version, option)}`
    );

    // 通过npx执行命令
    await spawnAsync("npx", ["release-it", type], {
      stdio: "inherit",
      cwd: CWD,
    });

    log.success("版本升级完成，当前项目版本", semver.inc(version, option));
  }

  // 执行安装包程序
  async execInstallPackages() {
    if (!this.releaseItPackages) {
      throw new Error("release-it功能相关依赖和版本不能为空");
    }
    log.info(`执行 npm install -D 安装依赖`);
    log.verbose("安装命令", `npm install -D ${this.releaseItPackages}`);
    // "release-it@16.0.0 auto-changelog@2.4.0" => ["release-it@16.0.0", "auto-changelog@2.4.0"]
    const cmdOptions = this.releaseItPackages.split(" "); // 通过空格切分数组作为命令参数
    const result = await spawnAsync("npm", ["install", "-D", ...cmdOptions], {
      stdio: "inherit",
      cwd: CWD,
    });

    if (result === 0) {
      log.success("安装release-it相关依赖成功");
    }

    const pkgPath = path.join(CWD, "package.json");
    // 拿到package.json并返回json
    const projectInfo = fse.readJsonSync(pkgPath);
    // 安装完成写入新的依赖后，更新projectInfo
    this.projectInfo = projectInfo;
  }

  // 创建.release-it.json配置
  async createReleaseItConfig() {
    log.info("开始生成release-it默认配置");
    // 从命令所在路径中获取配置模板
    const templateFile = path.join(__dirname, "template", ".release-it.json");
    // 目标文件
    const targetFile = path.resolve(CWD, ".release-it.json");

    log.verbose("templateFile", templateFile);
    log.verbose("targetFile", targetFile);

    // 拷贝模板文件到当前项目中
    fse.copyFileSync(templateFile, targetFile);
    log.success("生成release-it默认配置成功", "=> .release-it.json");
  }

  // 修改package.json脚本配置
  async modifyPackageScripts() {
    log.info("开始为当前项目package.json添加release-it相关scripts配置");

    let { scripts } = this.projectInfo;

    // 当前package.json中没有script属性
    if (!scripts) {
      scripts = {};
    }

    // 添加release-it相关命令
    scripts = {
      ...scripts,
      "release:major": "release-it major",
      "release:minor": "release-it minor",
      "release:patch": "release-it patch",
    };

    // 为当前项目添加script配置
    this.projectInfo.scripts = scripts;
    log.verbose("projectInfo", this.projectInfo);
    // 写入配置
    const targetFile = path.resolve(CWD, "package.json");
    fse.writeFileSync(targetFile, JSON.stringify(this.projectInfo, null, 2));
    log.success("添加release-it相关scripts配置成功");
  }

  async getConfirmReinstall() {
    const { reinstall } = await prompt({
      type: "confirm",
      name: "reinstall",
      message: "当前项目中release-it相关依赖已存在，是否需要重新安装？",
      default: false,
    });

    return reinstall;
  }

  // 检查node版本生成可用的release-it相关版本安装包
  async checkCurrentNodeVersion() {
    // 当前安装的node版本
    const currentVersion = process.version;
    log.info("检查系统当前node版本", currentVersion);

    // 获取版本号的主版本号部分
    const majorVersion = semver.major(currentVersion);
    log.verbose("主版本号", majorVersion);

    // 配置不同版本可用的release-it相关包
    const versionStrategy = {
      // 主版本号为16，返回可用包版本信息
      16: () => {
        return "release-it@16.0.0 @release-it/conventional-changelog@7.0.0 auto-changelog@2.4.0";
      },
      // 主版本号为18，返回可用包版本信息
      18: () => {
        return "release-it@17.10.0 @release-it/conventional-changelog@9.0.1 auto-changelog@2.5.0";
      },
    };

    let releaseItPackages = "";
    // 生成匹配的版本
    if (versionStrategy[majorVersion]) {
      releaseItPackages = versionStrategy[majorVersion]();
    } else {
      // 如果没匹配到，安装默认最新版
      releaseItPackages =
        "release-it@latest @release-it/conventional-changelog@latest auto-changelog@latest";
    }

    log.verbose("releaseItPackages", releaseItPackages);
    log.success("检查node版本通过，已生成当前版本可用的release-it相关依赖信息");

    this.releaseItPackages = releaseItPackages; // 缓存到this中
    return releaseItPackages;
  }

  // 检查必传参数
  async checkRequiredKeys() {
    const requireKeys = ["install", "patch", "minor", "major"];

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
      defaultValue: item.defaultValue
    }));

    if (!checkKeys(requireKeys, this.options)) {
      log.warn(
        `请指定参数确认您想升级什么类型的版本，支持以下参数：\n\n${commandOptions
          .map((option) => `['${option.flag}'：${option.description}，默认值：${option.defaultValue}]`)
          .join(
            "\n"
          )}\n\n您可以输入 ${CLI_NAME} ${COMMAND_NAME} -h 查看使用帮助`
      );
      process.exit(1);
    }
  }
}

function init(args) {
  return new ReleaseCommand(args);
}

module.exports = init;
module.exports.ReleaseCommand = ReleaseCommand;
