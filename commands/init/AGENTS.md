<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/init

## Purpose
项目初始化命令 (`@cjp-cli-dev/init`)。创建标准项目模板、自定义项目模板、组件库模板。支持强制初始化、自定义 npm 源。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | InitCommand 类——模板选择、项目名校验、模板下载与渲染 |
| `lib/getProjectTemplate.js` | 模板获取逻辑 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 使用 `@cjp-cli-dev/package` 下载模板包
- 使用 EJS 渲染项目模板
- 白名单命令机制防止执行危险的安装脚本
- 支持 `--force` 强制覆盖已有目录

### Testing Requirements
- `__tests__/init.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/package` — 模板包下载
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

### External
- kebab-case — 驼峰转短横线

<!-- MANUAL: -->
