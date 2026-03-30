# Exec 执行引擎设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：`@cjp-cli-dev/exec` 是脚手架的命令执行引擎，负责动态加载命令包并在子进程中执行，实现命令的按需加载和进程隔离。

---

## 1. 包定义

| 属性 | 值 |
|------|-----|
| 包名 | `@cjp-cli-dev/exec` |
| 版本 | `1.7.0` |
| 入口文件 | `lib/index.js` |
| 导出 | `exec` 函数（作为所有命令的 `.action()` 回调） |

## 2. 目录结构

```
core/exec/
├── package.json
├── lib/
│   └── index.js       # exec 函数，命令动态加载和子进程执行
└── __tests__/
    └── exec.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/exec",
  "dependencies": {
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/package": "file:../../models/package",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

| 依赖 | 用途 |
|------|------|
| `@cjp-cli-dev/package` | Package 模型，封装 npm 包的下载、缓存、更新、入口文件定位 |
| `@cjp-cli-dev/utils` | 使用 `spawn`（跨平台进程创建）、`DEFAULT_CLI_HOME`、`DEPENDENCIES_CACHE_DIR`、`DEFAULT_NPM_REGISTRY` |
| `@cjp-cli-dev/log` | 日志输出 |

## 4. 核心设计

### 4.1 命令映射表 SETTINGS

```javascript
const SETTINGS = {
  init: "@cjp-cli-dev/init",
  publish: "@cjp-cli-dev/publish",
  add: "@cjp-cli-dev/add",
  rollback: "@cjp-cli-dev/rollback",
  husky: "@cjp-cli-dev/husky",
  codelint: "@cjp-cli-dev/codelint",
  commitlint: "@cjp-cli-dev/commitlint",
  release: "@cjp-cli-dev/release",
  gitflow: "@cjp-cli-dev/gitflow",
  resume: "@cjp-cli-dev/resume",
  server: "@cjp-cli-dev/server",
  "delete-branch": "@cjp-cli-dev/delete-branch",
};
```

这是 exec 的核心数据结构，将**命令名**映射到**npm 包名**。当用户执行 `cjp-cli-dev init` 时，exec 通过此表查找到需要加载 `@cjp-cli-dev/init` 包。

**设计意义：**
- 命令与实现解耦：cli 注册命令时不需要知道包名
- 动态扩展：新增命令只需在此表中添加一行映射
- 可远程化：未来可将此表从远程配置中心获取

### 4.2 exec() 函数

exec 是一个普通函数（非类），通过 `arguments` 接收 Commander.js 传入的参数。

```javascript
async function exec() {
  // 1. 获取命令信息
  const cmdObj = arguments[arguments.length - 1];  // Commander 命令对象
  const cmdName = cmdObj.name();                    // 命令名称
  const cmdOpts = cmdObj.opts();                    // 命令选项
  const packageName = SETTINGS[cmdName];            // 查表得到 npm 包名
  const packageVersion = "latest";                  // 始终获取最新版本
  const registry = cmdOpts.registry || DEFAULT_NPM_REGISTRY;

  // 2. 加载命令包
  // 3. 子进程执行
}
```

## 5. 执行流程

```
exec() 被 Commander.js 的 .action() 调用
│
├─ 1. 解析命令信息
│     ├─ cmdObj = arguments 最后一个参数（Commander 命令对象）
│     ├─ cmdName = cmdObj.name()
│     ├─ cmdOpts = cmdObj.opts()
│     ├─ packageName = SETTINGS[cmdName]
│     └─ registry = cmdOpts.registry || DEFAULT_NPM_REGISTRY
│
├─ 2. 判断加载模式
│     │
│     ├─ [CLI_TARGET_PATH 存在] — 本地调试模式
│     │     └─ 直接使用 targetPath 创建 Package 实例（无 storeDir）
│     │
│     └─ [CLI_TARGET_PATH 不存在] — 缓存模式（默认）
│           ├─ 计算缓存路径
│           │     ├─ targetPath = CLI_HOME_PATH / dependencies
│           │     └─ storeDir = targetPath / node_modules
│           ├─ 创建 Package 实例
│           └─ 检查包是否存在
│                 ├─ 存在 → pkg.update()（检查并更新到最新版本）
│                 └─ 不存在 → pkg.install()（首次安装）
│
├─ 3. 获取入口文件
│     └─ rootFile = pkg.getRootFilePath()
│           ├─ 通过 pkg-dir 找到包根目录
│           ├─ 读取 package.json 的 main 字段
│           └─ format-path 处理跨平台路径差异
│
├─ 4. 简化参数
│     ├─ 提取 Commander 命令对象的有效属性（排除 _ 开头和 parent）
│     └─ 替换 arguments 最后一个参数为简化后的对象
│
└─ 5. 子进程执行
      ├─ 构造代码字符串
      │     └─ code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
      ├─ spawn("node", ["-e", code], { cwd, stdio: "inherit" })
      ├─ child.on("error") → 输出错误 + process.exit(e.code)
      └─ child.on("exit") → 退出码 0 成功 / 非 0 失败
