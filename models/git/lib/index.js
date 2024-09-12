"use strict";

// 第三方库
const simpleGit = require("simple-git"); // 用于在node程序中运行git
const inquirer = require("inquirer"); // 用于终端交互
const fse = require("fs-extra"); // 用于文件操作
const terminalLink = require("terminal-link"); // 用于生成终端可点击链接
// 内置库
const path = require("path");
const os = require("os");
const fs = require("fs");
// 自建库
const log = require("@cjp-cli-dev/log");
const { readFile, writeFile } = require("@cjp-cli-dev/utils");
const Github = require("./Github");
const Gitee = require("./Gitee");

const DEFAULT_CLI_HOME = ".cjp-cli-dev"; // 默认缓存路径
const GIT_ROOT_DIR = ".git"; // git根目录
const GIT_SERVER_FILE = ".git_server"; // git托管服务缓存文件
const GIT_TOKEN_FILE = ".git_token"; // git token缓存文件
const GITHUB = "github";
const GETEE = "gitee";

// 创建远端仓库类型选项
const GIT_SERVER_TYPE_CHOICES = [
  {
    name: "GitHub",
    value: GITHUB,
  },
  {
    name: "Gitee",
    value: GETEE,
  },
];

class Git {
  constructor({ name, version, dir }, { refreshGitServer = false, refreshGitToken = false }) {
    this.name = name;
    this.version = version;
    this.dir = dir;
    this.git = simpleGit(dir);
    this.gitServer = null;
    this.homePath = null;
    this.refreshGitServer = refreshGitServer;
    this.refreshGitToken = refreshGitToken;
  }

  async prepare() {
    this.checkHomePath(); // 检查缓存主目录
    await this.checkGitServer(); // 检查用户远端仓库类型，github/gitee/......
    await this.checkGitToken(); // 检查远端仓库token
  }

  // 检查用户主目录
  checkHomePath() {
    // 设置用户主目录
    if (!this.homePath) {
      this.homePath =
        process.env.CLI_HOME_PATH ||
        path.resolve(os.homedir(), DEFAULT_CLI_HOME);
    }
    log.verbose("homePath", this.homePath);

    // 创建缓存主目录，如果不存在就创建
    fse.ensureDirSync(this.homePath);
    if (!fs.existsSync(this.homePath)) {
      throw new Error("用户主目录获取失败！");
    }
  }

  // 检查git托管平台服务
  async checkGitServer() {
    const gitServerPath = this.createPath(GIT_SERVER_FILE);
    let gitServer = readFile(gitServerPath);
    // 如果没有找到gitServer，就让用户选择
    if (!gitServer || this.refreshGitServer) {
      gitServer = (
        await inquirer.prompt({
          type: "list",
          name: "gitServer",
          message: "请选择您想要托管的Git平台：",
          default: GITHUB,
          choices: GIT_SERVER_TYPE_CHOICES,
        })
      ).gitServer;
      writeFile(gitServerPath, gitServer);
      log.success("git server写入成功", `${gitServer}  =>  ${gitServerPath}`);
    } else {
      log.success("git server读取成功", `${gitServer}  =>  ${gitServerPath}`);
    }

    // 生成gitServer实例
    this.gitServer = this.createGitServer(gitServer);

    // 如果gitServer为空，就抛出错误
    if (!this.gitServer) {
      throw new Error("GitServer初始化失败！");
    }
  }

  // 检查git token
  async checkGitToken() {
    const tokenPath = this.createPath(GIT_TOKEN_FILE);
    let token = readFile(tokenPath);
    // 如果没有找到token，或者用户输入强制更换token指令，就让用户输入
    if (!token || this.refreshGitToken) {
      log.warn(
        `${this.gitServer.type} token未生成，请先生成token。${terminalLink(
          "帮助文档链接：\n",
          this.gitServer.getTokenHelpUrl()
        )}`
      );
      // 让用户输入token
      token = (await inquirer.prompt({
        type: 'password',
        name: 'token',
        message: `请将 ${this.gitServer.type} token粘贴到这里：`,
        default: '',
      })).token

      // 写入token到本地
      writeFile(tokenPath, token);
      log.success(`token写入成功`, `${token}  =>  ${tokenPath}`);
    }else {
      log.success(`token读取成功`, `读取路径 => ${tokenPath}`);
    }

    // 缓存token并更新
    this.token = token;
    this.gitServer.setToken(token)
  }

  createGitServer(gitServer) {
    // 创建策略模式，支持扩展更多选项
    const gitServerStrategy = {
      [GITHUB]: Github,
      [GETEE]: Gitee,
    };

    const GitServer = gitServerStrategy[gitServer];

    if (!GitServer) {
      log.error("gitServer不存在！");
      return null;
    }

    // 返回实例
    return new GitServer();
  }

  createPath(file) {
    // 在用户主目录下生成.git目录
    const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR);
    const filePath = path.resolve(rootDir, file);

    // 创建.git目录
    fse.ensureDirSync(rootDir);
    return filePath;
  }

  init() {}
}

module.exports = Git;
