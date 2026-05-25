<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/delete-branch

## Purpose
分支删除命令 (`@cjp-cli-dev/delete-branch`)。快速删除本地和远程 Git 分支，支持强制删除和批量删除。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | DeleteBranchCommand 类 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- `--force` 强制删除、`--multiple` 多分支删除
- 涉及远程操作，需确认用户意图

### Testing Requirements
- `__tests__/delete-branch.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
