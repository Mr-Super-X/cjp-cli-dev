// 白名单命令，不在此白名单中的命令都需要确认是否执行，防止用户插入风险操作，如：rm -rf等
const COMMAND_WHITELIST = [
  "npm", // Node.js的包管理工具
  "cnpm", // npm的中国镜像加速版
  "yarn", // 另一个流行的JavaScript包管理工具
  "pnpm", // 性能更优的npm替代品
  "node", // Node.js运行环境
  "git", // 版本控制系统
  "bash", // Bash shell，用于执行脚本
  "sh", // Bourne shell，也是用于执行脚本
  "curl", // 命令行工具，用于传输数据
  "wget", // 另一个命令行工具，用于从网络上自动下载文件
  "python", // Python编程语言解释器
  "pip", // Python的包管理工具
  "docker", // 容器化平台
  "docker-compose", // Docker Compose，用于定义和运行多容器Docker应用程序的工具
  "make", // 自动化编译工具，常用于C/C++项目
  "echo", // 在命令行中显示一行文本
  "ls", // 列出目录内容
  "cd", // 改变当前目录
  "pwd", // 显示当前目录的完整路径
  "grep", // 文本搜索工具
  "awk", // 强大的文本分析工具
  "sed", // 流编辑器，用于对文本进行过滤和转换
  "tar", // 打包工具
  "unzip", // 解压zip文件
  "zip", // 压缩文件为zip格式
  "mv", // 移动或重命名文件和目录
  "cp", // 复制文件和目录
];

module.exports = COMMAND_WHITELIST;
