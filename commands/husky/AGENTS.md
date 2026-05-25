<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/husky

## Purpose
Git Hooks 配置命令 (`@cjp-cli-dev/husky`)。为项目安装和配置 husky，支持添加和设置自定义 Git Hook 脚本。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | HuskyCommand 类——安装 husky、添加/设置 Hook 脚本 |
| `lib/gitignoreTemplate.js` | .gitignore 模板 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- `--add` 支持多个值（数组格式）
- `--set` 设置 Hook 脚本内容

### Testing Requirements
- `__tests__/husky.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
