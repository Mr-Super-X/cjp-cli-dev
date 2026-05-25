<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/server

## Purpose
静态资源服务命令 (`@cjp-cli-dev/server`)。启动本地静态资源托管服务，支持 HTTP 请求代理配置。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | ServerCommand 类 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- `--port` 指定端口（默认 3000）

### Testing Requirements
- `__tests__/server.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具集

<!-- MANUAL: -->
