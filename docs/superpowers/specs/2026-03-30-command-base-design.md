# Command 命令基类设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：`@cjp-cli-dev/command` 是所有命令的抽象基类，定义了命令的生命周期、参数解析和前置检查，commands/ 目录下所有命令包都必须继承该基类。

---

## 1. 包定义

| 属性 | 值 |
|------|-----|
| 包名 | `@cjp-cli-dev/command` |
| 版本 | `1.3.0` |
| 入口文件 | `lib/index.js` |
| 设计模式 | 模板方法模式（Template Method Pattern） |

## 2. 目录结构

```
models/command/
├── package.json
├── lib/
│   └── index.js       # Command 基类定义
└── __tests__/
    └── Command.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/command",
  "dependencies": {
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "colors": "^1.4.0"
  }
}
```

| 依赖 | 用途 |
|------|------|
| `@cjp-cli-dev/utils` | 使用 `semver`（版本比较）、`CLI_NAME`（脚手架名称）、`LOWEST_NODE_VERSION`（最低 Node 版本要求） |
| `colors` | 给错误提示信息添加红色高亮 |

## 4. 核心类设计

### Command 类

```javascript
class Command {
  constructor(args)        // 入口：参数校验 + Promise 链驱动生命周期
  checkNodeVersion()       // 检查 Node 版本是否满足最低要求
  initArgs()               // 解析并分离命令对象和其他参数
  init()                   // 抽象方法 — 子类必须实现（初始化阶段）
  exec()                   // 抽象方法 — 子类必须实现（执行阶段）
}
```

### 4.1 构造函数 — 参数校验 + 生命周期驱动

```javascript
constructor(args) {
  // 1. 参数校验
  if (!args) throw new Error("参数不能为空");
  if (!Array.isArray(args)) throw new Error("参数格式必须是Array");
  if (args.length < 1) throw new Error("参数列表不能为空");

  this._args = args;  // 保存原始参数，子类通过 this._args 访问

  // 2. Promise 链驱动生命周期（保证串行执行）
  let chain = Promise.resolve();
  chain = chain.then(() => this.checkNodeVersion());
  chain = chain.then(() => this.initArgs());
  chain = chain.then(() => this.init());   // 子类实现
  chain = chain.then(() => this.exec());   // 子类实现
  chain.catch((err) => { log.error(err.message); });
}
```

**设计要点：**
- 构造函数中直接启动生命周期，子类通过 `new XxxCommand(args)` 即可触发全部流程
- 使用 Promise 链而非 async/await，因为构造函数不能是 async
- 异常统一在链尾 catch，子类不需要关心错误处理

### 4.2 生命周期

```
constructor(args)
    │
    ├─ 1. checkNodeVersion()     ← 基类实现（通用）
    │     ├─ 获取 process.version
    │     ├─ 与 LOWEST_NODE_VERSION（16.0.0）比较
    │     └─ 不满足 → throw Error（红色提示）
    │
    ├─ 2. initArgs()             ← 基类实现（通用）
    │     ├─ this._cmd = args 最后一个元素（Commander 命令对象）
    │     └─ this._otherArgs = args 除最后一个外的所有元素
    │
    ├─ 3. init()                 ← 子类必须实现
    │     └─ 基类中 throw Error("子类中 init 方法必须实现！")
    │
    └─ 4. exec()                 ← 子类必须实现
          └─ 基类中 throw Error("子类中 exec 方法必须实现！")
```

### 4.3 参数解析结果

经过 `initArgs()` 后，子类可使用以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `this._args` | `Array` | 原始参数数组 |
| `this._cmd` | `Object` | Commander 命令对象（简化后），包含命令选项 |
| `this._otherArgs` | `Array` | 除命令对象外的其他参数（如 `projectName`、`branchName` 等位置参数） |

### 4.4 抽象方法约束

JavaScript 没有 `abstract` 关键字，基类通过在方法体中 `throw Error` 模拟抽象方法约束：

```javascript
init() {
  throw new Error("子类中 init 方法必须实现！在该方法中执行子类的一些初始化步骤");
}
exec() {
  throw new Error("子类中 exec 方法必须实现！在该方法中执行子类的详细步骤");
}
```

如果子类忘记实现这两个方法，运行时会立即报错，起到编译期检查的效果。

## 5. 子类使用示例

```javascript
const Command = require("@cjp-cli-dev/command");

class InitCommand extends Command {
  init() {
    // 解析命令参数
    this.projectName = this._args[0] || "";
    this.force = this._args[1].force || false;
  }

  async exec() {
    // 执行命令逻辑
    await this.prepare();
    await this.downloadTemplate();
    await this.installTemplate();
  }
}

// 工厂函数导出
function init(args) {
  return new InitCommand(args);
}
module.exports = init;
```

## 6. 设计模式分析

### 模板方法模式（Template Method Pattern）

| 角色 | 对应 |
|------|------|
| 抽象类 | `Command` 基类 |
| 模板方法 | `constructor` 中的 Promise 链定义了骨架流程 |
| 通用步骤 | `checkNodeVersion()`、`initArgs()` — 基类实现，所有子类共享 |
| 抽象步骤 | `init()`、`exec()` — 子类必须实现 |

**价值：**
- 流程标准化：所有命令都经过相同的前置检查
- 强制约束：子类忘记实现 `init`/`exec` 会立即报错
- 代码复用：参数解析、版本检查等通用逻辑只写一次

## 7. 已继承该基类的命令

| 命令包 | 类名 |
|--------|------|
| `@cjp-cli-dev/init` | `InitCommand` |
| `@cjp-cli-dev/publish` | `PublishCommand` |
| `@cjp-cli-dev/add` | `AddCommand` |
| `@cjp-cli-dev/rollback` | `RollbackCommand` |
| `@cjp-cli-dev/release` | `ReleaseCommand` |
| `@cjp-cli-dev/gitflow` | `GitFlowCommand` |
| `@cjp-cli-dev/delete-branch` | `DeleteBranchCommand` |
| `@cjp-cli-dev/husky` | `HuskyCommand` |
| `@cjp-cli-dev/codelint` | `CodelintCommand` |
| `@cjp-cli-dev/commitlint` | `CommitlintCommand` |
| `@cjp-cli-dev/server` | `ServerCommand` |
| `@cjp-cli-dev/resume` | `ResumeCommand` |
