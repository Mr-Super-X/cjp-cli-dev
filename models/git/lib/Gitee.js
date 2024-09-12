const GitServer = require("./GitServer");

class Gitee extends GitServer {
  constructor() {
    // 调用父类构造函数 super
    super("gitee");
  }

  // 获取 SSH key URL
  getSSHKeysHelpUrl() {
    return "https://gitee.com/profile/sshkeys";
  }

  // 返回生成token帮助文档链接
  getTokenHelpUrl() {
    return "https://gitee.com/help/articles/4191"
  }
}

module.exports = Gitee;
