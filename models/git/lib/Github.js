const GitServer = require("./GitServer");

class Github extends GitServer {
  constructor() {
    // 调用父类构造函数 super
    super('github')
  }
}

module.exports = Github;
