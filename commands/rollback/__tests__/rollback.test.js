'use strict';

const rollback = require('..');
const assert = require('assert').strict;

assert.strictEqual(rollback(), 'Hello from rollback');
console.info('rollback tests passed');
