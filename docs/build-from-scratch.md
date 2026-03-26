# 从零到一搭建 cjp-cli-dev 脚手架

> 本文档记录了 cjp-cli-dev 脚手架从零开始搭建的完整过程，包括环境准备、模块规划、逐步实现直到本地调试成功的每一步。

---

## 一、环境准备

### 1.1 开发环境版本

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 16.20.2 | 脚手架最低要求 >= 16.0.0 |
| npm | 8.19.4 | 配套 Node 16 的 npm 版本 |
| Lerna | 6.6.2 | 多包管理工具（注意：8.x 版本存在兼容问题，必须使用 6.x） |
| Git | - | 版本管理 |
| 操作系统 | Windows / macOS 均可 | 项目做了跨平台兼容 |

### 1.2 为什么选择这些版本

- **Node 16**：LTS 长期支持版本，稳定性好，且大部分 npm 包兼容
- **Lerna 6.6.2**：项目初期曾尝试 Lerna 8.x，但发现无法正常使用，回退到 6.x（对应 git 提交：`3ef13ba feat: 8.x版本无法正常使用，更换6.x版本lerna`）

---

## 二、模块规划

在写第一行代码之前，先规划好整体目录结构。将脚手架拆分为四个职责分明的包目录：

```
cjp-cli-dev/
├── core/        # 脚手架核心（入口 + 执行引擎）
├── commands/    # 具体命令的实现
├── models/      # 可复用的功能模型
├── utils/       # 工具函数
└── lerna.json   # Lerna 配置
```

**设计原则：**

- **单一职责**：每个包只做一件事，如 `log` 只管日志，`package` 只管包的下载和缓存
- **依赖方向单一**：core → commands → models → utils，上层依赖下层，下层不依赖上层
- **可独立发布**：每个包是独立的 npm 包，可以单独版本管理和发布

---

## 三、Step by Step 搭建过程

### Step 1：初始化项目与 Lerna 配置

```bash
# 创建项目目录
mkdir cjp-cli-dev && cd cjp-cli-dev

# 初始化 git
git init

# 初始化根 package.json（设为 private 防止根包被发布）
npm init -y
```

编辑根 `package.json`：

```json
{
  "name": "root",
  "private": true,
  "devDependencies": {
    "lerna": "^6.6.2"
  },
  "engines": {
    "node": "16.20.2",
    "npm": "8.19.4"
  }
}
```

安装 Lerna 并初始化：

```bash
npm install

# 初始化 lerna（会生成 lerna.json）
npx lerna init
```

编辑 `lerna.json`，配置四个包目录：

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "1.0.0",
  "packages": [
    "core/*",
    "models/*",
    "commands/*",
    "utils/*"
  ]
}
```

> `version` 使用 Fixed 模式（统一版本号），所有包共享同一个版本号，便于管理。

创建 `.gitignore`：

```
node_modules/
.idea/
.vscode/
*.log
```

---

### Step 2：创建核心入口包 `core/cli`

这是整个脚手架的第一个也是最重要的包。

```bash
# 使用 lerna 创建包（自动生成标准目录结构）
npx lerna create @cjp-cli-dev/core ./core/

# 将目录重命名为 cli（语义更清晰）
# 最终结构：core/cli/
```

编辑 `core/cli/package.json`，重点是配置 `bin` 字段：

```json
{
  "name": "@cjp-cli-dev/core",
  "version": "1.0.0",
  "bin": {
    "cjp-cli-dev": "bin/index.js"
  },
  "main": "lib/index.js",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.com/"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "dotenv": "^16.4.5",
    "import-local": "^3.2.0",
    "root-check": "^1.0.0"
  }
}
```

**关键配置说明：**

- `bin`：声明可执行命令。安装后在终端输入 `cjp-cli-dev` 就会执行 `bin/index.js`
- `publishConfig.access: "public"`：npm 默认不允许发布 scoped 包（`@cjp-cli-dev/xxx`），需要设为 public
- `import-local`：当项目本地也安装了脚手架时，优先使用本地版本

创建 `core/cli/bin/index.js`（CLI 入口）：

```javascript
#! /usr/bin/env node

const importLocal = require("import-local");
const log = require("@cjp-cli-dev/log");

