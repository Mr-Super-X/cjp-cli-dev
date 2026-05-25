<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# utils/log

## Purpose
统一日志工具 (`@cjp-cli-dev/log`)。提供分级日志输出（verbose/info/warn/error/notice），支持彩色终端输出和多级日志控制。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | 日志主类——log.verbose/info/warn/error/notice 方法 |
| `lib/commandFunnyQuote.js` | 搞笑语录生成——命令输错时随机返回一条 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- `log.level` 受 `process.env.LOG_LEVEL` 控制（`verbose` / `info`）
- debug 模式下 `LOG_LEVEL = "verbose"`
- 所有子包都依赖此日志模块
- `log.notice()` 用于特殊提示（如欢迎信息）

### Testing Requirements
- `__tests__/log.test.js`

## Dependencies

### External
- npmlog — npm 风格日志底层

<!-- MANUAL: -->
