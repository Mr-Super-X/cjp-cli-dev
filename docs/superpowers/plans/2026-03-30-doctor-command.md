# Doctor 命令实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `cjp-cli-dev doctor` 命令，对当前项目执行全面体检并输出结构化报告，支持 `--fix` 防御式自动修复。

**Architecture:** 遵循现有脚手架命令开发模式 — 创建 `commands/doctor` 包，继承 Command 基类，将 5 个检查项拆分为独立 checker 模块，通过 reporter 模块渲染终端报告。DoctorCommand 主类负责编排检查流程和 --fix 修复流程。

**Tech Stack:** Node.js CommonJS, Commander.js, Inquirer.js, child_process.execSync, semver, fs-extra

**Spec:** `docs/superpowers/specs/2026-03-30-doctor-command-design.md`

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| Create | `commands/doctor/package.json` | 包配置，声明依赖 |
| Create | `commands/doctor/lib/index.js` | DoctorCommand 主类 |
| Create | `commands/doctor/lib/reporter.js` | 终端彩色报告渲染 |
| Create | `commands/doctor/lib/checkers/env-checker.js` | 环境检查（Node/npm/包管理器） |
| Create | `commands/doctor/lib/checkers/deps-checker.js` | 依赖检查（过期/漏洞/lock文件） |
| Create | `commands/doctor/lib/checkers/lint-checker.js` | 规范检查（ESLint/Prettier/Husky/CommitLint） |
| Create | `commands/doctor/lib/checkers/structure-checker.js` | 项目结构检查（package.json/.gitignore/README） |
| Create | `commands/doctor/lib/checkers/git-checker.js` | Git 状态检查（仓库/未提交/分支） |
| Modify | `core/exec/lib/index.js:17-31` | SETTINGS 映射表添加 doctor |
| Modify | `core/cli/lib/index.js` | 注册 doctor 命令 |

---

### Task 1: 创建 doctor 包骨架

**Files:**
- Create: `commands/doctor/package.json`
- Create: `commands/doctor/lib/index.js`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@cjp-cli-dev/doctor",
  "version": "1.7.5",
  "description": "cjp-cli-dev doctor",
  "author": "v_jpch <v_jpch.digitalgd.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.com/"
  },
  "repository": {
    "type": "git",
    "url": "git@gitee.com:Mr_Mikey/cjp-cli-dev.git"
  },
  "scripts": {
    "test": "node ./__tests__/@cjp-cli-dev/doctor.test.js"
  },
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

- [ ] **Step 2: 创建 DoctorCommand 主类骨架**

创建 `commands/doctor/lib/index.js`：

```javascript
"use strict";

const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const { prompt, colors } = require("@cjp-cli-dev/utils");

// checkers
const envChecker = require("./checkers/env-checker");
const depsChecker = require("./checkers/deps-checker");
const lintChecker = require("./checkers/lint-checker");
const structureChecker = require("./checkers/structure-checker");
const gitChecker = require("./checkers/git-checker");
// reporter
const { renderReport } = require("./reporter");

// 检查器执行顺序
const CHECKERS = [envChecker, depsChecker, lintChecker, structureChecker, gitChecker];

class DoctorCommand extends Command {
  init() {
    this.fix = this._args[0].fix || false;
    log.verbose("fix", this.fix);
  }

  async exec() {
    try {
      // 1. 依次执行所有 checker，收集结果
      const results = await this.runCheckers();
      // 2. 渲染终端报告
      renderReport(results);
      // 3. 若传入 --fix，执行修复流程
      if (this.fix) {
        await this.runFix(results);
      }
    } catch (err) {
      log.error(err.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  async runCheckers() {
    const results = [];
    for (const checker of CHECKERS) {
      try {
        const items = await checker.check();
        results.push({ name: checker.name, items, checker });
      } catch (err) {
        log.warn(`${checker.name} 检查异常：${err.message}`);
        results.push({
          name: checker.name,
          items: [{ label: checker.name, status: "skip", message: `检查异常：${err.message}`, fixable: false }],
          checker,
        });
      }
    }
    return results;
  }

  async runFix(results) {
    // 收集所有可修复项
    const fixableItems = [];
    for (const group of results) {
      for (const item of group.items) {
        if (item.fixable && (item.status === "fail" || item.status === "warn")) {
          fixableItems.push({ ...item, checkerName: group.name, checker: group.checker });
        }
      }
    }

    if (fixableItems.length === 0) {
      log.info("没有可自动修复的问题");
      return;
    }

    log.info(`发现 ${fixableItems.length} 项可修复的问题`);

    // 按 checker 分组，逐项确认并修复
    const groupedByChecker = {};
    for (const item of fixableItems) {
      if (!groupedByChecker[item.checkerName]) {
        groupedByChecker[item.checkerName] = { checker: item.checker, items: [] };
      }
      groupedByChecker[item.checkerName].items.push(item);
    }

    for (const [checkerName, group] of Object.entries(groupedByChecker)) {
      const confirmedItems = [];
      for (const item of group.items) {
        const { confirm } = await prompt({
          type: "confirm",
          name: "confirm",
          default: true,
          message: `是否修复：${item.label}（${item.message}）？`,
        });
        if (confirm) {
          confirmedItems.push(item);
        } else {
          log.info(`跳过修复：${item.label}`);
        }
      }

      if (confirmedItems.length > 0 && group.checker.fix) {
        try {
          const fixResults = await group.checker.fix(confirmedItems);
          for (const result of fixResults) {
            if (result.success) {
              log.success(`修复成功：${result.label} — ${result.message}`);
            } else {
              log.error(`修复失败：${result.label} — ${result.message}，请手动处理`);
            }
          }
        } catch (err) {
          log.error(`${checkerName} 修复异常：${err.message}`);
        }
      }
    }
  }
}

function init(args) {
  return new DoctorCommand(args);
}

module.exports = init;
module.exports.DoctorCommand = DoctorCommand;
```

