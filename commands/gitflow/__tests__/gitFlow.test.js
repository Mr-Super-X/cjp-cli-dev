'use strict';

const gitflow = require('..');
const assert = require('assert').strict;

assert.strictEqual(gitflow(), 'Hello from gitflow');
console.info('gitflow tests passed');
