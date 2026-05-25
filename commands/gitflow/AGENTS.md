<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/gitflow

## Purpose
Git Flow 初始化命令 (`@cjp-cli-dev/gitflow`)。为项目初始化 Git Flow 分支模型（master/develop/feature/release/hotfix）。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | GitflowCommand 类 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 支持 `--force` 强制初始化

### Testing Requirements
- `__tests__/gitFlow.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
