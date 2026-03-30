"use strict";

const fs = require("fs");
const path = require("path");
const { semver, pathExists, fse } = require("@cjp-cli-dev/utils");

const CWD = process.cwd();

const DEFAULT_GITIGNORE = `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
`;

module.exports = {
  name: "项目结构",

  async check() {
    const items = [];
    const pkgPath = path.resolve(CWD, "package.json");

    // 1. package.json 存在
    const hasPkg = pathExists(pkgPath);
    items.push({
      label: "package.json",
      status: hasPkg ? "pass" : "fail",
      message: hasPkg ? "package.json 存在" : "package.json 不存在",
      fixable: false,
    });

    if (hasPkg) {
      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      } catch (e) {
        pkg = {};
      }

      // 2. name 字段
      const hasName = !!pkg.name;
      items.push({
        label: "name 字段",
        status: hasName ? "pass" : "fail",
        message: hasName ? `name: ${pkg.name}` : "package.json 缺少 name 字段",
        fixable: !hasName,
      });

      // 3. version 字段
      const hasVersion = pkg.version && semver.valid(pkg.version);
      items.push({
        label: "version 字段",
        status: hasVersion ? "pass" : "fail",
        message: hasVersion ? `version: ${pkg.version}` : "package.json 缺少合法的 version 字段",
        fixable: !hasVersion,
      });

      // 4. scripts 字段
      const hasScripts = pkg.scripts && (pkg.scripts.build || pkg.scripts.dev);
      items.push({
        label: "scripts 字段",
        status: hasScripts ? "pass" : "warn",
        message: hasScripts
          ? `存在 ${pkg.scripts.build ? "build" : "dev"} 脚本`
          : "缺少 build 或 dev 脚本",
        fixable: false,
      });
    }

    // 5. .gitignore
    const hasGitignore = pathExists(path.resolve(CWD, ".gitignore"));
    items.push({
      label: ".gitignore",
      status: hasGitignore ? "pass" : "warn",
      message: hasGitignore ? ".gitignore 存在" : ".gitignore 不存在",
      fixable: !hasGitignore,
    });

    // 6. README.md
    const readmePath = path.resolve(CWD, "README.md");
    const hasReadme = pathExists(readmePath);
    let readmeEmpty = true;
    if (hasReadme) {
      const content = fs.readFileSync(readmePath, "utf-8").trim();
      readmeEmpty = content.length === 0;
    }
    items.push({
      label: "README.md",
      status: hasReadme && !readmeEmpty ? "pass" : "warn",
      message: !hasReadme
        ? "README.md 不存在"
        : readmeEmpty
        ? "README.md 内容为空"
        : "README.md 存在",
      fixable: false,
    });

    return items;
  },

  async fix(confirmedItems) {
    const results = [];

    for (const item of confirmedItems) {
      if (item.label === "name 字段") {
        const pkgPath = path.resolve(CWD, "package.json");
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          if (!pkg.name) {
            pkg.name = path.basename(CWD);
            fse.writeJsonSync(pkgPath, pkg, { spaces: 2 });
            results.push({ label: item.label, success: true, message: `已补全 name 为 "${pkg.name}"` });
          } else {
            results.push({ label: item.label, success: true, message: "name 已存在，跳过" });
          }
        } catch (e) {
          results.push({ label: item.label, success: false, message: e.message });
        }
      }

      if (item.label === "version 字段") {
        const pkgPath = path.resolve(CWD, "package.json");
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          if (!pkg.version || !semver.valid(pkg.version)) {
            pkg.version = "1.0.0";
            fse.writeJsonSync(pkgPath, pkg, { spaces: 2 });
            results.push({ label: item.label, success: true, message: '已补全 version 为 "1.0.0"' });
          } else {
            results.push({ label: item.label, success: true, message: "version 已存在，跳过" });
          }
        } catch (e) {
          results.push({ label: item.label, success: false, message: e.message });
        }
      }

      if (item.label === ".gitignore") {
        const gitignorePath = path.resolve(CWD, ".gitignore");
        if (pathExists(gitignorePath)) {
          results.push({ label: item.label, success: true, message: "文件已存在，跳过" });
        } else {
          try {
            fs.writeFileSync(gitignorePath, DEFAULT_GITIGNORE);
            results.push({ label: item.label, success: true, message: "已创建默认 .gitignore" });
          } catch (e) {
            results.push({ label: item.label, success: false, message: e.message });
          }
        }
      }
    }

    return results;
  },
};
