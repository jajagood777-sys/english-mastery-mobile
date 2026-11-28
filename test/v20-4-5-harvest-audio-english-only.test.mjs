import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../core.mjs';

test('v20.4.6 bumps APP_VERSION and sw.js CACHE', () => {
  assert.equal(APP_VERSION, '20.4.6');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /english-cultivation-static-v20\.4\.6/);
});

test('v20.4.6 Word Harvest 2.0 uses synchronous iOS-safe speakHarvestWordAndSentence and hides Chinese gloss', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function speakHarvestWordAndSentence\(word, sentence = ''\)/);
  assert.match(app, /speakHarvestWordAndSentence\(card\.word, card\.originalSentence\)/);
  assert.doesNotMatch(app, /中文意思：/);
  assert.match(app, /English: \$\{sg\.en\}/);
});
