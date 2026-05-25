<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# models

## Purpose
数据模型层，封装项目核心抽象概念：命令行基类、npm 包管理、Git 平台操作、云构建服务。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `command/` | 命令基类——所有 CLI 命令的父类，提供 init/exec 生命周期、参数解析、Node 版本检查 (参见 `command/AGENTS.md`) |
| `package/` | 包管理——npm 包的下载、更新、缓存、入口文件定位 (参见 `package/AGENTS.md`) |
| `git/` | Git 操作——GitHub/Gitee API 封装、SSH 密钥管理、Git 命令交互 (参见 `git/AGENTS.md`) |
| `cloudbuild/` | 云构建——CloudBuild 服务抽象，用于项目云构建发布 (参见 `cloudbuild/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `command` 是所有命令的基类，修改它会影响所有命令
- `package` 管理 npm 包的下载缓存，修改时注意缓存路径和跨平台兼容
- `git` 包含 GitHub 和 Gitee 双平台支持
- 所有模型层代码运行在主进程和子进程中，需保持轻量和纯净

### Testing Requirements
- 每个模型包有对应 `__tests__/` 测试

### Common Patterns
- 使用 ES5 `require` / `module.exports` 风格（Node 16 支持但不强制 ES Module）
- 基类设计模式：`command` 父类定义抽象方法，子类强制实现

## Dependencies

### Internal
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — 工具方法
- `@cjp-cli-dev/request` — git 模型依赖，HTTP 请求

<!-- MANUAL: -->
