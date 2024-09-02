"use strict";

// 自建库
const Command = require("@cjp-cli-dev/command");
const log = require("@cjp-cli-dev/log");

class InitCommand extends Command {
  init() {
    this.projectName = this._args[0] || ''
    this.force = this._args[1].force || false
    // debug模式下输出以下变量
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  exec() {

  }
}

function init(args) {
  return new InitCommand(args)
}

module.exports = init;
module.exports.InitCommand = InitCommand;
