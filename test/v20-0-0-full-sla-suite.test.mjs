import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  clampDesiredRetention,
  scheduleFsrsReview,
  mapBehaviorToFsrsRating,
  isLeechCard,
  evaluateThreeDayCriterion,
  selectDifficultyTierByStability,
  sortByDescendingRetrievability,
  applySmartFuzzLoadBalance,
  disperseSiblingDates,
  burySameDayConfusables,
  interleaveReviewQueue,
  computeStabilityDistribution
} from '../fsrs-engine.mjs';
import {
  isHypercorrectionError,
  computeLexicalCoverage,
  checkOneTargetSentence,
  annotateConnectedSpeechAndWeakForms,
  buildKeywordPartialCaption,
  analyzePauseAndPhonation,
  trimSilenceBounds,
  detectTargetChipHits,
  buildSocraticMediationPrompt,
  buildAntiSycophancyDebatePrompt,
  buildConfusePairDuel
} from '../sla-enhancers.mjs';

test('v20.3.2 FSRS-6 DSR engine schedules reviews, enforces CMRR floor, protects pretesting, and handles leeches & 3-day criterion', () => {
  assert.equal(clampDesiredRetention(0.65), 0.80);
  assert.equal(clampDesiredRetention(0.99), 0.93);
  assert.equal(mapBehaviorToFsrsRating({ correct: false }), 1);
  assert.equal(mapBehaviorToFsrsRating({ correct: true, usedHint: true }), 2);
  assert.equal(mapBehaviorToFsrsRating({ correct: true, rtMs: 1200 }), 4);

  // Pretest never pollutes lapses
  const pre = scheduleFsrsReview(null, 1, { isPretest: true, nowMs: 1000 });
  assert.equal(pre.lapses, 0);
  assert.equal(pre.reps, 0);

  let card = scheduleFsrsReview(null, 3, { nowMs: Date.UTC(2026, 10, 24) });
  assert.ok(card.s > 0 && card.intervalDays >= 1);
  card = scheduleFsrsReview(card, 3, { nowMs: Date.UTC(2026, 10, 25) });
  card = scheduleFsrsReview(card, 3, { nowMs: Date.UTC(2026, 10, 26) });
  const crit = evaluateThreeDayCriterion(card);
  assert.equal(crit.graduated, true);
  assert.equal(crit.dots, '● ● ●');

  // Leech trigger after 4 lapses
  let bad = null;
  for (let i = 0; i < 4; i++) {
    bad = scheduleFsrsReview(bad, 1, { nowMs: Date.UTC(2026, 10, 24 + i) });
  }
  assert.equal(isLeechCard(bad), true);
  assert.equal(selectDifficultyTierByStability(3).tier, 1);
  assert.equal(selectDifficultyTierByStability(15).tier, 2);
  assert.equal(selectDifficultyTierByStability(45).tier, 3);
});

test('v20.3.2 backlog rescue, Smart Fuzz, Disperse Siblings, Anti-Clustering burying, and Interleaving work deterministically', () => {
  const now = Date.UTC(2026, 10, 24);
  const rescue = sortByDescendingRetrievability([
    { id: 'a', s: 2, lastReviewMs: now - 10 * 86400000 },
    { id: 'b', s: 10, lastReviewMs: now - 2 * 86400000 }
  ], now, { dailyCap: 1 });
  assert.equal(rescue.dueToday[0].id, 'b');
  assert.equal(rescue.postponed.length, 1);

  const balanced = applySmartFuzzLoadBalance(10, { '2026-12-04': 50, '2026-12-05': 2 }, { nowMs: now, easyWeekdays: [] });
  assert.ok(balanced !== 10 && (balanced === 9 || balanced === 11));

  const dispersed = disperseSiblingDates([
    { target: 'adapt', dueMs: now },
    { target: 'adapt', dueMs: now + 86400000 * 0.5 }
  ], 2);
  assert.ok((dispersed[1].dueMs - dispersed[0].dueMs) >= 2 * 86400000);

  const buried = burySameDayConfusables([{ target: 'adapt' }, { target: 'adopt' }], { adapt: 2, adopt: 1 });
  assert.equal(buried.kept.length, 1);
  assert.equal(buried.buried.length, 1);

  const mixed = interleaveReviewQueue([
    { id: 1, topic: 'A' }, { id: 2, topic: 'A' }, { id: 3, topic: 'B' }, { id: 4, topic: 'B' }
  ]);
  assert.deepEqual(mixed.map((x) => x.topic), ['A', 'B', 'A', 'B']);
  assert.equal(computeStabilityDistribution({ x: { s: 2 }, y: { s: 12 }, z: { s: 45 }, w: { s: 120 } }).permanent, 1);
});

