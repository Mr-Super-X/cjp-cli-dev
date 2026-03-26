# 快速开始

## 前置条件

- Node.js >= 16.0.0（推荐 16.20.2）
- npm >= 8.19.4
- Git

## 安装与启动

### 1. 克隆项目

```bash
git clone git@gitee.com:Mr_Mikey/cjp-cli-dev.git
cd cjp-cli-dev
```

### 2. 安装依赖并创建全局软链

```bash
npm run reinstall
```

该命令会执行 `scripts/install-deps.js`，自动完成以下操作：

1. 清理所有子包的 `node_modules` 目录
2. 遍历 `commands/`、`core/`、`models/`、`utils/` 下每个子包，逐个执行 `npm install`
3. 在 `core/cli` 目录下执行 `npm link`，将 `cjp-cli-dev` 命令注册到全局

### 3. 验证安装

```bash
cjp-cli-dev -v
```

能输出版本号即表示安装成功。

## 重要注意事项

### 不要使用 `lerna bootstrap`

由于 `lerna bootstrap` 会导致内部包软链失败，项目使用自定义的 `npm run reinstall` 脚本替代。

如果不小心执行了 `lerna bootstrap`，需要手动修复全局软链：

```bash
cd core/cli
npm link
```

### 环境变量配置

脚手架会读取用户主目录下的 `.env` 文件（如 `C:\Users\<用户名>\.env`），可在其中配置：

```env
# 脚手架缓存目录名（默认 .cjp-cli-dev）
CLI_HOME=.cjp-cli-dev

# 后端接口请求前缀
CJP_CLI_DEV_BASE_URL=http://your-api-server.com
```

### 本地调试

如果想调试某个命令包而不使用 npm 缓存版本，可以通过 `--targetPath` 参数指定本地路径：

```bash
cjp-cli-dev init --targetPath /path/to/local/commands/init
```

### Debug 模式

添加 `--debug` 参数开启调试模式，将输出详细的 verbose 级别日志：

```bash
cjp-cli-dev init --debug
```

## 基本使用示例

```bash
# 查看帮助
cjp-cli-dev -h

# 查看具体命令帮助
cjp-cli-dev init --help

# 初始化项目
cjp-cli-dev init my-project

# 强制初始化（覆盖已有文件）
cjp-cli-dev init my-project --force

# 发布项目
cjp-cli-dev publish

# 启动本地静态服务
cjp-cli-dev server --port 8080
```
