# CloudBuild 云构建模型设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：`@cjp-cli-dev/cloudbuild` 封装了与远程构建服务器的 WebSocket 通信逻辑，实现项目的远程构建和实时日志推送。

---

## 1. 包定义

| 属性 | 值 |
|------|-----|
| 包名 | `@cjp-cli-dev/cloudbuild` |
| 版本 | `1.3.0` |
| 入口文件 | `lib/index.js` |
| 导出 | `CloudBuild` 类 |

## 2. 目录结构

```
models/cloudbuild/
├── package.json
├── lib/
│   └── index.js       # CloudBuild 类定义
└── __tests__/
    └── cloudbuild.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/cloudbuild",
  "dependencies": {
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/request": "file:../../utils/request",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "lodash": "^4.17.21",
    "socket.io-client": "^2.5.0"
  }
}
```

| 依赖 | 用途 |
|------|------|
| `socket.io-client` | 与后端构建服务（Egg.js + egg-socket.io）建立 WebSocket 长连接 |
| `lodash` | 使用 `get` 方法安全提取嵌套对象属性 |

## 4. 核心类设计

### CloudBuild 类

```javascript
class CloudBuild {
  constructor(git, options)   // 初始化构建参数
  async prepare()             // 发布前检查（正式发布时检查 OSS 文件是否已存在）
  init()                      // 建立 Socket 连接，返回 Promise
  async build()               // 触发构建并监听日志，返回 Promise
  disconnect()                // 主动断开 Socket 连接
  doTimeout(fn, timeout)      // 设置连接超时
}
```

#### 4.1 构造函数

```javascript
constructor(git, options) {
  this.git = git;               // Git 实例（来自 @cjp-cli-dev/git）
  this.type = options.type;     // 平台类型
  this.buildCmd = options.buildCmd;     // 构建命令
  this.production = options.production; // 是否正式发布
  this.registry = options.registry;     // npm 源
  this.timeout = 5 * 60 * 1000;        // 构建超时 5 分钟
  this.timer = null;            // 超时定时器
  this.socket = null;           // Socket.io 实例
}
```

#### 4.2 常量定义

| 常量 | 值 | 说明 |
|------|-----|------|
| `WS_SERVER` | `http://cjp.clidev.xyz:7001` | 构建服务器 WebSocket 地址 |
| `TIMEOUT` | `5 * 60 * 1000`（5分钟） | 构建任务超时时间 |
| `CONNECT_TIMEOUT` | `5 * 1000`（5秒） | Socket 连接超时时间 |
| `BUILD_FAILED_ACTION` | `["prepare failed", "download failed", ...]` | 服务端失败事件类型列表 |

## 5. 执行流程

### 5.1 通信协议

```
脚手架客户端 (CloudBuild)              构建服务器 (Egg.js)
    │                                      │
    ├── io.connect(WS_SERVER, {query})  →  │  建立 Socket 连接
    │   query 携带：repo、name、branch、    │  （传递构建所需参数）
    │   version、buildCmd、prod、registry  │
    │                                      │
    │  ←── on("connect")                   │  连接成功
    │   收到 socket.id 作为任务 ID          │
    │                                      │
    ├── emit("build")                   →  │  触发构建任务
    │                                      │
    │  ←── on("building", 日志)            │  实时推送构建日志
    │  ←── on("building", 日志)            │  （持续推送）
    │  ←── on("building", 日志)            │
    │                                      │
    │  ←── on("build", result)             │  构建结果
    │   ├─ action 在 BUILD_FAILED_ACTION   │
    │   │  → 构建失败，断开连接             │
    │   └─ action 不在失败列表              │
    │      → 构建成功                       │
    │                                      │
    │  ←── on("disconnect")                │  连接断开
    │   → resolve(result)                  │
    │                                      │
    ├── disconnect()                    →  │  主动断开
    └── socket.close()                     │
```

### 5.2 prepare → init → build 完整流程

