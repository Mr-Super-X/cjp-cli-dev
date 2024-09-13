// 第三方库
const axios = require("axios"); // 用于发起http请求

const BASE_URL = "https://api.github.com";

// 帮助文档：https://docs.github.com/zh/rest
class GithubRequest {
  constructor(token) {
    this.token = token;
    this.service = axios.create({
      baseURL: BASE_URL,
      timeout: 5000,
    });

    // https://docs.github.com/zh/rest/authentication/authenticating-to-the-rest-api
    // 请求拦截
    this.service.interceptors.request.use(
      (config) => {
        config.headers["Authorization"] = "token " + this.token;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

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
      params,
      headers,
      method: "get",
    });
  }

  post(url, data, headers) {
    return this.service({
      url,
      data,
      headers,
      method: 'post'
    })
  }
}

module.exports = GithubRequest;
