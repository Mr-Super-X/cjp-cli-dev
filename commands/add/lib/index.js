"use strict";

// 第三方库
const inquirer = require("inquirer"); // 用于终端交互
// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");

// 页面模板
const PAGE_TEMPLATE = [
  {
    name: "vue3首页模板",
    npmName: "cjp-cli-dev-template-vue3-template-page", // 需要先将这个包发到npm上
    version: "1.0.0",
    targetPath: "src/views/home", // 要拷贝的文件目录
  },
];

class AddCommand extends Command {
  init() {
    // 获取add命令后面的参数
  }

  async exec() {
    // 1.获取页面安装文件夹路径
    const dir = process.cwd();
    // 2.选择页面模板
    const pageTemplate = await this.getPageTemplate();
    // 3.安装页面模板

    // 3.1.下载页面模板至缓存目录
    // 3.2.将页面模板拷贝至指定目录
    // 4.合并页面模板依赖
    // 5.安装完成
  }

  async getPageTemplate() {
    const { pageTemplateName } = await inquirer.prompt({
      type: "list",
      name: "pageTemplateName",
      message: "请选择要添加的页面模板：",
      default: "",
      choices: this.createChoices(),
    });
    // 2.1.输入页面名称
    const pageTemplate = PAGE_TEMPLATE.find(
      (item) => item.npmName === pageTemplateName
    );
    if (!pageTemplate) {
      throw new Error("页面模板不存在！");
    }
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: "请输入页面名称：",
      default: "",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("请输入页面名称");
          return;
        }
        done(null, true);
      },
    });
    // 对文件名进行trim处理
    pageTemplate.pageName = pageName.trim();

    return pageTemplate;
  }

  // 创建选项
  createChoices() {
    return PAGE_TEMPLATE.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }
}

function init(args) {
  return new AddCommand(args);
}

module.exports = init;
module.exports.AddCommand = AddCommand;
