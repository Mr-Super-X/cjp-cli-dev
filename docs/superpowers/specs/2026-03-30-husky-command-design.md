# Husky 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `husky` 命令，支持快速安装 husky 并管理 Git Hook 脚本。

---

## 1. 命令定义

```bash
cjp-cli-dev husky [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 安装 husky 到当前项目 | `false` |
| `--add` | `-a` | 向指定 Hook 追加脚本（需传 hook名 + 脚本内容） | `[]` |
| `--set` | `-s` | 设置（覆盖）指定 Hook 脚本内容 | `[]` |

> 互斥约束：`--install` 不可与 `--add` / `--set` 同时使用。

## 2. 目录结构

```
commands/husky/
├── package.json
├── lib/
│   ├── index.js                # HuskyCommand 主类
│   └── gitignoreTemplate.js    # .gitignore 默认模板
└── __tests__/
    └── husky.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/husky",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 版本策略

| 版本标识 | initCmd | prepare 脚本 | addHookMode |
|----------|---------|-------------|-------------|
| `husky@8.0.3`（稳定版，node<=16） | `npx husky install` | `husky install` | `npx husky add` |
| `husky@latest`（最新版，node>=18） | `npx husky init` | `husky init` | `echo > .husky/hook` |

## 5. 执行流程

### 5.1 安装流程（--install）

```
prepare() → checkIsGitRepo() → checkGitIgnore() → checkHusky()
→ getHuskyVersion() — 交互选择版本
→ installPackage()
    ├─ execInstallPackages()      — npm install -D husky@xxx
    ├─ createHuskyConfig()        — 执行版本对应的 initCmd
    ├─ modifyPackageScripts()     — 在 scripts.prepare 中添加 husky 初始化命令
    └─ addDefaultHooks()          — 生成默认 pre-commit 和 commit-msg Hook
```

### 5.2 添加/设置 Hook（--add / --set）

```
prepare() → checkHuskyVersion() — 从 devDependencies 推断版本策略
→ upsertHuskyHooks(hook, script, type)
    ├─ 8.x版本 → spawnAsync("npx", ["husky", type, ".husky/<hook>", script])
    └─ 最新版  → spawnAsync("echo", [script, ">", ".husky/<hook>"], { shell: true })
```

## 6. 关键实现细节

### 6.1 prepare 脚本合并策略

- 若 `scripts.prepare` 不存在：直接赋值
- 若已存在：按 `&&` 拆分，查找以 `husky` 开头的项进行替换；未找到则末尾追加

### 6.2 默认 Hook

安装完成后自动生成，为 codelint 和 commitlint 命令做铺垫：
- `pre-commit`：`npx lint-staged`
- `commit-msg`：`npx --no-install commitlint --edit ${1}`

### 6.3 自动检查 .gitignore

安装前检查项目是否存在 `.gitignore`，不存在则自动生成默认模板。

## 7. 注册方式

```javascript
const SETTINGS = { husky: "@cjp-cli-dev/husky" };

program
  .command("husky")
  .description("Git Hooks脚本配置工具")
  .option("-i, --install", "为当前项目安装husky功能", false)
  .option("-a, --add <hook...>", "添加新的Git Hook脚本", [])
  .option("-s, --set <hook...>", "设置Git Hook脚本内容", [])
  .action(exec);
```
