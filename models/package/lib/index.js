"use strict";

// 第三方库
const pkgDir = require("pkg-dir").sync; // 用于寻找项目根路径
const npminstall = require("npminstall"); // 用于下载npm包
// 内置库
const path = require("path");
// 自建库
const log = require("@cjp-cli-dev/log");
const formatPath = require("@cjp-cli-dev/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@cjp-cli-dev/get-npm-info");
const { isObject, fse, pathExists } = require("@cjp-cli-dev/utils");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空！");
    }
    if (!isObject(options)) {
      throw new Error("Package类的options参数类型必须为Object！");
    }
    // package路径
    this.targetPath = options.targetPath;
    // package存储路径（可以理解为node_modules）
    this.storeDir = options.storeDir;
    // package名称
    this.packageName = options.packageName;
    // package版本
    this.packageVersion = options.packageVersion;
    // npm 源
    this.registry = options.registry,
    // npminstall会将缓存放在node_modules/.store/@组织+包名@版本号/node_modules中
    this.cacheFilePathPrefix = this.packageName.replace("/", "+");
  }

  async prepare() {
    // 如果没有缓存路径，直接创建，解决目录不存在的问题
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }

    // 得到最新的要安装的真实版本号
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  // 在class中使用get关键字可以动态生成属性，之后允许通过this.xx获得（自动调用）
  get cacheFilePath() {
    // npminstall会将缓存放在node_modules/.store/@组织+包名@版本号/node_modules中
    return path.resolve(
      this.storeDir,
      ".store",
      `${this.cacheFilePathPrefix}@${this.packageVersion}`,
      "node_modules",
      this.packageName
    );
  }

  // 获取缓存文件中版本路径
  getSpecificCacheFilePath(version) {
    // npminstall会将缓存放在node_modules/.store/@组织+包名@版本号/node_modules中
    return path.resolve(
      this.storeDir,
      ".store",
      `${this.cacheFilePathPrefix}@${version}`,
      "node_modules",
      this.packageName
    );
  }

  // 判断当前package是否存在
  async exists() {
    if (this.storeDir) {
      // 缓存模式下执行
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      // 非缓存模块执行
      return pathExists(this.targetPath);
    }
  }

  // 安装package，依赖npminstall：https://www.npmjs.com/package/npminstall
  async install() {
    await this.prepare();
    const installOptions = {
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: this.registry || getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    };
    log.verbose("install安装参数：", installOptions);
    // npminstall方法返回值为promise
    await npminstall(installOptions);
  }

  // 更新package
  async update() {
    await this.prepare();
    // 1. 获取npm包最新版本号
    const latestVersion = await getNpmLatestVersion(this.packageName);
    // 2. 查询最新版本号对应的缓存路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestVersion);
    // 3. 如果缓存路径中不存在最新版本直接安装最新版本
    if (!pathExists(latestFilePath)) {
      const installOptions = {
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: this.registry || getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestVersion,
          },
        ],
      };
      log.verbose("update安装参数：", installOptions);
      await npminstall(installOptions);
      log.info(`【${this.packageName}】已从 ${this.packageVersion} 升级到最新版本：${latestVersion}，缓存路径为：\n${latestFilePath}`);
    } else {
      log.verbose(`当前缓存中已存在最新版本 ${latestVersion}，无需再次安装，缓存路径为：\n${latestFilePath}`);
    }

    // 4. 更新packageVersion，每次都获取最新版本
    this.packageVersion = latestVersion;
  }

  // 获取入口文件路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取package.json所在路径 -> pkg-dir
      const dir = pkgDir(targetPath);

      if (dir) {
        // 2. 读取package.json -> require
        const pkgFile = require(path.resolve(dir, "package.json"));
        // 3. 找到main/lib -> 输出成path
        if (pkgFile && (pkgFile.main || pkgFile.lib)) {
          // 4. 路径兼容（MacOS/Windows）
          return formatPath(path.resolve(dir, pkgFile.main || pkgFile.lib));
        }
      }

      log.warn("没有找到入口文件路径");
      return null;
    }
    // 判断是否使用缓存
    if (this.storeDir) {
      log.verbose("缓存路径存在，storeDir：", this.storeDir);
      return _getRootFile(this.cacheFilePath);
    } else {
      log.verbose("缓存路径不存在");
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
