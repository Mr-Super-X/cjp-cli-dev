"use strict";

const { execSync } = require("child_process");
const path = require("path");
const { semver, pathExists } = require("@cjp-cli-dev/utils");

const LOWEST_NODE_VERSION = "16.0.0";

module.exports = {
  name: "环境检查",

  async check() {
    const items = [];
    const cwd = process.cwd();

    // 读取项目 package.json（如果存在）
    let pkg = {};
    const pkgPath = path.resolve(cwd, "package.json");
    if (pathExists(pkgPath)) {
      try {
        pkg = require(pkgPath);
      } catch (_) {
        // ignore
      }
    }

    const engines = pkg.engines || {};

    // 1. Node.js 版本检查
    const nodeVersion = process.version;
    const requiredNode = engines.node || `>=${LOWEST_NODE_VERSION}`;
    if (semver.satisfies(nodeVersion, requiredNode)) {
      items.push({
        label: "Node.js 版本",
        status: "pass",
        message: `当前 ${nodeVersion}，满足 ${requiredNode}`,
        fixable: false,
      });
    } else {
      items.push({
        label: "Node.js 版本",
        status: "fail",
        message: `当前 ${nodeVersion}，不满足 ${requiredNode}，请升级 Node.js`,
        fixable: false,
      });
    }

    // 2. npm 版本检查
    try {
      const npmVersion = execSync("npm -v", { encoding: "utf-8" }).trim();
      const requiredNpm = engines.npm;
      if (requiredNpm) {
        if (semver.satisfies(npmVersion, requiredNpm)) {
          items.push({
            label: "npm 版本",
            status: "pass",
            message: `当前 v${npmVersion}，满足 ${requiredNpm}`,
            fixable: false,
          });
        } else {
          items.push({
            label: "npm 版本",
            status: "warn",
            message: `当前 v${npmVersion}，不满足 ${requiredNpm}，建议升级 npm`,
            fixable: false,
          });
        }
      } else {
        items.push({
          label: "npm 版本",
          status: "pass",
          message: `当前 v${npmVersion}`,
          fixable: false,
        });
      }
    } catch (_) {
      items.push({
        label: "npm 版本",
        status: "warn",
        message: "无法获取 npm 版本，请确认 npm 已安装",
        fixable: false,
      });
    }

    // 3. 包管理器识别
    const lockFiles = [
      { file: "package-lock.json", manager: "npm" },
      { file: "yarn.lock", manager: "yarn" },
      { file: "pnpm-lock.yaml", manager: "pnpm" },
    ];

    const detected = lockFiles
      .filter(({ file }) => pathExists(path.resolve(cwd, file)))
      .map(({ manager }) => manager);

    const managerMessage =
      detected.length > 0
        ? `检测到包管理器：${detected.join("、")}`
        : "未检测到 lock 文件，无法识别包管理器";

    items.push({
      label: "包管理器识别",
      status: "pass",
      message: managerMessage,
      fixable: false,
    });

    return items;
  },
};
