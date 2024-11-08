'use strict';

const release = require('..');
const assert = require('assert').strict;

assert.strictEqual(release(), 'Hello from release');
console.info('release tests passed');