if (importLocal(__filename)) {
  log.info("当前项目中已安装 cjp-cli-dev 脚手架，正在使用本地版本");
} else {
  require("../lib")(process.argv.slice(2));
}
```

**注意第一行 `#! /usr/bin/env node`**：这是 shebang 声明，告诉操作系统用 node 来执行这个文件。没有这行，`npm link` 后在终端执行命令会报错。

---

### Step 3：创建日志包 `utils/log`

脚手架需要一个统一的日志模块，这是最先创建的工具包。

```bash
npx lerna create @cjp-cli-dev/log ./utils/
```

编辑 `utils/log/lib/index.js`：

```javascript
"use strict";

const log = require("npmlog");

// 日志级别由环境变量控制，debug 模式下显示 verbose 级别
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

// 添加前缀标识
log.heading = "cjp-cli-dev 脚手架";
log.headingStyle = { fg: "white", bg: "green" };

// 定制自定义日志级别
log.addLevel("success", 2000, { fg: "green", bg: "", bold: true });
log.addLevel("notice", 2000, { fg: "blue", bg: "black" });

module.exports = log;
```

**为什么基于 npmlog 而不是 console.log？**

- 支持级别控制：正常模式只显示 info 以上，debug 模式显示全部
- 支持前缀和颜色：终端输出更具辨识度
- npm 官方也使用 npmlog，风格统一

---

### Step 4：创建工具包 `utils/utils`

存放脚手架的公共常量和工具方法。

```bash
npx lerna create @cjp-cli-dev/utils ./utils/
```

先创建常量配置文件 `utils/utils/lib/cli-const.js`：

```javascript
const CLI_NAME = "cjp-cli-dev";
const DEFAULT_CLI_HOME = ".cjp-cli-dev";
const LOWEST_NODE_VERSION = "16.0.0";
const DEPENDENCIES_CACHE_DIR = "dependencies";
const TEMPLATE_CACHE_DIR = "template";
const DEFAULT_NPM_REGISTRY = "https://registry.npmmirror.com/";

module.exports = {
  CLI_NAME,
  DEFAULT_CLI_HOME,
  DEPENDENCIES_CACHE_DIR,
  TEMPLATE_CACHE_DIR,
  DEFAULT_NPM_REGISTRY,
  LOWEST_NODE_VERSION,
};
```

然后在 `utils/utils/lib/index.js` 统一导出所有工具方法和常量。工具包聚合了多个第三方库的二次封装：

- `inquirer` → 终端交互
- `semver` → 版本号处理
- `fs-extra` → 文件操作
- `ejs` → 模板渲染
- `cross-spawn` → 跨平台进程创建
- `glob` → 文件匹配

> 这些第三方库最初散落在各个包中，后来做了一次优化提取，统一放到 utils 包中（对应 git 提交 `e428480 perf: 将inquirer prompt封装到公共utils包中` 等一系列提交）。

---

### Step 5：创建路径兼容包 `utils/format-path`

```bash
npx lerna create @cjp-cli-dev/format-path ./utils/
```

`utils/format-path/lib/index.js`：

```javascript
"use strict";

const path = require("path");

function formatPath(p) {
  if (p && typeof p === "string") {
    const sep = path.sep; // macOS 返回 /，Windows 返回 \
    if (sep === "/") {
      return p;
    } else {
      return p.replace(/\\/g, "/");
    }
  }
  return p;
}

module.exports = formatPath;
```

**为什么需要这个包？** Windows 使用反斜杠 `\` 作为路径分隔符，而 `require()` 和大部分 npm 包期望正斜杠 `/`。不做转换会导致动态 require 失败。

---

### Step 6：创建 NPM 信息获取包 `utils/get-npm-info`

```bash
npx lerna create @cjp-cli-dev/get-npm-info ./utils/
```

这个包负责与 npm Registry API 交互，核心能力是查询包的版本信息：

```javascript
// 通过 npm Registry API 获取包信息
// 原理：访问 https://registry.npmmirror.com/@cjp-cli-dev/core 获取 JSON
function getNpmInfo(npmName, registry) {
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios.get(npmInfoUrl).then((res) => {
    if (res.status === 200) return res.data;
    return null;
  });
}

