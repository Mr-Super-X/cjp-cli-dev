"use strict";

// 第三方库
const simpleGit = require("simple-git"); // 用于在node程序中运行git
const inquirer = require("inquirer"); // 用于终端交互
const fse = require("fs-extra"); // 用于文件操作
const semver = require("semver"); // 用于比对版本号
const terminalLink = require("terminal-link"); // 用于生成终端可点击链接
// 内置库
const path = require("path");
const os = require("os");
const fs = require("fs");
// 自建库
const log = require("@cjp-cli-dev/log");
const CloudBuild = require("@cjp-cli-dev/cloudbuild");
const { readFile, writeFile, spinners } = require("@cjp-cli-dev/utils");
const Github = require("./Github");
const Gitee = require("./Gitee");
const gitignoreTemplate = require("./gitignoreTemplate");
// 白名单命令，不在此白名单中的命令都需要确认是否执行，防止用户插入风险操作，如：rm -rf等
const COMMAND_WHITELIST = require("./commandWhitelist");

const DEFAULT_CLI_HOME = ".cjp-cli-dev"; // 默认缓存路径
const GIT_ROOT_DIR = ".git"; // git根目录
const GIT_SERVER_FILE = ".git_server"; // git托管服务缓存文件
const GIT_TOKEN_FILE = ".git_token"; // git token缓存文件
const GIT_OWNER_FILE = ".git_owner"; // git owner登录类型缓存文件
const GIT_LOGIN_FILE = ".git_login"; // git login缓存文件
const GIT_IGNORE_FILE = ".gitignore"; // .gitignore缓存文件
const GIT_PUBLISH_FILE = ".git_publish"; // 缓存发布文件

const GITHUB = "github";
const GETEE = "gitee";
const REPO_OWNER_USER = "user"; // 登录类型：个人
const REPO_OWNER_ORG = "org"; // 登录类型：组织
const RELEASE_VERSION = "release"; // 发布分支
const DEVELOP_VERSION = "develop"; // 开发分支

// 创建远程仓库类型选项
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

