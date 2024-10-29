# 前端统一研发脚手架

## About

前端通用脚手架

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
cjp-cli-dev gitflow
```

强制初始化Git Flow分支模型

```bash
cjp-cli-dev gitflow --force
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
cjp-cli-dev delete-branch --force
```

删除多个分支

```bash
cjp-cli-dev delete-branch --multiple
```

### 本地调试

调试本地包

```bash
cjp-cli-dev init --targetPath /path/cjp-cli-dev/commands/init
cjp-cli-dev publish --targetPath /path/cjp-cli-dev/commands/publish
cjp-cli-dev add --targetPath /path/cjp-cli-dev/commands/add
```
