# 包清单及依赖关系

所有子包均以 `@cjp-cli-dev/` 为 npm scope，发布到 npmjs.com 公共仓库。

## 包清单

### Core（核心）

| 包名 | 版本 | 说明 |
|------|------|------|
| `@cjp-cli-dev/core` | 1.7.4 | CLI 入口，命令注册、参数解析、环境初始化 |
| `@cjp-cli-dev/exec` | 1.7.0 | 命令执行引擎，动态加载命令包并在子进程中执行 |

### Commands（命令）

| 包名 | 版本 | 说明 |
|------|------|------|
| `@cjp-cli-dev/init` | 1.3.0 | 创建项目/组件模板 |
| `@cjp-cli-dev/add` | 1.3.0 | 添加代码片段/页面模板 |
| `@cjp-cli-dev/publish` | 1.3.0 | 云构建与发布 |
| `@cjp-cli-dev/rollback` | 1.3.0 | 版本回滚 |
| `@cjp-cli-dev/release` | 1.5.3 | 版本升级与 CHANGELOG 生成 |
| `@cjp-cli-dev/gitflow` | 1.6.2 | Git Flow 分支模型初始化 |
| `@cjp-cli-dev/husky` | 1.5.5 | Git Hooks 配置 |
| `@cjp-cli-dev/codelint` | 1.5.3 | 代码规范校验 |
| `@cjp-cli-dev/commitlint` | 1.5.4 | 提交规范校验 |
| `@cjp-cli-dev/server` | 1.7.0 | 静态资源托管服务 |
| `@cjp-cli-dev/delete-branch` | - | 分支删除 |
| `@cjp-cli-dev/resume` | - | Markdown 简历生成 |

### Models（功能模型）

| 包名 | 版本 | 说明 |
|------|------|------|
| `@cjp-cli-dev/command` | 1.3.0 | 命令基类，提供生命周期管理 |
| `@cjp-cli-dev/package` | 1.3.0 | NPM 包下载/更新/缓存管理 |
| `@cjp-cli-dev/git` | 1.3.0 | Git 自动化操作（远程仓库、冲突检查等） |
| `@cjp-cli-dev/cloudbuild` | 1.3.0 | 云构建 Socket.io 通信 |

### Utils（工具）

| 包名 | 版本 | 说明 |
|------|------|------|
| `@cjp-cli-dev/log` | 1.0.7 | 终端日志定制（基于 npmlog） |
| `@cjp-cli-dev/format-path` | 1.0.6 | 跨平台路径兼容处理 |
| `@cjp-cli-dev/get-npm-info` | 1.3.0 | NPM Registry API 交互 |
| `@cjp-cli-dev/request` | 1.0.6 | HTTP 请求封装（基于 axios） |
| `@cjp-cli-dev/utils` | 1.3.0 | 通用工具方法集合 |

## 内部依赖关系

```
@cjp-cli-dev/core (CLI 入口)
├── @cjp-cli-dev/exec
│   ├── @cjp-cli-dev/package
│   │   ├── @cjp-cli-dev/format-path
│   │   ├── @cjp-cli-dev/get-npm-info
│   │   ├── @cjp-cli-dev/log
│   │   └── @cjp-cli-dev/utils
│   ├── @cjp-cli-dev/log
│   └── @cjp-cli-dev/utils
├── @cjp-cli-dev/get-npm-info
├── @cjp-cli-dev/log
└── @cjp-cli-dev/utils

@cjp-cli-dev/init (init 命令)
├── @cjp-cli-dev/command (基类)
│   ├── @cjp-cli-dev/log
│   └── @cjp-cli-dev/utils
├── @cjp-cli-dev/package
├── @cjp-cli-dev/request
├── @cjp-cli-dev/log
└── @cjp-cli-dev/utils

@cjp-cli-dev/publish (publish 命令)
├── @cjp-cli-dev/command
├── @cjp-cli-dev/git
│   ├── @cjp-cli-dev/cloudbuild
│   │   ├── @cjp-cli-dev/log
│   │   ├── @cjp-cli-dev/request
│   │   └── @cjp-cli-dev/utils
│   ├── @cjp-cli-dev/log
│   ├── @cjp-cli-dev/request
│   └── @cjp-cli-dev/utils
├── @cjp-cli-dev/log
└── @cjp-cli-dev/utils

@cjp-cli-dev/server (server 命令)
├── @cjp-cli-dev/command
├── @cjp-cli-dev/log
└── @cjp-cli-dev/utils
```

## 关键第三方依赖

| 依赖 | 用途 | 使用位置 |
|------|------|----------|
| `commander` | 命令行参数解析 | core/cli |
| `inquirer` | 终端交互式问答 | utils/utils |
| `ejs` | 模板渲染引擎 | utils/utils |
| `simple-git` | Git 操作封装 | models/git, utils/utils |
| `npminstall` | NPM 包程序化安装 | models/package |
| `axios` | HTTP 请求 | utils/request, utils/get-npm-info, models/git |
| `socket.io-client` | WebSocket 通信 | models/cloudbuild |
| `express` | HTTP 服务器 | commands/server |
| `http-proxy-middleware` | 请求代理 | commands/server |
| `dotenv` | 环境变量加载 | core/cli |
| `fs-extra` | 增强文件操作 | utils/utils |
| `cross-spawn` | 跨平台进程创建 | utils/utils |
| `semver` | 语义化版本处理 | utils/utils |
| `npmlog` | 日志输出 | utils/log |
| `glob` | 文件匹配 | utils/utils |
| `listr` | 终端任务列表 | models/git |
