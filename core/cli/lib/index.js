'use strict';
const pkg = require('../package.json');
const log = require('@cjp-cli-dev/log')

module.exports = core;

function core() {
  checkPkgVersion()
}


function checkPkgVersion() {
  log.info('cli', pkg.version)
}

