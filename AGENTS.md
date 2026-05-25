<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# cjp-cli-dev

## Purpose
基于 Lerna 的 Monorepo 前端脚手架 CLI 工具。提供项目初始化、代码规范、Git Flow、发布部署等一站式前端工程化命令。所有命令通过子进程隔离执行，支持动态包下载和本地热重载调试。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 根包配置，Node 16.20.2 / npm 8.19.4，Lerna 6.6.2 |
| `lerna.json` | Lerna 配置，Fixed 版本模式 v1.7.5，管理 core/models/commands/utils 四个目录 |
| `.gitignore` | Git 忽略规则 |
| `README.md` | 项目说明文档 |
| `LICENSE.md` | MIT 许可证 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `.claude/` | AI 助手配置与项目记忆 (参见 `.claude/AGENTS.md`) |
| `core/` | 核心框架：CLI 入口和执行引擎 (参见 `core/AGENTS.md`) |
| `commands/` | 12 个 CLI 命令包 (参见 `commands/AGENTS.md`) |
| `models/` | 数据模型层：Command、Package、Git、CloudBuild (参见 `models/AGENTS.md`) |
| `utils/` | 公共工具层：日志、路径格式化、npm 信息、网络请求等 (参见 `utils/AGENTS.md`) |
| `docs/` | 架构设计、开发指南、命令规格文档 (参见 `docs/AGENTS.md`) |
| `scripts/` | 构建与安装脚本 (参见 `scripts/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 使用 `npm run reinstall` 一键重装所有子包依赖（替代 `lerna bootstrap`）
- 新命令必须继承 `@cjp-cli-dev/command` 基类并实现 `init()` 和 `exec()` 方法
- 所有命令通过 `core/exec` 的动态映射表注册，在子进程中执行
- 跨平台路径处理必须使用 `@cjp-cli-dev/format-path` 转换
- 终端输出解析换行符必须使用 `/\r?\n/` 正则分割
- 调用系统原生命令必须包裹 try-catch 并精准捕获 ENOENT 错误
- 外部网络请求需设 30s 超时并静默捕获异常
- 重构时绝不允许删除业务逻辑的中文注释

### Testing Requirements
- 每个子包在 `__tests__/` 目录下有对应测试
- 本地调试使用 `--targetPath` 指定本地包路径绕过 npm 下载
- 使用 `--debug` 开启详细调试日志

### Common Patterns
- 所有子包使用 `@cjp-cli-dev/<name>` 命名空间
- 采用 Fixed 版本模式统一发版（当前 v1.7.5）
- 子进程通过 `node -e "require('...').call(null, ...)"` 执行命令
- 每个子包导出通过 `lib/index.js`

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 所有命令的父类
- `@cjp-cli-dev/exec` — 命令动态加载与子进程执行引擎
- `@cjp-cli-dev/log` — 统一日志输出
- `@cjp-cli-dev/format-path` — 跨平台路径标准化
- `@cjp-cli-dev/get-npm-info` — npm 包信息获取
- `@cjp-cli-dev/utils` — 通用工具集
- `@cjp-cli-dev/request` — HTTP 请求封装
- `@cjp-cli-dev/package` — npm 包管理模型
- `@cjp-cli-dev/git` — Git 操作抽象
- `@cjp-cli-dev/cloudbuild` — 云构建模型

### External
- Lerna 6.6.2 — Monorepo 管理
- Commander — CLI 命令解析
- colors — 终端输出美化
- semver — 版本号比较
- dotenv — 环境变量加载

<!-- MANUAL: -->