test('v20.3.2 SLA enhancers cover Hypercorrection, 95-98% coverage, 1T check, weak forms, pause/PTR, VAD trim, chips & Socratic AI', () => {
  assert.equal(isHypercorrectionError({ rtMs: 900, correct: false }), true);
  assert.equal(isHypercorrectionError({ rtMs: 900, correct: true }), false);

  const cov = computeLexicalCoverage('The morning train crossed a desolate district.', ['crossed', 'district']);
  assert.ok(cov.unknownWords.includes('desolate'));
  const oneT = checkOneTargetSentence('The morning train crossed a desolate district.', ['crossed', 'district']);
  assert.equal(oneT.isOneTarget, true);

  const prosody = annotateConnectedSpeechAndWeakForms('She can go to an old dock.');
  assert.ok(prosody.some((p) => p.weak && p.weakIpa === '/kən/'));
  assert.ok(prosody.some((p) => p.linkNext));
  assert.ok(buildKeywordPartialCaption('She can go to desolate dock', ['desolate']).includes('___'));

  const fluency = analyzePauseAndPhonation([0.05, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0, 0.04], { frameMs: 50 });
  assert.equal(fluency.pauseCount, 1);
  assert.equal(fluency.longestPauseMs, 250);
  assert.ok(fluency.ptr > 0 && fluency.ptr < 1);

  const bounds = trimSilenceBounds([0, 0, 0.05, 0.08, 0, 0], { threshold: 0.01, padSamples: 1 });
  assert.equal(bounds.start, 1);
  assert.equal(bounds.end, 5);

  const chips = detectTargetChipHits('She staggered onto the dock and avoided a bustle.', ['staggered', 'bustle', 'exempt']);
  assert.deepEqual(chips.hits, ['staggered', 'bustle']);
  assert.deepEqual(chips.missed, ['exempt']);

  assert.ok(buildSocraticMediationPrompt(1, { learnerText: 'I go yesterday' }).includes('Level 1'));
  assert.ok(buildAntiSycophancyDebatePrompt('Remote work is better.', 1).includes('Never use empty praise'));
  assert.equal(buildConfusePairDuel('prophecy', 'hypocrisy', ['A'], ['B']).rounds.length, 2);
});

test('v20.3.2 sw.js precaches new modules with Safari HTTP 206 Range handler and app.js declares all state variables', () => {
  const swSrc = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(swSrc.includes('./fsrs-engine.mjs'));
  assert.ok(swSrc.includes('./sla-enhancers.mjs'));
  assert.ok(swSrc.includes('status: 206') && swSrc.includes('Content-Range'));

  const appSrc = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  for (const v of [
    'vocabLookAlikeOpenId', 'vocabQuestionShownAt', 'vocabGuardUntil',
    'vocabUndoState', 'vocabUndoTimer', 'readingPureBookMode',
    'readingSentenceFocusMode', 'readingProsodyMode', 'speechTimerMode',
    'speechRoundIdx', 'speechPlanActive'
  ]) {
    assert.match(appSrc, new RegExp(`\\blet\\s+${v}\\s*=`), `Missing explicit let declaration for ${v}`);
  }
});

import { migrateBackupPayload } from '../core.mjs';
import { computeStateProgressScore } from '../state-mirror.mjs';

test('v20.3.2 migrateBackupPayload preserves fsrsState and masteredVocabWords across IndexedDB/backup restore', () => {
  const payload = {
    version: '20.3.2',
    items: [],
    attempts: [],
    sessions: [],
    fsrsState: { desolate: { d: 6.2, s: 4.5, reps: 2, lapses: 1, distinctCorrectDays: ['2026-11-24'] } },
    masteredVocabWords: ['Bustle', 'exempt']
  };
  const migrated = migrateBackupPayload(payload);
  assert.ok(migrated.fsrsState && migrated.fsrsState.desolate, 'fsrsState must be preserved by validateBackup');
  assert.equal(migrated.fsrsState.desolate.s, 4.5);
  assert.deepEqual(migrated.masteredVocabWords, ['bustle', 'exempt']);
  assert.ok(computeStateProgressScore(migrated) >= 3, 'computeStateProgressScore must count fsrsState and masteredVocabWords');
});
