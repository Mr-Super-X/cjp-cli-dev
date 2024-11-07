"use strict";

// 第三方库
const express = require("express"); // 服务器
const { createProxyMiddleware } = require("http-proxy-middleware"); // 代理中间件
// 内置库
const path = require("path");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const { prompt } = require("@cjp-cli-dev/utils"); // 工具方法

const INDEX_FILE = "index.html"; // 入口文件
const CWD = process.cwd();
const PORT = 3000;

class ServerCommand extends Command {
  init() {
    const { port } = this._args[0];
    // 获取参数保存到this中
    this.port = port;
    this.publicPath = null;
    this.proxyConfirm = null; // 是否需要代理
    this.origin = null; // 代理地址
    this.pathRewrite = null; // 重写代理地址
    // debug模式下输出以下变量
    log.verbose("port", this.port);
  }

  async exec() {
    try {
      // 准备工作
      await this.prepare();
      // 获取publicPath、origin、apiPrefix、pathRewrite等参数
      await this.getPublicPath();
      await this.getProxyConfirm();
      if (this.proxyConfirm) {
        await this.getOrigin();
        await this.getPathRewrite();
      }
      // 启动服务
      await this.startExpress();
    } catch (err) {
      log.error(err.message);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  // 启动服务
  async startExpress() {
    const app = express();

    // 禁用缓存
    app.use((req, res, next) => {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      next();
    });

    // 设置静态资源目录为当前目录（托管静态文件）
    const staticDirectory = path.join(CWD, ".");

    // 中间件：重写publicPath，让html正确拿到publicPath引用的静态资源
    app.use((req, res, next) => {
      if (req.originalUrl.startsWith(`${this.publicPath}`)) {
        const pattern = new RegExp(`^${this.publicPath}`);
        // 将publicPath匹配到的资源替换成./当前目录
        req.url = req.originalUrl.replace(pattern, "./");
      }
      next();
    });

    // 使用 express.static 中间件来提供静态文件服务
    app.use(express.static(staticDirectory));

    if (this.proxyConfirm) {
      // 单个代理
      const proxy = await this.createSingleProxyMiddleware();

      // 使用代理中间件处理所有请求（只会对匹配的请求进行代理）
      app.use(proxy);
    }

    // 让所有路由都指向当前目录中的index.html
    app.get(`*`, (req, res) => {
      res.sendFile(path.join(staticDirectory, "index.html"));
    });

    const ip = await this.getLocalWalnIPv4();
    const port = this.port || PORT;

    // 启动服务
    app.listen(port, ip, () => {
      log.success(
        `本地预览服务器已启动，复制链接到浏览器地址栏进行访问\n\nhttp://${ip}:${port}${this.publicPath}/\n`
      );
    });
  }

  async createSingleProxyMiddleware() {
    log.info("开始生成代理服务配置");

    if (!this.origin) {
      log.error("代理目标服务器地址不存在，请重试");
      process.exit(1);
    }

    // 代理配置
    const proxyOptions = {
      target: this.origin, // 目标服务器地址
      changeOrigin: true, // 改变源地址
      ws: true, // 代理websocket请求
      logLevel: "debug", // 日志级别
    };

    if (this.pathRewrite) {
      const keyArr = this.pathRewrite.split(" : ");
      const apiPrefix = keyArr[0].trim();
      const rewritePath = keyArr[1].trim();
      log.verbose("apiPrefix", apiPrefix);
      log.verbose("rewritePath", rewritePath);
      proxyOptions.pathRewrite = {
        [apiPrefix]: rewritePath,
      };
    }

    const proxy = createProxyMiddleware(proxyOptions);

    log.success("代理服务配置生成成功");
    return proxy;
  }

  // 获取本机WALN IPv4地址
  async getLocalWalnIPv4() {
    var ipv4 = "";
    var ifaces = os.networkInterfaces(); // 所有类型的适配器和全部内容

    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details, alias) {
        if (dev === "WLAN") {
          // 判断需要获取IP的适配器
          if (details.family == "IPv4") {
            // 判断是IPV4还是IPV6 还可以通过alias去判断
            ipv4 = details.address; // 取addressIP地址
            return;
          }
        }
      });
    }

    return ipv4 || "127.0.0.1";
  }

  async prepare() {
    log.info(`开始检查是否存在入口文件 ${INDEX_FILE}`);
    // 检查index.html
    const targetPath = path.resolve(CWD, INDEX_FILE);

    if (!fs.existsSync(targetPath)) {
      log.error(`当前目录中入口文件 ${INDEX_FILE} 不存在`);
      process.exit(1);
    }
    log.success("入口文件检查通过");
  }

  async getPublicPath() {
    log.info(
      `publicPath的作用是指定打包后静态资源的访问路径前缀，默认使用绝对路径 /`
    );
    log.info(
      "如您的项目中已指定publicPath，请复制publicPath的值粘贴到此处，否则将加载不到静态资源文件\n"
    );
    const { publicPath } = await prompt({
      type: "input",
      name: "publicPath",
      message: "请输入您项目构建配置中 publicPath 的值：",
      default: "/", // 默认为/
    });

    this.publicPath = publicPath.trim();
    log.verbose("publicPath", publicPath);
  }

  async getProxyConfirm() {
    const { proxyConfirm } = await prompt({
      type: "confirm",
      name: "proxyConfirm",
      message: "是否需要代理http请求？",
      default: false, // 按回车默认为否
    });

    this.proxyConfirm = proxyConfirm;
  }

  async getOrigin() {
    const { origin } = await prompt({
      type: "input",
      name: "origin",
      message:
        "请输入要代理的目标服务器地址（示例：http://example.com:8888）：",
      default: "",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("目标服务器地址不能为空");
          return;
        }
        done(null, true);
      },
    });

    this.origin = origin.trim();
    log.verbose("origin", origin);
  }

  async getPathRewrite() {
    log.info(
      `pathRewrite的作用是修改代理请求路径，以【空格加冒号加空格】进行分隔，且只能分隔一次\n\n以请求 /api/user 为例：\n\n1. 输入 【/api : ""】 请求路径将被重写为 => /users\n2. 输入 【/api : /test】 请求路径将被重写为 => /test/user\n3. 输入 【/api : /abc/def】 请求路径将被重写为 => /abc/def/user\n`
    );
    const { pathRewrite } = await prompt({
      type: "input",
      name: "pathRewrite",
      message:
        "请输入pathRewrite配置：",
      default: "", // 默认 ''
      validate(value) {
        const done = this.async();
        // 支持跳过输入
        if (!value) {
          done(null, true);
        }

        function match(input) {
          // 使用全局正则表达式匹配所有空格加冒号加空格的实例
          const matches = input.match(/\s:\s/g);
          // 检查匹配到的次数是否为1
          return matches && matches.length === 1;
        }
        // 匹配空格加冒号加空格
        // 如果已输入则检查是否合法
        if (value && !match(value)) {
          done("输入的pathRewrite不合法，正确格式：以 [空格加冒号加空格] 隔离前缀和重写路径，且只能分隔一次");
          return;
        }
        done(null, true);
      },
    });

    this.pathRewrite = pathRewrite;
    log.verbose("pathRewrite", pathRewrite);
  }
}

function init(args) {
  return new ServerCommand(args);
}

module.exports = init;
module.exports.ServerCommand = ServerCommand;
