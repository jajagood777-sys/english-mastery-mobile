import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('v20.4.2: Speech Chamber wires live 4/3/2 countdown card, chime, and 15s outline auto-mask', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(process.cwd(), 'styles.css'), 'utf8');

  assert.match(appSrc, /yd-speech-432-card/);
  assert.match(appSrc, /yd-speech-432-clock/);
  assert.match(appSrc, /yd-speech-432-fill/);
  assert.match(appSrc, /playSpeechCueBeep/);
  assert.match(appSrc, /masked=Boolean\(speechPlanActive\)/);
  assert.match(appSrc, /yd-speech-plan-btn/);
  assert.match(cssSrc, /\.speech-432-card/);
  assert.match(cssSrc, /\.speech-432-clock\.is-urgent/);
});