- [ ] **Step 3: 安装依赖**

Run: `cd commands/doctor && npm install`

- [ ] **Step 4: Commit**

```bash
git add commands/doctor/package.json commands/doctor/lib/index.js
git commit -m "feat(doctor): 创建 doctor 命令包骨架"
```

---

### Task 2: 实现 env-checker（环境检查）

**Files:**
- Create: `commands/doctor/lib/checkers/env-checker.js`

- [ ] **Step 1: 创建 env-checker.js**

```javascript
"use strict";

const { execSync } = require("child_process");
const path = require("path");
const { semver, pathExists, LOWEST_NODE_VERSION } = require("@cjp-cli-dev/utils");

const CWD = process.cwd();

module.exports = {
  name: "环境检查",

  async check() {
    const items = [];

    // 1. Node.js 版本检查
    const currentNodeVersion = process.version;
    let requiredNodeVersion = `>=${LOWEST_NODE_VERSION}`;
    // 尝试从项目 package.json 的 engines 读取
    const pkgPath = path.resolve(CWD, "package.json");
    if (pathExists(pkgPath)) {
      try {
        const pkg = require(pkgPath);
        if (pkg.engines && pkg.engines.node) {
          requiredNodeVersion = pkg.engines.node;
        }
      } catch (e) { /* ignore */ }
    }

    const nodeOk = semver.satisfies(currentNodeVersion, requiredNodeVersion);
    items.push({
      label: "Node.js 版本",
      status: nodeOk ? "pass" : "fail",
      message: `${currentNodeVersion} (要求 ${requiredNodeVersion})`,
      fixable: false,
    });

    // 2. npm 版本检查
    try {
      const npmVersion = execSync("npm -v", { encoding: "utf-8" }).trim();
      let npmStatus = "pass";
      let npmMsg = npmVersion;

      if (pathExists(pkgPath)) {
        try {
          const pkg = require(pkgPath);
          if (pkg.engines && pkg.engines.npm) {
            const npmOk = semver.satisfies(npmVersion, pkg.engines.npm);
            npmStatus = npmOk ? "pass" : "warn";
            npmMsg = `${npmVersion} (要求 ${pkg.engines.npm})`;
          }
        } catch (e) { /* ignore */ }
      }

      items.push({
        label: "npm 版本",
        status: npmStatus,
        message: npmMsg,
        fixable: false,
      });
    } catch (e) {
      items.push({
        label: "npm 版本",
        status: "warn",
        message: "无法获取 npm 版本",
        fixable: false,
      });
    }

    // 3. 包管理器识别
    const lockFiles = [
      { file: "package-lock.json", manager: "npm" },
      { file: "yarn.lock", manager: "yarn" },
      { file: "pnpm-lock.yaml", manager: "pnpm" },
    ];
    const detected = lockFiles.find((l) => pathExists(path.resolve(CWD, l.file)));
    items.push({
      label: "包管理器",
      status: "pass",
      message: detected
        ? `${detected.manager} (${detected.file})`
        : "未检测到 lock 文件",
      fixable: false,
    });

    return items;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add commands/doctor/lib/checkers/env-checker.js
git commit -m "feat(doctor): 实现 env-checker 环境检查"
```