```
CloudBuild.prepare()
├─ [正式发布] 查询 OSS 中是否已存在该项目
│   ├─ 已存在 → 询问"是否覆盖发布？"
│   │   ├─ 放弃 → throw Error("发布终止")
│   │   └─ 覆盖 → 继续
│   └─ 不存在 → 继续

CloudBuild.init()
├─ io.connect(WS_SERVER, { query: 构建参数 })
├─ on("connect") → 清除超时定时器，输出任务 ID
├─ doTimeout(disconnect, 5秒) → 连接超时保护
├─ on("disconnect") → 输出断开日志
├─ on("error") → 输出错误，reject
└─ 返回 Promise（connect 时 resolve，error 时 reject）

CloudBuild.build()
├─ socket.emit("build") → 通知服务端开始构建
├─ on("build", msg)
│   ├─ parseMsg(msg) → 提取 action 和 message
│   ├─ action 在 BUILD_FAILED_ACTION → 输出错误 + 断开连接 + result = false
│   └─ action 正常 → 输出成功日志
├─ on("building", msg) → console.log(msg) 实时输出构建日志
├─ on("disconnect") → resolve(result)
├─ on("error") → reject(err)
└─ 返回 Promise<boolean>（构建成功 true / 失败 false）
```

## 6. 关键实现细节

### 6.1 消息解析协议

与后端约定的消息格式：

```javascript
// 服务端发送的消息结构
{
  data: {
    action: "building",         // 事件类型
    payload: {
      message: "npm install..." // 具体消息
    }
  }
}

// 客户端解析方法
function parseMsg(msg) {
  const action = get(msg, "data.action");
  const message = get(msg, "data.payload.message");
  return { action, message };
}
```

使用 `lodash.get` 安全提取嵌套属性，避免服务端消息格式异常时的 crash。

### 6.2 构建失败事件类型

```javascript
const BUILD_FAILED_ACTION = [
  "prepare failed",      // 准备阶段失败
  "download failed",     // 代码下载失败
  "install failed",      // 依赖安装失败
  "build failed",        // 构建执行失败
  "pre-publish failed",  // 发布前检查失败
  "publish failed",      // 发布失败
];
```

客户端收到 `build` 事件后，将 `action` 与此列表匹配，命中即为构建失败，主动断开连接。

### 6.3 超时保护机制

```javascript
doTimeout(fn, timeout) {
  this.timer && clearTimeout(this.timer);
  log.info("设置云构建服务连接超时时间：", `${timeout / 1000}秒`);
  this.timer = setTimeout(fn, timeout);
}
```

两级超时保护：
- **连接超时**（5秒）：Socket 连接建立超时，自动断开
- **构建超时**（5分钟）：构建任务执行超时，自动断开

连接成功后清除连接超时定时器。

### 6.4 OSS 覆盖发布保护

正式发布时（`production: true`），先查询 OSS 中是否已存在同名项目：

```javascript
const ossProject = await request({
  url: "/project/oss",
  params: { name: projectName, type: "prod" }
});
```

若已存在，通过 inquirer 询问用户是否覆盖。防止误操作覆盖线上已发布的资源。

### 6.5 Socket Query 参数

通过 Socket 连接的 query 参数将构建所需信息一次性传递给服务端：

| 参数 | 来源 | 说明 |
|------|------|------|
| `repo` | `git.remote` | 仓库远程地址 |
| `name` | `git.name` | 项目名称 |
| `branch` | `git.branch` | 本地开发分支 |
| `version` | `git.version` | 版本号 |
| `buildCmd` | `options.buildCmd` | 构建命令 |
| `prod` | `options.production` | 是否正式发布 |
| `registry` | `options.registry` | npm 源 |

## 7. 被引用关系

| 使用方 | 场景 |
|--------|------|
| `models/git` | 在 `publish()` 流程中创建 CloudBuild 实例执行云构建 |

CloudBuild 不被命令包直接使用，而是通过 Git 模型间接调用：

```
commands/publish → models/git.publish() → models/cloudbuild
```
