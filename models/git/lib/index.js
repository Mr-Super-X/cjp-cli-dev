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
const { readFile, writeFile, spinners } = require("@cjp-cli-dev/utils");
const Github = require("./Github");
const Gitee = require("./Gitee");
const gitignoreTemplate = require("./gitignoreTemplate");

const DEFAULT_CLI_HOME = ".cjp-cli-dev"; // 默认缓存路径
const GIT_ROOT_DIR = ".git"; // git根目录
const GIT_SERVER_FILE = ".git_server"; // git托管服务缓存文件
const GIT_TOKEN_FILE = ".git_token"; // git token缓存文件
const GIT_OWNER_FILE = ".git_owner"; // git owner登录类型缓存文件
const GIT_LOGIN_FILE = ".git_login"; // git login缓存文件
const GIT_IGNORE_FILE = ".gitignore"; // .gitignore缓存文件

const GITHUB = "github";
const GETEE = "gitee";
const REPO_OWNER_USER = "user";
const REPO_OWNER_ORG = "org";

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

// 创建远端仓库登录选项
const GIT_OWNER_TYPE_CHOICES = [
  {
    name: "个人",
    value: REPO_OWNER_USER,
  },
  {
    name: "组织",
    value: REPO_OWNER_ORG,
  },
];

// 登录类型唯一选项
const GIT_OWNER_TYPE_ONLY_CHOICES = [
  {
    name: "个人",
    value: REPO_OWNER_USER,
  },
];

class Git {
  constructor(
    { name, version, dir },
    {
      refreshGitServer = false,
      refreshGitToken = false,
      refreshGitOwner = false,
    }
  ) {
    // 将当前类使用到的属性都定义出来，可读性更高
    this.name = name; // 项目名称
    this.version = version; // 项目版本
    this.dir = dir; // 源码路径
    this.git = simpleGit(dir); // 运行git实例
    this.gitServer = null; // 托管平台实例 github/gitee
    this.homePath = null; // 用户主目录
    this.user = null; // 用户信息
    this.orgs = null; // 组织信息
    this.owner = null; // 登录类型是个人还是组织
    this.login = null; // 登录名
    this.repo = null; // 远程仓库信息
    this.remote = null; // 远程地址
    this.refreshGitServer = refreshGitServer; // 是否强制更新git托管平台
    this.refreshGitToken = refreshGitToken; // 是否强制更新git token
    this.refreshGitOwner = refreshGitOwner; // 是否强制更新登录类型
  }

  async prepare() {
    await this.checkHomePath(); // 检查缓存主目录
    await this.checkGitServer(); // 检查用户远端仓库类型，github/gitee/...
    await this.checkGitToken(); // 检查远端仓库token
    await this.getUserAndOrgs(); // 获取远端仓库用户和组织信息
    await this.checkGitOwner(); // 确认远端仓库登录类型是组织还是个人
    await this.checkRepo(); // 检查并创建远程仓库
    await this.checkGitIgnore(); // 检查并创建.gitignore
    await this.init(); // 完成本地git仓库初始化
  }

