import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v20.4.7 defines captureCurrentSelectionText and wires quick-lookup chips & backdrop close in AI lexicon drawer', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(appSrc, /function captureCurrentSelectionText\(/);
  assert.match(appSrc, /function getCurrentContextLookupWords\(/);
  assert.match(appSrc, /lexicon-quick-chips/);
  assert.match(appSrc, /if \(e\.target === overlay\)/);
  assert.match(cssSrc, /\.lexicon-quick-chips/);
  assert.match(cssSrc, /\.lexicon-input-row/);
});

test('v20.4.7 auto-reads example sentence after Smart Vocab choice and adds clickable replay + 1-tap lookup', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(appSrc, /function triggerVocabAutoPronounce\(key, text, audioUrl = "", segments = null\)/);
  assert.match(appSrc, /vocab-reveal-ex:/);
  assert.match(appSrc, /vocab-ex:/);
  assert.match(appSrc, /vocab-example-play-btn/);
  assert.match(appSrc, /btn\('🔍 查词',\(\)=>\{clearVocabFastAdvance\(\);openAiLexiconDrawer\(task\.target\);\}/);
  assert.match(cssSrc, /\.vocab-example-play-btn/);
});