// 获取满足 semver 范围的最新版本
function getSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => semver.compare(b, a));
}
```

**用途：**
1. 脚手架启动时检查是否有新版本
2. 命令包下载时获取最新版本号

---

### Step 7：创建 HTTP 请求包 `utils/request`

```bash
npx lerna create @cjp-cli-dev/request ./utils/
```

基于 axios 封装，支持通过环境变量配置接口地址：

```javascript
const BASE_URL = process.env.CJP_CLI_DEV_BASE_URL || "http://cjp.clidev.xyz:7001";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err)
);
```

---

### Step 8：实现 CLI 主流程 `core/cli/lib/index.js`

这是脚手架的大脑，实现了启动准备和命令注册两个核心阶段。

**准备阶段 `prepare()`：**

```javascript
async function prepare() {
  checkCliVersion();    // 1. 输出当前脚手架版本
  checkRoot();          // 2. 检查 root 权限并降级
  checkUserHome();      // 3. 检查用户主目录是否存在
  checkEnv();           // 4. 加载 ~/.env 环境变量
  await checkGlobalUpdate(); // 5. 检查脚手架是否有新版本
}
```

**命令注册 `registerCommander()`：**

使用 Commander.js 注册所有命令。以 init 命令为例：

```javascript
const program = new commander.Command();

program
  .name(Object.keys(pkg.bin)[0])  // 程序名：cjp-cli-dev
  .usage("<command> [options]")
  .version(pkg.version)
  .option("-dbg, --debug", "是否开启调试模式", false)
  .option("-tp, --targetPath <targetPath>", "指定本地调试文件路径", "");

// 注册 init 命令
program
  .command("init [projectName]")
  .description("创建标准项目模板、自定义项目模板、组件库模板")
  .option("-f, --force", "是否强制初始化项目")
  .action(exec);  // exec 来自 core/exec，负责动态加载和执行

// 监听 debug 参数，动态切换日志级别
program.on("option:debug", function () {
  const options = program.opts();
  process.env.LOG_LEVEL = options.debug ? "verbose" : "info";
  log.level = process.env.LOG_LEVEL;
});

// 解析命令行参数
program.parse(process.argv);
```

---

### Step 9：创建命令基类 `models/command`

```bash
npx lerna create @cjp-cli-dev/command ./models/
```

这是所有命令的父类，定义了统一的生命周期：

```javascript
class Command {
  constructor(args) {
    if (!args) throw new Error("参数不能为空");
    if (!Array.isArray(args)) throw new Error("参数格式必须是Array");
    if (args.length < 1) throw new Error("参数列表不能为空");

    this._args = args;

    // Promise 链控制生命周期顺序
    let chain = Promise.resolve();
    chain = chain.then(() => this.checkNodeVersion());
    chain = chain.then(() => this.initArgs());
    chain = chain.then(() => this.init());   // 子类必须实现
    chain = chain.then(() => this.exec());   // 子类必须实现
    chain.catch((err) => { log.error(err.message); });
  }

  // 子类不实现则报错 —— 模拟抽象方法
  init() {
    throw new Error("子类中 init 方法必须实现！");
  }
  exec() {
    throw new Error("子类中 exec 方法必须实现！");
  }
}
```

---

### Step 10：创建 Package 模型 `models/package`

```bash
npx lerna create @cjp-cli-dev/package ./models/
```

Package 类封装了 npm 包的下载、缓存、更新、入口文件查找：

```javascript
class Package {
  constructor(options) {
    this.targetPath = options.targetPath;       // 包路径
    this.storeDir = options.storeDir;           // 缓存目录（node_modules）
    this.packageName = options.packageName;     // 包名
    this.packageVersion = options.packageVersion; // 版本号
    this.registry = options.registry;           // npm 源
    // npminstall 缓存路径前缀：@scope/name → @scope+name
    this.cacheFilePathPrefix = this.packageName.replace("/", "+");
  }

  // 缓存路径：node_modules/.store/@scope+name@version/node_modules/@scope/name
  get cacheFilePath() {
    return path.resolve(
      this.storeDir, ".store",
      `${this.cacheFilePathPrefix}@${this.packageVersion}`,
      "node_modules", this.packageName
    );
  }

  async install() {
    await this.prepare();
    await npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: this.registry || getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }

