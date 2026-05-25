<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 | Updated: 2026-05-25 -->

# utils/utils

## Purpose
通用工具集 (`@cjp-cli-dev/utils`)。最大的工具包，聚合了常量配置、文件操作、终端颜色、CLI 交互、模板渲染、子进程管理、Git 操作封装等跨包共享的基础能力。

## Key Files
| File | Description |
|------|-------------|
| `lib/index.js` | 聚合导出——统一对外暴露所有工具 |
| `lib/cli-const.js` | CLI 常量配置——CLI_NAME、DEFAULT_CLI_HOME、LOWEST_NODE_VERSION、缓存目录、npm 源等 |
| `lib/colors.js` | 终端颜色封装 |
| `lib/ejs.js` | EJS 模板渲染封装 |
| `lib/file.js` | 文件读写方法 |
| `lib/fs-extra.js` | 增强文件操作 |
| `lib/glob.js` | 文件模式匹配 |
| `lib/inquirer.js` | 终端交互式问答 |
| `lib/path-exists.js` | 路径存在检查 |
| `lib/semver.js` | 语义化版本比较 |
| `lib/simple-git.js` | Git 操作封装 |
| `lib/spawn.js` | 子进程管理（spawn/spawnAsync） |
| `lib/spinner.js` | 终端 loading 动画 |
| `lib/util.js` | 其他通用工具方法 |
| `package.json` | 包配置 |

## For AI Agents

### Working In This Directory
- 此包被几乎所有子包依赖，修改常量配置影响全局
- `cli-const.js` 中的 DEFAULT_CLI_HOME、DEPENDENCIES_CACHE_DIR 等控制缓存路径
- 修改 `spawn.js` 需注意跨平台兼容
- 导出采用对象展开聚合模式（`...util, ...constant`）

### Testing Requirements
- `__tests__/utils.test.js`

## Dependencies

### External
- semver — 版本比较
- colors — 终端颜色
- ejs — 模板渲染
- simple-git — Git 操作

<!-- MANUAL: -->
