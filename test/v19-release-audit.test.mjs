import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_VERSION,
  recordsFromLearningPack,
  mergeDailyPackItems,
  validateBackup,
  mergeBackupState,
  persistState,
  buildBattleReport
} from '../core.mjs';
import { handoverEntries, describeHandoverRecordings, zipStore, readZipStore } from '../handover.mjs';
import { createRadioPlaybackClock } from '../radio.mjs';
import { captureExactResumeState, restoreExactResumeState } from '../continuity-os.mjs';
import { alignSpeakingTranscript, editAsrSegment } from '../skills-studio.mjs';

test('v20.3.4 Regression Guard (BUG #1-#4): app.js has zero undefined v19 callbacks and core.mjs preserves v19 across backup/reload', () => {
  assert.equal(APP_VERSION, '20.3.4');
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(!appSrc.includes('showToast?.('), 'app.js must call notify(), not undefined showToast');
  assert.ok(!appSrc.includes('saveData?.('), 'app.js must call save(), not undefined saveData');
  assert.ok(!appSrc.includes('currentPage'), 'app.js must reference page, not undefined currentPage');
  assert.ok(appSrc.includes('pagehide-v19-resume'), 'app.js must capture exactResume on pagehide');

  const baseBackup = {
    version: 4.3,
    items: [{ id: 'w:1', kind: 'word', target: 'mitigate', example: 'Trees mitigate urban heat.' }],
    attempts: [],
    sessions: [],
    v19: {
      disputes: [{ dispute_id: 'd1', question_id: 'q1', original_verdict: 'incorrect' }],
      confidenceLogs: [{ attemptId: 'a1', confidence: 'guess', correct: true }],
      lifeTasks: [{ taskId: 'life-1', scenarioTitle: '明天给房东报修' }],
      exactResume: captureExactResumeState({ packId: 'p1', page: 'practice', draftText: 'half draft', answerRevealedBeforeExit: true }),
      prefs: { largeText: true, oneHandMode: true, aiOutboundPreview: true }
    }
  };
  const validated = validateBackup(baseBackup);
  assert.equal(validated.v19.prefs.largeText, true);
  assert.equal(validated.v19.disputes.length, 1);
  assert.equal(validated.v19.exactResume.answerRevealedBeforeExit, true);

  const merged = mergeBackupState(validated, validated);
  assert.equal(merged.v19.disputes.length, 1, 'mergeBackupState must deduplicate v19 disputes');
  assert.equal(merged.v19.lifeTasks.length, 1, 'mergeBackupState must deduplicate v19 lifeTasks');
});

