const GitServer = require("./GitServer");
const GithubRequest = require("./GithubRequest");

class Github extends GitServer {
  constructor() {
    // 调用父类构造函数 super
    super("github");
    this.request = null; // 私有属性，Git 服务器的 HTTP 请求类
  }

  setToken(token) {
    super.setToken(token);
    this.request = new GithubRequest(token);
  }

  // https://docs.github.com/zh/rest/users/users
  getUser() {
    return this.request.get("/user");
  }

  // 仅列出公有组织：https://docs.github.com/zh/rest/orgs/orgs?apiVersion=2022-11-28#list-organizations-for-a-user
  // 需要公有和私有组织可替换这个API：https://docs.github.com/en/rest/orgs/orgs?apiVersion=2022-11-28#list-organizations-for-the-authenticated-user
  getOrg(username) {
    return this.request.get(`/users/${username}/orgs`, {
      page: 1,
      per_page: 100, // 最大值100，不方便翻页，尽可能多的加载数据
    });
  }

  // 返回生成Token的url
  getTokenUrl() {
    return "https://github.com/settings/tokens";
  }

  // 返回生成token帮助文档链接
  getTokenHelpUrl() {
    return "https://docs.github.com/zh/authentication/connecting-to-github-with-ssh";
  }
}

module.exports = Github;
