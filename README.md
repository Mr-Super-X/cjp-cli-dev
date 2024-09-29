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