  // 检查用户主目录
  async checkHomePath() {
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
      log.success("git server写入成功：", `${gitServer}  =>  ${gitServerPath}`);
    } else {
      log.success("git server读取成功：", gitServer);
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
          "链接：\n",
          this.gitServer.getTokenUrl()
        )}`
      );
      // 让用户输入token
      token = (
        await inquirer.prompt({
          type: "password",
          name: "token",
          message: `请将 ${this.gitServer.type} token粘贴到这里：`,
          default: "",
        })
      ).token;

      // 写入token到本地
      writeFile(tokenPath, token);
      log.success(`token写入成功：`, `${token}  =>  ${tokenPath}`);
    } else {
      log.success(`token读取成功`);
    }

    // 缓存token并更新
    this.token = token;
    this.gitServer.setToken(token);
  }

  // 确认远端仓库登录类型是组织还是个人
  async checkGitOwner() {
    const ownerPath = this.createPath(GIT_OWNER_FILE);
    const loginPath = this.createPath(GIT_LOGIN_FILE);
    let owner = readFile(ownerPath);
    let login = readFile(loginPath);
    // 如果两个任意一个不存在，提示用户输入
    if (!owner || !login || this.refreshGitOwner) {
      owner = (
        await inquirer.prompt({
          type: "list",
          name: "owner",
          message: "请选择远端仓库登录类型：",
          default: REPO_OWNER_USER, // 默认个人
          choices:
            this.orgs.length > 0
              ? GIT_OWNER_TYPE_CHOICES
              : GIT_OWNER_TYPE_ONLY_CHOICES,
        })
      ).owner;

      // 如果是组织，让用户进行选择
      if (owner === REPO_OWNER_USER) {
        login = this.user.login;
      } else {
        login = (
          await inquirer.prompt({
            type: "list",
            name: "login",
            message: "请选择组织：",
            default: "",
            choices: this.orgs.map((item) => ({
              name: item.login,
              value: item.login,
            })),
          })
        ).login;
      }

      // 写入缓存
      writeFile(ownerPath, owner);
      writeFile(loginPath, login);
      log.success("owner写入成功：", `${owner}  =>  ${ownerPath}`);
      log.success("login写入成功：", `${login}  =>  ${loginPath}`);
    } else {
      const userChinese = GIT_OWNER_TYPE_CHOICES.find(
        (item) => item.value === owner
      ).name;
      log.success("owner读取成功：", `${owner}（${userChinese}用户）`);
      log.success("login读取成功：", login);
    }

    this.owner = owner;
    this.login = login;
  }

  // 检查并创建远程仓库
  async checkRepo() {
    let repo = await this.gitServer.getRepo(this.login, this.name);
    log.verbose("repository", repo);

    if (!repo) {
      const spinner = spinners("开始创建远程仓库...");
      try {
        if (this.owner === REPO_OWNER_USER) {
          repo = await this.gitServer.createRepo(this.name);
        } else {
          repo = await this.gitServer.createOrgRepo(this.name, this.login);
        }
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);

        if (!repo) {
          throw new Error("创建远程仓库失败！");
        } else {
          log.success("创建远程仓库成功：", `${this.login}/${this.name}`);
        }
      }
    } else {
      log.success("获取远程仓库信息成功：", `${this.login}/${this.name}`);
    }

    // 将值保存到this中
    this.repo = repo;
  }

  // 检查并创建.gitignore
  async checkGitIgnore() {
    const ignorePath = path.resolve(this.dir, GIT_IGNORE_FILE);
    // 文件不存在则写入一个默认模板
    if (!fs.existsSync(ignorePath)) {
      writeFile(ignorePath, gitignoreTemplate);
      log.success(`自动写入 ${GIT_IGNORE_FILE} 文件成功`);
    }
  }

  // 完成本地git仓库初始化
  async init() {
    const hasRemote = await this.getRemote();
    // 不存在则初始化
    if (!hasRemote) {
      await this.initAndAddRemote();
    }
  }

  // 获取远程仓库地址
  async getRemote() {
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR);
    // 将remote缓存到this中
    this.remote = this.gitServer.getRemote(this.login, this.name);

    if (fs.existsSync(gitPath)) {
      log.info("git init已完成，无需再次init");
      return true;
    }
  }

  // 初始化并添加远程仓库
  async initAndAddRemote() {
    log.notice("执行git init");
    await this.git.init(this.dir);
    log.success("git init初始化成功");
    log.notice("添加git remote");
    const remotes = await this.git.getRemotes();
    log.success("git remote添加成功");
    log.verbose("git remote：", remotes);

    if (!remotes.find((item) => item.name === "origin")) {
      await this.git.addRemote("origin", this.remote);
    }
  }

  // 获取远端仓库用户和组织信息
  async getUserAndOrgs() {
    this.user = await this.gitServer.getUser();
    if (!this.user) {
      throw new Error("用户信息获取失败！");
    }
    log.verbose("用户信息：", this.user);

    this.orgs = await this.gitServer.getOrg(this.user.login);
    if (!this.orgs) {
      throw new Error("组织信息获取失败！");
    }
    log.verbose("用户所在组织信息：", this.orgs);

    log.success(
      `获取 ${this.gitServer.type} 用户和组织信息成功，当前用户：${this.user.name}`
    );
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
}

module.exports = Git;
