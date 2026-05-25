<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/add

## Purpose
代码复用命令 (`@cjp-cli-dev/add`)。添加组件代码片段模板、页面标准模板、自定义页面模板。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | AddCommand 类——模板选择与添加 |
| `lib/getTemplate.js` | 模板获取逻辑 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 支持自定义 npm 源（`--registry`）

### Testing Requirements
- `__tests__/add.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
