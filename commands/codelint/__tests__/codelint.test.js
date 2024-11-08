'use strict';

const codelint = require('..');
const assert = require('assert').strict;

assert.strictEqual(codelint(), 'Hello from codelint');
console.info('codelint tests passed');
