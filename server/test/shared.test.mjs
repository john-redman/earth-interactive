// The Worker and the browser must use the very same name rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as server from '../src/profanity.js';
import * as browser from '../../js/net/profanity.js';

test('server/src/profanity.js re-exports js/net/profanity.js', () => {
  assert.deepEqual(Object.keys(server).sort(), Object.keys(browser).sort());
  for (const k of Object.keys(browser)) assert.equal(server[k], browser[k], k);
});
