# 环境变量说明

## 环境变量加载机制

脚手架在启动时会通过 `dotenv` 读取用户主目录下的 `.env` 文件（如 `C:\Users\<用户名>\.env`），将其中的变量注入到 `process.env` 中。

## 已注册的环境变量

| 变量名 | 说明 | 来源 | 默认值 |
|--------|------|------|--------|
| `CLI_HOME` | 脚手架缓存目录名 | 用户主目录 `.env` 文件 | `.cjp-cli-dev` |
| `CLI_HOME_PATH` | 脚手架缓存完整路径 | 程序运行时自动生成 | `<用户主目录>/.cjp-cli-dev` |
| `CLI_TARGET_PATH` | 本地调试文件路径 | `--targetPath` 命令行参数 | `""` |
| `LOG_LEVEL` | 日志级别 | `--debug` 命令行参数 | `"info"`（debug 模式为 `"verbose"`） |
| `CJP_CLI_DEV_BASE_URL` | 后端接口请求前缀 | 用户主目录 `.env` 文件 | - |

## 环境变量详解

### CLI_HOME

控制脚手架在用户主目录下创建的缓存目录名称。脚手架会在该目录下存储下载的命令包、项目模板等缓存文件。

```env
# .env 文件
CLI_HOME=.cjp-cli-dev
```

最终缓存路径为：`<用户主目录>/<CLI_HOME>`，例如 `C:\Users\user\.cjp-cli-dev`

### CLI_HOME_PATH

由程序根据 `CLI_HOME` 自动计算生成的完整路径，无需手动配置。计算逻辑：

```javascript
// 如果 .env 中配置了 CLI_HOME
path.join(os.homedir(), process.env.CLI_HOME)

// 如果未配置，使用默认值
path.join(os.homedir(), '.cjp-cli-dev')
```

### CLI_TARGET_PATH

用于本地调试场景。设置后，`core/exec` 模块将直接从指定的本地路径加载命令包，而不是从 npm 缓存目录加载。

```bash
# 通过命令行参数设置
cjp-cli-dev init --targetPath /path/to/commands/init
```

### LOG_LEVEL

控制终端日志输出级别。普通模式下为 `info`，仅输出关键信息；开启 `--debug` 后切换为 `verbose`，输出详细调试日志和错误执行栈。

```bash
# 开启 debug 模式
cjp-cli-dev init --debug
```

### CJP_CLI_DEV_BASE_URL

后端接口请求的基础 URL。脚手架的部分功能（如获取项目模板列表、云构建等）需要与后端服务通信，该变量配置后端服务地址。

```env
# .env 文件
CJP_CLI_DEV_BASE_URL=http://your-api-server.com
```

## 缓存目录结构

以默认配置为例，缓存目录 `~/.cjp-cli-dev` 的结构如下：

```
~/.cjp-cli-dev/
├── dependencies/            # 命令包缓存目录
│   └── node_modules/        # 下载的命令包存储位置
├── templates/               # 项目模板缓存目录
│   └── node_modules/        # 下载的模板包存储位置
└── data/                    # 本地数据配置
    └── project.json         # 本地项目模板配置（可选）
```

## .env 配置文件示例

在用户主目录下创建 `.env` 文件：

```env
# 脚手架缓存目录名（可选，默认 .cjp-cli-dev）
CLI_HOME=.cjp-cli-dev

# 后端接口地址（如需使用云构建等远程功能）
CJP_CLI_DEV_BASE_URL=http://localhost:7001
```
