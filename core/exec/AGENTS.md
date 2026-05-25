<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# core/exec

## Purpose
命令执行引擎 (`@cjp-cli-dev/exec`)，脚手架调度中心。维护命令→npm 包映射表，通过 `@cjp-cli-dev/package` 下载/更新命令包，在隔离的 Node 子进程中通过 `node -e` 动态执行命令代码。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | exec() 主函数——命令映射查找、包缓存管理、子进程生成执行 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- `SETTINGS` 映射表：新增命令时在此添加 `命令名: "@cjp-cli-dev/包名"` 映射
- 子进程生成使用 `spawn("node", ["-e", code])`，code 是动态拼接的 `require().call()` 字符串
- `--targetPath` 环境变量跳过包下载机制，直接使用本地路径
- 子进程 stdio 设为 `"inherit"` 将输出流交给父进程
- 修改子进程生成逻辑时必须保持异常隔离，error 事件和 exit 事件都需处理

### Testing Requirements
- `__tests__/exec.test.js`

## Dependencies

### Internal
- `@cjp-cli-dev/package` — 包下载与缓存管理
- `@cjp-cli-dev/log` — 日志输出
- `@cjp-cli-dev/utils` — 常量（缓存目录、npm 源）、spawn 方法

<!-- MANUAL: -->
