<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands

## Purpose
CLI 命令包集合，共 12 个命令。每个命令继承 `@cjp-cli-dev/command` 基类，实现 `init()` 和 `exec()` 生命周期方法。所有命令通过 `core/exec` 在子进程中动态加载执行。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `init/` | 项目初始化——创建标准模板、自定义模板、组件库模板 (参见 `init/AGENTS.md`) |
| `publish/` | 项目发布——云构建云发布、组件库发布 npm (参见 `publish/AGENTS.md`) |
| `add/` | 代码复用——添加组件代码片段模板、页面模板 (参见 `add/AGENTS.md`) |
| `rollback/` | 版本回滚——回滚生产版本代码 (参见 `rollback/AGENTS.md`) |
| `husky/` | Git Hooks——安装和配置 husky (参见 `husky/AGENTS.md`) |
| `codelint/` | 代码规范——ESLint + Prettier 统一代码规范 (参见 `codelint/AGENTS.md`) |
| `commitlint/` | 提交规范——Angular 规范提交信息校验 (参见 `commitlint/AGENTS.md`) |
| `release/` | 版本发布——自动升级版本 + 生成 CHANGELOG (参见 `release/AGENTS.md`) |
| `gitflow/` | Git Flow——初始化分支模型 (参见 `gitflow/AGENTS.md`) |
| `delete-branch/` | 分支删除——快速删除本地和远程分支 (参见 `delete-branch/AGENTS.md`) |
| `resume/` | 简历生成——Markdown 简历 + PDF 导出 (参见 `resume/AGENTS.md`) |
| `server/` | 静态服务——本地静态资源托管 + HTTP 代理 (参见 `server/AGENTS.md`) |
| `doctor/` | 项目体检——全面检查项目健康状态 + 自动修复 (参见 `doctor/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 每个命令包必须继承 `@cjp-cli-dev/command` 基类
- 必须实现 `init()` 和 `exec()` 方法，否则运行时报错
- 命令被 `core/exec` 通过 `node -e` 在子进程中执行，代码必须是可在子进程中独立运行的完整逻辑
- 本地调试使用 `--targetPath` 指向本地包路径

### Testing Requirements
- 每个包 `__tests__/` 下至少一个测试文件

### Common Patterns
- 每个命令包结构：`lib/index.js`（入口）、`__tests__/`（测试）、`package.json`
- 部分命令包含 `lib/template/` 目录存放配置模板

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 所有命令的父类
- `@cjp-cli-dev/log` — 日志输出
- `@cjp-cli-dev/utils` — 通用工具

<!-- MANUAL: -->
