# Publish 命令设计规格书

> 日期：2026-03-30
> 状态：已确认
> 目标：为 cjp-cli-dev 脚手架提供 `publish` 命令，实现项目的 Git 自动化提交和云构建云发布，支持组件库自动构建并发布到 npm。

---

## 1. 命令定义

```bash
cjp-cli-dev publish [options]
```

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--refreshGitServer` | `-rgs` | 强制刷新 Git 远程仓库类型选择 | `false` |
| `--refreshGitToken` | `-rgt` | 强制刷新 Git Token | `false` |
| `--refreshGitOwner` | `-rgo` | 强制刷新 Git 远程仓库所有者（个人/组织）选择 | `false` |
| `--buildCmd` | `-bc` | 自定义构建命令 | `"npm run build"` |
| `--production` | `-prod` | 是否为正式发布 | `false` |
| `--componentNoDb` | `-cnd` | 组件发布时不写入数据库 | `false` |
| `--noCloudBuild` | `-ncb` | 禁用云构建，仅执行 Git 自动化 | `false` |
| `--registry` | `-reg` | 指定 npm 发布源 | - |
| `--sshUser` | `-su` | SSH 部署用户名 | - |
| `--sshIp` | `-si` | SSH 部署服务器 IP | - |
| `--sshPath` | `-sp` | SSH 部署目标路径 | - |

## 2. 目录结构

```
commands/publish/
├── package.json
├── lib/
│   └── index.js       # PublishCommand 主类，继承 Command 基类
└── __tests__/
    └── publish.test.js
```

publish 命令本身较为精简（~107行），核心的 Git 自动化和云构建逻辑委托给 `@cjp-cli-dev/git` 模型完成。

## 3. 依赖声明

```json
{
  "name": "@cjp-cli-dev/publish",
  "dependencies": {
    "@cjp-cli-dev/command": "file:../../models/command",
    "@cjp-cli-dev/git": "file:../../models/git",
    "@cjp-cli-dev/log": "file:../../utils/log",
    "@cjp-cli-dev/utils": "file:../../utils/utils"
  }
}
```

## 4. 核心类设计

### PublishCommand（继承 Command 基类）

| 方法 | 职责 |
|------|------|
| `init()` | 从 `this._args[0]` 解析所有命令行选项，构建 `this.options` 对象 |
| `exec()` | 编排完整发布流程：前置校验 → Git 自动化 → 云构建发布 → 输出耗时统计 |
| `prepare()` | 校验 `package.json` 存在性及必要字段：name、version、scripts.build |

## 5. 执行流程

```
PublishCommand.exec()
│
├─ 记录 startTime
│
├─ 1. prepare() — 前置校验
│     ├─ 检查 package.json 是否存在
│     ├─ 校验 name、version、scripts.build 必要字段
│     └─ 构建 this.projectInfo = { name, version, dir }
│
├─ 2. Git 自动化流程
│     ├─ new Git(this.projectInfo, this.options)
│     ├─ git.prepare() — 远程仓库类型选择、Token 管理、仓库自动创建
│     ├─ git.init()    — 本地仓库初始化、远程关联、分支合并
│     └─ git.commit()  — stash 管理、冲突检测、版本升级、自动提交推送
│
├─ 3. git.publish() — 云构建和云发布
│     ├─ [项目] 云构建 → SSH 部署到服务器
│     └─ [组件] 构建 → npm publish 发布
│
└─ 输出 "本次发布耗时：X 秒"
```

## 6. 关键实现细节

### 6.1 前置校验

三项必要字段缺一不可：
- `name` — 用于 Git 仓库命名和 npm 发布标识
- `version` — 用于版本管理和自动版本号升级
- `scripts.build` — 确保项目可构建，是云构建的执行入口

### 6.2 Git 自动化架构（委托模式）

所有 Git 操作委托给 `@cjp-cli-dev/git` 模型：

| 阶段 | Git 模型方法 | 核心能力 |
|------|-------------|---------|
| 准备 | `git.prepare()` | 远程仓库类型选择、Token 管理、仓库自动创建 |
| 初始化 | `git.init()` | 本地仓库初始化、远程关联、分支合并 |
| 提交 | `git.commit()` | stash 管理、冲突检测、版本升级、自动提交推送 |
| 发布 | `git.publish()` | 云构建、SSH 部署 / npm 组件发布 |

### 6.3 参数选项透传

所有命令行选项通过 `this.options` 统一透传给 `Git` 模型，控制行为如：
- `refreshGitServer/Token/Owner`：强制重新选择/输入，覆盖本地缓存
- `noCloudBuild`：跳过云构建阶段
- `production`：控制发布到正式环境还是测试环境

## 7. 注册方式

### exec 映射表

```javascript
const SETTINGS = {
  publish: "@cjp-cli-dev/publish",
};
```

### CLI 命令注册

```javascript
program
  .command("publish")
  .description("项目云构建云发布、组件库自动构建并发布npm")
  .option("-rgs, --refreshGitServer", "更新Git托管平台", false)
  .option("-rgt, --refreshGitToken", "更新Git托管平台token", false)
  .option("-rgo, --refreshGitOwner", "更新Git仓库登录类型", false)
  .option("-bc, --buildCmd <buildCmd>", "指定自定义构建命令", "npm run build")
  .option("-prod, --production", "是否正式发布", false)
  .option("-cnd, --componentNoDb", "发布组件库信息不写入数据库", false)
  .option("-ncb, --noCloudBuild", "发布项目不开启云构建", false)
  .option("-reg, --registry <registry>", "指定npm源地址", "")
  .option("-su, --sshUser <sshUser>", "指定模板服务器用户名", "")
  .option("-si, --sshIp <sshIp>", "指定模板服务器IP或域名", "")
  .option("-sp, --sshPath <sshPath>", "指定模板服务器上传路径", "")
  .action(exec);
```
