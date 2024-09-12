// 第三方库
const axios = require("axios"); // 用于发起http请求

const BASE_URL = "https://gitee.com/api/v5";

// 帮助文档：https://gitee.com/api/v5/swagger/
class GiteeRequest {
  constructor(token) {
    this.token = token;
    this.service = axios.create({
      baseURL: BASE_URL,
      timeout: 5000,
    });

    // 响应拦截
    this.service.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        if (error.response && error.response.data) {
          return error.response;
        } else {
          return Promise.reject(error);
        }
      }
    );
  }

  get(url, params, headers) {
    return this.service({
      url,
      params: {
        ...params,
        access_token: this.token,
      },
      headers,
      method: 'get'
    })
  }
}

module.exports = GiteeRequest;
