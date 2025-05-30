"use strict";

// 第三方库
const imageToBase64 = require("image-to-base64");
const puppeteer = require("puppeteer-core"); // 用于导出pdf
const marked = require("marked"); // 用于解析markdown
// 内置库
const path = require("path");
const os = require("os");
const fs = require("fs");
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");
const {
  prompt,
  isBoolean,
  fse,
  glob,
  ejs,
  EJS_DEFAULT_IGNORE,
  CLI_NAME,
  DEFAULT_CLI_HOME,
} = require("@cjp-cli-dev/utils");
const genHtmlContent = require("./htmlTemplate.js");

const COMMAND_NAME = "resume"; // 命令名称
const CWD = process.cwd(); // 当前进程执行所在目录
const USER_HOME = os.homedir(); // 用户主目录
const CHROME_INSTALL_PATH = "chrome_install_path"; // chrome安装路径

// 支持的证件照格式
const imageExtensions = [".jpg", ".jpeg", ".png"];

/**
 * 实现下载markdown简历模板，支持导出pdf文件
 * --install
 * 1. 输入姓名、手机号、邮箱、职位、年龄、工龄、求职地点等基础信息
 * 2. 询问是否需要证件照，提示将证件照拷贝到当前目录，支持jpg/png
 * 2.1. 列出当前目录中的图片文件供用户选择
 * 2.2. 将选择的证件照转为base64
 * 3. 生成markdown简历模板到当前目录，并通过ejs渲染
 * 3.1. 提示用户可通过脚手架命令导出pdf
 * 3.2. 返回markdown基础语法文档查阅地址
 *
 * --export
 * 1. 获取当前目录中的md文件并列出选项
 * 2. 首次使用导出提示用户依赖chrome浏览器，需提供chrome安装路径
 * 2.1. 将用户输入的chrome安装路径写入脚手架缓存
 * 3. 读取用户选择导出的md文件，通过marked转为html格式
 * 4. 调用puppeteer驱动chrome浏览器导出html为pdf
 */
class ResumeCommand extends Command {
  init() {
    // 获取命令参数
    this.options = this._args[0] || {};
    this.commandOptions = this._args[1].options || [];
    this.name = null; // 姓名
    this.phone = null; // 手机号
    this.email = null; // 邮箱
    this.position = null; // 职位
    this.age = null; // 年龄
    this.seniority = null; // 工龄
    this.location = null; // 求职地点
    this.photo = null; // 证件照
    this.resumeFilename = null; // 简历文件名称
    // debug模式下输出以下变量
    log.verbose("options", this.options);
    log.verbose("commandOptions", this.commandOptions);
  }

