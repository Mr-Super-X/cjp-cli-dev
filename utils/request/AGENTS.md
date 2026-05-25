<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# utils/request

## Purpose
HTTP 请求封装 (`@cjp-cli-dev/request`)。基于 axios 的 HTTP 客户端，统一处理请求超时（30s）、错误拦截和响应格式化。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | axios 实例创建与导出 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 30s 超时是硬性要求，防止网络问题阻塞主流程
- 被 `models/git` 和 `utils/get-npm-info` 依赖

### Testing Requirements
- `__tests__/request.test.js`

## Dependencies

### External
- axios — HTTP 客户端

<!-- MANUAL: -->
