"use strict";

// 第三方库
const io = require("socket.io-client"); // 用于连接egg-socket.io
const get = require("lodash/get");
// 自建库
const log = require("@cjp-cli-dev/log"); // 用于打印日志

const WS_SERVER = "http://cjp.clidev.xyz:7001";
const TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CONNECT_TIMEOUT = 5 * 1000; // 5 seconds以后超时断开连接

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
    const { buildCmd } = options;

    this.git = git;
    this.buildCmd = buildCmd;
    this.timeout = TIMEOUT;
    this.timer = null;
  }

  init() {
    const socket = io(WS_SERVER, {
      query: {
        repo: this.git.remote,
      },
    });

    socket.on("connect", () => {
      clearTimeout(this.timer);
      const { id } = socket;
      log.success("云构建任务创建成功", `任务ID：${id}`);

      // 服务端发送这个id时需要加延时时间，否则这里监听不到id，原因是服务端发送id时，监听事件还没有准备好
      socket.on(id, (msg) => {
        const parsedMsg = parseMsg(msg);
        log.success(parsedMsg.action, parsedMsg.message);
      });
    });

    // 主动断开连接方法
    const disconnect = () => {
      socket.disconnect();
      socket.close();
    };

    // 创建连接超时方法
    this.doTimeout(() => {
      log.error("云构建服务连接超时，云构建任务被终止");
      disconnect();
    }, CONNECT_TIMEOUT);

    // 监听连接断开事件
    socket.on('disconnect', () => {
      log.error("disconnect", "云构建任务断开");
      disconnect();
    })

    // 监听错误事件
    socket.on('error', (err) => {
      log.error("error", "云构建出错！", err);
      disconnect();
    })
  }

  doTimeout(fn, timeout) {
    this.timer && clearTimeout(this.timer);
    log.info("设置云构建服务连接超时时间：", `${timeout / 1000}秒`);
    this.timer = setTimeout(fn, timeout);
  }
}

module.exports = CloudBuild;
