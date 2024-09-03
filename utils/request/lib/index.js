"use strict";

// 第三方库
const axios = require("axios");

// 读取用户主目录下的环境变量，或者使用默认值，配置更灵活
const BASE_URL =
  process.env.CJP_CLI_DEV_BASE_URL || "http://cjp.clidev.xyz:7001";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  (res) => {
    return res.data;
  },
  (err) => {
    return Promise.reject(err);
  }
);

module.exports = request;
