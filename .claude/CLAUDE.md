# cjp-cli-dev 项目规范与最佳实践指南

欢迎来到 cjp-cli-dev 项目！作为一个复杂的 Monorepo 脚手架应用，本项目对代码隔离、跨平台兼容和防御性编程有着严格的要求。这篇指南将帮助你快速理解项目的核心准则。

## 🧠 记忆库检索 (Memory & Guidance)
项目组维护了一份动态记忆文件：`.claude/memory.md`。
**【强规则】** 
任何 AI 助手或新成员在处理复杂任务、修复 Bug 之前，**必须主动阅读** `.claude/memory.md`，以获取最新的项目决策记录、用户偏好和已知工作区的踩坑点，保证历史遗留问题不被复现。

## 🏗 核心架构原则 (Architecture Context)
本项目区别于常规 CLI 工具，重点请关注以下设计：
- **Monorepo / Lerna**：基于 Lerna 架构，使用 Fixed 版本模式（锁定 6.6.2，不用 8.x 版本）。
- **子进程隔离执行**：不要对 Commands 使用静态 `require` 执行！所有的命令（除内置命令外）统一由 `core/exec` 解析映射后包下载，并在**子进程**（`node -e`）中通过动态脚本运行，以此提供强异常隔离。
- **面向对象及基类约束**：新开发的命令必须继承 `@cjp-cli-dev/command` 基类，并严格实现 `init` 与 `exec` 生命周期方法。

## 🛡 开发铁律 (Code Conventions & Security)
本项目高度重视**防御性编程 (Defensive Programming)** 与跨平台稳健性，务必遵守：
1. **跨平台原生命令保护**：
   - Windows 环境下系统原生命令（如 `ssh-keygen`, `scp` 等）经常缺失。在调用 `cp.execSync` 时，必须带有 `try...catch` 块。
   - 判断条件必须精准拦截 `ENOENT` 错误（如 `e.code === 'ENOENT' || e.message.includes('ENOENT')`），而不是依赖 Exit code，并给出友好的中文安装指引保障避免闪退。
2. **标准输出（Stdout）换行处理**：读取终端内容（如 `git status` / `git ls-remote`）并需要切分解析时，强制使用正则表达式 `/\r?\n/` 分割以抹平 Windows（\r\n）和 Mac（\n）的换行符差异。
3. **路径拼接与引用**：跨端文件读写及动态 require 时使用的路径，一律先通过内置模块 `@cjp-cli-dev/format-path` 转换，确保使用 `/` 标准化分割。
4. **业务流注释保护**：代码中已有详尽的中文业务注解。在进行封装、重构任务时，**绝不允许**为了缩减行数而删减核心逻辑的原始中文注释。
5. **非阻塞式网络防挂起**：对所有外部服务接口探测（如检查更新 `getNpmInfo`）需要实施防等候策略。明确设定 30s 网络超时并在调用流末端抛出异步 `catch() {}` 静默捕获，保证无网环境脚手架依然可用。

## 🚀 测试与本地联调 (Debugging & Deployment)
- **避坑 Lerna Bootstrap 软链**：本地安装重置各子包依赖时直接使用定制脚本一键执行（清除、安装、link）：
  ```bash
  npm run reinstall
  ```
- **本地命令调试利器**：
  - `--debug` / `-dbg`: 追加开启完整的流程调试日志。
  - `--targetPath <local_path>` / `-tp`: 指令后挂载本地某个命令包的绝对路径。通过它跳过 npm 检测与远端下载机制，无缝使用本地代码调试（不需要发版 npm）。
