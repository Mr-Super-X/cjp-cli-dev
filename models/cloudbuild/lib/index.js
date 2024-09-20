"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const io = require("socket.io-client"); // 用于连接egg-socket.io
const get = require("lodash/get");
// 自建库
const request = require("@cjp-cli-dev/request"); // 用于发起http请求
const log = require("@cjp-cli-dev/log"); // 用于打印日志

const WS_SERVER = "http://cjp.clidev.xyz:7001";
const TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CONNECT_TIMEOUT = 5 * 1000; // 5 seconds以后超时断开连接

// 云构建失败服务器socket emit出来的action（需和服务端配置保持一致）
const BUILD_FAILED_ACTION = [
  "prepare failed",
  "download failed",
  "install failed",
  "build failed",
  "pre-publish failed",
  "publish failed",
]; // 错误类型

// 与后端约定好的规范参数解析方法
function parseMsg(msg) {
  const action = get(msg, "data.action");
  const message = get(msg, "data.payload.message");
  return {
    action,
    message,
  };
}

class CloudBuild {
  constructor(git, options) {
    const { buildCmd, production } = options;

    this.git = git; // 当前simpleGit实例（@cjp-cli-dev/git）
    this.buildCmd = buildCmd; // 自定义构建命令
    this.production = production; // 是否正式发布
    this.timeout = TIMEOUT; // 云构建任务超时时间
    this.timer = null; // socket连接超时延时器
    this.socket = null; // socket对象
  }

  async prepare() {
    // 是否为正式发布
    if (this.production) {
      // 1. 获取oss文件
      const projectName = this.git.name;
      const projectType = this.production ? "prod" : "dev";
      const ossProject = await request({
        url: "/project/oss",
        params: {
          name: projectName,
          type: projectType,
        },
      });
      // 2. 判断当前项目oss文件是否存在
      if (ossProject.code === 0 && ossProject.data.length > 0) {
        // 3. 如果存在且处于正式发布状态则询问用户是否覆盖安装
        const cover = (
          await inquirer.prompt({
            type: "list",
            name: "cover",
            message: `OSS中已存在 ${projectName} 项目，是否强行覆盖发布？`,
            default: false, // 默认不覆盖
            choices: [
              { name: "放弃发布", value: false },
              { name: "覆盖发布", value: true },
            ],
          })
        ).cover;

        if (!cover) {
          throw new Error("发布终止");
        }
      }
    }
  }

  init() {
    return new Promise((resolve, reject) => {
      const socket = io(WS_SERVER, {
        query: {
          repo: this.git.remote, // 仓库远程地址
          name: this.git.name, // 仓库项目名称
          branch: this.git.branch, // 本地开发分支
          version: this.git.version, // 版本号
          buildCmd: this.buildCmd, // 自定义构建命令
          prod: this.production, // 是否正式发布
        },
      });

      // 将socket缓存到this中
      this.socket = socket;

      socket.on("connect", () => {
        clearTimeout(this.timer);
        const { id } = socket;
        log.success("云构建任务创建成功", `任务ID：${id}`);

        // 服务端发送这个id时需要加延时时间，否则这里监听不到id，原因是服务端发送id时，监听事件还没有准备好
        socket.on(id, (msg) => {
          const parsedMsg = parseMsg(msg);
          log.success(parsedMsg.action, parsedMsg.message);
        });

        resolve(); // 连接成功调用resolve，失败调用reject
      });

      // 创建连接超时方法
      this.doTimeout(() => {
        log.error("云构建服务连接超时，云构建任务被终止");
        this.disconnect();
      }, CONNECT_TIMEOUT);

      // 监听连接断开事件
      socket.on("disconnect", () => {
        log.info("disconnect", "云构建任务断开");
        this.disconnect();
      });

      // 监听错误事件
      socket.on("error", (err) => {
        log.error("error", "云构建出错！", err);
        this.disconnect();

        reject(err); // 连接成功调用resolve，失败调用reject
      });
    });
  }

  async build() {
    let result = true;
    return new Promise((resolve, reject) => {
      // 发送build事件给到服务端执行
      this.socket.emit("build");
      // 监听服务端build事件
      this.socket.on("build", (msg) => {
        const parsedMsg = parseMsg(msg);
        // 如果检测到错误事件则断开连接
        if (BUILD_FAILED_ACTION.includes(parsedMsg.action)) {
          log.error(parsedMsg.action, parsedMsg.message);
          clearTimeout(this.timer);
          this.disconnect();
          result = false;
        } else {
          log.success(parsedMsg.action, parsedMsg.message);
        }
      });
      // 监听服务端building事件
      this.socket.on("building", (msg) => {
        console.log(msg); // 输出服务端构建过程中的所有原始日志
      });
      this.socket.on("disconnect", () => {
        resolve(result);
      });
      this.socket.on("error", (err) => {
        reject(err);
      });
    });
  }

  // 主动断开连接方法
  disconnect() {
    this.socket.disconnect();
    this.socket.close();
  }

  doTimeout(fn, timeout) {
    this.timer && clearTimeout(this.timer);
    log.info("设置云构建服务连接超时时间：", `${timeout / 1000}秒`);
    this.timer = setTimeout(fn, timeout);
  }
}

module.exports = CloudBuild;