// 创建远程仓库登录选项
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
      buildCmd = "",
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
    this.branch = null; // 本地开发分支
    this.refreshGitServer = refreshGitServer; // 是否强制更新git托管平台
    this.refreshGitToken = refreshGitToken; // 是否强制更新git token
    this.refreshGitOwner = refreshGitOwner; // 是否强制更新登录类型
    this.buildCmd = buildCmd; // 自定义构建命令
  }

  async prepare() {
    await this.checkHomePath(); // 检查缓存主目录
    await this.checkGitServer(); // 检查用户远程仓库类型，github/gitee/...
    await this.checkGitToken(); // 检查远程仓库token
    await this.getUserAndOrgs(); // 获取远程仓库用户和组织信息
    await this.checkGitOwner(); // 确认远程仓库登录类型是组织还是个人
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

  // 确认远程仓库登录类型是组织还是个人
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
          message: "请选择远程仓库登录类型：",
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
    // 如果仓库存在，就不需要执行后续了
    if (await this.getRemote()) {
      return;
    }
    await this.initAndAddRemote(); // 初始化git并添加远程地址
    await this.initCommit(); // 初始化提交
  }

  // 代码自动化提交
  async commit() {
    // 1. 生成开发分支
    await this.getCorrectVersion();
    // 2. 检查stash区
    await this.checkStash();
    // 3. 检查代码冲突
    await this.checkConflicted();
    // 4. 切换开发分支
    await this.checkoutLocalBranch(this.branch);
    // 5. 合并远程master分支到本地开发分支
    await this.pullRemoteMasterBranch();
    // 6. 检查未提交的代码进行提交
    await this.checkNotCommitted();
    // 7. 推送开发分支到远程仓库
    await this.pushRemoteRepo(this.branch);
  }

  // 发布
  async publish() {
    await this.preparePublish();

    // 创建云构建实例，将当前git实例和所需要的参数传进去
    const cloudBuild = new CloudBuild(this, {
      gitPublishType: "", // 发布类型 测试or预发布or生产
      buildCmd: this.buildCmd,
    });

    // 初始化云构建任务
    // await cloudBuild.init();
    // await cloudBuild.build();
  }

  // 发布准备阶段
  async preparePublish() {
    log.info("开始进行云构建前代码预检查");
    const pkg = this.getPackageJson();

    if (this.buildCmd) {
      const buildCmdArr = this.buildCmd.split(" ");
      const cmd = this.checkCommandInWhitelist(buildCmdArr[0]);
    } else {
      // 不传默认就是npm run build
      this.buildCmd = "npm run build";
    }

    log.verbose('buildCmd', this.buildCmd);
    log.verbose('scripts', pkg.scripts);

    // 如果package.json中没有配置script脚本则抛出异常
    const buildCmdArr = this.buildCmd.split(" ");
    const lastCmd = buildCmdArr[buildCmdArr.length - 1];
    if(!pkg.scripts || !Object.keys(pkg.scripts).includes(lastCmd)) {
      throw new Error(`当前项目package.json中scripts不存在 ${lastCmd} 命令配置`);
    }

    log.success("代码预检查通过");


  }

  // 获取项目package.json
  getPackageJson() {
    const pkgPath = path.resolve(this.dir, "package.json");
    // 没有package.json表示这不是一个标准前端项目
    if(!fs.existsSync(pkgPath)) {
      throw new Error(`源码目录 ${this.dir} 中不存在 package.json ，可能不是一个标准前端项目`)
    }

    return fse.readJSONSync(pkgPath);
  }

  // 检查命令是否在白名单
  checkCommandInWhitelist(command) {
    if (!COMMAND_WHITELIST.includes(command)) {
      // 如果命令不在白名单
      throw new Error(
        `命令 ${command} 不在白名单中，可能存在风险，已阻止程序运行。当前仅支持以下命令：\n${COMMAND_WHITELIST.join(
          "|"
        )}`
      );
    }

    return command;
  }

  async getCorrectVersion() {
    // 1. 获取远程分支列表
    // 分支规范：
    //    远程分支：release/x.y.z
    //    开发分支：develop/x.y.z
    // 版本规范：
    //    major/minor/patch
    log.info("获取远程代码分支信息");
    const remoteBranchList = await this.getRemoteBranchList(RELEASE_VERSION);
    let releaseVersion = null;
    if (remoteBranchList && remoteBranchList.length > 0) {
      releaseVersion = remoteBranchList[0]; // 拿到最新的版本号
    }
    log.verbose("远程仓库最新版本号：", releaseVersion);
    // 2. 判断远程最新发布版本号是否存在，不存在生成本地默认开发分支，存在判断本地是否小于远程最新版本号，小于则升级本地版本号
    const devVersion = this.version;
    if (!releaseVersion) {
      this.branch = `${DEVELOP_VERSION}/${devVersion}`;
    } else if (semver.gte(this.version, releaseVersion)) {
      log.info(
        "当前本地版本大于等于远程最新版本",
        `${devVersion} >= ${releaseVersion}`
      );
      this.branch = `${DEVELOP_VERSION}/${devVersion}`;
    } else {
      log.info(
        "当前本地版本落后于远程最新版本",
        `${devVersion} < ${releaseVersion}`
      );
      const incType = (
        await inquirer.prompt({
          type: "list",
          name: "incType",
          message: "自动升级版本，请选择版本号升级类型：",
          default: "patch",
          choices: [
            // semver.inc方法能自动帮我们计算要升级的版本号
            {
              name: `patch：${devVersion} => ${semver.inc(
                devVersion,
                "patch"
              )}（小版本，如修复bug或小改进，不破坏兼容性）`,
              value: "patch",
            },
            {
              name: `minor：${devVersion} => ${semver.inc(
                devVersion,
                "minor"
              )}（中版本，如新增功能或改进功能，不破坏兼容性）`,
              value: "minor",
            },
            {
              name: `major：${devVersion} => ${semver.inc(
                devVersion,
                "major"
              )}（大版本，如重大更新或废弃旧功能，会破坏兼容性）`,
              value: "major",
            },
          ],
        })
      ).incType;

      // 调用inc传入用户选择结果生成最终要升级的版本号
      const incVersion = semver.inc(devVersion, incType);
      // 更新信息
      this.branch = `${DEVELOP_VERSION}/${incVersion}`;
      this.version = incVersion;
    }
    log.verbose("本地开发分支：", this.branch);

    // 3. 同步写入版本到package.json
    this.writeVersionToPackageSync();
  }

  // 检查stash区，如果和本地变更有冲突，需要手动将本地代码进行提交，再手动执行git stash pop取出
  async checkStash() {
    log.info("检查stash记录");
    const stashList = await this.git.stashList();
    log.verbose("stash", stashList.all);
    // 如果stash中有内容则弹出内容
    if (stashList.all.length > 0) {
      log.info("检测到stash区中有内容，将自动取出stash");
      await this.git.stash(["pop"]);
      log.success("自动执行git stash pop成功");
    } else {
      log.info("stash区未检测到内容");
    }
  }

  // 切换开发分支
  async checkoutLocalBranch(branchName) {
    const localBranchList = await this.git.branchLocal();

    // 如果本地存在该分支，直接切换，否则创建一个本地分支
    if (localBranchList.all.includes(branchName)) {
      log.info(`本地分支 ${branchName} 存在，将自动切换到该分支`);
      await this.git.checkout(branchName);
      log.success(`自动切换到 ${branchName} 分支成功`);
    } else {
      log.info(`本地分支 ${branchName} 不存在，将自动创建该分支`);
      await this.git.checkoutLocalBranch(branchName); // 创建并切换到该分支
      log.success(`自动创建 ${branchName} 分支成功`);
    }
  }

  async pullRemoteMasterBranch() {
    log.info(`自动合并远程 master => ${this.branch}`);
    await this.pullRemoteRepo("master");
    log.success("合并远程 master 分支代码成功");

    // 合并代码后检查冲突
    await this.checkConflicted();
    log.info("检查远程开发分支");
    const remoteBranchList = await this.getRemoteBranchList();
    if (remoteBranchList.includes(this.version)) {
      log.info(
        `存在远程分支 ${this.branch}，自动合并远程 ${this.branch} => ${this.branch}`
      );
      await this.pullRemoteRepo(this.branch);
      log.success(`合并远程 ${this.branch} 分支代码成功`);

      // 合并完检查冲突
      await this.checkConflicted();
    } else {
      log.warn(`不存在远程分支 ${this.branch}`);
    }
  }

  // 同步写入版本到package.json
  async writeVersionToPackageSync() {
    const pkgPath = `${this.dir}/package.json`;
    const pkg = fse.readJsonSync(pkgPath);
    if (pkg && pkg.version && pkg.version !== this.version) {
      pkg.version = this.version;

      // 写入package.json并给两个字符的缩进
      fse.writeJSONSync(pkgPath, pkg, { spaces: 2 });
    }
  }

  // 获取远程分支列表
  async getRemoteBranchList(type) {
    const remotes = await this.git.listRemote(["--refs"]);
    if (!remotes) throw new Error("远程分支列表不存在！");

    let reg;
    if (type === RELEASE_VERSION) {
      reg = new RegExp(
        `.+?refs/tags/${RELEASE_VERSION}/(\\d+\\.\\d+\\.\\d+)`,
        "g"
      );
      // reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g
    } else {
      reg = new RegExp(
        `.+?refs/heads/${DEVELOP_VERSION}/(\\d+\\.\\d+\\.\\d+)`,
        "g"
      );
    }

    // 对返回版本列表进行处理
    return remotes
      .split("\n")
      .map((remote) => {
        const match = reg.exec(remote);
        reg.lastIndex = 0; // 有多个版本的情况下置为0才会重新进行匹配

        if (match && semver.valid(match[1])) {
          return match[1];
        }
      })
      .filter((_) => _) // 过滤结果为true的数据
      .sort((a, b) => semver.compare(b, a)); // 排序，从大到小，防止数据没有按预期顺序返回
  }

  // 项目初始化提交
  async initCommit() {
    await this.checkConflicted(); // 检查代码冲突
    await this.checkNotCommitted(); // 检查未提交的代码

    // 如果远程master已存在，则拉取代码到本地进行合并
    if (await this.checkRemoteMaster()) {
      log.info("当前远程仓库已存在 master 分支");
      await this.pullRemoteRepo("master", {
        // 强制让没有关系的两个分支代码进行合并，防止不在一条代码线上的情况
        "--allow-unrelated-histories": true,
      });
    } else {
      log.info("远程仓库 master 分支不存在");
      await this.pushRemoteRepo("master");
    }
  }

  // 检查代码冲突
  async checkConflicted() {
    log.info("检查代码冲突");
    const status = await this.git.status();
    if (status.conflicted.length > 0) {
      throw new Error(
        "当前代码存在冲突，请手动处理合并后再试！冲突文件：",
        status.conflicted
      );
    }

    log.success("代码冲突检查通过");
    return true;
  }

  // 检查未提交的代码
  async checkNotCommitted() {
    log.info("检查未提交代码");
    const status = await this.git.status();

    const { not_added, created, deleted, modified, renamed } = status;

    if (
      // 未提交的
      not_added.length > 0 ||
      // 新创建的
      created.length > 0 ||
      // 已删除的
      deleted.length > 0 ||
      // 已修改的
      modified.length > 0 ||
      // 重命名的
      renamed.length > 0
    ) {
      log.verbose("当前git状态", status);
      log.warn(`存在已变更但未提交的代码`);

      log.info("自动执行git add操作");
      // 将可能产生变更的所有文件都添加到git暂存区，然后让用户输入commit信息
      await this.git.add(not_added);
      await this.git.add(created);
      await this.git.add(deleted);
      await this.git.add(modified);
      await this.git.add(renamed);
      log.success("git add命令执行成功");

      log.info("自动执行git commit操作");
      let message;

      // 持续提示用户输入内容
      while (!message) {
        message = (
          await inquirer.prompt({
            type: "text",
            name: "message",
            default: "",
            message: "请输入commit信息：",
          })
        ).message;
      }

      await this.git.commit(message);
      log.success("本次commit提交成功：", message);
    }
  }

  // 检查是否存在master分支
  async checkRemoteMaster() {
    const refs = await this.git.listRemote(["--refs"]);
    if (!refs) return false;
    // 当--refs中存在refs/heads/master，我们认为master分支存在
    return refs.includes("refs/heads/master");
  }

  // 推送到远程分支
  async pushRemoteRepo(branchName) {
    log.info(`推送代码至远程仓库 ${branchName} 分支`);
    await this.git.push("origin", branchName);
    log.success("推送代码成功");
  }

  async pullRemoteRepo(branchName, options) {
    log.info(`同步远程仓库 ${branchName} 分支代码`);
    await this.git.pull("origin", branchName, options);
    log.success("代码同步成功");
  }

  // 获取远程仓库地址
  async getRemote() {
    log.info(`检查${GIT_ROOT_DIR}目录是否存在`);
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR);
    // 将remote缓存到this中
    this.remote = this.gitServer.getRemote(this.login, this.name);

    if (fs.existsSync(gitPath)) {
      log.info(`${GIT_ROOT_DIR}目录已存在`);
      return true;
    } else {
      log.warn(`${GIT_ROOT_DIR}目录不存在，将自动创建该目录`);
    }
  }

  // 初始化并添加远程仓库
  async initAndAddRemote() {
    log.info("执行git init");
    await this.git.init(this.dir);
    log.success("git init初始化成功");
    log.info("添加git remote");
    const remotes = await this.git.getRemotes();
    log.success("git remote添加成功");
    log.verbose("git remote：", remotes);

    if (!remotes.find((item) => item.name === "origin")) {
      await this.git.addRemote("origin", this.remote);
    }
  }

  // 获取远程仓库用户和组织信息
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
