import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  RADIO_PLAYBACK_MODES,
  normalizeRadioPlaybackMode,
  nextRadioPlaybackMode,
  pickNextRadioIndex
} from '../radio.mjs';

test('v20.3.7: playback modes cycle cleanly auto_next -> single_loop -> shuffle -> auto_next', () => {
  assert.equal(RADIO_PLAYBACK_MODES.length, 3);
  assert.equal(normalizeRadioPlaybackMode(''), 'auto_next');
  assert.equal(normalizeRadioPlaybackMode('unknown'), 'auto_next');
  assert.equal(nextRadioPlaybackMode('auto_next'), 'single_loop');
  assert.equal(nextRadioPlaybackMode('single_loop'), 'shuffle');
  assert.equal(nextRadioPlaybackMode('shuffle'), 'auto_next');
});

test('v20.3.7: pickNextRadioIndex handles auto_next, single_loop, and non-repeating shuffle', () => {
  assert.equal(pickNextRadioIndex({ currentIndex: 0, total: 0, mode: 'auto_next' }), -1);
  assert.equal(pickNextRadioIndex({ currentIndex: 0, total: 5, mode: 'auto_next' }), 1);
  assert.equal(pickNextRadioIndex({ currentIndex: 4, total: 5, mode: 'auto_next' }), 0);
  assert.equal(pickNextRadioIndex({ currentIndex: 2, total: 5, mode: 'single_loop' }), 2);
  assert.equal(pickNextRadioIndex({ currentIndex: 0, total: 1, mode: 'shuffle' }), 0);

  // Shuffle must never return currentIndex when total > 1
  for (let cur = 0; cur < 5; cur++) {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const nxt = pickNextRadioIndex({ currentIndex: cur, total: 5, mode: 'shuffle', randomFn: () => r });
      assert.notEqual(nxt, cur, `shuffle repeated index ${cur} for r=${r}`);
      assert.ok(nxt >= 0 && nxt < 5);
    }
  }
});

test('v20.3.7: app.js guards iOS lockscreen auto-advance and exposes visible 3-mode toggle', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
  assert.match(appSrc, /let radioStopAfterRound = false;/);
  assert.match(appSrc, /if\(document\.hidden&&!radioPlaying\)\{radioAudioUnlocked=false;\}/);
  assert.match(appSrc, /if \(!fromAutoAdvance\) unlockRadioAudio\(\);/);
  assert.match(appSrc, /radio-mode-toggle-btn/);
  assert.match(appSrc, /applyRadioPlaybackMode/);
});
