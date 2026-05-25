<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/codelint

## Purpose
代码规范校验命令 (`@cjp-cli-dev/codelint`)。为项目安装和配置 ESLint + Prettier 统一代码规范工具。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | CodelintCommand 类——安装 ESLint、Prettier 及配置模板 |
| `lib/template/.eslintrc.js` | ESLint 配置模板 |
| `lib/template/.prettierrc.js` | Prettier 配置模板 |
| `lib/template/eslint.config.mjs` | ESLint 新格式配置模板 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 模板文件存放在 `lib/template/` 目录
- 支持新旧两种 ESLint 配置格式

### Testing Requirements
- `__tests__/codelint.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
