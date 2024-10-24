// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于给log信息添加各种自定义风格
const {
  semver,
  fse,
  spawnAsync,
  prompt,
  CLI_NAME,
} = require("@cjp-cli-dev/utils"); // 工具方法

const COMMAND_NAME = "release"; // 命令名称

/**
 * 添加release-it功能
 * 1. 检查当前项目是否node项目
 * 1.1. 检查是否安装release-it
 * 2. 检查node版本，生成可用的release-it相关包版本
 * 3. 安装release-it相关包到当前项目
 * 3.1. 生成.release-it.json配置
 * 3.2. 修改package.json添加scripts
 * 4. 安装完成，提示用法和帮助文档
 * @param {*} options
 * @param {*} command
 */
module.exports = async function (options, command) {
  log.verbose("options", options);

  // 准备工作
  const pkgJson = await prepare(options, command);
  // 检查当前项目中是否安装release-it
  const hasReleaseIt = await checkReleaseIt(pkgJson);

  // 命令选项策略
  const optionStrategy = {
    // --init
    async init() {
      // 检查node版本，获取对应版本可用package信息
      const packages = await checkNodeVersion();
      // 安装release-it相关包
      await installPackage(pkgJson, packages, hasReleaseIt);
    },
    // --patch
    async patch() {
      await execRelease("patch", pkgJson, hasReleaseIt);
    },
    // --minor
    async minor() {
      await execRelease("minor", pkgJson, hasReleaseIt);
    },
    // --major
    async major() {
      await execRelease("major", pkgJson, hasReleaseIt);
    },
  };

  // 遍历options，找到为true且在命令选项策略中的方法进行调用
  Object.keys(options).forEach(async (key) => {
    if (options[key] && optionStrategy[key]) {
      await optionStrategy[key]();
    }
  });
};

async function prepare(options, command) {
  // 检查必传参数
  await checkRequiredKeys(options, command);

  // 1. 确认项目是否为npm项目
  const projectPath = process.cwd();
  const pkgPath = path.join(projectPath, "package.json");
  log.verbose("package.json路径", pkgPath);
  if (!fs.existsSync(pkgPath)) {
    throw new Error("package.json不存在！这不是一个标准的node项目");
  }

  // 2. 拿到package.json并返回json
  const pkgJson = fse.readJsonSync(pkgPath);

  // 检查必要字段
  const { version } = pkgJson;
  if (!version) {
    log.notice(`当前项目package.json中缺少version字段，自动为您创建该字段`);
    const v = await getVersion();
    pkgJson.version = v;
    // 将版本写入项目package.json中
    fse.writeJsonSync(pkgPath, pkgJson, { spaces: 2 });
  }

  log.verbose("pkgJson", pkgJson);
  return pkgJson;
}

// 获取version
async function getVersion() {
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
async function checkReleaseIt(pkgJson) {
  log.info("检查当前项目中是否已安装release-it");
  const { devDependencies } = pkgJson;
  log.verbose("devDependencies", devDependencies);

  // 包存在则认为已安装相关包
  if (devDependencies["release-it"]) {
    log.success("当前项目中已安装release-it");
    return true;
  } else {
    log.success("当前项目中未安装release-it");
    return false;
  }
}

async function installPackage(pkgJson, packages, hasReleaseIt) {
  log.info("开始安装release-it功能相关依赖");
  log.verbose("hasReleaseIt", hasReleaseIt);

  async function installSetup() {
    // 3. 执行安装命令
    await execInstallPackages(packages);
    // 3.1 生成.release-it.json配置
    await createReleaseItConfig();
    // 3.2 修改scripts，添加配置
    await modifyPackageScripts(pkgJson);
  }

  // 包存在则认为已安装相关包
  if (hasReleaseIt) {
    const reinstall = await getConfirmReinstall();
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
async function execRelease(option, pkgJson, hasReleaseIt) {
  log.verbose("hasReleaseIt", hasReleaseIt);
  // 检查未安装release-it的情况
  if (hasReleaseIt === false) {
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

  const { version } = pkgJson;

  log.info(
    `开始升级 ${option} 版本`,
    `${version} => ${semver.inc(version, option)}`
  );

  // 通过npx执行命令
  await spawnAsync("npx", ["release-it", type], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  log.success("版本升级完成，当前项目版本", semver.inc(version, option));
}

// 执行安装包程序
async function execInstallPackages(packages) {
  if (!packages) {
    throw new Error("release-it功能相关依赖和版本不能为空");
  }
  log.info(`执行 npm install -D 安装依赖`);
  log.verbose("安装命令", `npm install -D ${packages}`);
  // "release-it@16.0.0 auto-changelog@2.4.0" => ["release-it@16.0.0", "auto-changelog@2.4.0"]
  const cmdOptions = packages.split(" "); // 通过空格切分数组作为命令参数
  const result = await spawnAsync("npm", ["install", "-D", ...cmdOptions], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  if (result === 0) {
    log.success("安装release-it相关依赖成功");
  }
}

// 创建.release-it.json配置
async function createReleaseItConfig() {
  log.info("开始生成release-it默认配置");
  // 从命令所在路径中获取配置模板
  const templateFile = path.join(__dirname, "template", ".release-it.json");
  // 目标文件
  const targetFile = path.resolve(process.cwd(), ".release-it.json");

  log.verbose("templateFile", templateFile);
  log.verbose("targetFile", targetFile);

  // 拷贝模板文件到当前项目中
  fse.copyFileSync(templateFile, targetFile);
  log.success("生成release-it默认配置成功", "=> .release-it.json");
}

// 修改package.json脚本配置
async function modifyPackageScripts(pkgJson) {
  log.info("开始为当前项目package.json添加release-it相关scripts配置");
  log.verbose("pkgJson", pkgJson);

  let { scripts } = pkgJson;

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
  pkgJson.scripts = scripts;
  log.verbose("pkgJson", pkgJson);
  // 写入配置
  const targetFile = path.resolve(process.cwd(), "package.json");
  fse.writeFileSync(targetFile, JSON.stringify(pkgJson, null, 2));
  log.success("添加release-it相关scripts配置成功");
}

async function getConfirmReinstall() {
  const { reinstall } = await prompt({
    type: "confirm",
    name: "reinstall",
    message: "当前项目中release-it相关依赖已存在，是否需要重新安装？",
    default: false,
  });

  return reinstall;
}

// 检查node版本生成可用的release-it相关版本安装包
async function checkNodeVersion() {
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
    // 如果没匹配到，则判断版本是否小于18，小于18则默认生成16版本，否则生成18版本
    // 对比当前node版本是否小于18.0.0
    if (semver.lt(currentVersion, "18.0.0")) {
      releaseItPackages = versionStrategy["16"]();
    } else {
      releaseItPackages = versionStrategy["18"]();
    }
  }

  log.verbose("releaseItPackages", releaseItPackages);
  log.success("检查node版本通过，已生成当前版本可用的release-it相关依赖信息");
  return releaseItPackages;
}

// 检查必传参数
async function checkRequiredKeys(options, command) {
  const requireKeys = ["init", "patch", "minor", "major"];

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
    process.exit(1);
  }
}