  async exec() {
    try {
      // 准备工作
      // await this.prepare();

      // 命令选项策略
      const optionStrategy = {
        // --install
        install: async () => {
          // 下载简历模板
          await this.installTemplate();
        },
        // --export
        export: async () => {
          // 导出pdf简历
          await this.exportPDF();
        },
        // --resetChromePath
        resetChromePath: async () => {
          // 重置chrome路径
          await this.resetChromePath();
        },
      };

      // 遍历options，找到为true且在命令选项策略中的方法进行调用
      Object.keys(this.options).forEach(async (key) => {
        if (this.options[key] && optionStrategy[key]) {
          await optionStrategy[key]();
        }
      });
    } catch (err) {
      log.error(err.message);

      // debug模式下打印执行栈，便于调试
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(err);
      }
    }
  }

  async resetChromePath() {
    log.info("开始重置chrome缓存安装路径");
    // 获取chrome路径
    const chromeInstallPath = await this.getChromeInstallPath();
    // 创建缓存文件
    await this.createChromePathCache(chromeInstallPath);
    log.success("chrome缓存安装路径重置成功");
  }

  // 导出pdf
  async exportPDF() {
    log.info("开始将markdown简历导出为PDF格式");
    // 读取 Markdown 文件
    const mdFiles = await this.getMdFiles();
    if (mdFiles && mdFiles.length > 0) {
      // 用户选择markdown
      const selectMarkdown = await this.getSelectMd(mdFiles);
      // 更新选中的简历名称
      this.resumeFilename = path.basename(
        selectMarkdown,
        path.extname(selectMarkdown)
      );
      // 读取markdown内容
      let markdownContent = fs.readFileSync(selectMarkdown, "utf-8");
      log.verbose("markdownContent证件照转Base64前", markdownContent);

      // 正则表达式，用于匹配 id 为 "photo" 的 img 标签的 src 属性
      const regex = /<img\s+[^>]*id="photo"[^>]*src="([^"]*)"[^>]*>/;
      // 提取匹配到的 src 属性值，并转换为Base64（异步操作）
      async function replaceImageSrcWithBase64(content, regex, cwd) {
        // 查找匹配项
        const match = content.match(regex);
        if (!match) {
          return content; // 没有匹配项，直接返回原始内容
        }

        // 提取原始src属性值
        const originalSrc = match[1];
        // 读取图片路径
        const imgPath = path.resolve(cwd, originalSrc);
        // 获取图片后缀，去除点
        const imgExt = path.extname(imgPath).slice(1);

        // 将图片路径转换为Base64
        const base64 = await imageToBase64(imgPath);

        // 替换匹配到的 src 属性值
        const newContent = content.replace(regex, (m, p1) => {
          // 注意：这里不需要再次使用await，因为base64已经是处理后的结果了
          return m.replace(p1, `data:image/${imgExt};base64,${base64}`); // 根据实际图片类型调整MIME类型
        });

        return newContent;
      }
      // 将证件照Base64处理后的文本内容交给marked渲染
      markdownContent = await replaceImageSrcWithBase64(markdownContent, regex, process.cwd());
      log.verbose("markdownContent证件照转Base64后", markdownContent);
      // 生成html内容
      const htmlContent = genHtmlContent(marked, markdownContent);
      log.verbose("htmlContent", htmlContent);

      // 查看缓存是否存在
      const cachePath = path.resolve(
        USER_HOME,
        DEFAULT_CLI_HOME,
        CHROME_INSTALL_PATH
      );
      let chromeInstallPath;
      if (fs.existsSync(cachePath)) {
        chromeInstallPath = fs.readFileSync(cachePath, "utf-8");
      } else {
        log.notice(
          "导出功能依赖chrome浏览器，首次使用请先指定chrome浏览器安装路径"
        );
        log.notice(
          "路径必须使用引号包裹，如:",
          '"C:/Program Files/Google/Chrome/Application/chrome.exe"'
        );
        await this.checkPlatform(); // 检查平台，生成提示
        // 获取chrome路径
        chromeInstallPath = await this.getChromeInstallPath();
        // 创建缓存文件
        await this.createChromePathCache(chromeInstallPath);
      }

      // 如果路径包含引号，去除它们
      const cleanedPath = chromeInstallPath.replace(/^"|"$/g, "");
      log.verbose("去除引号后的路径", cleanedPath);
      // 将反斜杠替换为正斜杠
      const correctedPath = cleanedPath.replace(/\\/g, "/");
      log.verbose("修正后的路径", correctedPath);
      // 启动chrome浏览器，导出pdf
      await this.startPuppeteer(htmlContent, correctedPath);
      log.success(`导出完成，已将简历 ${this.resumeFilename} 导出为PDF格式`);
    } else {
      log.error("当前目录中没有可供导出的markdown简历模板");
      process.exit(1);
    }
  }

  // 检查平台，生成不同提示
  async checkPlatform() {
    const platform = os.platform();
    // 平台策略
    const strategy = {
      // window系统
      win32: () => {
        log.notice(
          "可通过以下方式查找chrome安装路径：\n\n1. 启动chrome浏览器，在地址栏输入 chrome://version/ 复制【可执行文件路径】 \n2. 在桌面或系统搜索中找到chrome应用图标，鼠标右键打开文件所在位置，复制并输入包含chrome.exe在内的完整路径\n"
        );
      },
      // macOS系统
      darwin: () => {
        log.notice(
          "可通过以下方式查找chrome安装路径：\n\n1. 启动chrome浏览器，在地址栏输入 chrome://version/ 复制【可执行文件路径】 \n2. 使用命令如：find /Applications -name 'Google Chrome.app' -type d 进行查找\n"
        );
        process.exit(0);
      },
    };

    if (strategy[platform]) {
      strategy[platform]();
    } else {
      log.error("暂不支持当前操作系统");
      process.exit(0);
    }
  }

  // 启动 Puppeteer 浏览器实例
  async startPuppeteer(htmlContent, chromeInstallPath) {
    // 启动 Puppeteer 浏览器实例
    const browser = await puppeteer.launch({
      executablePath: chromeInstallPath,
      args: ["--no-sandbox"],
      dumpio: false,
    });

    const page = await browser.newPage();

    // 设置页面内容（从 HTML 字符串）
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // 设置 PDF 选项
    const pdfOptions = {
      format: "A4", // 设置页面格式为A4
      printBackground: true, // 是否打印背景图（可对头像生效）
      preferCSSPageSize: true, // 给页面优先级声明的任何CSS @page 大小超过 width 和 height 或 format 选项中声明的大小
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    };

    // 生成 PDF 并保存到文件
    const pdfFilePath = path.resolve(CWD, `${this.resumeFilename}.pdf`); // 输出 PDF 文件路径
    await page.pdf({
      path: pdfFilePath,
      ...pdfOptions,
    });

    log.success("导出PDF成功", `=> ${pdfFilePath}`);

    // 关闭浏览器实例
    await browser.close();
  }

  // 缓存用户输入的chrome安装路径
  async createChromePathCache(data) {
    // 在用户主目录下生成缓存文件
    const rootDir = path.resolve(USER_HOME, DEFAULT_CLI_HOME);
    const filePath = path.resolve(rootDir, CHROME_INSTALL_PATH);

    // 写入缓存
    fs.writeFileSync(filePath, data);
  }

  // 获取chrome浏览器安装路径
  async getChromeInstallPath() {
    const { chromeInstallPath } = await prompt({
      type: "input",
      name: "chromeInstallPath",
      message: "请输入chrome浏览器完整安装路径：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("路径不能为空");
          return;
        }
        done(null, true);
      },
    });

    this.chromeInstallPath = chromeInstallPath;
    return chromeInstallPath;
  }

  async getMdFiles() {
    const targetPath = CWD;
    const files = fs.readdirSync(targetPath);
    const mdFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".md"].includes(ext);
    });

    this.mdFiles = mdFiles;
    log.verbose("mdFiles", mdFiles);
    return mdFiles;
  }

  async getSelectMd(mdFiles) {
    const { selectMd } = await prompt({
      type: "list",
      name: "selectMd",
      message: "请选择您要导出为PDF的简历模板",
      choices: mdFiles.map((item) => ({
        name: item,
        value: path.resolve(CWD, item),
      })),
    });

    this.selectMd = selectMd;
    return selectMd;
  }

  // 安装模板
  async installTemplate() {
    log.info("开始创建markdown简历模板");
    await this.getName();
    await this.getPhone();
    await this.getEmail();
    await this.getPosition();
    await this.getAge();
    await this.getSeniority();
    await this.getLocation();
    const needPhoto = await this.getNeedPhoto();
    if (needPhoto) {
      const imageFiles = await this.getPhotoImages();

      // 如果在当前路径中找到证件照了，则让用户选择
      if (imageFiles && imageFiles.length > 0) {
        await this.getPhoto(imageFiles);
      } else {
        log.error(
          `请先将证件照存放到项目根路径中，支持 ${imageExtensions.join(
            "/"
          )} 格式`
        );
        process.exit(1);
      }
    } else {
      // 用户未选择证件照时设置默认提示，防止ejs渲染报错
      this.photo = "如您需要证件照，请手动将完整照片路径粘贴到此处";
    }

    const resumeFilename = `${this.position}-${this.name}-${this.seniority}年经验-${this.location}-简历`;
    this.resumeFilename = resumeFilename;
    log.verbose("resumeFilename", resumeFilename);

    // 获取简历模板
    const templateFile = path.resolve(__dirname, "template", "resume.md");
    const targetFile = path.resolve(CWD, `${resumeFilename}.md`);
    if (!fs.existsSync(targetFile)) {
      // 拷贝模板文件到当前项目中
      fse.copyFileSync(templateFile, targetFile);
      // 使用ejs渲染目标路径中的文件
      await this.ejsRender({ targetPath: CWD, ignore: EJS_DEFAULT_IGNORE });
      log.success("markdown简历模板已创建", `=> ${resumeFilename}.md`);
      log.success(
        "模板内容仅供参考，请根据自己的情况调整简历内容，可通过脚手架命令导出PDF文件"
      );
      log.success(
        `markdown语法基本要素查阅参考文档：\n\nhttps://shd101wyy.github.io/markdown-preview-enhanced/#/zh-cn/markdown-basics\nhttps://docs.github.com/zh/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax`
      );
    } else {
      log.warn(`当前项目中已存在简历模板 ${resumeFilename}.md`);
    }
  }

  // 使用ejs渲染模板
  async ejsRender(options = {}) {
    const { targetPath, ignore } = options;

    try {
      // 获取匹配的文件
      const files = await glob("**", {
        cwd: targetPath,
        ignore: ignore || "**/node_modules/**", // 忽略内容
        nodir: true, // 不要文件夹
        dot: true, // 包含隐藏文件
      });

      if (!files || files.length === 0) {
        throw new Error("glob没有匹配到文件");
      }

      // 遍历文件并渲染 EJS 模板
      await Promise.all(
        files.map(async (file) => {
          // 获取文件真实路径
          const filePath = path.join(targetPath, file);
          try {
            // 第二个参数是ejs渲染所需要的变量，如 <%= name %>
            const result = await ejs.renderFile(
              filePath,
              {
                name: this.name,
                phone: this.phone,
                email: this.email,
                age: this.age,
                position: this.position,
                seniority: this.seniority,
                location: this.location,
                photo: this.photo,
              },
              {}
            );
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

  async getName() {
    // 获取姓名
    const { name } = await prompt({
      type: "input",
      name: "name",
      message: "请输入您的姓名：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("姓名不能为空");
          return;
        }
        done(null, true);
      },
    });

    this.name = name;
  }

  // 获取手机
  async getPhone() {
    // 获取手机
    const { phone } = await prompt({
      type: "input",
      name: "phone",
      message: "请输入您的手机号：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("手机号不能为空");
          return;
        }
        if (!/^(?:(?:\+|00)86)?1[3-9]\d{9}$/.test(value)) {
          done("手机号格式不正确");
          return;
        }
        done(null, true);
      },
    });

    this.phone = phone;
  }

  // 获取邮箱
  async getEmail() {
    // 获取邮箱
    const { email } = await prompt({
      type: "input",
      name: "email",
      message: "请输入您的邮箱：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("邮箱不能为空");
          return;
        }
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
          done("邮箱格式不正确");
          return;
        }
        done(null, true);
      },
    });

    this.email = email;
  }

  // 获取年龄
  async getAge() {
    // 获取年龄
    const { age } = await prompt({
      type: "input",
      name: "age",
      message: "请输入您的年龄：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("年龄不能为空");
          return;
        }
        if (!(value >= 0 && Math.floor(value) === Number(value))) {
          done("年龄必须为正整数");
          return;
        }
        done(null, true);
      },
    });

    this.age = age;
  }

  // 获取职位
  async getPosition() {
    // 获取职位
    const { position } = await prompt({
      type: "input",
      name: "position",
      message: "请输入您的求职岗位：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("职位不能为空");
          return;
        }
        done(null, true);
      },
    });

    this.position = position;
  }

  // 获取工龄
  async getSeniority() {
    // 获取工龄
    const { seniority } = await prompt({
      type: "input",
      name: "seniority",
      message: "请输入您的工作年限：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("工作年限不能为空");
          return;
        }
        if (!(value >= 0 && Math.floor(value) === Number(value))) {
          done("工作年限必须为正整数");
          return;
        }
        done(null, true);
      },
    });

    this.seniority = parseInt(seniority);
  }

  // 获取求职地点
  async getLocation() {
    // 获取求职地点
    const { location } = await prompt({
      type: "input",
      name: "location",
      message: "请输入您的求职地点：",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("求职地点不能为空");
          return;
        }
        done(null, true);
      },
    });

    this.location = location;
  }

  async getNeedPhoto() {
    log.info(
      `如需要导入证件照，请将证件照存放至当前项目根路径中，支持 ${imageExtensions.join(
        "/"
      )} 格式`
    );
    const { needPhoto } = await prompt({
      type: "list",
      name: "needPhoto",
      message: "需要导入证件照吗？",
      default: true,
      choices: [
        { name: "需要（请将证件照存放至当前项目根路径中）", value: true },
        { name: "不需要", value: false },
      ],
    });

    return needPhoto;
  }

  async createImgChoices(imgFiles) {
    imgFiles = imgFiles || []; // 参数适配
    return imgFiles.map((item) => ({
      name: item,
      value: path.resolve(CWD, item),
    }));
  }

  // 获取可用照片
  async getPhotoImages() {
    const targetPath = CWD;
    const files = fs.readdirSync(targetPath);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    this.imageFiles = imageFiles;
    log.verbose("imageFiles", imageFiles);
    return imageFiles;
  }

  async getPhoto(imgFiles) {
    const { photo } = await prompt({
      type: "list",
      name: "photo",
      message: "请选择您的证件照：",
      choices: await this.createImgChoices(imgFiles),
    });

    this.photo = photo;
  }

  async prepare() {
    // 检查必传参数
    await this.checkRequiredKeys();
  }
  // 检查必传参数
  async checkRequiredKeys() {
    const requireKeys = ["install", "export", "resetChromePath"];

    // 检查是否没传参数
    function checkKeys(keys, obj) {
      let result = false;

      keys.forEach((key) => {
        if (isBoolean(obj[key]) && obj[key] === true) {
          result = true;
        }
      });

      return result;
    }

    // 找出所需要的参数
    const commandOptions = this.commandOptions.map((item) => ({
      flag: item.flags,
      description: item.description,
      defaultValue: item.defaultValue,
    }));

    if (!checkKeys(requireKeys, this.options)) {
      log.warn(
        `请指定参数，支持以下参数：\n\n${commandOptions
          .map(
            (option) =>
              `['${option.flag}'：${option.description}，默认值：${option.defaultValue}]`
          )
          .join(
            "\n"
          )}\n\n您可以输入 ${CLI_NAME} ${COMMAND_NAME} -h 查看使用帮助`
      );
      process.exit(1);
    }
  }
}

function init(args) {
  return new ResumeCommand(args);
}

module.exports = init;
module.exports.ResumeCommand = ResumeCommand;
