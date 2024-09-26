// 自建库
const request = require('@cjp-cli-dev/request')

module.exports = {
  getPageTemplate() {
    return request({
      url: '/page/template'
    }).then(res => {
      return res.data;
    })
  },
  getSectionTemplate() {
    return request({
      url: '/section/template'
    }).then(res => {
      return res.data;
    })
  }
}