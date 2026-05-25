<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# utils

## Purpose
公共工具层，提供跨包共享的基础能力：日志输出、路径格式化、npm 信息查询、HTTP 请求封装、通用工具函数。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `log/` | 日志工具——分级日志（verbose/info/warn/error/notice），彩色输出，搞笑语录 (参见 `log/AGENTS.md`) |
| `format-path/` | 路径格式化——跨平台路径标准化（`\` → `/`），Windows/Mac 兼容 (参见 `format-path/AGENTS.md`) |
| `get-npm-info/` | npm 信息——获取 npm 包版本列表、最新版本号、语义化版本比较 (参见 `get-npm-info/AGENTS.md`) |
| `request/` | HTTP 请求——基于 axios 的请求封装，含 30s 超时 (参见 `request/AGENTS.md`) |
| `utils/` | 通用工具集——常量、文件操作、颜色、模板渲染、CLI 交互、Git 操作封装等 (参见 `utils/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 工具层代码被所有其他层依赖，修改需注意影响范围
- `format-path` 是跨平台核心组件，所有动态路径必须经它转换
- `log` 提供分级日志，debug 模式下启用 verbose 级别
- `utils/utils` 是最大、最综合的工具包

### Testing Requirements
- 每个包有 `__tests__/` 测试

### Common Patterns
- 所有工具包通过 `@cjp-cli-dev/<name>` 命名空间引用
- 导出单一入口 `lib/index.js`

## Dependencies

### External
- axios — request 包依赖
- colors — 终端颜色
- semver — 版本比较
- ejs — utils 包依赖，模板渲染

<!-- MANUAL: -->
