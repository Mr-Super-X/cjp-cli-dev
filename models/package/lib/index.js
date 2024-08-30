"use strict";

// 第三方库
const pkgDir = require("pkg-dir").sync; // 用于寻找项目根路径
// 内置库
const path = require('path')
// 自建库
const log = require("@cjp-cli-dev/log");
const formatPath = require("@cjp-cli-dev/format-path");
const { isObject } = require("@cjp-cli-dev/utils");

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
    // package存储路径
    // this.storePath = options.storePath;
    // package名称
    this.packageName = options.packageName;
    // package版本
    this.packageVersion = options.packageVersion;
  }

  // 判断当前package是否存在
  exists() {}

  // 安装package
  install() {}

  // 更新package
  update() {}

  // 获取入口文件路径
  getRootFilePath() {
    // 1. 获取package.json所在路径 -> pkg-dir
    const dir = pkgDir(this.targetPath);

    if (dir) {
      // 2. 读取package.json -> require
      const pkgFile = require(path.resolve(dir, 'package.json'));
      // 3. 找到main/lib -> 输出成path
      if(pkgFile && (pkgFile.main || pkgFile.lib)) {
        // 4. 路径兼容（MacOS/Windows）
        return formatPath(path.resolve(dir, pkgFile.main || pkgFile.lib));
      }
    }

    log.warn('没有找到入口文件路径')
    return null;
  }
}

module.exports = Package;
