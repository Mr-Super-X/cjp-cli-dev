# 前端工程化统一研发脚手架

> 查看详细文档：<https://mr-super-x.github.io/cjp-cli-dev-docs/>

## About

前端工程化统一研发脚手架，支持以下功能：

1. init：创建项目或组件库，通过npm安装项目或组件库模板，支持本地配置文件、MongoDB配置模板数据，支持默认项目模板创建、自定义项目模板创建、组件库模板创建、模板自动安装和启动等配置。
2. publish：发布项目或组件库，包括测试发布和正式发布、支持自动在github/gitee创建远程仓库和提交代码、Git Flow自动化处理。 支持项目云构建、云发布，采用Redis管理云构建任务数据，发布完成自动清除Redis缓存，静态资源自动上传OSS、自动同步代码和创建版本Tag，支持MySQL管理发布组件信息。
3. add：支持快速添加组件代码片段模板、标准页面模板、自定义页面模板到本地项目（暂时仅支持vue项目）。支持自动写入组件到指定代码位置，自动导入并注册局部组件，自动合并项目依赖等。
4. rollback：支持快速回滚生产版本，支持回滚master分支到指定release tag，自动本地构建回滚版本。
5. husky：支持快速为项目安装可用的Git Hooks配置工具，兼容husky稳定版和最新版。
6. codelint：支持快速为项目安装统一代码规范和代码格式校验工具，支持仅校验暂存文件，包含eslint、prettier、lint-staged功能，优先使用prettier美化和格式化代码。
7. commitlint：支持快速为项目安装统一提交信息规范校验工具，使用Angular提交规范，配套汉化版终端交互工具，终端调用命令选择规范提交类型和输入提交信息。
8. release：支持release-it快速自动升级项目版本，自动生成git变更记录文档。
9. gitflow：支持快速为项目创建Git Flow分支模型，自动检查系统是否安装对应工具并返回帮助文档。
10. delete-branch：支持快速删除本地和远端分支，可多选删除。
11. clean：支持清除脚手架依赖缓存或全部缓存文件。
12. resume：支持创建markdown简历，提供前端简历模板，支持驱动chrome浏览器导出one-light主题样式PDF。
13. server：通过express启动本地页面预览服务，支持http请求代理，支持代理多个服务器。

## Getting Started

### 安装

```bash
npm install -g @cjp-cli-dev/core
```

### 创建项目

项目/组件初始化

```bash
cjp-cli-dev init [name]
```

强制清空当前文件夹并初始化

```bash
cjp-cli-dev init --force
```

指定安装源

```bash
cjp-cli-dev init --registry https://registry.npmmirror.com/
```

### 发布项目

发布项目/组件

```bash
cjp-cli-dev publish
```

指定发布源

```bash
cjp-cli-dev publish --registry https://registry.npmmirror.com/
```

更新git托管平台

```bash
cjp-cli-dev publish --refreshGitServer
```

更新git token

```bash
cjp-cli-dev publish --refreshGitToken
```

更新git登录类型

```bash
cjp-cli-dev publish --refreshGitOwner
```

正式发布

```bash
cjp-cli-dev publish --production
```

手动指定build命令

```bash
cjp-cli-dev publish --buildCmd "npm run build:test"
```

发布项目不开启云构建

```bash
cjp-cli-dev publish --noCloudBuild
```

发布组件不上传数据库

```bash
cjp-cli-dev publish --componentNoDb
```

指定上传模板服务器

```bash
cjp-cli-dev publish --sshUser root --sshIp 1xx.xx.xx.xx:8888 --sshPath /data/apps
```

### 回滚版本

回滚版本

```bash
cjp-cli-dev rollback
```

手动指定回滚版本构建命令

```bash
cjp-cli-dev rollback --buildCmd "npm run build:test"
```

### 添加页面或组件

添加页面模板/组件代码片段

```bash
cjp-cli-dev add
```

指定安装源

```bash
cjp-cli-dev add --registry https://registry.npmmirror.com/
```

## More

### debug调试

DEBUG 模式

```bash
cjp-cli-dev <command> --debug
```

### 清除缓存

清空本地全部缓存

```bash
cjp-cli-dev clean --all
```

清空本地依赖缓存

```bash
cjp-cli-dev clean --dep
```

### 本地调试

调试本地包

```bash
cjp-cli-dev init --targetPath /path/cjp-cli-dev/commands/init
cjp-cli-dev publish --targetPath /path/cjp-cli-dev/commands/publish
cjp-cli-dev add --targetPath /path/cjp-cli-dev/commands/add
```

### 安装Git Hook脚本配置工具

安装工具

```bash
cjp-cli-dev husky --install
```

添加hook

```bash
cjp-cli-dev husky --add pre-commit "npm test"
```

设置hook

```bash
cjp-cli-dev husky --set pre-commit "npm run lint"
```

### 统一代码格式规范（eslint/prettier/lint-staged）

安装工具

```bash
cjp-cli-dev codelint --install
```

### 统一提交格式规范（Angular提交规范/commitlint/汉化commitizen）

安装工具

```bash
cjp-cli-dev commitlint --install
```

### Git Flow

初始化Git Flow分支模型

```bash
cjp-cli-dev gitflow --install
```

强制初始化Git Flow分支模型

```bash
cjp-cli-dev gitflow --install --force
```

### 自动升级项目版本、生成git版本变更记录

安装定制release-it功能

```bash
cjp-cli-dev release --install
```

升级patch版本

```bash
cjp-cli-dev release --patch
```

升级minor版本

```bash
cjp-cli-dev release --minor
```

升级major版本

```bash
cjp-cli-dev release --major
```

### 删除分支

快速删除本地和远程分支

```bash
cjp-cli-dev delete-branch [branchName]
```

强制删除本地和远程分支

```bash
cjp-cli-dev delete-branch [branchName] --force
```

删除多个分支

```bash
cjp-cli-dev delete-branch --multiple
```

### 启动本地页面预览服务（支持代理http请求，支持代理多个服务器）

启动服务

```bash
cjp-cli-dev server
```

指定端口

```bash
cjp-cli-dev server -p 3001
```

### 创建简历

下载markdown简历模板

```bash
cjp-cli-dev resume --install
```

导出简历为pdf

```bash
cjp-cli-dev resume --export
```

> 查看详细文档：<https://mr-super-x.github.io/cjp-cli-dev-docs/>
