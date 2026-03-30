# Git 自动化模型设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：`@cjp-cli-dev/git` 封装了 Git 仓库的完整自动化操作，包括远程仓库管理、代码提交、分支管理、云构建发布和版本回滚。是 publish 和 rollback 命令的核心依赖。

---

## 1. 包定义

| 属性 | 值 |
|------|-----|
| 包名 | `@cjp-cli-dev/git` |
| 版本 | `1.3.0` |
| 入口文件 | `lib/index.js` |
| 文件规模 | ~1670 行（建议后续拆分） |

## 2. 目录结构

```
models/git/
├── package.json
├── lib/
│   ├── index.js              # Git 主类（1670行）
│   ├── Github.js             # GitHub API 封装
│   ├── Gitee.js              # Gitee API 封装
│   ├── ComponentRequest.js   # 组件信息数据库交互
│   ├── gitignoreTemplate.js  # 默认 .gitignore 模板
│   └── commandWhitelist.js   # 构建命令白名单
└── __tests__/
    └── git.test.js
```

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/git",
  "dependencies": {
    "@cjp-cli-dev/cloudbuild": "file:../../models/cloudbuild",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/request": "file:../../utils/request",
    "@cjp-cli-dev/utils": "file:../../utils/utils",
    "axios": "^1.7.7",
    "listr": "^0.14.3",
    "rxjs": "^6.6.7",
    "simple-git": "^3.26.0",
    "terminal-link": "^2.1.1"
  }
}
```

| 依赖 | 用途 |
|------|------|
| `simple-git` | Node.js 中执行 Git 命令 |
| `listr` + `rxjs` | 终端任务列表增强（打 Tag 流程的交互优化） |
| `terminal-link` | 在终端生成可点击的超链接 |
| `@cjp-cli-dev/cloudbuild` | 云构建 WebSocket 通信 |

## 4. 核心类设计

### Git 类

#### 4.1 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `name` | `String` | 项目名称 |
| `version` | `String` | 项目版本号 |
| `dir` | `String` | 源码路径 |
| `git` | `SimpleGit` | simple-git 实例 |
| `gitServer` | `Github\|Gitee` | 托管平台实例 |
| `homePath` | `String` | 用户主目录 |
| `user` | `Object` | 远程平台用户信息 |
| `orgs` | `Array` | 用户所在组织列表 |
| `owner` | `String` | 仓库所有者类型（user/org） |
| `login` | `String` | 登录名 |
| `repo` | `Object` | 远程仓库信息 |
| `cloneType` | `String` | 克隆方式（https/ssh） |
| `token` | `String` | Git Token |
| `remote` | `String` | 远程仓库地址 |
| `branch` | `String` | 本地开发分支名 |
| `refreshGitServer` | `Boolean` | 是否强制刷新托管平台 |
| `refreshGitToken` | `Boolean` | 是否强制刷新 Token |
| `refreshGitOwner` | `Boolean` | 是否强制刷新登录类型 |
| `buildCmd` | `String` | 自定义构建命令 |
| `production` | `Boolean` | 是否正式发布 |
| `noCloudBuild` | `Boolean` | 是否禁用云构建 |

#### 4.2 方法分类

Git 类的 ~50 个方法按职责可分为 7 个功能组：

**A. 准备阶段（prepare 组）**

| 方法 | 功能 |
|------|------|
| `prepare()` | 主入口：依次执行下列检查 |
| `checkHomePath()` | 设置并创建用户主目录缓存（`~/.cjp-cli-dev/.git/`） |
| `checkGitServer()` | 检查或让用户选择 Git 托管平台（GitHub/Gitee） |
| `checkGitToken()` | 检查或让用户输入 Token |
| `getUserAndOrgs()` | 获取远程平台的用户和组织信息 |
| `checkGitOwner()` | 选择仓库所有者类型（个人/组织） |
| `checkRepo()` | 获取或自动创建远程仓库 |
| `checkGitIgnore()` | 自动生成默认 .gitignore |

**B. 仓库初始化（init 组）**

| 方法 | 功能 |
|------|------|
| `init()` | 主入口：初始化本地仓库并关联远程 |
| `getRemote()` | 生成远程仓库地址 |
| `initAndAddRemote()` | 执行 git init + git remote add origin |
| `initCloneType()` | 确定使用 HTTPS 还是 SSH |
| `getCloneType()` | 交互式选择克隆方式 |
| `checkSSHKey()` | 检查 SSH 公钥是否存在 |
| `checkGitSSHConnection()` | 测试 SSH 连接可用性 |
| `initCommit()` | 首次提交并推送 master |
| `checkRemoteMaster()` | 检查远程是否存在 master 分支 |

**C. 代码提交（commit 组）**

| 方法 | 功能 |
|------|------|
| `commit()` | 主入口：自动化提交推送流程 |
| `getCorrectVersion()` | 计算正确的开发分支版本号 |
| `checkStash()` | 检查 stash 记录并提示 pop |
| `getStashConfirm()` | 确认是否弹出 stash |
| `checkConflicted()` | 检查代码冲突 |
| `checkNotCommitted()` | 自动 add + commit 未提交代码 |
| `checkoutLocalBranch(branch)` | 切换或创建本地分支 |
| `pullRemoteMasterBranch()` | 拉取远程 master 合并到当前分支 |
| `pushRemoteRepo(branch)` | 推送到指定远程分支 |
| `pullRemoteRepo(branch, opts)` | 拉取远程分支并合并 |
| `writeVersionToPackageSync()` | 将版本号回写到 package.json |

**D. 发布流程（publish 组）**

| 方法 | 功能 |
|------|------|
| `publish()` | 主入口：编排发布全流程 |
| `preparePublish()` | 发布前代码预检查 + 选择发布平台 |
| `checkTag()` | 自动生成远程/本地 Tag |
| `runCreateTagTask()` | 使用 Listr + RxJS 优化打 Tag 任务交互 |
| `mergeBranchToMaster()` | 合并代码到 master |
| `deleteLocalBranch()` | 删除本地开发分支 |
| `deleteRemoteBranch()` | 删除远程开发分支 |
| `localBuild()` | 本地构建（非云构建模式） |
| `uploadTemplate()` | 从 OSS 下载 HTML 模板并 scp 到服务器 |
| `checkComponent()` | 检查组件合法性 |
| `uploadComponentToNpm()` | npm publish 发布组件 |
| `saveComponentToDB()` | 将组件信息写入 MySQL |
| `checkNpmLogin()` | 检查 npm 登录状态 |
| `getPackageJson()` | 读取项目 package.json |
| `checkCommandInWhitelist(cmd)` | 校验构建命令安全性 |

**E. 版本回滚（rollback 组）**

| 方法 | 功能 |
|------|------|
| `rollbackPrepare()` | 回滚前预检查主入口 |
| `rollback()` | 执行回滚主流程 |
| `checkIsGitRepo()` | 检查是否为 Git 仓库 |
| `checkRollbackTag()` | 获取 release Tag 列表供用户选择 |
| `checkRollbackBranch()` | 创建 master 备份分支 |
| `checkLocalRollbackBranch()` | 检查本地备份分支是否已存在 |
| `checkRemoteRollbackBranch()` | 检查远程备份分支是否已存在 |
| `resetHardTagForce(branch, tag)` | 执行 git reset --hard + force push |
| `checkReleaseTags()` | 获取远程 release Tag 列表 |

**F. 远程分支/Tag 查询（query 组）**

| 方法 | 功能 |
|------|------|
| `getRemoteBranchList(type)` | 获取远程分支或 Tag 列表 |
| `checkRemoteAllUpdate()` | 执行 git fetch 获取最新远程信息 |
| `createTagChoices(data, type)` | 将 Tag 列表转为 inquirer choices |
| `getChoicesTag(choices)` | 交互式让用户选择 Tag |

**G. 工具方法**

| 方法 | 功能 |
|------|------|
| `createGitServer(type)` | 策略模式：按标识返回 GitHub 或 Gitee 实例 |
| `createPath(file)` | 基于用户主目录生成 Git 缓存文件路径 |
| `isComponent()` | 判断是否为组件项目（检查 .componentrc） |

## 5. 核心流程

### 5.1 prepare → init → commit → publish（发布全链路）

```
new Git(projectInfo, options)
│
├─ prepare()
│   ├─ checkHomePath()         → 确认缓存目录
│   ├─ checkGitServer()        → 选择 GitHub/Gitee
│   ├─ checkGitToken()         → 输入/缓存 Token
│   ├─ getUserAndOrgs()        → 获取用户和组织信息
│   ├─ checkGitOwner()         → 选择个人/组织
│   ├─ checkRepo()             → 获取或创建远程仓库
│   └─ checkGitIgnore()        → 生成 .gitignore
│
├─ init()
│   ├─ getRemote()             → 拼接远程地址
│   ├─ initAndAddRemote()      → git init + add remote
│   ├─ initCloneType()         → 确定 HTTPS/SSH
│   ├─ [SSH] checkSSHKey()     → 检查公钥
│   └─ initCommit()            → 首次提交 + 推送 master
│
├─ commit()
│   ├─ getCorrectVersion()     → 计算开发分支版本号
│   ├─ checkStash()            → 处理 stash
│   ├─ checkConflicted()       → 检查代码冲突
│   ├─ checkNotCommitted()     → 自动 add + commit
│   ├─ checkoutLocalBranch()   → 切换到开发分支
│   ├─ pullRemoteMasterBranch() → 拉取并合并远程 master
│   └─ pushRemoteRepo()        → 推送到远程开发分支
│
└─ publish()
    ├─ preparePublish()        → 发布前检查
    ├─ [项目] CloudBuild       → Socket.io 云构建
    │   ├─ prepare()           → OSS 检查
    │   ├─ init()              → Socket 连接
    │   └─ build()             → 触发构建 + 监听日志
    ├─ [组件] localBuild()     → 本地构建
    │   └─ uploadComponentToNpm() → npm publish
    ├─ checkTag()              → 自动打 Tag
    ├─ mergeBranchToMaster()   → 合并到 master
    └─ deleteLocalBranch() + deleteRemoteBranch() → 清理分支
