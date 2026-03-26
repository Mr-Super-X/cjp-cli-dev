# 开发指南

## 开发环境搭建

### 1. 安装依赖

```bash
npm run reinstall
```

该命令会自动完成所有子包的依赖安装和全局软链创建。

### 2. 验证安装

```bash
cjp-cli-dev -v
```

## 本地调试

### 使用 `--targetPath` 调试命令

开发时可以使用 `--targetPath` 参数指向本地命令包目录，跳过远程 npm 包的下载：

```bash
# 调试 init 命令
cjp-cli-dev init --targetPath D:/personal/cli/cjp-cli-dev/commands/init --debug

# 调试 publish 命令
cjp-cli-dev publish --targetPath D:/personal/cli/cjp-cli-dev/commands/publish --debug
```

### Debug 模式

`--debug` 参数将日志级别设置为 `verbose`，输出详细的调试信息和错误执行栈：

```bash
cjp-cli-dev <command> --debug
```

## 创建新命令

### 1. 创建命令包

```bash
lerna create @cjp-cli-dev/<command-name> ./commands/
```

### 2. 实现命令

新命令必须继承 `@cjp-cli-dev/command` 基类，并实现 `init()` 和 `exec()` 方法：

```javascript
"use strict";
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");

class MyCommand extends Command {
  // 初始化：解析参数、准备数据
  init() {
    // this._args 包含命令行传入的参数
    // this._cmd 是 commander 的命令对象
    // this._otherArgs 是除命令对象外的其他参数
  }

  // 执行：命令的核心逻辑
  async exec() {
    try {
      // 实现命令逻辑
    } catch (err) {
      log.error(err.message);
    }
  }
}

function myCommand(args) {
  return new MyCommand(args);
}

module.exports = myCommand;
```

### 3. 注册命令

在 `core/exec/lib/index.js` 的 `SETTINGS` 中添加命令映射：

```javascript
const SETTINGS = {
  // ... 已有命令
  "my-command": "@cjp-cli-dev/my-command",
};
```

在 `core/cli/lib/index.js` 的 `registerCommander()` 中注册命令：

```javascript
program
  .command("my-command")
  .description("命令描述")
  .option("-x, --example", "示例参数", false)
  .action(exec);
```

### 4. 配置依赖

在命令包的 `package.json` 中声明内部依赖（使用 `file:` 协议）：

```json
{
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 常用开发命令

```bash
# 安装全部依赖并创建全局软链
npm run reinstall

# 手动创建全局软链
cd core/cli && npm link

# 取消全局软链
npm unlink -g @cjp-cli-dev/core

# 检查全局软链
npm ls -g @cjp-cli-dev/core

# 清除所有子包依赖
lerna clean -y

# 创建新包
lerna create @cjp-cli-dev/<package-name> ./<directory>/

# 查看所有包
lerna ls
```

## 发布流程

### 前置条件

登录 npm 账号（建议指定 npm 源防止源切换导致发布失败）：

```bash
npm login --registry https://registry.npmjs.com/
```

### 发布步骤

```bash
# 1. 更新版本号（交互式选择版本升级类型）
lerna version

# 2. 发布到 npm
lerna publish
```

## 项目约定

- 所有命令包必须继承 `@cjp-cli-dev/command` 基类
- 子类必须实现 `init()` 和 `exec()` 两个方法
- 内部包引用使用 `file:` 协议
- npm scope 统一为 `@cjp-cli-dev/`
- 发布配置统一为 `"access": "public"` 和 `"registry": "https://registry.npmjs.com/"`
- 命令在子进程中执行，避免阻塞主进程