  // 获取入口文件：读取 package.json 的 main 字段
  getRootFilePath() {
    function _getRootFile(targetPath) {
      const dir = pkgDir(targetPath);
      if (dir) {
        const pkgFile = require(path.resolve(dir, "package.json"));
        if (pkgFile && (pkgFile.main || pkgFile.lib)) {
          return formatPath(path.resolve(dir, pkgFile.main || pkgFile.lib));
        }
      }
      return null;
    }
    return this.storeDir ? _getRootFile(this.cacheFilePath) : _getRootFile(this.targetPath);
  }
}
```

---

### Step 11：创建执行引擎 `core/exec`

```bash
npx lerna create @cjp-cli-dev/exec ./core/
```

exec 是连接 CLI 入口和命令实现的桥梁，核心是**命令映射表 + 动态加载 + 子进程执行**：

```javascript
// 命令 → npm 包名映射表
const SETTINGS = {
  init: "@cjp-cli-dev/init",
  publish: "@cjp-cli-dev/publish",
  add: "@cjp-cli-dev/add",
  // ... 更多命令
};

async function exec() {
  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];

  let targetPath = process.env.CLI_TARGET_PATH;

  if (!targetPath) {
    // 走缓存模式：下载/更新命令包
    targetPath = path.resolve(homePath, DEPENDENCIES_CACHE_DIR);
    const storeDir = path.resolve(targetPath, "node_modules");

    const pkg = new Package({ targetPath, storeDir, packageName, packageVersion: "latest" });

    if (await pkg.exists()) {
      await pkg.update();  // 已存在则检查更新
    } else {
      await pkg.install(); // 不存在则安装
    }
  }

  // 找到入口文件，在子进程中执行
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
    const child = spawn("node", ["-e", code], {
      cwd: process.cwd(),
      stdio: "inherit", // 子进程输出直接显示在终端
    });
  }
}
```

---

### Step 12：创建第一个命令 —— `commands/init`

```bash
npx lerna create @cjp-cli-dev/init ./commands/
```

init 命令继承 Command 基类，实现三个核心流程：

```javascript
class InitCommand extends Command {
  init() {
    this.projectName = this._args[0] || "";
    this.force = this._args[1].force || false;
  }

  async exec() {
    // 1. 准备阶段：检查目录、选择模板类型、输入项目信息
    const projectInfo = await this.prepare();
    if (!projectInfo) return;

    // 2. 下载模板：通过 Package 模型从 npm 下载模板包
    await this.downloadTemplate();

    // 3. 安装模板：拷贝文件 + EJS 渲染 + 执行安装命令
    await this.installTemplate();
  }
}

// 导出工厂函数
function init(args) {
  return new InitCommand(args);
}
module.exports = init;
```

---

### Step 13：安装所有依赖并创建全局软链

所有包创建完成后，需要安装依赖并将 CLI 注册到全局。

**方法一：手动安装（早期做法）**

```bash
# 逐个进入子包目录安装依赖
cd utils/log && npm install
cd utils/utils && npm install
cd utils/format-path && npm install
cd utils/get-npm-info && npm install
cd utils/request && npm install
cd models/command && npm install
cd models/package && npm install
cd core/exec && npm install
cd core/cli && npm install

# 创建全局软链（关键步骤！）
cd core/cli
npm link
```

**方法二：自动化脚本（后续优化）**

后来写了 `scripts/install-deps.js` 自动化这个过程：

```javascript
const DIRS = ['commands', 'core', 'models', 'utils'];

async function main() {
  // 1. 清理所有子包的 node_modules
  DIRS.forEach(dir => {
    // 遍历每个子目录，删除 node_modules
  });

  // 2. 逐个安装依赖
  DIRS.forEach(dir => {
    // 遍历每个子包，执行 npm install
    execSync('npm install', { cwd: packagePath, stdio: 'inherit' });
  });

  // 3. 创建全局软链
  execSync('npm link', { cwd: path.join(ROOT_DIR, 'core/cli'), stdio: 'inherit' });
}
```

在根 `package.json` 中注册脚本：

```json
{
  "scripts": {
    "reinstall": "node scripts/install-deps.js"
  }
}
```

此后只需一条命令：

```bash
npm run reinstall
```

---

### Step 14：本地调试验证

安装软链后，在终端验证：

```bash
# 检查命令是否注册成功
cjp-cli-dev -v
# 输出：1.0.0

# 查看帮助信息
cjp-cli-dev -h

# 测试 init 命令（debug 模式）
cjp-cli-dev init test-project --debug

