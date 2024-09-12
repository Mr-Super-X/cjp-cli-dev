function error(methodName) {
  throw new Error(`${methodName} 方法必须实现！`);
}

// 基类定义规范，子类实现方法
class GitServer {
  constructor(type, token) {
    this.type = type;
    this.token = token;
  }

  // 设置必要方法必须实现
  setToken() {
    error("setToken");
  }

  // 创建普通仓库
  createRepo() {
    error("createRepo");
  }

  // 创建组织仓库
  createOrgRepo() {
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
}

module.exports = GitServer;
