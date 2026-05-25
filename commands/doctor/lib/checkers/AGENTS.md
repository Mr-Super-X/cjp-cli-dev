<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/doctor/lib/checkers

## Purpose
doctor 命令的检查器集合。每个 checker 负责项目健康检查的一个维度，实现统一的检查接口，被 DoctorCommand 调度遍历执行。

## Key Files
| File | Description |
|------|-------------|
| `env-checker.js` | 环境检查——Node 版本、系统环境等 |
| `deps-checker.js` | 依赖检查——npm 包版本、依赖冲突等 |
| `lint-checker.js` | 代码规范检查——ESLint、Prettier 配置 |
| `structure-checker.js` | 项目结构检查——目录组织、文件规范 |
| `git-checker.js` | Git 状态检查——分支、未提交变更等 |

## For AI Agents

### Working In This Directory
- 所有 checker 实现统一接口，返回检查结果对象
- 新增 checker 后在 `commands/doctor/lib/index.js` 的 `CHECKERS` 数组中注册
- 修复功能需要用户交互确认

### Common Patterns
- Checker 模式：统一接口 + 遍历执行 + 结果聚合

<!-- MANUAL: -->