```

## 6. 关键实现细节

### 6.1 两种加载模式

| 模式 | 触发条件 | 行为 | 场景 |
|------|----------|------|------|
| **缓存模式** | `CLI_TARGET_PATH` 为空（默认） | 从 npm 下载包到 `~/.cjp-cli-dev/dependencies/`，自动检查更新 | 正常使用 |
| **本地调试模式** | `CLI_TARGET_PATH` 有值（通过 `--targetPath` 设置） | 直接从指定路径加载包，不下载不缓存 | 开发调试 |

### 6.2 缓存目录结构

```
~/.cjp-cli-dev/
└── dependencies/                          # targetPath
    └── node_modules/                      # storeDir
        └── .store/                        # npminstall 存储目录
            └── @cjp-cli-dev+init@1.3.0/   # 包名 + 版本
                └── node_modules/
                    └── @cjp-cli-dev/init/  # 实际包内容
```

### 6.3 子进程执行机制

```javascript
const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
const child = spawn("node", ["-e", code], {
  cwd: process.cwd(),
  stdio: "inherit",
});
```

| 设计决策 | 原因 |
|----------|------|
| `node -e` 动态执行 | 将 `require` 调用转为字符串，实现跨进程的模块加载 |
| `stdio: "inherit"` | 子进程的 stdout/stderr 直接继承主进程终端，用户实时看到输出和加载动画 |
| `spawn` 而非 `exec` | spawn 是流式输出，适合耗时任务的实时日志；exec 会缓存全部输出到结束才返回 |

**为什么不在主进程直接 `require`：**

1. **进程隔离**：命令包崩溃不影响主进程
2. **性能**：子进程可利用多核 CPU，不阻塞主进程事件循环
3. **内存独立**：命令执行完毕后子进程自动回收内存

### 6.4 参数简化

Commander 命令对象包含大量内部属性（`_name`、`_description`、`parent` 等），直接序列化会导致 JSON 过大或循环引用。exec 在传入子进程前做了简化处理：

```javascript
const args = Array.from(arguments);
const cmd = args[args.length - 1];
const o = Object.create(null);
Object.keys(cmd).forEach((key) => {
  if (cmd.hasOwnProperty(key) && !key.startsWith("_") && key !== "parent") {
    o[key] = cmd[key];
  }
});
args[args.length - 1] = o;
```

过滤规则：
- 排除 `_` 开头的私有属性
- 排除 `parent` 属性（避免循环引用）
- 只保留 `hasOwnProperty` 的自有属性

### 6.5 registry 参数透传

exec 从命令选项中提取 `registry` 参数，传递给 Package 实例：

```javascript
const registry = cmdOpts.registry || DEFAULT_NPM_REGISTRY;

const pkg = new Package({
  targetPath,
  storeDir,
  packageName,
  packageVersion,
  registry,  // 透传给 npminstall
});
```

这使得用户可以通过 `--registry` 指定私有 npm 源下载命令包。

### 6.6 错误处理

```javascript
child.on("error", (e) => {
  handleError(cmdOpts, e, "命令执行失败：");
  process.exit(e.code);
});

child.on("exit", (c) => {
  if (c === 0) {
    log.verbose("命令执行成功");
  } else {
    log.error("命令执行失败，退出码：", c);
  }
  process.exit(c);
});
```

- `error` 事件：子进程创建失败，debug 模式输出堆栈
- `exit` 事件：根据退出码判断成功/失败
- 主进程同步退出码：`process.exit(c)` 确保脚手架返回正确的退出码给调用方（如 CI/CD）

## 7. 与其他模块的关系

```
┌─────────────────────────────────────────────┐
│  core/cli                                    │
│  ├─ 注册命令：program.command("init")        │
│  ├─ 绑定到 exec：.action(exec)              │
│  └─ 全局参数：--debug, --targetPath         │
└──────────────────┬──────────────────────────┘
                   │ .action(exec) 调用
┌──────────────────▼──────────────────────────┐
│  core/exec                                   │
│  ├─ SETTINGS 查表：init → @cjp-cli-dev/init │
│  ├─ Package 模型：下载/缓存/定位入口文件      │
│  └─ spawn：子进程执行命令包                   │
└──────────────────┬──────────────────────────┘
                   │ spawn("node", ["-e", ...])
┌──────────────────▼──────────────────────────┐
│  commands/init/lib/index.js                  │
│  └─ new InitCommand(args)                    │
│     └─ Command 基类生命周期                   │
│        init() → exec()                       │
└─────────────────────────────────────────────┘

依赖方向：cli → exec → models/package → utils
                    └─→ commands/* (运行时动态加载，非编译时依赖)
```

## 8. 设计模式与架构价值

### 8.1 命令模式（Command Pattern）

exec 实现了经典的命令模式：
- **调用者**（cli）只知道"执行某个命令"
- **接收者**（具体命令包）实现具体逻辑
- **exec** 充当"命令对象"，负责定位和调用接收者

### 8.2 动态加载带来的工程价值

| 价值 | 说明 |
|------|------|
| 按需加载 | 13 个命令不需要全部下载，用到哪个下载哪个 |
| 独立更新 | 命令包发布新版后，脚手架下次执行自动更新，无需重装全局脚手架 |
| 开发解耦 | 不同命令可由不同开发者独立开发、独立发布 |
| 体积控制 | 全局安装的 `@cjp-cli-dev/core` 非常轻量，重量级命令按需下载 |

### 8.3 进程隔离的工程价值

| 价值 | 说明 |
|------|------|
| 稳定性 | 命令包崩溃（OOM、未捕获异常）不影响主进程 |
| 状态隔离 | 命令执行的全局变量、环境变量不污染主进程 |
| 资源回收 | 命令执行完毕后子进程退出，自动释放内存 |
| 退出码透传 | 子进程的退出码透传给主进程，CI/CD 可正确判断命令是否成功 |
