import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SESSION_PACING_MODES,
  LISTENING_DECODE_STEPS,
  selectTodayMissionWords,
  detectActivatedMissionWords,
  buildOpeningWarmupQueue,
  buildClosingExitTicket,
  clampShadowRepCount
} from '../pipeline-mastery.mjs';

test('v20.5.0 selectTodayMissionWords prioritizes missed vocab & promoted reading harvest words and detects inflected activation', () => {
  const data = {
    dailyPack: { packId: 'p1', vocabularyPractice: [{ target: 'steady', archivedExample: 'Keep a steady pace.' }] },
    dailyJourney: {
      vocabularyAttempts: [
        { packId: 'p1', target: 'pervade', correct: false, skipped: false },
        { packId: 'p1', target: 'steady', correct: true, skipped: false }
      ]
    },
    readingMarks: [
      { wordText: 'insulated', originalSentence: 'The roof was well insulated.', harvestTier: 'promote' },
      { wordText: 'noiseword', originalSentence: 'Skip me.', harvestTier: 'drop' }
    ]
  };
  const mw = selectTodayMissionWords(data, 4);
  assert.equal(mw[0].word, 'pervade');
  assert.equal(mw[1].word, 'insulated');

  const res = detectActivatedMissionWords(
    'Calm focus pervaded the quiet room while we kept a steady pace.',
    mw,
    ['insulated']
  );
  assert.equal(res.activatedCount, 3);
  assert.ok(res.activated.some(x => x.word === 'pervade' && x.byText));
  assert.ok(res.activated.some(x => x.word === 'insulated' && x.byManual));
});

test('v20.5.0 buildOpeningWarmupQueue and buildClosingExitTicket produce concise interleaved consolidation items', () => {
  const data = {
    dailyPack: {
      packId: 'p1',
      vocabularyPractice: [{ target: 'pervade', targetSense: 'spread through', archivedExample: 'Calm seemed to pervade the room.' }]
    },
    dailyJourney: {
      vocabularyAttempts: [{ packId: 'p1', target: 'pervade', correct: false, skipped: false }]
    },
    readingMarks: [{ wordText: 'insulated', originalSentence: 'Thick walls insulated the house.', harvestTier: 'promote' }],
    fsrsState: { 'executive': { s: 0.8 }, 'steady': { s: 4.5 } }
  };
  const warmup = buildOpeningWarmupQueue(data, 4);
  assert.ok(warmup.length >= 2);
  assert.equal(warmup[0].word, 'insulated');

  const exit = buildClosingExitTicket(data, 4);
  assert.ok(exit.length >= 3);
  assert.ok(exit.some(x => x.kind === 'vocab_cloze'));
  assert.ok(exit.some(x => x.kind === 'reading_cloze'));
  assert.ok(exit.some(x => x.kind === 'complex_frame'));
});

test('v20.5.0 pacing modes, listening decode steps, and shadow rep sweet-spot helper behave cleanly', () => {
  assert.equal(SESSION_PACING_MODES.length, 2);
  assert.equal(LISTENING_DECODE_STEPS.length, 3);
  assert.equal(clampShadowRepCount(0).inSweetSpot, false);
  assert.equal(clampShadowRepCount(3).inSweetSpot, true);
  assert.equal(clampShadowRepCount(5).inSweetSpot, false);
});

test('v20.5.0 app.js, styles.css, and sw.js wire all 4 full-pipeline upgrades cleanly', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(appSrc, /pipeline-mastery\.mjs/);
  assert.match(appSrc, /function renderSessionPacingBar\(/);
  assert.match(appSrc, /function renderOpeningWarmupCard\(/);
  assert.match(appSrc, /function renderMissionWordsBar\(/);
  assert.match(appSrc, /function renderClosingExitTicketCard\(/);
  assert.match(appSrc, /listening-decode-strip/);
  assert.match(cssSrc, /\.mission-word-chip\.is-activated/);
  assert.match(cssSrc, /\.listening-decode-strip/);
  assert.match(swSrc, /\.\/pipeline-mastery\.mjs/);
  assert.match(swSrc, /english-cultivation-static-v20\.5\.0/);
});
