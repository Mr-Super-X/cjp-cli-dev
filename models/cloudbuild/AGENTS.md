<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# models/cloudbuild

## Purpose
云构建模型 (`@cjp-cli-dev/cloudbuild`)。封装 CloudBuild 服务抽象，用于 `publish` 命令的项目云构建发布流程。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | CloudBuild 类 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 被 `models/git` 和 `commands/publish` 引用
- 涉及远程服务调用，需处理网络超时和异常

### Testing Requirements
- `__tests__/cloudbuild.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/log` — 日志

<!-- MANUAL: -->
