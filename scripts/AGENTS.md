<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# scripts

## Purpose
项目构建与维护脚本目录。

## Key Files
| File | Description |
|------|-------------|
| `install-deps.js` | 一键重装脚本——遍历所有子包执行 npm install 并建立软链接，替代不可靠的 lerna bootstrap |

## For AI Agents

### Working In This Directory
- 通过 `npm run reinstall` 调用此脚本
- 修改依赖安装流程时需确保 Windows/Mac 双平台兼容
- 脚本需要处理软链接失败的容错

### Common Patterns
- 脚本使用 Node.js 编写，通过 `node scripts/install-deps.js` 执行

<!-- MANUAL: -->
