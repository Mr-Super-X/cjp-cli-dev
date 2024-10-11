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
  // 列出公有和私有组织：https://docs.github.com/en/rest/orgs/orgs?apiVersion=2022-11-28#list-organizations-for-the-authenticated-user
  getOrg() {
    return this.request.get(`/user/orgs`, {
      page: 1,
      per_page: 100, // 最大值100，不方便翻页，尽可能多的加载数据
    });
  }

  // 获取远端仓库
  // https://docs.github.com/zh/rest/repos
  // https://docs.github.com/zh/rest/repos/repos?apiVersion=2022-11-28#get-a-repository
  getRepo(login, name) {
    return this.request.get(`/repos/${login}/${name}`).then((res) => {
      return this.handleResponse(res);
    });
  }

  // 创建个人用户仓库
  // https://docs.github.com/zh/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-for-the-authenticated-user
  createRepo(name) {
    return this.request.post("/user/repos", {
      name,
    });
  }

  // 创建组织仓库
  // https://docs.github.com/zh/rest/repos/repos?apiVersion=2022-11-28#create-an-organization-repository
  createOrgRepo(name, login) {
    return this.request.post(`/orgs/${login}/repos`, {
      name,
    });
  }

  // 获取远程地址
  getRemote(login, name) {
    // https方式默认使用443端口，下面一种方式使用ssh连接默认22端口（可能需要添加id_rsa.pub）
    // 22端口特别容易出现GitError ssh: connect to host github.com port 22: Connection refused错误
    // 因此替换成https协议来尝试解决问题
    return `https://github.com/${login}/${name}.git`;
    // return `git@github.com:${login}/${name}.git`;
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
