# CLAUDE.md 规范与最佳实践设计书

> 日期：2026-04-03
> 状态：已批准
> 目标：为 `cjp-cli-dev` 项目制定 `CLAUDE.md` 最佳实践指南，以便 AI 助手和新团队成员快速了解项目规范与上下文。

## 1. 核心定位
`CLAUDE.md` 作为项目根目录下的 AI 与开发者协同索引指南，主要用于串联系统的重点规范、屏蔽常见踩坑点，并作为上下文记忆的引导入口。

## 2. 结构规划

### 2.1 指引与记忆检索 (Memory & Guidance)
- **强规则**：所有的项目积累上下文、用户偏好、已知 Bug 及临时解决方案（Workarounds）统一通过 `.claude/memory.md` 管理。
- **动作**：要求 AI 助手在处理复杂任务前，主动阅读 `.claude/memory.md`，保证历史踩坑不再复现。

### 2.2 核心架构原则 (Architecture Context)
浓缩说明本项目区别于常规 CLI 工具的特点，指导代码的扩展方向：
- **插件化/多包架构**：基于 Lerna / npm workspace 的环境，遵守 Fixed 版本控制。
- **命令子进程隔离**：所有 Command 并不通过静态 `require` 执行，而是由 `core/exec` 解析映射后在子进程中运行，强制隔离异常。
- **面向对象及基类约束**：新命令必须继承 `@cjp-cli-dev/command` 基类，遵循 `init` 与 `exec` 生命周期。

### 2.3 开发铁律 (Code Conventions & Security)
- **跨平台稳健性 (Defensive Programming)**：
  - Windows 环境下系统原生命令（如 `ssh-keygen`, `scp`等）缺失严重，调用 `cp.execSync` 时必须捕获并正确处理 `ENOENT`。
  - 读取终端标准输出内容（如 `git status`），强制使用正则表达式 `/\r?\n/` 分割以抹平换行符差异。
  - 文件读取、写入和引用路径拼接，一律使用 `@cjp-cli-dev/format-path` 解决 `\` 与 `/` 的冲突。
- **注释保护**：在重构和封装文件时，必须严格保留中文业务逻辑注释。
- **非阻塞式网路请求**：对外置接口（如 `getNpmInfo` 版本检测）采用防等候策略（设置 timeout 或 catch），确保网络环境恶劣时 CLI 依然可用。

### 2.4 测试与本地联调 (Debugging & Deployment)
- **本地包安装**：弃用 `lerna bootstrap`，使用自主脚本 `npm run reinstall` 一键自动重装依赖并链接。
- **调试模式**：使用 `--debug` 及 `--targetPath`（本地路径）以跳过线上依赖更新探测，进入本地沉浸式联调。
