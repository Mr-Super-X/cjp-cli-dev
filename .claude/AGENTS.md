<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# .claude

## Purpose
AI 助手配置目录，包含项目级 CLAUDE.md 规范、动态记忆库和自定义 Agent 定义。

## Key Files
| File | Description |
|------|-------------|
| `CLAUDE.md` | 项目规范与最佳实践指南——架构原则、开发铁律、调试方法 |
| `memory.md` | 项目记忆库——用户偏好、架构决策记录、跨平台踩坑与兼容性方案 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `agents/` | 自定义 Agent 定义文件 (参见 `agents/AGENTS.md`) |
| `agent-memory/` | Agent 记忆存储目录 (暂无内容) |

## For AI Agents

### Working In This Directory
- 处理任务前必须阅读 `CLAUDE.md` 了解项目核心准则
- 处理复杂任务或 Bug 修复前必须阅读 `memory.md` 获取历史决策和已知踩坑点
- `CLAUDE.md` 中的开发铁律具有最高优先级，不可违反

### Common Patterns
- 项目采用防御性编程思维，所有高风险操作需要边界测试和异常捕获
- 中文注释覆盖率完整，重构时必须保留

## Dependencies

### External
- 无外部依赖，纯配置文件目录

<!-- MANUAL: -->