---

### Task 3: 实现 deps-checker（依赖检查）

**Files:**
- Create: `commands/doctor/lib/checkers/deps-checker.js`

- [ ] **Step 1: 创建 deps-checker.js**

```javascript
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

    // 前置检查：node_modules 是否存在
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
      // npm outdated 在有过期依赖时会返回非0退出码
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
      // npm outdated 在有过期依赖时退出码非0，stdout 仍包含 JSON
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
        // 前置检查
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
```

- [ ] **Step 2: Commit**

```bash
git add commands/doctor/lib/checkers/deps-checker.js
git commit -m "feat(doctor): 实现 deps-checker 依赖检查"
```

---

### Task 4: 实现 lint-checker（规范检查）

**Files:**
- Create: `commands/doctor/lib/checkers/lint-checker.js`

- [ ] **Step 1: 创建 lint-checker.js**

```javascript
"use strict";

const fs = require("fs");
const path = require("path");
const { pathExists } = require("@cjp-cli-dev/utils");
const log = require("@cjp-cli-dev/log");

const CWD = process.cwd();

// ESLint 配置文件模式
const ESLINT_FILES = [
  ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml", ".eslintrc.yaml", ".eslintrc",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
];

// Prettier 配置文件模式
const PRETTIER_FILES = [
  ".prettierrc", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.json",
  ".prettierrc.yml", ".prettierrc.yaml", ".prettierrc.toml", "prettier.config.js", "prettier.config.cjs",
];

// CommitLint 配置文件模式
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
      // ESLint / Prettier 通过 codelint 一起安装
      if (item.label === "ESLint" || item.label === "Prettier") {
        // 前置检查：如果已配置则跳过
        const hasEslint = hasConfigFile(ESLINT_FILES) || hasPackageJsonField("eslintConfig");
        if (hasEslint) {
          results.push({ label: item.label, success: true, message: "已配置，跳过" });
          continue;
        }
        try {
          const codelint = require("@cjp-cli-dev/codelint");
          // 模拟传入 --install 参数
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
```

- [ ] **Step 2: Commit**

```bash
git add commands/doctor/lib/checkers/lint-checker.js
git commit -m "feat(doctor): 实现 lint-checker 规范检查"
```

---

### Task 5: 实现 structure-checker（项目结构检查）

**Files:**
- Create: `commands/doctor/lib/checkers/structure-checker.js`

- [ ] **Step 1: 创建 structure-checker.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add commands/doctor/lib/checkers/structure-checker.js
git commit -m "feat(doctor): 实现 structure-checker 项目结构检查"
```

---

### Task 6: 实现 git-checker（Git 状态检查）

**Files:**
- Create: `commands/doctor/lib/checkers/git-checker.js`

- [ ] **Step 1: 创建 git-checker.js**

```javascript
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
        const changedFiles = statusOutput.split("\n").length;
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

    // 当前分支（已在上面的 Git 仓库项中输出）
    items.push({
      label: "当前分支",
      status: "pass",
      message: branchName || "unknown",
      fixable: false,
    });

    return items;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add commands/doctor/lib/checkers/git-checker.js
git commit -m "feat(doctor): 实现 git-checker Git 状态检查"
```

---

### Task 7: 实现 reporter（终端报告渲染）

**Files:**
- Create: `commands/doctor/lib/reporter.js`

- [ ] **Step 1: 创建 reporter.js**

```javascript
"use strict";

const { colors } = require("@cjp-cli-dev/utils");

// 状态图标
const STATUS_ICONS = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
  skip: "-",
};

// 状态颜色
const STATUS_COLORS = {
  pass: "green",
  warn: "yellow",
  fail: "red",
  skip: "gray",
};

