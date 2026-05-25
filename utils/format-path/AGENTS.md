<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# utils/format-path

## Purpose
跨平台路径格式化工具 (`@cjp-cli-dev/format-path`)。将 Windows 反斜杠 `\` 统一转换为正斜杠 `/`，确保路径在 Windows/Mac/Linux 下均可正确识别。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | 核心函数——路径分隔符标准化 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 所有动态 `require()` 和文件读写操作必须经此模块转换路径
- 被 `core/exec` 和 `models/package` 等核心模块依赖

### Testing Requirements
- `__tests__/format-path.test.js`

## Dependencies

### External
- 无外部依赖

<!-- MANUAL: -->
