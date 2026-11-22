import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  naturalSortTracks,
  createUnclearMark,
  buildUnclearReplayQueue,
  computeScrubberUndoTarget,
  computeInterruptionResumeAction,
  computeCommuteReadiness,
  evaluateRadioPlaybackPolicy
} from '../radio-offline.mjs';
import {
  insertDictationAtCursor,
  buildWordDiffHighlight,
  buildHomeResumeBanner,
  buildEndOfDayContinuationCue,
  buildWeeklyThreePairHighlights,
  shouldHideVocabTargetHeader
} from '../ux-100.mjs';
import { APP_VERSION, mergeTransferAttempts, validateBackup, mergeBackupState } from '../core.mjs';
import { checkVocabularyTaskLeak, scheduleInSessionDelayedRetry } from '../vocab.mjs';

test('v19.6.3 Batch 1: Unclear mark, cross-episode replay queue, scrubber undo, natural sort & interruption resume', () => {
  assert.equal(APP_VERSION, '19.6.3');

  const sorted = naturalSortTracks([
    { title: '第10集_Travel' },
    { title: '第2集_City' },
    { title: '第1集_Work' }
  ]);
  assert.deepEqual(sorted.map(x => x.title), ['第1集_Work', '第2集_City', '第10集_Travel']);

  const m1 = createUnclearMark({
    channel: 'speaking_qa',
    episodeId: 'ep1',
    title: 'Part 1 Work',
    timeSec: 42.5,
    sentenceText: 'I would have changed my schedule earlier.',
    segmentStartSec: 40,
    segmentEndSec: 45,
    dateKey: '2026-11-22'
  });
  const m2 = createUnclearMark({
    channel: 'speaking_qa',
    episodeId: 'ep2',
    title: 'Part 1 City',
    timeSec: 18,
    sentenceText: 'Public transit makes daily life smoother.',
    segmentStartSec: 16,
    segmentEndSec: 21,
    dateKey: '2026-11-22'
  });
  assert.equal(m1.resumeAtSec, 39.5);
  assert.equal(m1.endAtSec, 46.2);
  assert.equal(buildUnclearReplayQueue([m1, m2], { episodeId: 'ep1' }).length, 1);
  assert.equal(buildUnclearReplayQueue([m1, m2], { dateKey: '2026-11-22' }).length, 2);
  m1.resolved = true;
  assert.equal(buildUnclearReplayQueue([m1, m2], { dateKey: '2026-11-22' }).length, 1);

  assert.equal(computeScrubberUndoTarget(200, 204, 8).canUndo, false);
  const undo = computeScrubberUndoTarget(200, 1270, 8);
  assert.equal(undo.canUndo, true);
  assert.equal(undo.fromSec, 200);

  const withSubs = computeInterruptionResumeAction([{ startSec: 12, endSec: 18, text: 'Hello' }], 15.2);
  assert.equal(withSubs.primaryLabel, '从刚才那句开头听');
  assert.equal(withSubs.primarySec, 12);

  const plainMp3 = computeInterruptionResumeAction([], 15.2);
  assert.equal(plainMp3.primaryLabel, '退 5 秒继续');
  assert.equal(plainMp3.primarySec, 10.2);

  const readiness = computeCommuteReadiness([{ id: '1' }, { id: '2' }, { id: '3' }], [true, false, true]);
  assert.equal(readiness.readyCount, 2);
  assert.equal(readiness.missingEpisodes.length, 1);
  assert.match(readiness.summaryText, /2\/3 集已就绪，第 2 集需要重导/);
});

test('v19.6.3 Batch 2: Cursor dictation, minimal word diff, home env/deferred card & real continuation cue', () => {
  const ins = insertDictationAtCursor('First sentence. Third sentence.', 'Second sentence.', 16, 16);
  assert.equal(ins.value, 'First sentence. Second sentence. Third sentence.');

  const diff = buildWordDiffHighlight('She suggested me to go.', 'She suggested that I go.');
  assert.equal(diff.isExact, false);
  assert.equal(diff.isValidAlternative, false);
  assert.ok(diff.originalTokens.some(t => t.word === 'me' && t.changed));
  assert.ok(diff.referenceTokens.some(t => t.word === 'that' && t.changed));

  const validAlt = buildWordDiffHighlight('I prefer living in a big city.', 'I would rather live in a major city.', {
    accepted: ['I prefer living in a big city.']
  });
  assert.equal(validAlt.isValidAlternative, true);
  assert.equal(validAlt.statusLabel, '你的说法也成立');

  const home = buildHomeResumeBanner({
    dailyPack: { transferTasks: [{ taskType: 'speaking' }], readings: [{ id: 'r1' }] },
    dailyJourney: {
      steps: ['transfer'],
      index: 0,
      transferIndex: 2,
      transferDraft: 'Regarding the schedule change for Thursday...',
      transferAttempts: [{ firstAnswer: 'Initial answer', recordingIds: ['rec1'], retryAnswer: '' }]
    },
    deferredSpeaking: [{ id: 'd1', status: 'deferred_speaking' }],
    myAudioTracks: [{ id: 'a1' }, { id: 'a2' }]
  });
  assert.equal(home.primaryLabel, '继续综合输出 · 第 3 题');
  assert.match(home.draftPreview, /Regarding the schedule change/);
  assert.match(home.deferredSummary, /还有 1 段待开口复述/);
  assert.match(home.lastLeaveReceipt, /初答已保存，录音仍在本机，重答尚未提交/);

  const cue = buildEndOfDayContinuationCue({
    radioUnclearMarks: [{
      id: 'u1',
      title: 'Interview',
      sentenceText: 'I would have called earlier',
      replayedCount: 2,
      resolved: true,
      timeSec: 50,
      resumeAtSec: 47
    }]
  });
  assert.match(cue.headline, /would have/);
  assert.equal(cue.actionLabel, '下次从这句开始');

  const pairs = buildWeeklyThreePairHighlights({
    transferAttempts: [{ firstAnswer: 'old', retryAnswer: 'better', hintUsed: false, rating: 'K' }],
    radioUnclearMarks: [{ id: 'u1', resolved: true }]
  });
  assert.equal(pairs.length, 3);
});