# 使用 targetPath 指向本地命令包调试
cjp-cli-dev init --targetPath D:/personal/cli/cjp-cli-dev/commands/init --debug
```

**调试技巧：**

1. `--debug` 参数开启 verbose 日志，查看完整执行链路
2. `--targetPath` 跳过 npm 下载，直接使用本地代码
3. 修改命令代码后无需重新 link，直接生效（因为 `npm link` 创建的是符号链接）

---

## 四、后续功能开发时间线

根据 git 提交历史，以下是功能的开发先后顺序：

### 第一阶段：核心骨架（v1.0.0 ~ v1.0.6）

| 顺序 | 内容 | 关键提交 |
|------|------|----------|
| 1 | 项目初始化、Lerna 配置 | `38925e9 feat: init` |
| 2 | Lerna 8.x → 6.x 降级 | `3ef13ba feat: 8.x版本无法正常使用，更换6.x版本lerna` |
| 3 | 添加 bin 入口 | `d91d315 feat: 添加bin` |
| 4 | 创建 log 包 | `7adebd5 feat: 添加log包` |
| 5 | 创建 get-npm-info 包 | `91b6cd9 feat: 新增get-npm-info包` |
| 6 | 创建 init 包 | `5ce84bb 添加@cjp-cli-dev/init包` |
| 7 | 创建 format-path 包 | `00e425a feat: 添加format-path包` |
| 8 | 完成 Package 安装/更新 | `8ababd4 feat: 完成package安装和更新逻辑` |
| 9 | 创建 Command 基类 | `1472b99 feat: 添加command包` |
| 10 | 创建 request 包 | `9ec785b feat: 添加request包` |

### 第二阶段：init 命令完善（v1.0.6 ~ v1.0.6）

| 顺序 | 内容 | 关键提交 |
|------|------|----------|
| 11 | 目录检查与强制覆盖 | `38a51e6 feat: 完成init包询问和强制覆盖创建项目功能` |
| 12 | 模板下载和更新 | `92521ad feat: 完善init包，实现下载、更新npm包功能` |
| 13 | 模板安装与拷贝 | `1f53337 feat: 修复安装模板未拷贝模板内容` |
| 14 | 依赖安装 + 项目启动 | `c9be60a feat: 新增自动执行依赖安装和启动项目功能` |
| 15 | 命令白名单安全机制 | `f3089ec feat: 添加命令白名单功能，非白名单将拦截` |
| 16 | EJS 模板渲染 | `cd9c0d7 feat: 新增ejs渲染模板功能` |
| 17 | 自定义模板支持 | `dccb7ce feat: 自定义模板安装` |

### 第三阶段：publish 与 Git 自动化（v1.0.5 ~ v1.0.16）

| 顺序 | 内容 | 关键提交 |
|------|------|----------|
| 18 | 创建 publish + git 包 | `b63c683 feat: 添加publish包` |
| 19 | Git 平台选择 | `5f83a44 feat: 添加git包，完成选择git托管平台功能` |
| 20 | Gitee/GitHub 仓库创建 | `fe30f55 feat: 完成gitee创建远程仓库功能` |
| 21 | 代码自动提交 + 冲突检查 | `bced633 feat: 完成代码冲突检查、代码自动提交...` |
| 22 | CloudBuild Socket 通信 | `fb302a0 feat: 云构建socket连接` |
| 23 | 云构建完成 | `0bcc9a0 feat: 完成代码云构建功能` |
| 24 | OSS 上传 + 生产发布 | `2a47e12 feat: 阿里oss上传代码` |

### 第四阶段：add 命令（v1.0.7 ~ v1.0.8）

| 顺序 | 内容 | 关键提交 |
|------|------|----------|
| 25 | add 命令基础功能 | `d259b69 feat: 添加add命令包` |
| 26 | 页面模板安装 | `eacff9f feat: 添加add命令，完成安装页面模板能力` |
| 27 | 依赖合并 | `b626167 feat: 完成模板依赖合并、自动安装模板依赖功能` |
| 28 | 代码片段插入 | `b9890cb feat: 完成选择源码文件、插入行号、插入组件内容` |

### 第五阶段：工程化命令（v1.1.0 ~ v1.7.5）

| 顺序 | 内容 | 版本 |
|------|------|------|
| 29 | rollback 版本回滚 | v1.1.0 |
| 30 | delete-branch 分支删除 | v1.1.3 |
| 31 | gitflow 分支模型 | v1.2.0 |
| 32 | release 版本升级 + CHANGELOG | v1.2.1 |
| 33 | husky Git Hooks 配置 | v1.3.0 |
| 34 | commitlint 提交规范 | v1.4.0 |
| 35 | codelint 代码规范 | v1.5.0 |
| 36 | resume 简历生成 | v1.6.0 |
| 37 | server 静态资源服务 | v1.7.0 |

### 第六阶段：代码优化

| 内容 | 关键提交 |
|------|----------|
| 将 inquirer 提取到公共 utils | `e428480 perf: 将inquirer prompt封装到公共utils包中` |
| 将 semver 提取到公共 utils | `30ade78 perf: 将semver封装到公共utils包中` |
| 将 fs-extra 提取到公共 utils | `83740f0 perf: 将fs-extra封装到公共utils包中` |
| 将 glob/ejs 提取到公共 utils | `43424f8` / `83a46ab` |
| 自动安装脚本替代 lerna bootstrap | `ef73d6f feat: 新增自动安装子包依赖脚本` |

---

## 五、新增命令的完整操作流程（以 server 为例）

当核心骨架搭好后，新增一个命令的标准流程如下：

### 5.1 创建包

```bash
npx lerna create @cjp-cli-dev/server ./commands/
```

### 5.2 声明依赖

编辑 `commands/server/package.json`：

```json
{
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "express": "^4.21.1",
    "http-proxy-middleware": "^3.0.3"
  }
}
```

### 5.3 实现命令

`commands/server/lib/index.js`：

```javascript
const Command = require("@cjp-cli-dev/command");

