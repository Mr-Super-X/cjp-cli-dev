'use strict';

// 自建库
const Package = require('@cjp-cli-dev/package')
const log = require('@cjp-cli-dev/log')

// 全局变量
// 配置表
const SETTINGS = {
  init: '@cjp-cli-dev/init',
}

function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  // 在debug模式输出
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  const cmdObj = arguments[arguments.length - 1]
  // 获取命令名称
  const cmdName = cmdObj.name()
  // 获取命令参数
  const cmdOpts = cmdObj.opts()
  // 获取命令对应的包名（可以放在服务端通过接口获取，这样可以扩展动态配置）
  const packageName = SETTINGS[cmdName]
  // 获取版本号，默认获取最新版本
  const packageVersion = 'latest'

  if(!targetPath) {
    // 生成缓存路径
    targetPath = ''
  }

  const pkg = new Package({
    targetPath,
    packageName,
    packageVersion
  })
  console.log(pkg.getRootFilePath())
}

module.exports = exec;