<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# models/git

## Purpose
Git 操作抽象层 (`@cjp-cli-dev/git`)。封装 GitHub 和 Gitee 双平台 API、SSH 密钥管理、Git 命令交互（simple-git）。提供创建仓库、推送代码、管理 Token 等能力。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | Git 主类——平台选择、Git 操作整合 |
| `lib/Github.js` | GitHub API 封装——仓库创建、SSH 密钥管理 |
| `lib/Gitee.js` | Gitee API 封装 |
| `lib/GithubRequest.js` | GitHub HTTP 请求封装 |
| `lib/GiteeRequest.js` | Gitee HTTP 请求封装 |
| `lib/GitServer.js` | Git 平台抽象基类 |
| `lib/ComponentRequest.js` | 组件库请求封装 |
| `lib/commandWhitelist.js` | 命令白名单——防止执行危险的 Git 命令 |
| `lib/gitignoreTemplate.js` | .gitignore 模板 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 跨平台原生命令调用（如 ssh-keygen）必须包裹 try-catch 并捕获 ENOENT 错误
- GitHub/Gitee API 调用使用 `@cjp-cli-dev/request` 统一处理
- 终端输出解析使用 `/\r?\n/` 分割换行
- `ssh-keygen --help` 退出码为 1，不能以非零退出码判断命令缺失

### Testing Requirements
- `__tests__/git.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/request` — HTTP 请求
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/cloudbuild` — 云构建
- `@cjp-cli-dev/utils` — 工具方法

### External
- simple-git — Git 命令封装
- terminal-link — 终端可点击链接
- listr — 任务列表增强
- rxjs — 响应式数据流

<!-- MANUAL: -->