class ServerCommand extends Command {
  init() {
    this.port = this._args[0].port || 3000;
  }
  async exec() {
    // 启动 express 静态服务的具体逻辑
  }
}

function server(args) {
  return new ServerCommand(args);
}
module.exports = server;
```

### 5.4 注册到 exec 映射表

`core/exec/lib/index.js`：

```javascript
const SETTINGS = {
  // ... 其他命令
  server: "@cjp-cli-dev/server",
};
```

### 5.5 注册到 CLI

`core/cli/lib/index.js`：

```javascript
program
  .command("server")
  .description("启动本地静态资源托管服务，支持配置http请求代理")
  .option("-p, --port <port>", "指定启动服务的端口", 3000)
  .action(exec);
```

### 5.6 安装依赖并调试

```bash
cd commands/server && npm install

# 本地调试
cjp-cli-dev server --targetPath D:/personal/cli/cjp-cli-dev/commands/server --debug --port 8080
```

### 5.7 发布

```bash
npm login --registry https://registry.npmjs.com/
lerna version
lerna publish
```

---

## 六、踩坑记录

### 坑 1：Lerna 8.x 无法正常使用

**现象：** 使用 Lerna 8.x 初始化后，各种命令报错。

**解决：** 回退到 6.6.2。`"lerna": "^6.6.2"`

### 坑 2：lerna bootstrap 软链失败

**现象：** 执行 `lerna bootstrap` 后，子包之间的 `file:` 协议依赖无法正确解析。

**解决：** 放弃 `lerna bootstrap`，编写 `scripts/install-deps.js` 逐包安装。

### 坑 3：scoped 包发布 402

**现象：** `lerna publish` 报错 402 Forbidden。

**原因：** npm 默认不允许发布 scoped 包（`@cjp-cli-dev/xxx`）到公共仓库。

**解决：** 每个包的 `package.json` 添加 `"publishConfig": { "access": "public" }`。

### 坑 4：Windows spawn 路径错误

**现象：** 在 Windows 上 `child_process.spawn` 执行命令找不到路径。

**解决：** 使用 `cross-spawn` 替代原生 `spawn`，它内部处理了 Windows 的 `.cmd` 文件查找和路径转义。

### 坑 5：package-lock.json 导致 lerna publish 失败

**现象：** `lerna publish` 报错 Git 工作目录不干净。

**原因：** `lerna version` 修改了 package-lock.json 但没有被 commit。

**解决：** 确保 `.gitignore` 不忽略 `package-lock.json`，或在 publish 前手动 commit。

### 坑 6：puppeteer 自动下载 Chromium 导致卡死

**现象：** resume 命令安装 puppeteer 时会自动下载 Chromium 浏览器，体积巨大且经常超时。

**解决：** 将 `puppeteer` 替换为 `puppeteer-core`，由用户指定本地 Chrome 路径。
