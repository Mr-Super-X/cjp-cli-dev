'use strict';

const deleteBranch = require('..');
const assert = require('assert').strict;

assert.strictEqual(deleteBranch(), 'Hello from deleteBranch');
console.info('deleteBranch tests passed');
