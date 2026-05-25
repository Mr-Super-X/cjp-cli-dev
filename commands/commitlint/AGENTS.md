<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/commitlint

## Purpose
提交规范校验命令 (`@cjp-cli-dev/commitlint`)。为项目安装和配置 Git 提交信息 Angular 规范校验工具（commitlint + commitizen）。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | CommitlintCommand 类 |
| `lib/template/.commitlintrc.js` | commitlint 配置模板 |
| `lib/template/.cz-config.js` | commitizen 配置模板 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 模板文件在 `lib/template/` 目录

### Testing Requirements
- `__tests__/commitlint.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
