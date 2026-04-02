"use strict";

const { execSync } = require("child_process");

module.exports = {
  name: "Git 状态",

  async check() {
    const items = [];

    // 1. 检查是否在 Git 仓库中
    let isGitRepo = false;
    try {
      execSync("git rev-parse --is-inside-work-tree", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      isGitRepo = true;
    } catch (e) {
      isGitRepo = false;
    }

    if (!isGitRepo) {
      items.push({
        label: "Git 仓库",
        status: "warn",
        message: "当前目录不是 Git 仓库",
        fixable: false,
      });
      items.push({
        label: "未提交更改",
        status: "skip",
        message: "非 Git 仓库，跳过检查",
        fixable: false,
      });
      items.push({
        label: "当前分支",
        status: "skip",
        message: "非 Git 仓库，跳过检查",
        fixable: false,
      });
      return items;
    }

    // 在 Git 仓库中
    // 2. 获取当前分支
    let branchName = "";
    try {
      branchName = execSync("git branch --show-current", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch (e) {
      branchName = "unknown";
    }

    items.push({
      label: "Git 仓库",
      status: "pass",
      message: `Git 仓库 (分支: ${branchName})`,
      fixable: false,
    });

    // 3. 未提交更改
    try {
      const statusOutput = execSync("git status --porcelain", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (statusOutput) {
        const changedFiles = statusOutput.split(/\r?\n/).filter(Boolean).length;
        items.push({
          label: "未提交更改",
          status: "warn",
          message: `有 ${changedFiles} 个未提交的文件`,
          fixable: false,
        });
      } else {
        items.push({
          label: "未提交更改",
          status: "pass",
          message: "工作区干净",
          fixable: false,
        });
      }
    } catch (e) {
      items.push({
        label: "未提交更改",
        status: "skip",
        message: "无法获取 Git 状态",
        fixable: false,
      });
    }

    // 当前分支
    items.push({
      label: "当前分支",
      status: "pass",
      message: branchName || "unknown",
      fixable: false,
    });

    return items;
  },
};