function renderReport(results) {
  const lineWidth = 50;
  const border = "═".repeat(lineWidth);

  console.log();
  console.log(`╔${border}╗`);
  console.log(`║${centerText("cjp-cli-dev 项目体检报告", lineWidth)}║`);
  console.log(`╠${border}╣`);

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let fixableCount = 0;

  for (const group of results) {
    console.log(`║${padRight(` ${group.name}`, lineWidth)}║`);

    for (const item of group.items) {
      const icon = STATUS_ICONS[item.status] || "?";
      const colorFn = STATUS_COLORS[item.status] || "white";
      const fixTag = item.fixable ? " [可修复]" : "";
      const line = `   ${icon} ${item.label}: ${item.message}${fixTag}`;

      console.log(`║${colors[colorFn](padRight(line, lineWidth))}║`);

      // 统计
      if (item.status === "pass") passCount++;
      else if (item.status === "warn") warnCount++;
      else if (item.status === "fail") failCount++;
      else if (item.status === "skip") skipCount++;

      if (item.fixable && (item.status === "fail" || item.status === "warn")) {
        fixableCount++;
      }
    }
  }

  console.log(`╠${border}╣`);
  const summary = ` 总计: ${passCount} 通过 / ${warnCount} 警告 / ${failCount} 不通过`;
  console.log(`║${padRight(summary, lineWidth)}║`);

  if (fixableCount > 0) {
    const fixSummary = ` 其中 ${fixableCount} 项可通过 --fix 自动修复`;
    console.log(`║${padRight(fixSummary, lineWidth)}║`);
  }

  if (skipCount > 0) {
    const skipSummary = ` ${skipCount} 项跳过`;
    console.log(`║${colors.gray(padRight(skipSummary, lineWidth))}║`);
  }

  console.log(`╚${border}╝`);
  console.log();
}

function padRight(str, width) {
  // 中文字符占2个宽度
  const strWidth = getStringWidth(str);
  if (strWidth >= width) return str.substring(0, width);
  return str + " ".repeat(width - strWidth);
}

function centerText(str, width) {
  const strWidth = getStringWidth(str);
  const padding = Math.max(0, Math.floor((width - strWidth) / 2));
  const right = Math.max(0, width - strWidth - padding);
  return " ".repeat(padding) + str + " ".repeat(right);
}

function getStringWidth(str) {
  let width = 0;
  for (const char of str) {
    // CJK 字符占 2 个宽度
    if (char.charCodeAt(0) > 0x7f) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

module.exports = { renderReport };
```

- [ ] **Step 2: Commit**

```bash
git add commands/doctor/lib/reporter.js
git commit -m "feat(doctor): 实现 reporter 终端报告渲染"
```

---

### Task 8: 注册 doctor 命令到脚手架

**Files:**
- Modify: `core/exec/lib/index.js:17-31`
- Modify: `core/cli/lib/index.js`

- [ ] **Step 1: 在 exec SETTINGS 中添加 doctor 映射**

在 `core/exec/lib/index.js` 的 SETTINGS 对象中添加：

```javascript
  "delete-branch": "@cjp-cli-dev/delete-branch",
  doctor: "@cjp-cli-dev/doctor",
```

- [ ] **Step 2: 在 cli 中注册 doctor 命令**

在 `core/cli/lib/index.js` 的 `registerCommander()` 函数中，在 `clean` 命令之前添加：

```javascript
  // 项目体检
  program
    .command("doctor")
    .description("对当前项目进行全面体检，输出健康报告")
    .option("-f, --fix", "检查后逐项确认并自动修复可修复的问题", false)
    .action(exec);
```

- [ ] **Step 3: 在 description.js 中补充 doctor 描述**

在 `core/cli/lib/description.js` 的描述模板末尾 `server` 之后添加：

```
14. doctor：对当前项目进行全面体检，检查运行环境、依赖安全、代码规范、项目结构和Git状态，输出结构化健康报告，支持--fix自动修复可修复的问题。
```

- [ ] **Step 4: Commit**

```bash
git add core/exec/lib/index.js core/cli/lib/index.js core/cli/lib/description.js
git commit -m "feat(doctor): 注册 doctor 命令到脚手架"
```

---

### Task 9: 安装依赖并本地调试验证

- [ ] **Step 1: 安装 doctor 包依赖**

Run: `cd commands/doctor && npm install`

- [ ] **Step 2: 重新 link 全局命令**

Run: `cd core/cli && npm link`

- [ ] **Step 3: 验证命令注册成功**

Run: `cjp-cli-dev doctor --help`

Expected: 输出 doctor 命令帮助信息，包含 `--fix` 选项

- [ ] **Step 4: 在当前项目根目录运行 doctor**

Run: `cd D:/personal/cli/cjp-cli-dev && cjp-cli-dev doctor --debug`

Expected: 输出彩色体检报告，包含环境检查、依赖检查、规范检查、项目结构、Git 状态 5 个分组

- [ ] **Step 5: 验证 --fix 流程**

Run: `cjp-cli-dev doctor --fix --debug`

Expected: 对可修复项逐项询问用户确认，执行修复后输出结果

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(doctor): 完成 doctor 命令实现和本地调试验证"
```
