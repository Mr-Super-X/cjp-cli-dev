<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# models/command

## Purpose
命令基类 (`@cjp-cli-dev/command`)。所有 CLI 命令的父类，定义 `init()` 和 `exec()` 抽象方法强制子类实现，封装参数初始化解析、Node 版本检查、执行耗时统计等通用逻辑。使用 Promise 链保证生命周期顺序执行。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | Command 类——构造函数启动 Promise 链：checkNodeVersion → initArgs → init → exec → 耗时统计 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 修改此基类会影响所有 12 个命令
- Promise 链顺序不可变更：先 init 再 exec
- `init()` 和 `exec()` 故意抛出 Error——这是强制子类实现的机制
- 执行耗时超过 3 秒才输出，避免简单命令也显示
- `checkNodeVersion()` 使用 `semver.gte()` 比较当前版本与 `LOWEST_NODE_VERSION`

### Testing Requirements
- `__tests__/Command.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — semver、CLI_NAME、LOWEST_NODE_VERSION

### External
- colors — 终端颜色

<!-- MANUAL: -->
