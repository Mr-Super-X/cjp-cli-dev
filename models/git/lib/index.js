"use strict";

// 第三方库
const simpleGit = require("simple-git"); // 用于在node程序中运行git
const terminalLink = require("terminal-link"); // 用于生成终端可点击链接
const Listr = require("listr"); // 文件列表增强工具
const { Observable } = require("rxjs"); // 用于响应式数据操作
// 内置库
const path = require("path");
const os = require("os");
const fs = require("fs");
const cp = require("child_process");
// 自建库
const request = require("@cjp-cli-dev/request");
const log = require("@cjp-cli-dev/log");
const CloudBuild = require("@cjp-cli-dev/cloudbuild");
const {
  readFile,
  writeFile,
  spinners,
  sleep,
  prompt,
  semver,
  fse,
  DEFAULT_CLI_HOME,
} = require("@cjp-cli-dev/utils");
const Github = require("./Github");
const Gitee = require("./Gitee");
const ComponentRequest = require("./ComponentRequest");
const gitignoreTemplate = require("./gitignoreTemplate");
// 白名单命令，不在此白名单中的命令都需要确认是否执行，防止用户插入风险操作，如：rm -rf等
const COMMAND_WHITELIST = require("./commandWhitelist");

const GIT_ROOT_DIR = ".git"; // git根目录
const GIT_SERVER_FILE = ".git_server"; // git托管服务缓存文件
const GIT_TOKEN_FILE = ".git_token"; // git token缓存文件
const GIT_OWNER_FILE = ".git_owner"; // git owner登录类型缓存文件
const GIT_LOGIN_FILE = ".git_login"; // git login缓存文件
const GIT_IGNORE_FILE = ".gitignore"; // .gitignore缓存文件
const GIT_PUBLISH_FILE = ".git_publish"; // 缓存发布文件
const OLD_GIT_SSH_KEY_FILE = "id_rsa.pub"; // git ssh公钥（旧版）
const NEW_GIT_SSH_KEY_FILE = "id_ed25519.pub"; // git ssh公钥（新版）

const GITHUB = "github";
const GETEE = "gitee";
const SSH = "ssh";
const HTTPS = "https";
const REPO_OWNER_USER = "user"; // 登录类型：个人
const REPO_OWNER_ORG = "org"; // 登录类型：组织
const RELEASE_VERSION = "release"; // 发布分支
const DEVELOP_VERSION = "develop"; // 开发分支
const PUBLISH_TYPE = "oss"; // 默认发布平台
const TEMPLATE_TEMP_DIR = "oss-temp"; // 从oss下载的模板缓存目录
const COMPONENT_FILE = ".componentrc"; // 组件配置文件

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

// 发布类型选项（可配置更多扩展）
const GIT_PUBLISH_TYPE_CHOICES = [
  {
    name: "OSS",
    value: "oss",
  },
];

