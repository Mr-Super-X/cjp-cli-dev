<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# utils/get-npm-info

## Purpose
npm 包信息查询工具 (`@cjp-cli-dev/get-npm-info`)。获取 npm 包的所有版本列表、最新版本号，支持语义化版本比较。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | getNpmSemverVersion/getNpmLatestVersion/getDefaultRegistry 等函数 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 调用 npm registry API 获取包信息
- `getNpmSemverVersion` 用于检查 CLI 脚手架是否有新版本
- 需要处理网络超时和 API 不可用场景
- getDefaultRegistry 返回默认 npm 源

### Testing Requirements
- `__tests__/get-npm-info.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/request` — HTTP 请求（含超时控制）
- `@cjp-cli-dev/utils` — semver

<!-- MANUAL: -->
