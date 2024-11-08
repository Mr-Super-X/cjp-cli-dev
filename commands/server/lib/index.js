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
    this.proxyMultipleConfirm = null; // 是否代理多个服务器
    this.multipleProxy = null; // 代理多服务器配置
    this.origin = null; // 代理地址
    this.pathRewrite = null; // 重写代理地址
    // debug模式下输出以下变量
    log.verbose("port", this.port);
  }

  async exec() {
    try {
      // 准备工作
      await this.prepare();
      // 获取publicPath
      await this.getPublicPath();
      await this.getProxyConfirm();
      await this.getMultipleConfirm();
      // 是否需要代理
      if (this.proxyConfirm) {
        // 代理多个服务器
        if (this.proxyMultipleConfirm) {
          await this.getMultipleProxy();
        } else {
          // 代理单个服务器
          await this.getOrigin();
          await this.getPathRewrite();
        }
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
      if (this.proxyMultipleConfirm) {
        // 多个代理
        const proxies = await this.createMultipleProxyMiddleware();
        proxies.forEach((proxy) => {
          // 使用中间件（区分路径来代理不同服务器）
          app.use(proxy.apiPrefix, proxy.middleware);
        });
      } else {
        // 单个代理
        const proxy = await this.createSingleProxyMiddleware();
        // 使用代理中间件处理所有请求（只会对匹配的请求进行代理）
        app.use(proxy);
      }
    }

    // 让所有路由都指向当前目录中的index.html
    app.get(`*`, (req, res) => {
      res.sendFile(path.join(staticDirectory, "index.html"));
    });

    const ip = await this.getLocalWalnIPv4();
    const port = this.port || PORT;

    // 启动服务
    app.listen(port, ip, () => {
      const publicPath = this.publicPath === "./" ? "/" : this.publicPath;
      log.success(
        `本地预览服务启动成功，复制链接到浏览器地址栏进行访问\n\nhttp://${ip}:${port}${publicPath}\n`
      );
    });
  }

  // 生成多个代理服务中间件配置
  async createMultipleProxyMiddleware() {
    log.info("开始生成多服务器代理中间件");

    if (!this.multipleProxy) {
      log.error("多服务器代理配置不存在，请重试");
      process.exit(1);
    }

    const proxies = [];

    const multipleProxy = JSON.parse(this.multipleProxy);

    multipleProxy.forEach((item) => {
      if (!item.apiPrefix && !item.target) {
        log.error("必要属性 apiPrefix 或 target 不存在，请重试");
        process.exit(1);
      }
      const defaultOptions = {
        target: item.target, // 目标服务器地址
        pathRewrite: item.pathRewrite || {}, // 重写请求路径
        changeOrigin: true, // 支持跨域
        ws: true, // 代理websocket请求
        logLevel: "debug", // 日志级别
      };

      // 创建中间件
      const proxy = createProxyMiddleware(defaultOptions);

      proxies.push({ apiPrefix: item.apiPrefix, middleware: proxy });
    });

    log.success("多服务器代理中间件生成成功");
    return proxies;
  }

  async createSingleProxyMiddleware() {
    log.info("开始生成单服务器代理中间件");

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
      const pathRewriteObj = JSON.parse(this.pathRewrite);
      let apiPrefix;
      let rewritePath;
      // 读取前缀和匹配路径
      const pathRewriteKeys = Object.keys(pathRewriteObj);
      // 兼容处理，如果出现极端边界情况拿到了多个键值对，只取第一个
      apiPrefix = pathRewriteKeys[0];
      rewritePath = pathRewriteObj[pathRewriteKeys[0]];

      log.verbose("apiPrefix", apiPrefix);
      log.verbose("rewritePath", rewritePath);
      // 添加到proxyOptions
      proxyOptions.pathRewrite = {
        [apiPrefix]: rewritePath,
      };
    }

    const proxy = createProxyMiddleware(proxyOptions);

    log.success("单服务器代理中间件生成成功");
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

  async getMultipleConfirm() {
    const { proxyMultipleConfirm } = await prompt({
      type: "confirm",
      name: "proxyMultipleConfirm",
      message: "是否有代理多个服务器需求？",
      default: false, // 按回车默认为否
    });

    this.proxyMultipleConfirm = proxyMultipleConfirm;
  }

  async getMultipleProxy() {
    const formatStr = `[
  {
    "apiPrefix": "/api1",
    "target": "http://example1.com:8888",
    "pathRewrite": {
      "/api": ""
    }
  },
  {
    "apiPrefix": "/api2",
    "target": "http://192.168.8.8:8888",
    "pathRewrite": {
      "/api": "/test"
    }
  }
]`;
    log.info(
      `multipleProxy数据格式为JSON数组对象格式：\n\n ${formatStr} \n\n必传属性为：apiPrefix（匹配到该路径将代理到target服务器）、target（代理服务器地址） \n查看pathRewrite配置文档：https://github.com/chimurai/http-proxy-middleware?tab=readme-ov-file#pathrewrite-objectfunction\n`
    );
    const { multipleProxy } = await prompt({
      type: "input",
      name: "multipleProxy",
      message: "请输入multipleProxy配置：",
      default: "", // 默认 ''
      validate(value) {
        const done = this.async();
        if (!value || !Array.isArray(JSON.parse(value))) {
          done(
            `输入的multipleProxy格式不合法，正确格式为JSON数组对象：\n\n${formatStr} \n\n必传属性：apiPrefix（匹配到该路径将代理到target服务器）、target（代理服务器地址） \n查看pathRewrite配置文档：https://github.com/chimurai/http-proxy-middleware?tab=readme-ov-file#pathrewrite-objectfunction\n`
          );
          return;
        }
        done(null, true);
      },
    });

    this.multipleProxy = multipleProxy;
    log.verbose("multipleProxy", multipleProxy);
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
      `pathRewrite的作用是修改代理请求路径，填写JSON对象格式 {"key": "value"}，且只能填写一组\n\n以请求 /api/user 为例：\n\n1. 输入 {"/api": ""} 请求路径将被重写为 => /users\n2. 输入 {"/api": "/test"} 请求路径将被重写为 => /test/user\n3. 输入 {"/api": "/abc/def"} 请求路径将被重写为 => /abc/def/user\n`
    );
    const { pathRewrite } = await prompt({
      type: "input",
      name: "pathRewrite",
      message: "请输入pathRewrite配置（不需要可按回车键跳过）：",
      default: "", // 默认 ''
      validate(value) {
        const done = this.async();
        // 支持跳过输入
        if (!value) {
          done(null, true);
        }

        function match(input) {
          const matches = input.match(
            /^\s*\{\s*"([^"]+)"\s*:\s*([^,}]+)\s*\}\s*$/
          );
          if (matches) {
            return true;
          } else {
            return false;
          }
        }
        // 匹配空格加冒号加空格
        // 如果已输入则检查是否合法
        if (value && !match(value)) {
          done(
            `输入的pathRewrite不合法，正确格式：{"key": "value"}，key为匹配路径前缀，value为重写路径，且只能写一组`
          );
          return;
        }
        done(null, true);
      },
    });

    this.pathRewrite = JSON.stringify(pathRewrite);
    log.verbose("pathRewrite", pathRewrite);
  }
}

function init(args) {
  return new ServerCommand(args);
}

module.exports = init;
module.exports.ServerCommand = ServerCommand;