test('v20.3.4 Pre-Release Audit Scenarios 1-7: synthetic pack, evidence separation, recording ZIP readback, radio clock, storage rollback, 110-word pack', () => {
  // Scenario 1 & 6: 110-word synthetic schema 2.0 pack + idempotent re-import
  const syntheticPack = {
    schema_version: '2.0',
    pack_id: 'audit-pack-110',
    title: 'Synthetic Audit Pack 110 Words',
    items: Array.from({ length: 110 }, (_, i) => ({
      id: `item-${i + 1}`,
      type: 'word',
      target: `lexeme${i + 1}`,
      example: `Using lexeme${i + 1} in a clear sentence helps recall.`
    })),
    readings: [{ id: 'r1', title: 'Long Reading Passage', text: 'Urban transit reduces traffic congestion. '.repeat(30) }]
  };
  const parsed = recordsFromLearningPack(syntheticPack);
  assert.equal(parsed.items.length, 110);
  const m1 = mergeDailyPackItems([], parsed.items);
  const m2 = mergeDailyPackItems(m1.items, parsed.items);
  assert.equal(m2.added, 0);
  assert.equal(m2.items.length, 110);

  // Scenario 2: Evidence separation (independent correct vs wrong-then-retry vs prompted vs viewed-answer vs skipped)
  const session = { id: 'sess-audit', startedAt: '2026-11-21T01:00:00Z', endedAt: '2026-11-21T01:10:00Z', activeMs: 600000, mode: 'words', packId: 'audit-pack-110' };
  const attempts = [
    { id: 'a-ind', sessionId: 'sess-audit', itemId: m1.items[0].id, kind: 'word', status: 'K', answer: 'lexeme1', prompt_used: false, viewed_answer: false, initial_check: { status: 'correct' }, at: '2026-11-21T01:01:00Z' },
    { id: 'a-retry', sessionId: 'sess-audit', itemId: m1.items[1].id, kind: 'word', status: 'N', answer: 'wrong1', prompt_used: false, viewed_answer: false, initial_check: { status: 'incorrect' }, retried_after_error: true, retry_answer: 'lexeme2', retry_check: { status: 'correct' }, at: '2026-11-21T01:02:00Z' },
    { id: 'a-prompt', sessionId: 'sess-audit', itemId: m1.items[2].id, kind: 'word', status: 'K', answer: 'lexeme3', prompt_used: true, viewed_answer: false, initial_check: { status: 'correct' }, at: '2026-11-21T01:03:00Z' },
    { id: 'a-viewed', sessionId: 'sess-audit', itemId: m1.items[3].id, kind: 'word', status: 'V', answer: 'lexeme4', prompt_used: true, viewed_answer: true, initial_check: { status: 'correct' }, at: '2026-11-21T01:04:00Z' },
    { id: 'a-skip', sessionId: 'sess-audit', itemId: m1.items[4].id, kind: 'word', status: null, answer: '', skipped: true, at: '2026-11-21T01:05:00Z' }
  ];
  // Duplicate submission attempt (Scenario 5: double-click) must only count once
  const report = buildBattleReport({ session, attempts: [...attempts, attempts[0]], items: m1.items });
  assert.equal(report.attempts.length, 5);
  assert.equal(report.prompt_stats.first_attempt_independent, 3); // a-ind, a-retry, a-skip (unprompted)
  assert.equal(report.prompt_stats.viewed_answer, 1);
  assert.equal(report.skipped_items, 1);
  const retryRow = report.attempts.find(r => r.attempt_id === 'a-retry');
  assert.equal(retryRow.initial_check.status, 'incorrect', 'First error must never be rewritten as correct after retry');
  assert.equal(retryRow.retry_check.status, 'correct');
  assert.equal(retryRow.user_answer, 'wrong1', 'Retry answer must never overwrite first user_answer in Battle Report');
  assert.equal(retryRow.retry_answer, 'lexeme2', 'Retry answer must stay in retry_answer field');

  // Scenario 3: Recording full pipeline + independent ZIP readback + missing recording + excluded recording
  const recReport = {
    report_id: 'rep-rec-1',
    transfer_attempts: [{ id: 't1', recordingIds: ['spk:init', 'spk:retry'] }],
    reading_analysis: { retelling_attempts: [{ id: 'rt1', recordingIds: ['retell:init', 'retell:retry'] }] }
  };
  const payloadBytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);
  const packFull = handoverEntries({
    report: recReport,
    recordings: [
      { id: 'spk:init', mimeType: 'audio/webm', bytes: payloadBytes },
      { id: 'spk:retry', mimeType: 'audio/webm', bytes: payloadBytes },
      { id: 'retell:init', mimeType: 'audio/webm', bytes: payloadBytes }
      // intentionally missing retell:retry
    ]
  });
  const zipRes = zipStore(packFull.entries);
  const readBack = readZipStore(zipRes.bytes);
  assert.equal(readBack.filter(e => e.name.startsWith('recordings/')).length, 3);
  const status = describeHandoverRecordings({ report: recReport, manifest: packFull.manifest, includeRecordings: true });
  assert.equal(status.complete, false);
  assert.equal(status.expectedCount, 4);
  assert.equal(status.packagedCount, 3);
  assert.ok(status.summaryText.includes('缺少阅读复述重答'));
  const excludedStatus = describeHandoverRecordings({ report: recReport, manifest: packFull.manifest, includeRecordings: false });
  assert.equal(excludedStatus.complete, true);

  // Scenario 4: Radio controllable clock (10s failed synth = 0s; 30s play + 60s pause = 30s)
  const clk = createRadioPlaybackClock();
  assert.equal(Math.round(clk.snapshot(10000).activeMs / 1000), 0);
  clk.onPlaybackStarted(10000, { clips: 1, channel: 'youtube_speeches' });
  clk.onPlaybackPausedOrStopped(40000);
  assert.equal(Math.round(clk.snapshot(100000).activeMs / 1000), 30);
  assert.equal(clk.snapshot(100000).clipsPlayed, 1);

  // Scenario 5: Storage write failure preserves last known-good backup
  const failingStorage = {
    store: { k: '{"good":true}' },
    setItem(k, v) { if (v.includes('boom')) throw new Error('QuotaExceededError'); this.store[k] = v; }
  };
  const saveRes = persistState(failingStorage, 'k', { boom: true }, '{"good":true}');
  assert.equal(saveRes.ok, false);
  assert.equal(failingStorage.store.k, '{"good":true}');

  // Scenario 7: ASR edit invalidates stale grammar feedback
  const aligned = alignSpeakingTranscript({
    recordingId: 'r1',
    segments: [{ segmentId: 's1', startSec: 0, endSec: 3, text: 'I go yesterday' }],
    feedbackItems: [{ feedbackId: 'f1', segmentId: 's1', issue: 'Use went' }]
  });
  assert.equal(editAsrSegment(aligned, 's1', 'I went yesterday').feedbackItems[0].status, 'PENDING_REVIEW');
});

