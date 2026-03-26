# 命令参考手册

## 全局参数

所有命令均支持以下全局参数：

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--debug` | `-dbg` | 开启调试模式，输出 verbose 级别日志 | `false` |
| `--targetPath <path>` | `-tp` | 指定本地调试文件路径，跳过远程包加载 | `""` |

---

## cjp

输出作者信息。

```bash
cjp-cli-dev cjp
```

---

## init

创建标准项目模板、自定义项目模板、组件库模板。

```bash
cjp-cli-dev init [projectName] [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `projectName` | - | 项目名称（可选，未提供会交互式询问） | - |
| `--force` | `-f` | 强制初始化，覆盖非空目录 | `false` |
| `--registry <registry>` | `-reg` | 指定 npm 源地址 | `""` |

**执行流程：**

1. 检查当前目录是否为空，非空时询问是否清空
2. 交互式选择项目类型（项目/组件）
3. 输入项目名称、版本号，选择项目模板
4. 从 npm 下载模板包到本地缓存
5. 拷贝模板到当前目录并执行 EJS 渲染
6. 执行模板配置的安装和启动命令

**模板数据来源：** 优先读取本地配置文件 `~/.cjp-cli-dev/data/project.json`，不存在则通过 HTTP 接口从后端获取。

---

## publish

项目云构建云发布、组件库自动构建并发布 npm。

```bash
cjp-cli-dev publish [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--refreshGitServer` | `-rgs` | 更新 Git 托管平台 | `false` |
| `--refreshGitToken` | `-rgt` | 更新 Git 托管平台 token | `false` |
| `--refreshGitOwner` | `-rgo` | 更新 Git 仓库登录类型 | `false` |
| `--buildCmd <cmd>` | `-bc` | 指定自定义构建命令 | `"npm run build"` |
| `--production` | `-prod` | 是否正式发布 | `false` |
| `--componentNoDb` | `-cnd` | 发布组件库信息不写入数据库 | `false` |
| `--noCloudBuild` | `-ncb` | 发布项目不开启云构建 | `false` |
| `--registry <registry>` | `-reg` | 指定 npm 源地址 | `""` |
| `--sshUser <user>` | `-su` | 指定模板服务器用户名 | `""` |
| `--sshIp <ip>` | `-si` | 指定模板服务器 IP 或域名 | `""` |
| `--sshPath <path>` | `-sp` | 指定模板服务器上传路径 | `""` |

---

## add

添加组件代码片段模板、页面标准模板、自定义页面模板到当前项目。

```bash
cjp-cli-dev add [templateName] [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `templateName` | - | 模板名称（可选） | - |
| `--registry <registry>` | `-reg` | 指定 npm 源地址 | `""` |

---

## rollback

回滚生产版本代码。

```bash
cjp-cli-dev rollback [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--buildCmd <cmd>` | `-bc` | 指定自定义构建命令 | `"npm run build"` |

---

## husky

Git Hooks 脚本配置工具。

```bash
cjp-cli-dev husky [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 为当前项目安装 husky 功能 | `false` |
| `--add <hook...>` | `-a` | 添加新的 Git Hook 脚本（支持多个值） | `[]` |
| `--set <hook...>` | `-s` | 设置 Git Hook 脚本内容（支持多个值） | `[]` |

---

## codelint

创建统一代码规范。

```bash
cjp-cli-dev codelint [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 为项目安装代码规范校验工具 | `false` |

---

## commitlint

创建统一提交规范（Angular 规范）。

```bash
cjp-cli-dev commitlint [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 为项目安装 Git 提交信息 Angular 规范校验工具 | `false` |

---

## release

自动升级项目版本、自动生成 Git 版本变更记录文档（基于 release-it）。

```bash
cjp-cli-dev release [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 为当前项目安装 release-it 功能 | `false` |
| `--patch` | `-pa` | 自动升级 patch 版本（如 1.0.0 → 1.0.1） | `false` |
| `--minor` | `-mi` | 自动升级 minor 版本（如 1.0.0 → 1.1.0） | `false` |
| `--major` | `-ma` | 自动升级 major 版本（如 1.0.0 → 2.0.0） | `false` |

---

## gitflow

初始化 Git Flow 分支模型。

```bash
cjp-cli-dev gitflow [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 为当前项目初始化 Git Flow 分支模型 | `false` |
| `--force` | `-f` | 强制初始化分支模型 | `false` |

---

## delete-branch

删除本地和远程分支。

```bash
cjp-cli-dev delete-branch [branchName] [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `branchName` | - | 分支名称（可选） | - |
| `--force` | `-f` | 强制删除分支 | `false` |
| `--multiple` | `-m` | 是否删除多个分支 | `false` |

---

## resume

创建 Markdown 简历，支持转为 PDF。

```bash
cjp-cli-dev resume [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--install` | `-i` | 下载 Markdown 简历模板 | `false` |
| `--export` | `-e` | 将 Markdown 简历转为 PDF | `false` |
| `--resetChromePath` | `-rcp` | 重置 Chrome 浏览器安装路径缓存 | `false` |

---

## server

启动本地静态资源托管服务，支持配置 HTTP 请求代理。

```bash
cjp-cli-dev server [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port <port>` | `-p` | 指定启动服务的端口 | `3000` |

---

## clean

清空脚手架缓存文件。

```bash
cjp-cli-dev clean [options]
```

**参数：**

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--all` | `-a` | 清空全部缓存 | `false` |
| `--dep` | `-d` | 仅清空依赖缓存 | `false` |
