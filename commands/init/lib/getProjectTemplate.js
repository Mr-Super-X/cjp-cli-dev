// 自建库
const request = require('@cjp-cli-dev/request')

module.exports = function () {
  return request({
    url: '/project/template'
  }).then(res => {
    return res.data;
  })
}