test('v19.6.3 Six Legacy Regression Routes & Accident Guards remain intact', () => {
  // Route 1: Idempotent backup merge (restored twice -> no duplicates)
  const att = [{ id: 'ta1', taskId: 't1', firstAnswer: 'orig', retryAnswer: '' }];
  const merged1 = mergeTransferAttempts([], att);
  const merged2 = mergeTransferAttempts(merged1, att);
  assert.equal(merged2.length, 1);
  assert.equal(merged2[0].firstAnswer, 'orig');

  // Route 5: Offline-only mode strictly enforces ZERO cloud TTS calls
  const policy = evaluateRadioPlaybackPolicy({
    offlineOnly: true,
    hasOriginalAudio: false,
    hasLocalOfflineClip: false,
    hasCloudCachedAudio: false,
    cloudTtsConfigured: true
  });
  assert.equal(policy.allowCloudRequest, false);
  assert.equal(policy.reason, "blocked_by_offline_only");

  // Route 6 & SW completeness: ux-100.mjs precached, deferred skipWaiting & UI hooks present
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(sw, /\.\/ux-100\.mjs/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(app, /👂 没听清/);
  assert.match(app, /🌙 晚点开口/);
  assert.match(app, /🔁 连起来听（停0\.5秒）/);
  assert.match(app, /📖 回原文找依据/);
  assert.match(app, /↩ 回到第 /);
  assert.match(app, /insertDictationAtCursor/);
});

test('v19.6.3 Bugfix Guards: validateBackup/mergeBackupState persist unclearMarks & deferredSpeaking, manual pause never triggers BT banner, replay exits cleanly', () => {
  const s1 = validateBackup({
    version: 4.3,
    items: [{ id: "i1", kind: "word", target: "test", meaning: "测试" }],
    attempts: [],
    sessions: [],
    readings: [],
    radioUnclearMarks: [{ id: 'u1', episodeId: 'ep1', timeSec: 12, resolved: false }],
    deferredSpeaking: [{ id: 'd1', taskId: 't1', status: 'deferred_speaking' }]
  });
  assert.equal(s1.radioUnclearMarks.length, 1);
  assert.equal(s1.deferredSpeaking.length, 1);
  const merged = mergeBackupState(s1, s1);
  assert.equal(merged.radioUnclearMarks.length, 1);
  assert.equal(merged.deferredSpeaking.length, 1);

  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /radioPaused = true;\s*try \{ radioAudioEl\.pause\(\); \}/);
  assert.match(app, /if \(!fromUnclearReplay\) \{ radioUnclearReplayQueue = \[\]; radioUnclearReplayCursor = -1; \}/);
  assert.match(app, /d\.status='completed';d\.completedAt=submittedAt;/);
});

test('v19.6.3 Vocab Anti-Leak & Compact Zero-Scroll Feedback: hides target when options contain target word or blank', () => {
  assert.equal(shouldHideVocabTargetHeader({
    type: 'collocation_choice',
    target: 'subdue',
    prompt: 'The team managed to ______ the fire.',
    options: [{ id: 'A', text: 'safeguard' }, { id: 'B', text: 'subdue' }]
  }), true);
  assert.equal(shouldHideVocabTargetHeader({
    type: 'confusable_pair',
    target: 'inflict',
    prompt: 'Which one means: To cause someone to suffer something unpleasant.',
    options: [{ id: 'A', text: 'inflict' }, { id: 'B', text: 'reinforce' }]
  }), true);
  assert.equal(shouldHideVocabTargetHeader({
    type: 'definition_choice',
    target: 'relic',
    prompt: 'Choose the best English meaning for this word.',
    options: [{ id: 'A', text: 'An object that survives from an earlier historical period.' }]
  }), false);

  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /const hideTargetNow=!prior&&shouldHideVocabTargetHeader\(task\);/);
  assert.match(app, /vocab-sticky-next-bar/);
  assert.match(app, /vocab-feedback-top-bar/);
});

test('v19.6.3 Commute Quiz System: anti-leak pack gate, 3-item delayed retry interleaving & fast-flow toggle', () => {
  const leakCheck = checkVocabularyTaskLeak({
    type: 'collocation_challenge',
    target: 'subdue',
    prompt: 'Choose the precise expression to subdue the fire.',
    archivedExample: 'The team managed to subdue the fire.',
    options: [{ id: 'A', text: 'safeguard' }, { id: 'B', text: 'subdue' }]
  });
  assert.equal(leakCheck.hasLeak, true);
  assert.equal(leakCheck.shouldHideHeader, true);
  assert.equal(leakCheck.leaks.length, 2);

  const q = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }];
  const nextQ = scheduleInSessionDelayedRetry(q, 0, { id: 'q1', target: 'subdue', prompt: 'Pick subdue', archivedExample: 'They subdue it.' }, { delayGap: 3 });
  assert.equal(nextQ.length, 6);
  assert.equal(nextQ[4].id, 'q1__retry');
  assert.equal(nextQ[4].isDelayedRetry, true);
  assert.doesNotMatch(nextQ[4].prompt, /subdue/i);

  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /⚡ 极速连刷/);
  assert.match(app, /vocabBatchTargetCount/);
  assert.match(app, /scheduleInSessionDelayedRetry/);
});