// git克隆仓库的方式
const GIT_CLONE_TYPE_CHOICES = [
  {
    name: "SSH",
    value: SSH,
  },
  {
    name: "HTTPS",
    value: HTTPS,
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
      production = false,
      componentNoDb = false,
      noCloudBuild = false,
      registry = "",
      sshUser = "",
      sshIp = "",
      sshPath = "",
    }
  ) {
    // 将当前类使用到的属性都定义出来，可读性更高

    // 如果项目名称中带有@符号开头且包含分隔符/说明这是一个组织包，代码托管平台不允许创建这种名称的仓库，需要处理
    if (name.startsWith("@") && name.includes("/")) {
      const nameArr = name.split("/");
      // 将名称如@cjp-cli-dev/test-component => cjp-cli-dev_test-component
      name = nameArr.join("_").replace("@", "");
    }
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
    this.cloneType = null; // 克隆仓库方式 https ssh
    this.token = null; // Git token
    this.remote = null; // 远程地址
    this.branch = null; // 本地开发分支
    this.gitPublish = null; // 静态资源服务器类型
    this.refreshGitServer = refreshGitServer; // 是否强制更新git托管平台
    this.refreshGitToken = refreshGitToken; // 是否强制更新git token
    this.refreshGitOwner = refreshGitOwner; // 是否强制更新登录类型
    this.buildCmd = buildCmd; // 自定义构建命令
    this.production = production; // 是否正式发布
    this.componentNoDb = componentNoDb; // 不写入数据库 默认写入
    this.noCloudBuild = noCloudBuild; // 不启用云构建，默认启用
    this.registry = registry; // npm安装源
    this.sshUser = sshUser; // ssh用户
    this.sshIp = sshIp; // ssh IP
    this.sshPath = sshPath; // ssh 路径

    log.verbose("ssh配置：", this.sshUser, this.sshIp, this.sshPath);
  }

  async prepare() {
    await this.checkHomePath(); // 检查缓存主目录
    await this.checkGitServer(); // 检查用户远程仓库类型，github/gitee/...
    await this.checkGitToken(); // 检查远程仓库token
    await this.getUserAndOrgs(); // 获取远程仓库用户和组织信息
    await this.checkGitOwner(); // 确认远程仓库登录类型是组织还是个人
    await this.checkRepo(); // 检查并创建远程仓库
    await this.checkGitIgnore(); // 检查并创建.gitignore
    await this.checkComponent(); // 检查组件合法性
    await this.init(); // 完成本地git仓库初始化
  }

  // 检查组件合法性
  async checkComponent() {
    let componentFile = this.isComponent();
    if (componentFile) {
      log.info("开始检查build结果");
      // 如果没有配置构建命令则默认npm run build
      if (!this.buildCmd) {
        const defaultBuildCmd = "npm run build";
        log.warn(
          `当前没有配置构建命令，将使用默认 ${defaultBuildCmd} 命令进行构建`
        );
        this.buildCmd = defaultBuildCmd;
      }
      log.info("自动执行组件库构建");
      // 自动执行build命令生成结果
      cp.execSync(this.buildCmd, {
        cwd: this.dir,
        stdio: "inherit",
      });

      // 检查构建结果
      const buildPath = path.resolve(this.dir, componentFile.buildPath);
      if (!fs.existsSync(buildPath)) {
        throw new Error(`构建结果目录：${buildPath} 不存在！`);
      }

      // 检查pkg.files中是否存在构建结果目录，如果不存在，发布npm时就没有该目录
      const pkg = this.getPackageJson();
      if (!pkg.files || !pkg.files.includes(componentFile.buildPath)) {
        throw new Error(
          `package.json中files属性未添加构建结果目录：${componentFile.buildPath}，将导致发布的npm包缺少构建结果，请手动添加后再试！`
        );
      }

      log.success("build结果检查通过");
    }
  }

  // 判断是否为组件，满足.componentrc文件存在且内容不为空
  isComponent() {
    const componentFilePath = path.resolve(this.dir, COMPONENT_FILE);
    return (
      fs.existsSync(componentFilePath) && fse.readJsonSync(componentFilePath)
    );
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
        await prompt({
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
        `${
          this.gitServer.type
        } token未生成，请先生成token。链接：\n${this.gitServer.getTokenUrl()}}`
      );
      // 让用户输入token
      token = (
        await prompt({
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
        await prompt({
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
          await prompt({
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
    await this.initCloneType(); // 初始化克隆方式
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
    // 4. 检查未提交的代码进行提交
    await this.checkNotCommitted();
    // 5. 切换开发分支
    await this.checkoutLocalBranch(this.branch);
    // 6. 合并远程master分支到本地开发分支
    await this.pullRemoteMasterBranch();
    // 7. 推送开发分支到远程仓库
    await this.pushRemoteRepo(this.branch);
  }

  // 发布
  async publish() {
    let result = false;
    // 如果是组件，发布npm流程，如果是项目则执行云构建和云发布流程
    if (this.isComponent()) {
      // 1. 将组件发布信息上传至mysql数据库
      // TODO 2. 将组件多预览页面上传至oss（暂未完成）
      log.info("开始发布组件");
      // 如果用户传了componentNoDb为true，表示不写入数据库
      if (this.componentNoDb === false) {
        result = await this.saveComponentToDB();
      } else {
        log.info("您已指定组件发布信息不写入数据库");
        result = true;
      }
      // 生产发布需要将组件发布npm
      if (this.production) {
        await this.uploadComponentToNpm();
      }

      // TODO 优化点：如果不指定production表示测试发布，应该增加测试发布的相关内容，如将测试发布的构建结果上传到OSS

      if (result) {
        log.success("组件发布成功");
      }
    } else {
      log.info("开始发布项目");
      await this.preparePublish();
      // 如果用户指定不开启云构建，则走本地构建流程
      if (this.noCloudBuild === false) {
        // 创建云构建实例，将当前git实例和所需要的参数传进去
        const cloudBuild = new CloudBuild(this, {
          type: this.gitPublish, // 静态资源服务器类型
          buildCmd: this.buildCmd, // 构建命令
          production: this.production, // 是否正式发布
          registry: this.registry, // npm源
        });
        // 准备云构建任务
        await cloudBuild.prepare();
        // 初始化云构建任务
        await cloudBuild.init();
        // 开始云构建
        result = await cloudBuild.build();
      } else {
        log.info("您已指定项目发布不启用云构建，开始本地构建");
        result = await this.localBuild();
      }

      // 获取构建结果，上传模板至OSS服务器
      if (result) {
        await this.uploadTemplate();
        log.success("项目发布成功");
      }
    }

    // 公共流程

    // 如果是生产发布且前面的结果都正确则执行以下流程
    if (this.production && result) {
      await this.runCreateTagTask();

      // // 自动删除和打新tag
      // await this.checkTag();
      // // 切换master分支
      // await this.checkoutLocalBranch("master");
      // // 合并开发分支代码到master分支
      // await this.mergeBranchToMaster();
      // // 将代码推送到远程master分支
      // await this.pushRemoteRepo("master");
      // // 删除本地开发分支
      // await this.deleteLocalBranch();
      // // 删除远程开发分支
      // await this.deleteRemoteBranch();
    }
  }

  // 本地构建
  async localBuild() {
    // 1. 当前项目目录下执行buildCmd
    // 2. 提示用户手动操作构建结果

    cp.execSync(`${this.buildCmd}`, {
      cwd: this.dir, // 在当前源码目录下执行
      stdio: "inherit",
    });

    log.success("本地构建成功，请您手动处理构建结果进行发布");
    // 上一步execSync报错会终止程序运行，如果没报错表示执行成功，返回true告知当前步骤成功
    return true;
  }

  async saveComponentToDB() {
    log.info("正在将组件信息写入MySQL数据库");
    const componentFile = this.isComponent();
    // 获取源码目录下.componentrc中的examplePath，在MongoDB中配置
    let componentExamplePath = path.resolve(
      this.dir,
      componentFile.examplePath
    );
    // 获取examplePath下的dist路径
    let dirs = fs.readdirSync(componentExamplePath);
    // 如果componentExamplePath下存在dist文件夹，则进行更新
    if (dirs.includes("dist")) {
      componentExamplePath = path.resolve(componentExamplePath, "dist");
      dirs = fs.readdirSync(componentExamplePath);
      componentFile.examplePath = `${componentFile.examplePath}/dist`;
    }
    // 拿到所有的index.html
    dirs = dirs.filter((dir) => dir.match(/^index(\d)*.html$/));
    log.verbose("组件预览页面路径：", componentExamplePath);
    log.verbose("组件预览页面数据：", dirs);

    // 将最终预览文件名称信息存入componentFile
    componentFile.exampleList = dirs;
    // 更新预览文件访问路径
    componentFile.exampleRealPath = componentExamplePath;
    const data = ComponentRequest.createComponent({
      component: componentFile, // 组件信息
      git: {
        // git信息
        type: this.gitServer.type,
        remote: this.remote,
        version: this.version,
        branch: this.branch,
        login: this.login,
        owner: this.owner,
        repo: this.repo,
      },
    });
    if (!data) {
      throw new Error("组件信息写入MySQL数据库失败");
    }

    log.success("组件信息写入MySQL数据库成功");

    // 告诉下一步，当前这一步完成了
    return true;
  }

  // 上传组件到npm
  async uploadComponentToNpm() {
    // 3. 完成组件上传npm
    log.info("开始发布npm包");
    // 如果用户有指定源，直接提示即可
    if (this.registry) {
      log.verbose("当前指定源为：" + this.registry);
    } else {
      await this.checkNpmSource();
    }

    const localRegistry = await this.getNpmRegistry(); // 获得用户本地源地址
    const registry = this.registry || localRegistry; // 对--registry参数进行支持

    // 发布前检查用户是否已登录npm
    const npmLogin = await this.checkNpmLogin();
    // 如果没登录，自动执行npm login
    if (!npmLogin) {
      log.warn("请先登录npm");
      log.info(`自动执行：npm login --registry=${registry}`);
      cp.execSync(`npm login --registry=${registry}`, {
        cwd: this.dir, // 在当前源码目录下执行
        stdio: "inherit",
      });
      log.success("npm登录成功");
    } else {
      log.success("您已登录npm，可正常执行publish操作");
    }

    // 执行发布操作
    log.info(`执行npm发布命令：npm publish --registry=${registry}`);
    cp.execSync(`npm publish --registry=${registry}`, {
      cwd: this.dir, // 在当前源码目录下执行
      stdio: "inherit",
    });
    log.success("npm包发布成功");
  }

  // 检查用户是否登录npm
  async checkNpmLogin() {
    return new Promise((resolve, reject) => {
      cp.exec("npm whoami", (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // 检测用户当前npm源
  async checkNpmSource() {
    try {
      const npmRegistry = await this.getNpmRegistry();
      const officialSource = "https://registry.npmjs.com/";
      log.verbose("npm registry：", npmRegistry);
      if (npmRegistry === officialSource) {
        log.info(`当前npm源为官方源：${officialSource}`);
      } else {
        log.warn(`您当前的npm源为：${npmRegistry} `);
      }
    } catch (error) {
      log.error("检查npm源失败：", error.message);
    }
  }

  // 获取npm registry
  async getNpmRegistry() {
    return new Promise((resolve, reject) => {
      cp.exec("npm config get registry", (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // 使用listr和rxjs优化任务在终端的交互，目前以自动打tag任务作为示例，可以参考将所有的流程都进行优化
  async runCreateTagTask() {
    // 注意以下task任务中的方法不能调用log.xx输出日志，否则会有冲突
    const tasks = new Listr([
      {
        title: "自动删除旧Tag并生成新Tag，合并代码并删除开发分支",
        task: () =>
          new Listr([
            {
              title: "检查旧Tag并生成新Tag",
              task: () => {
                return new Observable(async (o) => {
                  o.next("正在检查旧Tag并生成新Tag");
                  await sleep(1000);
                  this.checkTag().then(() => {
                    o.complete();
                  });
                });
              },
            },
            {
              title: "切换master分支",
              task: () => {
                return new Observable(async (o) => {
                  o.next("正在切换master分支");
                  await sleep(1000);
                  this.checkoutBranchTask("master").then(() => {
                    o.complete();
                  });
                });
              },
            },
            {
              title: "合并开发分支代码到master分支",
              task: () => {
                return new Observable(async (o) => {
                  o.next("正在合并开发分支代码到master分支");
                  await sleep(1000);
                  await this.git.mergeFromTo(this.branch, "master");
                  o.complete();
                });
              },
            },
            {
              title: "代码推送到远程master分支",
              task: () => {
                return new Observable(async (o) => {
                  o.next("正在将代码推送到远程master分支");
                  await sleep(1000);
                  await this.git.push("origin", "master");
                  o.complete();
                });
              },
            },
            {
              title: "删除本地开发分支",
              task: () => {
                return new Observable(async (o) => {
                  o.next("正在删除本地开发分支");
                  await sleep(1000);
                  await this.git.deleteLocalBranch(this.branch);
                  o.complete();
                });
              },
            },
            {
              title: "删除远程开发分支",
              task: () => {
                return new Observable(async (o) => {
                  o.next("正在删除远程开发分支");
                  await sleep(1000);
                  await this.git.push(["origin", "--delete", this.branch]);
                  o.complete();
                });
              },
            },
          ]),
      },
    ]);

    tasks.run();
  }

  // 删除本地开发分支
  async deleteLocalBranch() {
    log.info("开始删除本地开发分支", this.branch);
    await this.git.deleteLocalBranch(this.branch);
    log.success(`删除本地开发分支 ${this.branch} 成功`);
  }

  // 删除远程开发分支
  async deleteRemoteBranch() {
    log.info("开始删除远程开发分支", this.branch);
    await this.git.push(["origin", "--delete", this.branch]);
    log.success(`删除远程开发分支 ${this.branch} 成功`);
  }

  // 合并开发分支代码到master分支
  async mergeBranchToMaster() {
    log.info("开始合并代码", `${this.branch}  =>  master`);
    await this.git.mergeFromTo(this.branch, "master");
    log.success("代码合并成功", `已将 ${this.branch} 合并至 master`);
  }

  // 上传模板
  async uploadTemplate() {
    const TEMPLATE_FILE_NAME = "index.html";
    if (this.sshUser && this.sshIp && this.sshPath) {
      log.info("开始从OSS中下载模板文件");
      let ossTemplateFile = await request({
        url: "/oss/get",
        params: {
          name: this.name, // 项目文件夹名称
          type: this.production ? "prod" : "dev", // 是否生产模式
          file: TEMPLATE_FILE_NAME,
        },
      });
      // 更新
      if (ossTemplateFile.code === 0 && ossTemplateFile.data) {
        ossTemplateFile = ossTemplateFile.data;
      }
      log.verbose("oss模板文件url", ossTemplateFile.url);

      // 下载模板文件（index.html）
      let response = await request({
        url: ossTemplateFile.url,
      });

      if (response) {
        // 如果模板文件存在，则创建缓存目录，否则清空目录
        const ossTempDir = path.resolve(
          this.homePath,
          TEMPLATE_TEMP_DIR,
          `${this.name}@${this.version}`
        );
        if (!fs.existsSync(ossTempDir)) {
          fse.mkdirpSync(ossTempDir);
        } else {
          fse.emptyDirSync(ossTempDir);
        }

        // 然后将模板文件写入缓存目录
        const templateFilePath = path.resolve(ossTempDir, TEMPLATE_FILE_NAME);
        fse.createFileSync(templateFilePath);
        fs.writeFileSync(templateFilePath, response);
        log.success("OSS模板文件下载成功，已写入缓存 => " + templateFilePath);

        // 上传模板文件
        log.info("开始上传模板文件至服务器");
        const uploadCmd = `scp -r ${templateFilePath} ${this.sshUser}@${this.sshIp}:${this.sshPath}`;
        log.verbose("uploadCmd", uploadCmd);
        const result = cp.execSync(uploadCmd);
        console.log(result.toString()); // 打印服务端日志
        log.success("模板文件上传成功");
        fse.emptyDirSync(ossTempDir); // 上传模板成功后清空缓存目录
      }
    }
  }

  // 检查并打tag
  async checkTag() {
    // log.info("获取远程 tag 列表");
    const tag = `${RELEASE_VERSION}/${this.version}`;
    const tagList = await this.getRemoteBranchList(RELEASE_VERSION);
    log.verbose("tagList", tagList);
    log.verbose("tag", tag);

    // 检查远程tag，如果远程tag中有当前版本则删除
    if (tagList.includes(this.version)) {
      // log.info(`远程tag ${tag} 已存在`);
      await this.git.push(["origin", `:refs/tags/${tag}`]);
      // await this.git.push(["origin", "--delete", tag]); // 效果与上面一致
      // log.success(`远程tag ${tag} 删除成功`);
    }

    // 检查本地tag，有也需要进行删除
    const localTagList = await this.git.tags();
    if (localTagList.all.includes(tag)) {
      // log.info(`本地已存在tag ${tag}，将会自动删除该tag然后创建新的tag`);
      await this.git.tag(["-d", tag]);
      // log.success(`本地tag ${tag} 删除成功`);
    }

    // 创建新的本地tag
    await this.git.addTag(tag);
    // log.success(`创建新的本地tag ${tag} 成功`);
    // 推送新的本地tag到远端
    await this.git.pushTags("origin");
    // log.success(`已将新的tag ${tag} 推送到远程`);
  }

  // 发布准备阶段
  async preparePublish() {
    log.info("开始进行云构建前代码预检查");
    const pkg = this.getPackageJson();

    if (this.buildCmd) {
      const buildCmdArr = this.buildCmd.split(" ");
      this.checkCommandInWhitelist(buildCmdArr[0]);
    } else {
      // 不传默认就是npm run build
      this.buildCmd = "npm run build";
    }

    log.verbose("buildCmd", this.buildCmd);
    log.verbose("scripts", pkg.scripts);

    // 如果package.json中没有配置script脚本则抛出异常
    const buildCmdArr = this.buildCmd.split(" ");
    const lastCmd = buildCmdArr[buildCmdArr.length - 1];
    if (!pkg.scripts || !Object.keys(pkg.scripts).includes(lastCmd)) {
      throw new Error(
        `当前项目package.json中scripts不存在 ${lastCmd} 命令配置`
      );
    }

    log.success("代码预检查通过");

    // 开启云构建才需要检查OSS服务器
    if (this.noCloudBuild === false) {
      const gitPublishPath = this.createPath(GIT_PUBLISH_FILE);
      let gitPublish = readFile(gitPublishPath);
      if (!gitPublish) {
        gitPublish = (
          await prompt({
            type: "list",
            name: "gitPublish",
            message: "请选择您想要上传静态资源代码的平台：",
            default: PUBLISH_TYPE,
            choices: GIT_PUBLISH_TYPE_CHOICES,
          })
        ).gitPublish;

        writeFile(gitPublishPath, gitPublish);
        log.success(
          "发布平台类型写入成功",
          `${gitPublish}  =>  ${gitPublishPath}`
        );
      } else {
        log.success("发布平台类型读取成功", `${gitPublish}`);
      }

      this.gitPublish = gitPublish; // 缓存到this上
      log.verbose("gitPublish", gitPublish);
    } else {
      log.verbose("已关闭云构建");
    }
  }

  // 获取项目package.json
  getPackageJson() {
    const pkgPath = path.resolve(this.dir, "package.json");
    // 没有package.json表示这不是一个标准前端项目
    if (!fs.existsSync(pkgPath)) {
      throw new Error(
        `源码目录 ${this.dir} 中不存在 package.json ，可能不是一个标准前端项目`
      );
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
      const { incType } = await prompt({
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
      });

      // 调用inc传入用户选择结果生成最终要升级的版本号
      const incVersion = semver.inc(devVersion, incType);
      // 更新信息
      this.branch = `${DEVELOP_VERSION}/${incVersion}`;
      this.version = incVersion;
    }
    log.verbose("本地开发分支：", this.branch);

    // 3. 同步写入版本到package.json
    await this.writeVersionToPackageSync();
  }

  // 二次确认stash内容是否自动弹出
  async getStashConfirm() {
    const { stashConfirm } = await prompt({
      type: "confirm",
      name: "stashConfirm",
      message: "检测到stash区中有内容，是否需要取出stash？",
      default: true, // 直接按回车默认取出
    });

    return stashConfirm;
  }

  // 检查stash区，如果和本地变更有冲突，需要手动将本地代码进行提交，再手动执行git stash pop取出
  async checkStash() {
    log.info("检查stash记录");
    const stashList = await this.git.stashList();
    log.verbose("stash", stashList.all);
    // 如果stash中有内容则弹出内容
    if (stashList.all.length > 0) {
      // 二次确认是否需要取出stash，防止某些用户喜欢用stash暂存内容
      const stashConfirm = await this.getStashConfirm();
      if (stashConfirm) {
        await this.git.stash(["pop"]);
        log.success("自动执行git stash pop成功");
      }
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
      log.info(`本地分支 ${branchName} 不存在，将自动创建并切换到该分支`);
      await this.git.checkoutLocalBranch(branchName); // 创建并切换到该分支
      log.success(`自动创建并切换 ${branchName} 分支成功`);
    }
  }

  // 切换开发分支（给listr使用的，不能带log）
  async checkoutBranchTask(branchName) {
    const localBranchList = await this.git.branchLocal();

    // 如果本地存在该分支，直接切换，否则创建一个本地分支
    if (localBranchList.all.includes(branchName)) {
      await this.git.checkout(branchName);
    } else {
      await this.git.checkoutLocalBranch(branchName); // 创建并切换到该分支
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
      log.warn(`远程分支 ${this.branch} 不存在，将在远程创建该分支`);
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
          await prompt({
            type: "text",
            name: "message",
            default: "",
            message: "请输入commit信息：",
          })
        ).message;
      }

      await this.git.commit(message);
      log.success("本次commit提交成功：", message);
    } else {
      log.info("没有发现未提交代码");
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
    log.info(`推送代码至远程 ${branchName} 分支`);
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
    log.info(`检查 ${GIT_ROOT_DIR} 目录是否存在`);
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR);
    // 将remote缓存到this中
    this.remote = this.gitServer.getRemote(
      this.login,
      this.name,
      this.cloneType,
      this.token
    );

    if (fs.existsSync(gitPath)) {
      log.info(`${GIT_ROOT_DIR} 目录已存在`);
      return true;
    } else {
      log.warn(`${GIT_ROOT_DIR} 目录不存在，自动为您创建该目录`);
    }
  }

  // 初始化并添加远程仓库
  async initAndAddRemote() {
    log.info("执行git init");
    await this.git.init(this.dir);
    log.success("git init初始化成功");
    log.info("添加git remote");
    const remotes = await this.git.getRemotes();
    log.verbose("git remote：", remotes);

    if (!remotes.find((item) => item.name === "origin")) {
      await this.git.addRemote("origin", this.remote);
    }

    log.success("git remote添加成功");
  }

  // 初始化克隆使用https方式克隆仓库还是ssh方式
  async initCloneType() {
    const cloneType = await this.getCloneType();
    log.verbose("cloneType", cloneType);

    // 如果使用ssh方式克隆仓库，则需要检查ssh公钥
    if (cloneType === SSH) {
      await this.checkSSHKey(); // 检查ssh公钥配置
    }

    log.info(`后续将为您使用 ${cloneType} 方式拉取和提交代码`);
    this.cloneType = cloneType; // 缓存克隆方式
  }

  // async checkHttps() {
  //   log.info(
  //     `检查远程地址是否符合token提交要求：https://<用户名>:<token>@${this.gitServer.type}.com/<用户名>/<仓库名>.git`
  //   );
  //   if (
  //     /https:\/\/([^/:]+):([^@]+)@([^.]+)\.com\/([^/]+)\/([^.]+)\.git/.test(
  //       this.remote
  //     )
  //   ) {
  //     log.success("检查通过，您当前仓库远程地址符合token提交的https方式");
  //   } else {
  //     throw new Error(
  //       `您的远程仓库地址不符合token提交的要求，请检查您的git remote`
  //     );
  //   }
  // }

  // 获取git仓库克隆方式
  async getCloneType() {
    const { cloneType } = await prompt({
      type: "list",
      name: "cloneType",
      message: "请选择您希望克隆远程仓库的方式？",
      default: "https", // 默认使用https
      choices: GIT_CLONE_TYPE_CHOICES,
    });

    return cloneType;
  }

  // 检查和生成ssh公钥（用于拉取和提交代码）
  async checkSSHKey() {
    log.info("开始检查Git SSH Key配置");
    // 查找旧和新版的ssh公钥是否存在
    const oldSshKeyPath = path.resolve(
      os.homedir(),
      ".ssh",
      OLD_GIT_SSH_KEY_FILE
    );
    const newSshKeyPath = path.resolve(
      os.homedir(),
      ".ssh",
      NEW_GIT_SSH_KEY_FILE
    );
    let sshKey = readFile(oldSshKeyPath) || readFile(newSshKeyPath);
    log.verbose("sshKey", sshKey);
    // 公钥不存在，自动生成公钥，提醒用户将公钥添加到托管平台，询问用户是否已添加，确认后继续
    if (!sshKey) {
      log.warn(`${this.gitServer.type} ssh key未生成，将为您生成ssh key`);

      log.info(
        `若您对生成ssh key的版本有疑问，请查看以下文档，链接：\n${this.gitServer.getSshKeyHelpUrl()}`
      );

      // 询问用户使用新版还是旧版生成key的方式
      const { sshKeyType } = await prompt({
        type: "list",
        name: "sshKeyType",
        message: "您希望ssh key使用新版本还是旧版本生成？",
        default: NEW_GIT_SSH_KEY_FILE, // 默认新版本
        choices: [
          { name: "新版本（ed25519）", value: NEW_GIT_SSH_KEY_FILE },
          { name: "旧版本（rsa）", value: OLD_GIT_SSH_KEY_FILE },
        ],
      });

      // 确定生成key的方式
      const oldCmd = `ssh-keygen -t rsa -C "${this.gitServer.type} SSH Key"`;
      const newCmd = `ssh-keygen -t ed25519 -C "${this.gitServer.type} SSH Key"`;
      const createKeyCmd =
        sshKeyType === OLD_GIT_SSH_KEY_FILE ? oldCmd : newCmd;

      log.info(`自动执行：${createKeyCmd}，中间过程一路按回车确定即可`);
      cp.execSync(createKeyCmd, {
        cwd: this.dir, // 在当前源码目录下执行
        stdio: "inherit",
      });

      // 公钥已生成，提醒用户将公钥添加到托管平台
      const sshKeyPath =
        sshKeyType === OLD_GIT_SSH_KEY_FILE ? oldSshKeyPath : newSshKeyPath;
      sshKey = readFile(sshKeyPath);
      log.info("公钥内容", sshKey);
      log.notice(
        `请您将上面的公钥内容复制，并添加到您的 ${
          this.gitServer.type
        } 托管平台上。链接：\n${this.gitServer.getSshKeyUrl()}`
      );

      // 提示用户进行确认
      log.info(
        `请先将ssh公钥添加到${this.gitServer.type}托管平台中，否则您可能没有足够的权限拉取仓库和提交代码`
      );

      await prompt({
        type: "confirm",
        name: "sshKeyConfirm",
        message: `您是否已将ssh公钥添加到${this.gitServer.type}托管平台？`,
        default: true, // 直接按回车默认继续
      });

      // 测试能否正确使用ssh连接gitee/github
      await this.checkGitSSHConnection();
    } else {
      // 公钥存在，测试能否正确连接
      await this.checkGitSSHConnection();
    }
  }

  // 检查能否正确使用ssh协议连接到gitee/github
  async checkGitSSHConnection() {
    try {
      const stdout = cp.execSync(`ssh -T git@${this.gitServer.type}.com`);
      log.verbose("checkGitSSHConnection stdout", stdout.toString());
      if (stdout.toString().includes("Hi")) {
        log.success("Git SSH连接测试通过");
        return true;
      } else {
        throw new Error(
          `Git SSH连接测试失败，请检查您的公钥和网络，确认您已将公钥添加到${
            this.gitServer.type
          }托管平台中。链接：\n${this.gitServer.getSshKeyUrl()}`
        );
      }
    } catch (error) {
      throw new Error(
        `Git SSH连接测试失败，请检查您的公钥和网络，确认您已将公钥添加到${
          this.gitServer.type
        }托管平台中。链接：\n${this.gitServer.getSshKeyUrl()}`
      );
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
