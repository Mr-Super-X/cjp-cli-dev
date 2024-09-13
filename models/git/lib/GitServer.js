function error(methodName) {
  throw new Error(`${methodName} 方法必须实现！`);
}

// 设置必要方法必须实现
// 基类定义规范，子类实现方法
class GitServer {
  constructor(type, token) {
    this.type = type;
    this.token = token;
  }

  setToken(token) {
    this.token = token;
  }

  // 获取远端仓库
  getRepo(login, name) {
    error("getRepo");
  }

  // 创建普通仓库
  createRepo(name) {
    error("createRepo");
  }

  // 创建组织仓库
  createOrgRepo(name, login) {
    error("createOrgRepo");
  }

  // 获取远程地址
  getRemote() {
    error("getRemote");
  }

  // 获取用户信息
  getUser() {
    error("getUser");
  }

  // 获取组织信息
  getOrg() {
    error("getOrg");
  }

  // 返回生成Token的url
  getTokenUrl() {
    error("getSSHKeysHelpUrl");
  }

  // 返回生成token帮助文档链接
  getTokenHelpUrl() {
    error("getTokenHelpUrl");
  }

  // 判断是否http返回
  isHttpResponse(response) {
    if(response && response.status && response.headers && response.config && response.request) {
      return true;
    }
    return false;
  }

  // 处理正确返回状态
  handleResponse(response) {
    if (this.isHttpResponse(response) && response.status !== 200) {
      return null;
    } else {
      return response;
    }
  }
}

module.exports = GitServer;
