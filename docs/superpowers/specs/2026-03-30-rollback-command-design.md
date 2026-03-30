# Rollback 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `rollback` 命令，支持快速回滚生产版本代码。

---

## 1. 命令定义

```bash
cjp-cli-dev rollback [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--buildCmd` | `-bc` | 指定自定义构建命令 | `"npm run build"` |

## 2. 目录结构

```
commands/rollback/
├── package.json
├── lib/
│   └── index.js       # RollbackCommand 主类，继承 Command 基类
└── __tests__/
    └── rollback.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/rollback",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/git": "file:../../models/git",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 核心类设计

### RollbackCommand（继承 Command 基类）

| 方法 | 职责 |
|------|------|
| `init()` | 解析 `buildCmd` 参数 |
| `exec()` | 编排回滚流程：prepare → Git 回滚自动化 → 耗时统计 |
| `prepare()` | 检查 package.json 的 name 和 version 字段 |

Git 回滚操作委托给 `@cjp-cli-dev/git` 模型。

## 5. 执行流程

```
RollbackCommand.exec()
│
├─ 记录 startTime
│
├─ 1. prepare() — 检查 package.json 必要字段 (name, version)
│
├─ 2. Git 回滚自动化
│     ├─ new Git(this.projectInfo, this.options)
│     ├─ git.rollbackPrepare() — 回滚预检查
│     │     ├─ 确认当前处于 master 分支
│     │     ├─ 确保工作区干净
│     │     ├─ 获取远程 Tag 列表
│     │     └─ 交互式选择目标回滚 Tag
│     └─ git.rollback() — 执行回滚
│           ├─ 自动备份 master → backup/master/rollback-<timestamp>
│           ├─ git reset --hard <target-tag>
│           └─ git push --force origin master
│
└─ 输出 "本次回滚耗时：X 秒"
```

## 6. 关键实现细节

### 6.1 备份机制

回滚前自动创建备份分支，确保可恢复：
- 命名规则：`backup/master/rollback-<timestamp>`
- 基于当前 master 的 HEAD 创建

### 6.2 安全保障

| 步骤 | 操作 | 安全措施 |
|------|------|---------|
| 1 | 备份 master | 创建 backup 分支，保留当前状态 |
| 2 | reset --hard | 强制回退到指定 Tag 的 commit |
| 3 | force push | 覆盖远程 master 分支 |

**注意：** force push 是破坏性操作，备份分支是唯一恢复手段。

## 7. 注册方式

```javascript
// exec 映射表
const SETTINGS = { rollback: "@cjp-cli-dev/rollback" };

// CLI 注册
program
  .command("rollback")
  .description("回滚生产版本代码")
  .option("-bc, --buildCmd <buildCmd>", "指定自定义构建命令", "npm run build")
  .action(exec);
```