test('v20.3.4 Seeded Randomized Cross-Feature Invariant Fuzzing (50 deterministic seeds)', () => {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  for (let seed = 1; seed <= 50; seed += 1) {
    const rng = mulberry32(seed);
    const items = Array.from({ length: 6 }, (_, i) => ({ id: `w:${i}`, kind: 'word', target: `word${i}`, example: `Use word${i} well.` }));
    const attempts = [];
    const firstAnswerSnapshot = new Map();
    let resumeState = null;

    for (let step = 0; step < 12; step += 1) {
      const idx = Math.floor(rng() * items.length);
      const item = items[idx];
      const action = Math.floor(rng() * 5);
      if (action === 0) {
        // First submission (immutable once recorded for same attempt_id)
        const aid = `att:${seed}:${idx}`;
        if (!firstAnswerSnapshot.has(aid)) {
          const wrong = rng() < 0.5;
          const row = {
            id: aid,
            sessionId: `s:${seed}`,
            itemId: item.id,
            kind: 'word',
            status: wrong ? 'N' : 'K',
            answer: wrong ? 'wrong' : item.target,
            prompt_used: rng() < 0.3,
            viewed_answer: false,
            initial_check: { status: wrong ? 'incorrect' : 'correct' },
            at: new Date(1700000000000 + step * 1000).toISOString()
          };
          attempts.push(row);
          firstAnswerSnapshot.set(aid, row.answer);
        } else {
          // Duplicate tap of same attempt_id
          attempts.push({ ...attempts.find(a => a.id === aid) });
        }
      } else if (action === 1) {
        // Background exit before or after reveal
        const revealed = rng() < 0.5;
        resumeState = captureExactResumeState({ packId: `p:${seed}`, page: 'practice', itemId: item.id, draftText: 'wip', answerRevealedBeforeExit: revealed });
        const restored = restoreExactResumeState(resumeState, `p:${seed}`);
        assert.equal(restored.preservePromptedFlag, revealed, `Seed ${seed}: reveal condition lost`);
      }
    }

    const report = buildBattleReport({
      session: { id: `s:${seed}`, startedAt: '2026-11-21T00:00:00Z', endedAt: '2026-11-21T00:05:00Z', activeMs: 300000, mode: 'words', packId: `p:${seed}` },
      attempts,
      items
    });

    // Invariant 1 & 2: each attempt_id appears at most once and first answer is immutable
    const seenIds = new Set();
    for (const row of report.attempts) {
      assert.ok(!seenIds.has(row.attempt_id), `Seed ${seed}: duplicate attempt_id ${row.attempt_id}`);
      seenIds.add(row.attempt_id);
      assert.equal(row.user_answer, firstAnswerSnapshot.get(row.attempt_id), `Seed ${seed}: first answer mutated`);
    }
  }
});
