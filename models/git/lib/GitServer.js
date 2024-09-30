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
    error("子类必须实现 getRepo 方法，用于获取git仓库");
  }

  // 创建普通仓库
  createRepo(name) {
    error("子类必须实现 createRepo 方法，用于创建git个人仓库");
  }

  // 创建组织仓库
  createOrgRepo(name, login) {
    error("子类必须实现 createOrgRepo 方法，用于创建git组织仓库");
  }

  // 获取远程地址
  getRemote() {
    error("子类必须实现 getRemote 方法，用于获取git远程地址");
  }

  // 获取用户信息
  getUser() {
    error("子类必须实现 getUser 方法，用于获取git用户信息");
  }

  // 获取组织信息
  getOrg() {
    error("子类必须实现 getOrg 方法，用于获取git组织信息");
  }

  // 返回获取Token的url
  getTokenUrl() {
    error("子类必须实现 getTokenUrl 方法，用于返回获取token的链接");
  }

  // 返回生成token帮助文档链接
  getTokenHelpUrl() {
    error("子类必须实现 getTokenHelpUrl 方法，用于返回生成token帮助文档链接");
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
