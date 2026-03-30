"use strict";

const { execSync } = require("child_process");
const path = require("path");
const { pathExists } = require("@cjp-cli-dev/utils");

const CWD = process.cwd();

module.exports = {
  name: "依赖检查",

  async check() {
    const items = [];
    const nodeModulesPath = path.resolve(CWD, "node_modules");
    const hasNodeModules = pathExists(nodeModulesPath);

    // 前置检查
    if (!hasNodeModules) {
      items.push({
        label: "依赖状态",
        status: "warn",
        message: "未检测到 node_modules，请先安装依赖",
        fixable: false,
      });
      return items;
    }

    // 1. 过期依赖检查
    try {
      const outdatedOutput = execSync("npm outdated --json", {
        encoding: "utf-8",
        cwd: CWD,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const outdatedData = JSON.parse(outdatedOutput || "{}");
      const outdatedCount = Object.keys(outdatedData).length;
      if (outdatedCount > 0) {
        items.push({
          label: "过期依赖",
          status: "warn",
          message: `发现 ${outdatedCount} 个过期依赖`,
          fixable: false,
        });
      } else {
        items.push({
          label: "过期依赖",
          status: "pass",
          message: "所有依赖均为最新版本",
          fixable: false,
        });
      }
    } catch (e) {
      try {
        const outdatedData = JSON.parse(e.stdout || "{}");
        const outdatedCount = Object.keys(outdatedData).length;
        items.push({
          label: "过期依赖",
          status: outdatedCount > 0 ? "warn" : "pass",
          message: outdatedCount > 0
            ? `发现 ${outdatedCount} 个过期依赖`
            : "所有依赖均为最新版本",
          fixable: false,
        });
      } catch (parseErr) {
        items.push({
          label: "过期依赖",
          status: "skip",
          message: "无法检查过期依赖",
          fixable: false,
        });
      }
    }

    // 2. 安全漏洞检查
    try {
      const auditOutput = execSync("npm audit --json", {
        encoding: "utf-8",
        cwd: CWD,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const auditData = JSON.parse(auditOutput || "{}");
      const vulnerabilities = auditData.metadata && auditData.metadata.vulnerabilities;
      if (vulnerabilities) {
        const highAndCritical = (vulnerabilities.high || 0) + (vulnerabilities.critical || 0);
        if (highAndCritical > 0) {
          items.push({
            label: "安全漏洞",
            status: "fail",
            message: `发现 ${highAndCritical} 个高危/严重漏洞`,
            fixable: true,
          });
        } else {
          items.push({
            label: "安全漏洞",
            status: "pass",
            message: "未发现高危漏洞",
            fixable: false,
          });
        }
      } else {
        items.push({
          label: "安全漏洞",
          status: "pass",
          message: "未发现安全漏洞",
          fixable: false,
        });
      }
    } catch (e) {
      try {
        const auditData = JSON.parse(e.stdout || "{}");
        const vulnerabilities = auditData.metadata && auditData.metadata.vulnerabilities;
        const highAndCritical = vulnerabilities
          ? (vulnerabilities.high || 0) + (vulnerabilities.critical || 0)
          : 0;
        items.push({
          label: "安全漏洞",
          status: highAndCritical > 0 ? "fail" : "pass",
          message: highAndCritical > 0
            ? `发现 ${highAndCritical} 个高危/严重漏洞`
            : "未发现高危漏洞",
          fixable: highAndCritical > 0,
        });
      } catch (parseErr) {
        items.push({
          label: "安全漏洞",
          status: "skip",
          message: "无法执行安全审计",
          fixable: false,
        });
      }
    }

    // 3. lock 文件检查
    const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
    const hasLockFile = lockFiles.some((f) => pathExists(path.resolve(CWD, f)));
    items.push({
      label: "lock 文件",
      status: hasLockFile ? "pass" : "warn",
      message: hasLockFile ? "lock 文件存在" : "未检测到 lock 文件，建议提交 lock 文件到仓库",
      fixable: false,
    });

    return items;
  },

  async fix(confirmedItems) {
    const results = [];
    for (const item of confirmedItems) {
      if (item.label === "安全漏洞") {
        const nodeModulesPath = path.resolve(CWD, "node_modules");
        if (!pathExists(nodeModulesPath)) {
          results.push({ label: item.label, success: false, message: "请先安装依赖" });
          continue;
        }
        try {
          execSync("npm audit fix", { cwd: CWD, stdio: "inherit" });
          results.push({ label: item.label, success: true, message: "已执行 npm audit fix" });
        } catch (e) {
          results.push({ label: item.label, success: false, message: `npm audit fix 执行失败：${e.message}` });
        }
      }
    }
    return results;
  },
};
