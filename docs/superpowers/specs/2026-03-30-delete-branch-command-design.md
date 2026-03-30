# Delete-Branch 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `delete-branch` 命令，支持快速删除本地和远程分支，支持单删与多选批量删除。

---

## 1. 命令定义

```bash
cjp-cli-dev delete-branch [branchName] [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `branchName` | - | 分支名称（可选，单删模式） | `""` |
| `--force` | `-f` | 强制删除，跳过二次确认 | `false` |
| `--multiple` | `-m` | 多选模式，列出全部分支供多选删除 | `false` |

## 2. 目录结构

```
commands/delete-branch/
├── package.json
├── lib/
│   └── index.js       # DeleteBranchCommand 主类
└── __tests__/
    └── delete-branch.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/delete-branch",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

使用 `@cjp-cli-dev/utils` 中的 `simpleGit` 进行 Git 操作。

## 4. 执行流程

### 4.1 单删模式

```
指定 branchName → force ? 直接删除 : 二次确认
→ checkLocalBranch(branchName) — 存在则删除本地分支
→ checkRemoteBranch(branchName) — 存在则删除远程分支
```

### 4.2 多选模式（--multiple）

```
getBranches() — 交互式 checkbox 多选（显示本地+远程分支列表）
→ 拆分选中项为 localBranches 和 remoteBranches（以 "origin/" 前缀区分）
→ force ? 直接批量删除 : 二次确认
→ batchDeleteBranches(localBranches, remoteBranches)
```

## 5. 关键实现细节

### 5.1 分支来源识别

| API 调用 | 作用 | 对应 Git 命令 |
|----------|------|---------------|
| `git.branchLocal()` | 获取本地分支列表 | `git branch` |
| `git.branch(["-r"])` | 获取远程分支列表 | `git branch -r` |

### 5.2 远程分支名称处理

删除远程分支时自动去除 `origin/` 前缀：

```javascript
branchName = branchName.replace(/^origin\//, "");
await git.push(["origin", "--delete", branchName]);
```

### 5.3 安全性：二次确认

| 场景 | `--force` | 行为 |
|------|-----------|------|
| 单删 | 否 | confirm 确认（默认 N） |
| 单删 | 是 | 直接删除 |
| 多选 | 否 | 选择后 confirm 确认 |
| 多选 | 是 | 选择后直接删除 |

## 6. 注册方式

```javascript
const SETTINGS = { "delete-branch": "@cjp-cli-dev/delete-branch" };

program
  .command("delete-branch [branchName]")
  .description("删除本地和远程分支")
  .option("-f, --force", "是否强制删除分支", false)
  .option("-m, --multiple", "是否删除多个分支", false)
  .action(exec);
```
