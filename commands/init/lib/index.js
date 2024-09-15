"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
const fse = require("fs-extra"); // 用于清空文件夹
const semver = require("semver"); // 用于判断版本号
const kebabCase = require("kebab-case"); // 用于将驼峰命名转为kebab-case
const ejs = require("ejs"); // 用于渲染ejs模板
const { glob } = require("glob"); // 用于shell模式匹配文件
// 内置库
const fs = require("fs");
const os = require("os");
const path = require("path");
// 自建库
const Command = require("@cjp-cli-dev/command");
const Package = require("@cjp-cli-dev/package");
const log = require("@cjp-cli-dev/log");
const { spinners, spawnAsync } = require("@cjp-cli-dev/utils");
const getProjectTemplate = require("./getProjectTemplate");

// 白名单命令，不在此白名单中的命令都需要确认是否执行，防止用户插入风险操作，如：rm -rf等
const COMMAND_WHITELIST = require("./commandWhitelist");

// 全局变量
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const userHome = os.homedir(); // 用户主目录

class InitCommand extends Command {
  init() {
    this.projectName = this._args[0] || "";
    this.force = this._args[1].force || false;
    // debug模式下输出以下变量
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      // 准备阶段完成结果为true才继续执行后续
      if (!projectInfo) return;
      // debug模式输出调试信息
      log.verbose("projectInfo", projectInfo);
      // 将项目信息保存到class中
      this.projectInfo = projectInfo;

      // 2. 下载模板
      await this.downloadTemplate();
      // 3. 安装模板
      await this.installTemplate();
    } catch (err) {
      log.error(err.message);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  async installTemplate() {
    // debug模式下输出模板信息
    log.verbose("templateInfo", this.templateInfo);
    log.verbose("npmPackage", this.npmPackage);

    if (!this.templateInfo) {
      throw new Error("模板信息不存在！");
    }

    // type不存在则默认给normal
    if (!this.templateInfo.type) {
      this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
    }

    // 分发type策略
    const typeStrategies = {
      // 标准安装
      [TEMPLATE_TYPE_NORMAL]: async () => {
        await this.installNormalTemplate();
      },
      // 自定义安装
      [TEMPLATE_TYPE_CUSTOM]: async () => {
        await this.installCustomTemplate();
      },
    };

    // 若type不存在，则抛出错误信息并终止
    if (!typeStrategies[this.templateInfo.type]) {
      throw new Error("无法识别模板类型！");
    }

    // 分发执行策略
    await typeStrategies[this.templateInfo.type]();
  }

  // 安装标准模板，例如安装vue-cli创建项目模板
  async installNormalTemplate() {
    const spinner = spinners("正在安装标准模板...");
    try {
      // 拷贝模板代码到当前目录
      const templatePath = path.resolve(
        this.npmPackage.cacheFilePath,
        "template"
      );
      // 当前目录路径
      const targetPath = process.cwd();
      // 确保这两个目录都存在，如果不存在会自动创建
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      // 拷贝模板代码到当前目录
      fse.copySync(templatePath, targetPath);
    } catch (err) {
      // 如果报错，抛出错误
      throw err;
    } finally {
      // 结束spinner
      spinner.stop(true);
    }

    // ejs忽略文件夹，默认node_modules，可在数据库中配置ignore属性（数组）
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ["**/node_modules/**", ...templateIgnore];
    // 模板安装完成后进行ejs渲染，替换掉ejs变量
    await this.ejsRender({ ignore });

    // 模板安装完成后执行安装和启动模板
    const { installCommand, startCommand } = this.templateInfo;

    // 执行安装命令
    const installResult = await this.parsingCommandExec(
      installCommand,
      "installCommand",
      `检测到installCommand存在，执行：${installCommand}`
    );

    if (installResult === 0) {
      log.success("依赖安装成功");
    } else {
      // 抛出错误，阻断后面执行
      throw new Error("依赖安装失败");
    }

    // 执行启动命令
    await this.parsingCommandExec(
      startCommand,
      "startCommand",
      `检测到startCommand存在，执行：${startCommand}`
    );
  }

  // 安装自定义模板，例如安装自己创建的项目模板
  async installCustomTemplate() {
    // 查询自定义模板入口文件
    if(await this.npmPackage.exists()) {
      const rootFile = this.npmPackage.getRootFilePath()
      if(fs.existsSync(rootFile)) {
        log.notice('开始执行自定义模板安装')
        const templatePath = path.resolve(this.npmPackage.cacheFilePath, 'template')

        const options = {
          templateInfo: this.templateInfo, // 模板信息
          projectInfo: this.projectInfo, // 项目信息
          sourcePath: templatePath, // 模板来源路径
          targetPath: process.cwd(), // 目标路径
        }

        // 动态引入代码
        const code = `require('${rootFile}')(${JSON.stringify(options)})`
        // 调试模式输出
        log.verbose('code', code)
        // 子进程中执行代码，并将stdout、stderr打印到控制台中
        const result = await spawnAsync('node', ['-e', code], {
          stdio: "inherit",
          cwd: process.cwd(),
        })

        if(result === 0) {
          log.success('自定义模板安装成功')
        }
      }else {
        throw new Error('自定义模板入口文件不存在！')
      }
    }
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1. 通过eggjs搭建后端
    // 1.2. 通过npm存储项目模板
    // 1.3. 将项目模板存储到MongoDB
    // 1.4. 通过egg.js获取MongoDB中的模板数据并通过API返回模板

    // 读取模板
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );

    // 将模板信息存到this中
    this.templateInfo = templateInfo;

    // 生成包安装路径信息
    const targetPath = path.resolve(userHome, ".cjp-cli-dev", "template");
    const storeDir = path.resolve(
      userHome,
      ".cjp-cli-dev",
      "template",
      "node_modules"
    );
    const { npmName: packageName, version: packageVersion } = templateInfo;

    // 创建npm包实例
    const npmPackage = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });

    let spinner; // 加载动画
    let successMsg; // 成功信息

    // 捕获下载或更新的报错，将错误抛出，防止程序异常
    try {
      // 如果npm包不存在，则执行npm install，否则更新
      if (!(await npmPackage.exists())) {
        spinner = spinners("正在下载模板...");
        await npmPackage.install();
        successMsg = "下载模板成功";
      } else {
        spinner = spinners("正在更新模板...");
        await npmPackage.update();
        successMsg = "更新模板成功";
      }
    } catch (err) {
      // 如果执行报错，抛出错误
      throw err;
    } finally {
      // 只要完成就停止加载动画
      spinner.stop(true);
      // 完成后下载文件存在且有成功信息
      if ((await npmPackage.exists()) && successMsg) {
        // 输出成功信息
        log.success(successMsg);
        // 将包信息存入this
        this.npmPackage = npmPackage;
      }
    }
  }

  // 使用ejs渲染模板
  async ejsRender(options = {}) {
    const cwd = process.cwd();
    const projectInfo = this.projectInfo;

    try {
      // 获取匹配的文件
      const files = await glob("**", {
        cwd,
        ignore: options.ignore || "node_modules/**", // 忽略内容
        nodir: true, // 不要文件夹
        dot: true, // 包含隐藏文件
      });

      if (!files || files.length === 0) {
        throw new Error("glob没有匹配到文件");
      }

      // 遍历文件并渲染 EJS 模板
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(cwd, file);
          try {
            const result = await ejs.renderFile(filePath, projectInfo, {});
            // 写入渲染后的结果
            fse.writeFileSync(filePath, result);
          } catch (err) {
            throw new Error(`EJS 渲染文件 ${filePath} 出错: ${err.message}`);
          }
        })
      );
    } catch (err) {
      // 捕获并处理所有错误
      log.error("ejsRender 执行出错：", err.message);
      throw err; // 抛出错误，以便外部调用处理
    }
  }

  // 检查命令是否在白名单
  checkCommandInWhitelist(command) {
    if (!COMMAND_WHITELIST.includes(command)) {
      // 如果命令不在白名单
      throw new Error(
        `命令 ${command} 不在白名单中，可能存在风险，已阻止程序运行。当前仅支持以下命令：\n${COMMAND_WHITELIST.join('|')}`
      );
    }

    return command;
  }

  /**
   * 解析并执行命令
   * @param {*} command 命令内容，如npm install、npm run dev
   * @param {*} field 接口数据中配置命令的字段名，如installCommand、startCommand
   * @param {*} logInfo 提示信息
   * @returns
   */
  async parsingCommandExec(command, field, logInfo) {
    // 命令不存在直接return
    if (!command) {
      // debug模式下输出提示
      log.verbose(`${field} 不存在，请查看数据库是否存在该配置`);
      return;
    }
    // 打印提示信息
    log.info(logInfo);
    // 解析命令并执行
    const cmds = command.split(" ");
    const cmd = this.checkCommandInWhitelist(cmds[0]);
    const args = cmds.slice(1); // 从索引1开始到数组结束的所有元素
    const result = await spawnAsync(cmd, args, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    return result;
  }

  async prepare() {
    // 请求接口，判断项目模板是否存在，没有则中断执行
    const template = await getProjectTemplate();

    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }

    // 将模板保存到class中
    this.template = template;

    const localPath = process.cwd();

    // 1. 当前目录是否为空
    if (!this.ifDirIsEmpty(localPath)) {
      let ifContinue = true;

      // 没有输入--force参数时
      if (!this.force) {
        // 1.1. 询问是否继续创建
        ifContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "ifContinue",
            default: false, // 默认不创建
            message: "当前文件夹不为空，是否继续创建项目？",
          })
        ).ifContinue;
      }

      // 1.2. 用户如果不确认继续，结束流程
      if (!ifContinue) return;

      // 2. 确认是否强制覆盖
      // 用户选择继续或者输入了--force参数
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmClean } = await inquirer.prompt({
          type: "confirm",
          name: "confirmClean",
          default: false,
          message: "是否确认清空当前目录下的所有文件？",
        });
        // 用户选择不确认，中断执行
        if (!confirmClean) return;

        // 用户选择确认，清空当前目录并继续
        fse.emptyDirSync(localPath);
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    let projectInfo = {};
    let isProjectNameValid = false;

    // 检查用户输入的项目名是否合法
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName; // 更新合法项目名称
    } else {
      log.warn("项目名称不合法，请继续流程，稍后会提示重新输入");
    }

    // 3. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择创建项目的类型：",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    // debug模式下输出
    log.verbose("创建项目的类型：", type);
    // 基于用户选择的类型对template进行拆分
    this.template = this.template.filter((item) => item.tag.includes(type));
    log.verbose(`筛选${type}模板数据：`, this.template);

    // 4. 获取项目基本信息
    const promptTitle = type === TYPE_PROJECT ? '项目' : '组件'
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      default: "",
      message: `请输入${promptTitle}名称：`,
      validate: function (v) {
        const done = this.async();

        setTimeout(() => {
          if (!isValidName(v)) {
            done(
              `请输入合法的项目名称，要求如下：\n 1. 第一个字符必须是字母 \n 2. 输入的内容不少于2个字符，不超过64个字符 \n 3. 可以用横杠和下划线作为连接符`
            );
            return;
          }

          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };

    // 定义终端询问用户交互
    const projectPrompts = [
      {
        type: "input",
        name: "projectVersion",
        default: "1.0.0",
        message: `请输入${promptTitle}版本号：`,
        validate: function (v) {
          const done = this.async();

          setTimeout(() => {
            if (!!!semver.valid(v)) {
              done(
                `请输入合法的语义化版本号，如1.0.0、v1.0.0，可查阅：https://semver.org/lang/zh-CN/`
              );
              return;
            }

            done(null, true);
          }, 0);
        },
        filter: function (v) {
          return semver.valid(v) || v;
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择所需的${promptTitle}模板：`,
        choices: this.createTemplateChoices(),
      },
    ];
    // 如果用户输入的项目名称不合法，增加项目名称输入环节prompt
    if (!isProjectNameValid) {
      projectPrompts.unshift(projectNamePrompt);
    }

    // 分发策略
    const typeStrategies = {
      [TYPE_PROJECT]: async () => {
        // 获取用户输入结果
        const project = await inquirer.prompt(projectPrompts);

        // 更新项目信息
        projectInfo = {
          ...projectInfo,
          type,
          ...project,
        };
      },
      [TYPE_COMPONENT]: async () => {
        // 组件需要额外增加描述信息填写
        const descriptionPrompt = {
          type: "input",
          name: "componentDescription",
          default: "",
          message: "请输入组件描述：",
          validate: function (v) {
            const done = this.async();

            setTimeout(() => {
              if (!v) {
                done(`请输入组件描述信息`);
                return;
              }

              done(null, true);
            }, 0);
          },
        };

        projectPrompts.push(descriptionPrompt);

        // 获取用户输入结果
        const component = await inquirer.prompt(projectPrompts);

        // 更新项目信息
        projectInfo = {
          ...projectInfo,
          type,
          ...component,
        };
      },
    };

    if (!typeStrategies[type]) {
      log.error("未找到创建项目的类型");
      return;
    }

    // 分发执行策略
    await typeStrategies[type]();

    // 处理用户输入的项目名称，通过ejs动态渲染模板内容
    const { projectName } = projectInfo;
    if (projectName) {
      // kebabCase方法返回在开头多一个-，需要去除
      projectInfo.projectName = kebabCase(projectName).replace(/^-/, "");
      log.verbose(
        "项目名称kebab-case",
        `输入：${projectName} 输出：${projectInfo.projectName}`
      );
    }

    // 返回项目基本信息
    return projectInfo;
  }

  createTemplateChoices() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  ifDirIsEmpty(localPath) {
    let files = fs.readdirSync(localPath);

    // 过滤掉隐藏文件和node_modules
    files = files.filter(
      (file) => !file.startsWith(".") && !["node_modules"].includes(file)
    );

    // 如果没有文件，返回true，表示目录为空
    return files && files.length === 0;
  }
}

function isValidName(v) {
  // 正则表达式说明：
  // [a-zA-Z] - 第一个字符必须是字母
  // [a-zA-Z0-9_-]{0,62} - 后面可以跟0到62个字母、数字、下划线或短横线
  // $        - 字符串结束
  // 注意：因为我们已经要求第一个字符不能是数字或短横线，所以这里{0,62}确保总长度不超过64个字符
  const regex = /^[a-zA-Z][a-zA-Z0-9_-]{0,62}$/;

  return regex.test(v) && v.length >= 2 && v.length <= 64;
}

function init(args) {
  return new InitCommand(args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
