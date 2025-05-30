## 架构说明

```
cjp-cli-dev                # 脚手架的名字
├─ commands                # 命令管理目录
│  ├─ add                  # add命令，添加组件代码片段模板、页面标准模板、自定义页面模板到本地项目
│  ├─ init                 # init命令，创建标准项目模板、自定义项目模板、组件库模板
│  └─ publish              # publish命令，支持云构建、云发布项目、自动构建组件库并发布npm，使用redis管理云构建任务
├─ core                    # 脚手架核心管理目录
│  ├─ cli                  # 脚手架入口，负责注册命令、解析命令参数、调用命令，commands目录中的包为具体命令的实现
│  └─ exec                 # 执行命令的入口，负责接收cli的命令和参数，动态解析命令包可执行路径，并在子进程中执行
├─ models                  # 功能模块管理目录
│  ├─ cloudbuild           # 云构建云发布功能，使用socket与后端服务（egg）进行通信，将必要参数传递给服务端，监听结果
│  ├─ command              # 命令包的父类，commands/目录下所有的包都需要继承该父类，核心功能是对子类进行规范
│  ├─ git                  # 对代码托管平台的自动化操作、支持创建远程仓库、Git flow自动化、代码冲突检查等功能
│  └─ package              # 下载/更新npm包功能，管理npm包实例
├─ utils                   # 工具管理目录
│  ├─ format-path          # 处理跨平台路径兼容工具，MacOS/Windows
│  ├─ get-npm-info         # 使用npm官方提供的接口获取npm包信息、版本信息等
│  ├─ log                  # 使用npmlog定制自己的终端日志打印功能，对脚手架debug模式支持的关键
│  ├─ request              # 脚手架公共发起http请求方法
│  └─ utils                # 脚手架使用的工具方法都在这个包里面管理
└─ lerna.json              # 采用lerna进行多包管理，目前用的6.6.2版本，高了会有问题
```

## 启动

```bash
# 安装依赖并软链命令到全局
npm run reinstall
# 查看是否成功
cjp-cli-dev -v
```

## 注意事项

不能用 lerna bootstrap 命令安装依赖，会导致软链失败，暂未找到解决办法，需要手动进入各个包下，执行 npm install。

**因此做了个脚本，执行 npm run reinstall 命令，会自动进入各个包下，执行 npm install，并自动将脚手架软链到全局。**

在已通过 `npm run reinstall` 命令安装好依赖的前提下，如果你不小心调用了 `lerna bootstrap` 命令，需要重新进入 core/cli 目录下，执行 `npm link` 命令，将脚手架软链到全局。

## 其它命令

```bash
# 本地软链调试
cd core/cli
npm link
# 取消脚手架全局软链接
npm unlink -g @cjp-cli-dev/core
# 检查全局软链接
npm ls -g @cjp-cli-dev/core
# 清除依赖
lerna clean -y
# 创建包，如core包
lerna create core
# 添加包到指定目录下，如在core目录下添加package-name包
lerna create @cjp-cli-dev/package-name ./core/
# 查看系统环境变量
/usr/bin/env
```

## 发布

```bash
# 登录npm
npm login --registry https://registry.npmjs.com/
# 更新版本号
lerna version
# 发布
lerna publish
```

## 已注册的环境变量

| 名称                             | 说明                                          |
| -------------------------------- | --------------------------------------------- |
| process.env.CLI_HOME             | 用户主目录（读取c盘用户主目录下的.env文件）   |
| process.env.CLI_HOME_PATH        | 用户主目录                                    |
| process.env.CLI_TARGET_PATH      | 是否指定本地调试文件路径                      |
| process.env.LOG_LEVEL            | 日志的级别控制，一般用于控制debug             |
| process.env.CJP_CLI_DEV_BASE_URL | 接口请求前缀（读取c盘用户主目录下的.env文件） |

## 优化方向

- 将使用和未来可能使用次数大于3次的包提取到公共utils包中
- 代码结构优化、重复部分提取封装等
- add命令增加复用本地代码能力、其它优化
- 对重要功能进行单元测试
- 增加对gitlab等更多托管平台的支持
- 增加前端部署docker和nginx支持
- 增加回滚功能，支持回滚后自动发布
- 为husky和release命令添加uninstall支持
