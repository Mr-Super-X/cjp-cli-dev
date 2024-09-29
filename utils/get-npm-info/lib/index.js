"use strict";

// 第三方库
const axios = require("axios"); // 用于发起ajax请求
const urlJoin = require("url-join"); // 用于拼接url
// 自建库
const { semver } = require("@cjp-cli-dev/utils");

function getNpmInfo(npmName, registry) {
  if (!npmName) return;
  const registryUrl = registry || getDefaultRegistry();
  // 官方提供了这个功能，通过npm仓库地址加上包名可以获取当前包的所有信息。
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      // TODO 简单判断一下（可以优化更友好的错误处理）
      if (res.status === 200) {
        return res.data;
      }

      return null;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}

function getDefaultRegistry(isOriginal = false) {
  // 获取npm的原始仓库地址，如果是国内可以直接使用淘宝镜像
  return isOriginal
    ? "https://registry.npmjs.com"
    : "https://registry.npmmirror.com/";
}

/**
 * 获取npm包所有的版本号，如：https://registry.npmjs.com/@cjp-cli-dev/core 表示获取@cjp-cli-dev/core这个包
 * @param {*} npmName npm包名
 * @param {*} registry 仓库地址
 * @returns []version
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);

  const result = data ? Object.keys(data.versions) : [];

  return result;
}

function getSemverVersions(baseVersion, versions) {
  // 获取大于或等于baseVersion开头的版本号，比如baseVersion是1.0.0，这里会找到大于等于1.0.0的所有版本号，
  // 在版本开头符号中^表示大于或等于
  return (
    versions
      .filter((version) => semver.satisfies(version, `^${baseVersion}`))
      // 排序，从大到小，防止数据没有按预期顺序返回
      .sort((a, b) => semver.compare(b, a))
  );
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
  // 获取npm包所有版本号
  const versions = await getNpmVersions(npmName, registry);
  // 获取符合semver的版本号
  const semverVersions = getSemverVersions(baseVersion, versions);
  // 取出第一个符合semver的版本号
  if (semverVersions && semverVersions.length > 0) {
    return semverVersions[0];
  }
  return null;
}

async function getNpmLatestVersion(npmName, registry) {
  // 获取npm包所有版本号
  const versions = await getNpmVersions(npmName, registry);
  // 取出第一个符合semver的版本号
  if (versions && versions.length > 0) {
    // 排序，从大到小，防止数据没有按预期顺序返回
    return versions.sort((a, b) => semver.compare(b, a))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
