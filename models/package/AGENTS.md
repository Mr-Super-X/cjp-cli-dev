<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# models/package

## Purpose
npm 包管理模型 (`@cjp-cli-dev/package`)。封装 npm 包的下载（npminstall）、更新、缓存管理、入口文件定位（pkg-dir）等功能。被 `core/exec` 用于动态获取命令包。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | Package 类——exists/install/update/getRootFilePath 等核心方法 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- `npminstall` 用于下载包到本地缓存目录
- `pkg-dir` 用于定位包的根路径
- `getRootFilePath()` 通过读取包的 `package.json` 中 `main` 字段获取入口文件
- 所有路径操作通过 `@cjp-cli-dev/format-path` 标准化
- 缓存路径结构：`{CLI_HOME}/dependencies/node_modules/`

### Testing Requirements
- `__tests__/package.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/log` — 日志
- `@cjp-cli-dev/format-path` — 路径标准化
- `@cjp-cli-dev/get-npm-info` — 获取最新版本号
- `@cjp-cli-dev/utils` — 工具方法

### External
- npminstall — npm 包下载
- pkg-dir — 包根路径查找

<!-- MANUAL: -->
