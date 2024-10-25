'use strict';

const husky = require('..');
const assert = require('assert').strict;

assert.strictEqual(husky(), 'Hello from husky');
console.info('husky tests passed');
