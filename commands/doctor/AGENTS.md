<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# commands/doctor

## Purpose
项目体检命令 (`@cjp-cli-dev/doctor`)。对当前项目进行全面健康检查，输出体检报告。支持 `--fix` 自动修复可修复的问题。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | DoctorCommand 类——Checker 调度、结果收集、修复流程 |
| `lib/reporter.js` | 终端报告渲染 |
| `lib/checkers/env-checker.js` | 环境检查器 |
| `lib/checkers/deps-checker.js` | 依赖检查器 |
| `lib/checkers/lint-checker.js` | 代码规范检查器 |
| `lib/checkers/structure-checker.js` | 项目结构检查器 |
| `lib/checkers/git-checker.js` | Git 状态检查器 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 继承 `@cjp-cli-dev/command` 基类
- Checker 模式：每个 checker 实现统一的检查接口，依次执行
- `--fix` 模式需要逐项确认后修复，不可直接批量自动修改
- 新增检查项：在 `lib/checkers/` 下添加新 checker 并在 `CHECKERS` 数组中注册

### Testing Requirements
- `__tests__/doctor.test.js`

### Common Patterns
- Checker 模式：统一接口 + 调度器遍历执行
- 修复前需用户交互确认（通过 `prompt`）

## Dependencies

### Internal
- `@cjp-cli-dev/command` — 基类
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/utils` — prompt 等工具

<!-- MANUAL: -->
