'use strict';

const resume = require('..');
const assert = require('assert').strict;

assert.strictEqual(resume(), 'Hello from resume');
console.info('resume tests passed');
