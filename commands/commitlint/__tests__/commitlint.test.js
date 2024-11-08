'use strict';

const commitlint = require('..');
const assert = require('assert').strict;

assert.strictEqual(commitlint(), 'Hello from commitlint');
console.info('commitlint tests passed');
