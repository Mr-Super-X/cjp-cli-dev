<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# core

## Purpose
脚手架核心框架层：CLI 入口程序负责命令注册、参数解析和启动流程；执行引擎负责命令动态加载、子进程隔离执行和包缓存管理。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `cli/` | CLI 入口程序——Commander 命令注册、启动准备（版本检查、环境变量、Root 降级） (参见 `cli/AGENTS.md`) |
| `exec/` | 命令执行引擎——命令映射表、动态包下载、子进程隔离执行 (参见 `exec/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `cli` 是用户直接交互的入口，`exec` 是命令调度中心
- 新增命令需要同时修改：`cli/lib/index.js`（注册 Commander 命令）+ `exec/lib/index.js`（添加 SETTINGS 映射表）
- 修改 `exec` 的子进程执行逻辑时务必保持异常隔离，确保命令崩溃不影响主进程

### Testing Requirements
- 每个包在 `__tests__/` 下对应测试文件

## Dependencies

### Internal
- `@cjp-cli-dev/log` — cli 和 exec 都依赖
- `@cjp-cli-dev/utils` — 常量、工具方法
- `@cjp-cli-dev/get-npm-info` — 版本检查
- `@cjp-cli-dev/package` — exec 依赖，包管理
- `@cjp-cli-dev/format-path` — exec 依赖，路径标准化

<!-- MANUAL: -->
