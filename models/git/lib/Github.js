const GitServer = require("./GitServer");

class Github extends GitServer {
  constructor() {
    // 调用父类构造函数 super
    super("github");
  }

  // 获取 SSH key URL
  getSSHKeysHelpUrl() {
    return "https://github.com/settings/keys";
  }

  // 返回生成token帮助文档链接
  getTokenHelpUrl() {
    return "https://docs.github.com/zh/authentication/connecting-to-github-with-ssh";
  }
}

module.exports = Github;