```

### 5.2 rollback 流程

```
rollbackPrepare()
├─ checkIsGitRepo()            → 确认 Git 仓库
├─ checkRemoteAllUpdate()      → git fetch
├─ checkRollbackTag()          → 列出 release Tag 让用户选择
└─ checkRollbackBranch()       → 创建 backup/master/rollback-<timestamp> 备份

rollback()
├─ resetHardTagForce("master", tag) → git reset --hard <tag> + force push
└─ localBuild()                     → 可选的本地重新构建
```

## 6. 关键实现细节

### 6.1 多平台支持（策略模式）

```javascript
createGitServer(gitServer) {
  const gitServerStrategy = {
    [GITHUB]: Github,
    [GETEE]: Gitee,
  };
  const GitServer = gitServerStrategy[gitServer];
  return GitServer ? new GitServer() : null;
}
```

`Github` 和 `Gitee` 分别封装了各自平台的 REST API，提供统一接口：
- `getUser()` — 获取用户信息
- `getOrg(login)` — 获取组织信息
- `getRepo(owner, name)` — 获取仓库信息
- `createRepo(name)` — 创建仓库
- `createOrgRepo(name, login)` — 创建组织仓库
- `getRemote(login, name)` — 生成远程仓库地址
- `getSshKeyUrl()` — 获取 SSH Key 设置页面链接

### 6.2 缓存机制

Git 模型在用户主目录下维护缓存文件，避免重复输入：

| 缓存文件 | 路径 | 内容 |
|----------|------|------|
| `.git_server` | `~/.cjp-cli-dev/.git/` | 托管平台类型（github/gitee） |
| `.git_token` | `~/.cjp-cli-dev/.git/` | Git Token |
| `.git_owner` | `~/.cjp-cli-dev/.git/` | 仓库所有者类型（user/org） |
| `.git_login` | `~/.cjp-cli-dev/.git/` | 登录名 |
| `.git_publish` | `~/.cjp-cli-dev/.git/` | 发布平台选择 |

`--refreshGitServer`、`--refreshGitToken`、`--refreshGitOwner` 参数可强制重新选择/输入。

### 6.3 SSH Key 检查

```
checkSSHKey()
├─ 检查 ~/.ssh/id_rsa.pub（旧版 RSA）
├─ 检查 ~/.ssh/id_ed25519.pub（新版 Ed25519）
├─ 都不存在 → 提示用户生成 SSH Key 并给出帮助链接
└─ 存在 → checkGitSSHConnection() 测试 SSH 连接
```

### 6.4 版本号管理

```
getCorrectVersion()
├─ 获取远程所有 release/ 开头的分支
├─ 与当前 package.json 版本比较
├─ 远程有更高版本 → 使用远程版本并 patch +1
├─ 远程无更高版本 → 使用本地版本
└─ 生成开发分支名 develop/<version>
```

### 6.5 Listr + RxJS 终端交互优化

打 Tag 流程使用 Listr 和 RxJS 提供更优的终端展示效果：

```javascript
const tasks = new Listr([
  {
    title: "自动生成远程Tag",
    task: () => new Observable(observer => {
      observer.next("开始创建Tag...");
      // ... 执行 git tag + push
      observer.complete();
    })
  },
  {
    title: "合并代码到master",
    task: () => new Observable(observer => { /* ... */ })
  }
]);
await tasks.run();
```

### 6.6 安全白名单

与 init 命令类似，构建命令执行前必须通过白名单校验，防止恶意命令注入。

## 7. 已知改进方向

| 问题 | 建议 |
|------|------|
| 单文件 1670 行 | 按功能组拆分为 `git-auth.js`、`git-repo.js`、`git-flow.js`、`git-publish.js`、`git-rollback.js`，index.js 作为聚合导出 |
| GitHub/Gitee 实例在同一目录 | 可提取为独立的 `models/git-server` 包 |
| 缓存文件管理分散在多个方法中 | 可提取为 `GitCache` 工具类统一管理 |

## 8. 被引用关系

| 使用方 | 场景 |
|--------|------|
| `commands/publish` | 发布全链路：prepare → init → commit → publish |
| `commands/rollback` | 回滚链路：rollbackPrepare → rollback |
