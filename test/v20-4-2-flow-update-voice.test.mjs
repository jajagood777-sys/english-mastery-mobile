import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../core.mjs';

test('v20.4.6 bumps APP_VERSION and sw.js CACHE + SKIP_WAITING listener', () => {
  assert.equal(APP_VERSION, '20.4.6');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /english-cultivation-static-v20\.4\.6/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /\.\/release-safety\.mjs/);
});

test('v20.4.6 integrates complexLab into One-Flow Journey right after speech', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /speech:'演讲跟读',complexLab:'复杂句仿说',transfer:'综合输出'/);
  assert.match(app, /if\(journeySpeeches\(\)\.length\)\{stages\.push\('speech'\);stages\.push\('complexLab'\);\}/);
  assert.match(app, /function completeComplexLabJourneyStage/);
  assert.match(app, /renderJourneyFlowRibbon\('complexLab'\)/);
});

test('v20.4.6 wires One-Tap PWA Update Banner for waiting SW without deadlock', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(!pwaUpdateReady && !swWaitingWorker\) return el\('span', ''\);/);
  assert.match(app, /function applyPendingPwaUpdate\(\)/);
  assert.match(app, /postMessage\(\{ type: 'SKIP_WAITING' \}\)/);
});

test('v20.4.6 speech-clips.mjs accepts California & dual-speaker Kokoro voices while rejecting invalid strings', () => {
  const sc = readFileSync(new URL('../speech-clips.mjs', import.meta.url), 'utf8');
  const m = sc.match(/\/\^\[A-Za-z0-9\._\+-\]\{2,64\}\$\//);
  assert.ok(m, 'Expected safe voice regex in speech-clips.mjs');
  const re = /^[A-Za-z0-9._+-]{2,64}$/;
  for (const okVoice of ['af_heart', 'af_bella', 'af_cali_energetic', 'af_sky', 'am_puck', 'am_puck+af_cali_energetic']) {
    assert.equal(re.test(okVoice), true, `Should accept ${okVoice}`);
  }
  for (const badVoice of ['', 'a', 'af heart', '../evil', 'voice;rm -rf']) {
    assert.equal(re.test(badVoice), false, `Should reject ${badVoice}`);
  }
});
