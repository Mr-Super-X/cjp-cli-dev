# Gitflow 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `gitflow` 命令，支持快速为项目初始化 Git Flow 分支模型。

---

## 1. 命令定义

```bash
cjp-cli-dev gitflow [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 执行 git flow 初始化 | `false` |
| `--force` | `-f` | 强制重新初始化（跳过已初始化检测） | `false` |

## 2. 目录结构

```
commands/gitflow/
├── package.json
├── lib/
│   └── index.js       # GitFlowCommand 主类
└── __tests__/
    └── gitFlow.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/gitflow",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 执行流程

```
exec()
├─ prepare() → checkRequiredKeys()
├─ checkGitFlowTool()        — 检查系统是否安装 git-flow，未安装按平台提示
├─ checkIsGitRepo()          — 检查 .git 目录，不存在则自动 git init
├─ checkGitFlowIsInit()      — 检查是否已初始化（force 时跳过）
└─ initGitFlow()
    ├─ getGitFlowMode() — 交互选择默认/自定义分支模型
    ├─ [默认] git flow init -d [-f]
    └─ [自定义] git flow init [-f]（交互式输入分支名称）
```

## 5. 关键实现细节

### 5.1 跨平台 git-flow 安装检测

| 平台 | 安装提示 |
|------|---------|
| Windows (`win32`) | 一般随 Git 安装自带；若缺失，提示前往 GitHub wiki |
| macOS (`darwin`) | 提示 `brew install git-flow` |

### 5.2 分支模型选择

| 模式 | 命令 | 说明 |
|------|------|------|
| 默认分支模型 | `git flow init -d [-f]` | 使用 master/develop/release/feature/hotfix/bugfix/support |
| 自定义分支模型 | `git flow init [-f]` | `stdio: inherit`，由 git flow 原生交互输入分支名称 |

### 5.3 重复初始化保护

通过 `git flow config list` 返回码判断是否已初始化，已初始化时提示使用 `--force`。

## 6. 注册方式

```javascript
const SETTINGS = { gitflow: "@cjp-cli-dev/gitflow" };

program
  .command("gitflow")
  .description("初始化Git Flow分支模型")
  .option("-i, --install", "为当前项目初始化Git Flow分支模型", false)
  .option("-f, --force", "是否强制初始化分支模型", false)
  .action(exec);
```
