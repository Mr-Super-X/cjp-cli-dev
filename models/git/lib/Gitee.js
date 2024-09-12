const GitServer = require("./GitServer");

class Gitee extends GitServer {
  constructor() {
    // 调用父类构造函数 super
    super('gitee')
  }
}

module.exports = Gitee;
