"use strict";

// 第三方库
const simpleGit = require("simple-git"); // 用于在node程序中运行git
const inquirer = require("inquirer"); // 用于终端交互
const fse = require("fs-extra"); // 用于文件操作
// 内置库
const path = require("path");
const os = require("os");
const fs = require("fs");
// 自建库
const log = require("@cjp-cli-dev/log");
const { readFile, writeFile } = require("@cjp-cli-dev/utils");

const DEFAULT_CLI_HOME = ".cjp-cli-dev";
const GIT_ROOT_DIR = ".git";
const GIT_SERVER_FILE = ".git_server";
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
  constructor({ name, version, dir }, { refreshGitServer = false }) {
    this.name = name;
    this.version = version;
    this.dir = dir;
    this.git = simpleGit(dir);
    this.gitServer = null;
    this.homePath = null;
    this.refreshGitServer = refreshGitServer;
  }

  async prepare() {
    this.checkHomePath(); // 检查缓存主目录
    await this.checkGitServer(); // 检查用户远端仓库类型，github/gitee/......
  }

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
    this.gitServer = this.createGitServer(gitServer)
    // 获取用户远端仓库类型
    // this.gitServer = await this.git.remote('get', 'origin').then(origin => {
    //   const match = origin.match(/(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.\/]*)?(\?[\w-.\/]*)?#?/);
    //   if(match && match[2]) {
    //     return match[2];
    //   }
    //   return null;
    // }).catch(() => {
    //   return null;
    // });
    // log.verbose('gitServer', this.gitServer)

    // if(!this.gitServer) {
    //   throw new Error('获取远端仓库类型失败！');
    // }
  }

  createGitServer(gitServer) {

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
