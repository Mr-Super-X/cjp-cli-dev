# CLI 核心入口设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：`@cjp-cli-dev/core` 是整个脚手架的入口包，负责环境检查、命令注册、参数解析和全局事件监听。

---

## 1. 包定义

| 属性 | 值 |
|------|-----|
| 包名 | `@cjp-cli-dev/core` |
| 版本 | `1.7.4` |
| 可执行命令 | `cjp-cli-dev`（通过 `bin` 字段注册） |
| 入口文件 | `lib/index.js` |

## 2. 目录结构

```
core/cli/
├── package.json
├── bin/
│   └── index.js              # CLI 可执行入口（shebang 声明 + import-local 优先检测）
├── lib/
│   ├── index.js              # 主流程：prepare() + registerCommander()
│   ├── description.js        # 脚手架功能描述模板（用于 --help 输出）
│   └── execClean.js          # clean 命令实现（清理缓存）
└── __tests__/
    └── core.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/core",
  "bin": {
    "cjp-cli-dev": "bin/index.js"
  },
  "main": "lib/index.js",
  "dependencies": {
    "@cjp-cli-dev/exec": "file:../exec",
    "@cjp-cli-dev/get-npm-info": "file:../../utils/get-npm-info",
    "@cjp-cli-dev/init": "file:../../commands/init",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "commander": "^11.0.0",
    "dotenv": "^16.4.5",
    "import-local": "^3.2.0",
    "root-check": "^1.0.0"
  }
}
```

| 依赖 | 用途 |
|------|------|
| `commander` | 命令行参数解析框架，注册命令、选项、帮助文档 |
| `dotenv` | 加载用户主目录 `.env` 文件中的环境变量到 `process.env` |
| `import-local` | 检测项目本地是否也安装了脚手架，优先使用本地版本 |
| `root-check` | 检测并降级 root 权限，避免高权限带来的安全和文件权限问题 |
| `@cjp-cli-dev/exec` | 命令执行引擎，接收所有命令的 `.action()` 回调 |
| `@cjp-cli-dev/get-npm-info` | 查询 npm Registry，用于版本更新检查 |

## 4. 核心模块设计

### 4.1 bin/index.js — 可执行入口

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

**设计要点：**

| 要点 | 说明 |
|------|------|
| `#! /usr/bin/env node` | shebang 声明，让操作系统知道用 node 执行此文件。`npm link` 后终端输入 `cjp-cli-dev` 即可运行 |
| `import-local` | 当项目 `node_modules` 中也安装了脚手架时，优先使用项目本地版本，确保团队环境一致性 |
| `process.argv.slice(2)` | 去掉 `argv[0]`（node 路径）和 `argv[1]`（脚本路径），只传入用户输入的命令和参数 |

### 4.2 lib/index.js — 主流程

导出 `cli()` 异步函数，分为两个核心阶段：

```
cli()
├─ prepare()          — 准备阶段（环境检查）
└─ registerCommander() — 命令注册阶段
```

#### 4.2.1 prepare() — 准备阶段

按顺序执行 5 项检查，任一失败将通过 `throw` 或 `log.warn` 处理：

```
prepare()
│
├─ 1. checkCliVersion()
│     └─ 读取 package.json 的 version，输出 "cli版本 x.x.x"
│
├─ 2. checkRoot()
│     └─ 调用 root-check，若为 root 用户则尝试降级为普通用户
│     └─ 目的：防止 root 创建的缓存文件普通用户无法读取
│
├─ 3. checkUserHome()
│     └─ 通过 os.homedir() 获取用户主目录
│     └─ 检查主目录是否存在，不存在则 throw Error
│
├─ 4. checkEnv()
│     ├─ 读取用户主目录下的 .env 文件（如 C:\Users\xxx\.env）
│     ├─ 通过 dotenv.config() 将变量注入 process.env
│     └─ createDefaultConfig()
│           ├─ 计算 CLI_HOME_PATH = <homedir>/<CLI_HOME || .cjp-cli-dev>
│           └─ 挂载到 process.env.CLI_HOME_PATH
│
└─ 5. checkGlobalUpdate()（异步，不阻塞命令启动）
      ├─ 获取当前版本号和包名
      ├─ 调用 getNpmSemverVersion() 查询 npm 上大于当前版本的最新版本
      ├─ 有新版本 → log.warn("更新提示 检测到脚手架有新版本...")
      ├─ 无新版本 → 静默跳过
      ├─ 网络异常 → 静默捕获，不阻断主流程（try-catch 保护）
      └─ 注意：不使用 await，异步执行不阻塞后续命令注册和执行
```

#### 4.2.2 registerCommander() — 命令注册

使用 Commander.js 注册所有命令。核心结构：

