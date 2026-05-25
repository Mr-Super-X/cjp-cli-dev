<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/publish

## Purpose
项目发布命令 (`@cjp-cli-dev/publish`)。项目云构建云发布、组件库自动构建并发布到 npm。支持 Git 托管平台配置、SSH 上传、自定义构建命令。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | PublishCommand 类——Git 平台配置、云构建触发、组件库发布 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- 依赖 `@cjp-cli-dev/git` 进行 Git 平台操作和 SSH 密钥管理
- 支持 `--refreshGitServer/Token/Owner` 更新 Git 配置
- 支持 `--production` 正式发布、`--noCloudBuild` 跳过云构建

### Testing Requirements
- `__tests__/publish.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/git` — Git 平台操作
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
