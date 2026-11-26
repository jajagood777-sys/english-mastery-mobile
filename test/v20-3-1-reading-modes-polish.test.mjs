import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v20.3.1 removes undefined speakText, compacts reading banners, fixes prosody spacing, and syncs audio sentence focus', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.equal(/\bspeakText\s*\(/.test(appSrc), false, 'no undefined speakText call remains');
  assert.match(appSrc, /function syncReadingSentenceToAudio\(/);
  assert.match(appSrc, /appendProsodyPlainSegment\(wfView, item\.text \|\| ''\)/);
  assert.match(appSrc, /reading-mode-compact-strip/);
  assert.match(cssSrc, /\.reading-mode-compact-strip/);
  assert.match(cssSrc, /\.reading-focus-bar/);
  assert.match(cssSrc, /\.link-arc/);
});
