const GitServer = require("./GitServer");
const GiteeRequest = require("./GiteeRequest");

// 帮助文档：https://gitee.com/api/v5/swagger/
class Gitee extends GitServer {
  constructor() {
    // 调用父类构造函数 super
    super("gitee");
    this.request = null; // 私有属性，Git 服务器的 HTTP 请求类
  }

  setToken(token) {
    super.setToken(token);
    this.request = new GiteeRequest(token);
  }

  // https://gitee.com/api/v5/swagger/#/getV5User
  getUser() {
    return this.request.get("/user");
  }

  // https://gitee.com/api/v5/swagger/#/getV5UsersUsernameOrgs
  getOrg(username) {
    return this.request.get(`/users/${username}/orgs`, {
      page: 1,
      per_page: 100, // 最大值100，不方便翻页，尽可能多的加载数据
    });
  }

  // 返回生成Token的url
  getTokenUrl() {
    return "https://gitee.com/personal_access_tokens"
  }

  // 返回生成token帮助文档链接
  getTokenHelpUrl() {
    return "https://gitee.com/help/articles/4191";
  }
}

module.exports = Gitee;
