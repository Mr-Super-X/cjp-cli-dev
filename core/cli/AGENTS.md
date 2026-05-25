<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# core/cli

## Purpose
CLI 入口程序 (`@cjp-cli-dev/cli`)，脚手架主进程。负责 Commander 命令注册与解析、启动准备流程（版本检查、环境变量注入、Root 降级、全局更新检测）和清理缓存命令。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | 主入口——cli() 启动函数、prepare() 准备流程、registerCommander() 注册所有命令 |
| `lib/description.js` | 脚手架描述文本模板 |
| `lib/execClean.js` | 清空缓存命令的处理逻辑（内置命令，不走子进程） |
| `bin/index.js` | CLI 二进制入口 |
| `package.json` | 包配置，定义 bin 入口和依赖 |

## For AI Agents

### Working In This Directory
- 新增命令需要在 `registerCommander()` 中添加 `.command()` 注册
- 修改启动流程在 `prepare()` 函数中调整检查顺序
- `checkGlobalUpdate()` 使用 `.catch(() => {})` 静默处理，不可改为阻塞式
- clean 命令是唯一定义在此的内置命令，不走 exec 子进程
- 未知命令会触发模糊匹配和搞笑语录提示

### Testing Requirements
- `__tests__/core.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/log` — 日志 + 搞笑语录
- `@cjp-cli-dev/exec` — 命令执行委托
- `@cjp-cli-dev/get-npm-info` — 版本检查
- `@cjp-cli-dev/utils` — 常量、工具方法

### External
- commander — CLI 框架
- dotenv — 环境变量加载
- root-check — Root 用户降级

<!-- MANUAL: -->