```
registerCommander()
│
├─ program 基础配置
│     ├─ .name()        — 从 package.json 的 bin 字段提取程序名
│     ├─ .usage()       — "<command> [options]"
│     ├─ .description() — 从 description.js 加载完整功能描述
│     ├─ .version()     — 从 package.json 读取版本号
│     └─ 全局选项
│           ├─ --debug (-dbg)      — 开启调试模式
│           └─ --targetPath (-tp)  — 指定本地调试文件路径
│
├─ 注册 13 个命令
│     ├─ cjp           — 输出作者信息（内联 action，不经过 exec）
│     ├─ init          — .action(exec)
│     ├─ publish       — .action(exec)
│     ├─ add           — .action(exec)
│     ├─ rollback      — .action(exec)
│     ├─ husky         — .action(exec)
│     ├─ codelint      — .action(exec)
│     ├─ commitlint    — .action(exec)
│     ├─ release       — .action(exec)
│     ├─ gitflow       — .action(exec)
│     ├─ delete-branch — .action(exec)
│     ├─ resume        — .action(exec)
│     ├─ server        — .action(exec)
│     └─ clean         — .action(execClean)（内置命令，不经过 exec 动态加载）
│
├─ 全局事件监听
│     ├─ option:debug     — 动态设置 LOG_LEVEL 为 verbose
│     ├─ option:targetPath — 更新 process.env.CLI_TARGET_PATH
│     └─ command:*         — 未知命令监听，模糊匹配提示 + 搞笑语录 + 可用命令列表
│
├─ program.parse(process.argv)
│
└─ 无参数时输出帮助文档
      └─ program.args.length < 1 → program.outputHelp()
```

#### 4.2.3 全局参数监听机制

| 事件 | 触发条件 | 行为 |
|------|----------|------|
| `option:debug` | 用户传入 `--debug` | 设置 `process.env.LOG_LEVEL = "verbose"` 并同步 `log.level`，开启详细日志 |
| `option:targetPath` | 用户传入 `--targetPath <path>` | 设置 `process.env.CLI_TARGET_PATH`，exec 模块据此跳过 npm 缓存直接加载本地包 |
| `command:*` | 用户输入了未注册的命令 | 先模糊匹配提示"您是不是想输入：xxx？"，再输出搞笑语录 + 所有可用命令列表 |

### 4.3 lib/execClean.js — clean 命令实现

`clean` 是内置命令，不经过 `exec` 动态加载，直接在 cli 包内实现：

```
execClean(options, command)
│
├─ 检查是否传入了 --all 或 --dep 参数，均未传则输出帮助
│
├─ [--all] cleanAll()
│     ├─ 检查 CLI_HOME_PATH 是否存在
│     ├─ 计算并显示缓存目录大小（递归统计，格式化为 KB/MB）
│     ├─ 二次确认 "确认要清除所有缓存吗？"
│     └─ fse.emptyDirSync(CLI_HOME_PATH)
│
└─ [--dep] cleanDep()
      ├─ 计算依赖缓存路径 = CLI_HOME_PATH / dependencies
      ├─ 计算并显示依赖缓存目录大小
      ├─ 二次确认 "确认要清除依赖缓存吗？"
      └─ fse.emptyDirSync(depPath)
```

### 4.4 lib/description.js — 功能描述

导出一段多行字符串，用于 `program.description()`，列出所有 13 个命令的功能说明。在用户执行 `cjp-cli-dev -h` 时显示。

## 5. 环境变量管理

### 5.1 加载流程

```
用户主目录/.env 文件
    │
    ├─ dotenv.config() 注入到 process.env
    │
    └─ createDefaultConfig()
          ├─ 读取 process.env.CLI_HOME（来自 .env）
          ├─ 计算 cliHome = homedir + CLI_HOME（默认 .cjp-cli-dev）
          └─ 设置 process.env.CLI_HOME_PATH = cliHome
```

### 5.2 已注册环境变量

| 变量名 | 来源 | 说明 |
|--------|------|------|
| `CLI_HOME` | `.env` 文件 | 脚手架缓存目录名 |
| `CLI_HOME_PATH` | 运行时计算 | 脚手架缓存完整路径 |
| `CLI_TARGET_PATH` | `--targetPath` 参数 | 本地调试文件路径 |
| `LOG_LEVEL` | `--debug` 参数 | 日志级别（info / verbose） |
| `CJP_CLI_DEV_BASE_URL` | `.env` 文件 | 后端接口请求前缀 |

## 6. 命令与 exec 的关系

除 `cjp`（作者信息）和 `clean`（缓存清理）外，所有命令的 `.action()` 回调都指向 `exec` 函数（来自 `@cjp-cli-dev/exec`）：

```javascript
// init / publish / add / rollback / server / ... 等 11 个命令
.action(exec)
```

`exec` 负责：
1. 从命令名查找对应的 npm 包名
2. 下载/更新命令包到本地缓存
3. 在子进程中执行命令包的入口文件

这种设计将**命令注册**（cli 负责）和**命令执行**（exec 负责）解耦，cli 不需要知道命令怎么实现，exec 不需要知道命令怎么注册。

## 7. 版本更新检查机制

```javascript
async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn("更新提示", `检测到脚手架有新版本：${lastVersion}，请运行 npm install -g ${npmName} 命令进行更新`);
  }
}
```

- 异步执行，不阻塞命令启动
- 只提示不强制，不打断用户工作流
- 通过 `semver.gt` 比较，仅在有更高版本时提示

## 8. 错误处理策略

```javascript
async function cli() {
  try {
    await prepare();
    registerCommander();
  } catch (e) {
    log.error(e);
    if (process.env.LOG_LEVEL === "verbose") {
      console.log(e);  // debug 模式输出完整错误栈
    }
  }
}
```

所有准备阶段和命令注册的错误统一在顶层 catch，普通模式仅输出 message，debug 模式额外输出堆栈。
