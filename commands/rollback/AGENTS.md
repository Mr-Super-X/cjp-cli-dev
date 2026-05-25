<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/rollback

## Purpose
版本回滚命令 (`@cjp-cli-dev/rollback`)。回滚生产版本代码，支持自定义构建命令。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | RollbackCommand 类 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 支持 `--buildCmd` 指定自定义构建命令

### Testing Requirements
- `__tests__/rollback.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
