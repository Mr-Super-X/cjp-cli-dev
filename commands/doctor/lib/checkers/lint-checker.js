"use strict";

const fs = require("fs");
const path = require("path");
const { pathExists } = require("@cjp-cli-dev/utils");

const CWD = process.cwd();

const ESLINT_FILES = [
  ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml", ".eslintrc.yaml", ".eslintrc",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
];

const PRETTIER_FILES = [
  ".prettierrc", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.json",
  ".prettierrc.yml", ".prettierrc.yaml", ".prettierrc.toml", "prettier.config.js", "prettier.config.cjs",
];

const COMMITLINT_FILES = [
  "commitlint.config.js", "commitlint.config.cjs", "commitlint.config.mjs", "commitlint.config.ts",
  ".commitlintrc", ".commitlintrc.json", ".commitlintrc.yml", ".commitlintrc.yaml", ".commitlintrc.js", ".commitlintrc.cjs",
];

function hasConfigFile(patterns) {
  return patterns.some((f) => pathExists(path.resolve(CWD, f)));
}

function hasPackageJsonField(field) {
  const pkgPath = path.resolve(CWD, "package.json");
  if (!pathExists(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return !!pkg[field];
  } catch (e) {
    return false;
  }
}

module.exports = {
  name: "规范检查",

  async check() {
    const items = [];

    // 1. ESLint
    const hasEslint = hasConfigFile(ESLINT_FILES) || hasPackageJsonField("eslintConfig");
    items.push({
      label: "ESLint",
      status: hasEslint ? "pass" : "fail",
      message: hasEslint ? "ESLint 已配置" : "ESLint 未配置",
      fixable: !hasEslint,
    });

    // 2. Prettier
    const hasPrettier = hasConfigFile(PRETTIER_FILES) || hasPackageJsonField("prettier");
    items.push({
      label: "Prettier",
      status: hasPrettier ? "pass" : "warn",
      message: hasPrettier ? "Prettier 已配置" : "Prettier 未配置",
      fixable: !hasPrettier,
    });

    // 3. Husky
    const hasHusky = pathExists(path.resolve(CWD, ".husky"));
    items.push({
      label: "Husky",
      status: hasHusky ? "pass" : "warn",
      message: hasHusky ? "Husky 已配置" : "Husky 未配置",
      fixable: !hasHusky,
    });

    // 4. CommitLint
    const hasCommitlint = hasConfigFile(COMMITLINT_FILES);
    items.push({
      label: "CommitLint",
      status: hasCommitlint ? "pass" : "warn",
      message: hasCommitlint ? "CommitLint 已配置" : "CommitLint 未配置",
      fixable: !hasCommitlint,
    });

    return items;
  },

  async fix(confirmedItems) {
    const results = [];

    for (const item of confirmedItems) {
      if (item.label === "ESLint" || item.label === "Prettier") {
        const hasEslint = hasConfigFile(ESLINT_FILES) || hasPackageJsonField("eslintConfig");
        if (hasEslint) {
          results.push({ label: item.label, success: true, message: "已配置，跳过" });
          continue;
        }
        try {
          const codelint = require("@cjp-cli-dev/codelint");
          codelint([{ install: true }, { options: [] }]);
          results.push({ label: item.label, success: true, message: "已通过 codelint 安装" });
        } catch (e) {
          results.push({
            label: item.label,
            success: false,
            message: `命令包未安装，请手动执行 cjp-cli-dev codelint --install`,
          });
        }
      }

      if (item.label === "Husky") {
        const hasHusky = pathExists(path.resolve(CWD, ".husky"));
        if (hasHusky) {
          results.push({ label: item.label, success: true, message: "已配置，跳过" });
          continue;
        }
        try {
          const husky = require("@cjp-cli-dev/husky");
          husky([{ install: true, add: [], set: [] }, { options: [] }]);
          results.push({ label: item.label, success: true, message: "已通过 husky 安装" });
        } catch (e) {
          results.push({
            label: item.label,
            success: false,
            message: `命令包未安装，请手动执行 cjp-cli-dev husky --install`,
          });
        }
      }

      if (item.label === "CommitLint") {
        const hasCommitlint = hasConfigFile(COMMITLINT_FILES);
        if (hasCommitlint) {
          results.push({ label: item.label, success: true, message: "已配置，跳过" });
          continue;
        }
        try {
          const commitlint = require("@cjp-cli-dev/commitlint");
          commitlint([{ install: true }, { options: [] }]);
          results.push({ label: item.label, success: true, message: "已通过 commitlint 安装" });
        } catch (e) {
          results.push({
            label: item.label,
            success: false,
            message: `命令包未安装，请手动执行 cjp-cli-dev commitlint --install`,
          });
        }
      }
    }

    return results;
  },
};
