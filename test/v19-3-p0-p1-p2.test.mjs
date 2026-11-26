import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  APP_VERSION,
  mergeBackupState,
  replayFsrsShadowHistory,
  persistState,
  migrateBackupPayload
} from '../core.mjs';
import {
  auditPackOfflineReadiness,
  dryRunBackupRestore,
  buildWeeklyEvidenceReview
} from '../continuity-os.mjs';
import {
  findSentenceStartForTime,
  evaluateRadioPlaybackPolicy,
  resolveEpisodeByIdentity
} from '../radio-offline.mjs';
import { isPrunablePackClipRow } from '../speech-clips.mjs';

test('v20.3.1 P0-1: Safe cache pruning deletes ONLY old daily_pack clips and preserves raw MP3, speaking_qa & unknown sources', () => {
  const activePack = 'pack-today-001';
  assert.equal(isPrunablePackClipRow({ key: 'raw:abc123', source: 'my_audio', packId: 'old' }, activePack), false);
  assert.equal(isPrunablePackClipRow({ key: 'raw:def456', source: 'speaking_qa', packId: 'old' }, activePack), false);
  assert.equal(isPrunablePackClipRow({ key: 'af_heart:111', source: 'custom_offline', packId: 'old' }, activePack), false);
  assert.equal(isPrunablePackClipRow({ key: 'af_heart:222', source: 'unknown_legacy' }, activePack), false);
  assert.equal(isPrunablePackClipRow({ key: 'af_heart:333', source: 'daily_pack', packId: activePack }, activePack), false);
  assert.equal(isPrunablePackClipRow({ key: 'af_heart:444', source: 'daily_pack', packId: 'pack-yesterday-999' }, activePack), true);

  const scSrc = fs.readFileSync(new URL('../speech-clips.mjs', import.meta.url), 'utf8');
  assert.match(scSrc, /const staged=\[\];/);
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /hasRawAudioBlob\(audioSha256\)/);
  assert.match(appSrc, /pruneOldPackSpeechClips\(activePackId\)/);
});

test('v20.3.1 P0-2: Unified offline-only policy blocks cloud TTS across all 5 playback paths and persists setting', () => {
  assert.deepEqual(
    evaluateRadioPlaybackPolicy({ offlineOnly: true, isOriginalAudio: false, hasOfflineClip: false, hasCloudLocalCache: false, cloudTtsReady: true }),
    { allowPlay: false, allowCloudRequest: false, reason: 'blocked_by_offline_only' }
  );
  assert.deepEqual(
    evaluateRadioPlaybackPolicy({ offlineOnly: true, isOriginalAudio: false, hasOfflineClip: true, hasCloudLocalCache: false, cloudTtsReady: true }),
    { allowPlay: true, allowCloudRequest: false, reason: 'offline_pack' }
  );
  assert.deepEqual(
    evaluateRadioPlaybackPolicy({ offlineOnly: true, isOriginalAudio: true, hasOfflineClip: true }),
    { allowPlay: true, allowCloudRequest: false, reason: 'original_local' }
  );

  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /data\.settings\.radioOfflineOnly/);
  assert.match(appSrc, /evaluateRadioPlaybackPolicy\(/);
  assert.match(appSrc, /markTrackActualPlay/);
});

test('v20.3.1 P0-3: Backup merge restores readingRetellingAttempts & deduplicates speechTransferAttempts idempotently', () => {
  const backup = {
    readingRetellingAttempts: [{ id: 'retell:1', readingId: 'r1', firstAnswer: 'Original retelling text' }],
    speechTransferAttempts: [{ id: 'sp-tr:1', taskId: 't1', firstAnswer: 'Original speech transfer' }]
  };
  const once = mergeBackupState({}, backup);
  assert.equal(once.readingRetellingAttempts.length, 1);
  assert.equal(once.speechTransferAttempts.length, 1);

  const twice = mergeBackupState(once, backup);
  assert.equal(twice.readingRetellingAttempts.length, 1);
  assert.equal(twice.speechTransferAttempts.length, 1);
  assert.equal(twice.readingRetellingAttempts[0].firstAnswer, 'Original retelling text');
  assert.equal(twice.speechTransferAttempts[0].firstAnswer, 'Original speech transfer');

  const dry = dryRunBackupRestore({}, {
    reports: [{ report_id: 'rep:1' }],
    readingRetellingAttempts: backup.readingRetellingAttempts,
    speechTransferAttempts: backup.speechTransferAttempts,
    myAudioTracks: [{ id: 'my1', audioSha256: 'sha1' }],
    recordingsMeta: [{ id: 'rec1' }]
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.recoverable.newRetellingsToAdd, 1);
  assert.equal(dry.recoverable.newSpeechTransfersToAdd, 1);
  assert.equal(dry.recoverable.myAudioTracksNeedingSourceFiles, 1);
  assert.equal(dry.recoverable.recordingMetaCount, 1);
});

test('v20.3.1 P0-4: Service Worker defers skipWaiting until client sends SKIP_WAITING', () => {
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.doesNotMatch(swSrc, /addAll\(ASSETS\)\)\.then\(\(\)\s*=>\s*self\.skipWaiting\(\)\)/);
  assert.match(swSrc, /SKIP_WAITING/);
  assert.match(swSrc, new RegExp(APP_VERSION.replace(/\./g, '\\.')));
});

test('v20.3.1 P0-5: FSRS shadow & weekly review strictly reject bare K, passive exposure, missing timestamps & duplicates', () => {
  const now = new Date('2026-11-21T10:00:00+08:00');
  const fsrs = replayFsrsShadowHistory([
    // Bare self-rating K with no answer/check -> excluded
    { id: 'a1', itemId: 'w1', rating: 'K', at: '2026-11-20T09:00:00+08:00' },
    // Duplicate of same valid independent attempt -> counted ONCE
    { id: 'a2', itemId: 'w2', rating: 'K', answer: 'resilient', initial_check: { status: 'correct' }, at: '2026-11-20T10:00:00+08:00' },
    { id: 'a2', itemId: 'w2', rating: 'K', answer: 'resilient', initial_check: { status: 'correct' }, at: '2026-11-20T10:00:00+08:00' },
    // Passive radio / voice recording / prompted -> excluded
    { id: 'a3', itemId: 'w3', rating: 'K', answer: 'foo', evidence_type: 'voice_recording', at: '2026-11-20T11:00:00+08:00' },
    { id: 'a4', itemId: 'w4', rating: 'K', answer: 'bar', prompt_used: true, at: '2026-11-20T12:00:00+08:00' }
  ], now);
  assert.equal(fsrs.qualifiedIndependentEvents, 1);
  assert.equal(fsrs.trackedCards, 1);

  const weekly = buildWeeklyEvidenceReview([
    // Bare K + isRetest with NO answer & NO timestamp -> rejected
    { rating: 'K', isRetest: true },
    // Same-day retest -> rejected for nextDayIndependent
    { rating: 'K', isRetest: true, answer: 'same day', at: '2026-11-21T15:00:00+08:00', previousAt: '2026-11-21T09:00:00+08:00' },
    // True next-day independent retest in Asia/Shanghai -> accepted
    { rating: 'K', isRetest: true, answer: 'next day ok', at: '2026-11-21T09:00:00+08:00', previousAt: '2026-11-20T22:00:00+08:00' }
  ], [], { now });
  assert.equal(weekly.highlights.find(h => h.role === 'next_day_independent')?.record?.answer, 'next day ok');
});

test('v20.3.1 P1-7: findSentenceStartForTime never jumps forward in inter-sentence gaps & resolveEpisodeByIdentity guards mismatches', () => {
  const segs = [
    { startSec: 0, endSec: 3, text: 'Sentence one.' },
    { startSec: 10, endSec: 14, text: 'Sentence two.' },
    { startSec: 18, endSec: 22, text: 'Sentence three.' },
    { startSec: 25, endSec: 29, text: 'Sentence four.' }
  ];
  // At t=4s (inside gap after Sentence one 0-3s), rewind MUST go to 0s, NOT 10s!
  const gapRes = findSentenceStartForTime(segs, 4.0, { lastTapAtMs: 0, nowMs: 10000 });
  assert.equal(gapRes.targetSec, 0);
  assert.ok(gapRes.targetSec <= 4.0);

  // Mid-sentence
  const midRes = findSentenceStartForTime(segs, 12.2, { lastTapAtMs: 0, nowMs: 10000 });
  assert.equal(midRes.targetSec, 10);

  // Double-tap near start jumps to previous sentence
  const dblRes = findSentenceStartForTime(segs, 10.3, { lastTapAtMs: 9000, nowMs: 10000 });
  assert.equal(dblRes.targetSec, 0);

  // Fallback without segments
  const noSegRes = findSentenceStartForTime([], 12.0);
  assert.equal(noSegRes.mode, 'fallback_5s');
  assert.equal(noSegRes.targetSec, 7.0);

  // Content-addressed episode identity guard
  const eps = [{ id: 'ep1', contentHash: 'hash-new-1' }, { id: 'ep2', contentHash: 'hash-2' }];
  assert.equal(resolveEpisodeByIdentity(eps, { episodeId: 'ep1', contentHash: 'hash-old-1' }).status, 'content_changed');
  assert.equal(resolveEpisodeByIdentity(eps, { episodeId: 'ep99', contentHash: 'hash-99' }).status, 'not_found');
  assert.equal(resolveEpisodeByIdentity(eps, { episodeId: 'ep2', contentHash: 'hash-2' }).index, 1);
});

test('v20.3.1 P1-8, P1-9, P2-10, P2-11 & #120 regression guards', () => {
  const ready = auditPackOfflineReadiness({
    pack: { items: [{ id: 'i1' }], readings: [] },
    queueEpisodes: [
      { id: '1', isLocalReady: true }, { id: '2', isLocalReady: true }, { id: '3', isLocalReady: true },
      { id: '4', isLocalReady: false },
      { id: '5', isLocalReady: true }, { id: '6', isLocalReady: true }, { id: '7', isLocalReady: true }
    ]
  });
  assert.equal(ready.queueReadyCount, 6);
  assert.equal(ready.queueTotal, 7);
  assert.equal(ready.queueMissing[0].order, 4);

  // #120 stale_tab_revision conflict even when content differs
  const storeMap = new Map();
  const mockStorage = {
    getItem: k => storeMap.get(k) ?? null,
    setItem: (k, v) => storeMap.set(k, v)
  };
  const r1 = persistState(mockStorage, 'k', { version: VERSION, stateRevision: 1, items: [] }, null);
  assert.equal(r1.ok, true);
  // Simulate newer tab writing revision 2
  persistState(mockStorage, 'k', { version: VERSION, stateRevision: 2, items: [{ id: 'new' }] }, r1.serialized);
  // Stale tab with revision 1 & different draft tries to save -> blocked!
  const stale = persistState(mockStorage, 'k', { version: VERSION, stateRevision: 1, items: [{ id: 'old-edit' }] }, r1.serialized);
  assert.equal(stale.ok, false);
  assert.equal(stale.conflict, 'stale_tab_revision');

  // Preserve radio fields across backup migration
  const migrated = migrateBackupPayload({
    version: VERSION,
    items: [],
    attempts: [],
    sessions: [],
    reports: [],
    stateRevision: 7,
    myAudioTracks: [{ id: 'm1', audioSha256: 'abc', channel: 'speaking_qa', hasSubtitles: true }],
    radioMoments: [{ id: 'mom1', episodeId: 'm1', timeSec: 12 }],
    radioQueue: [{ id: 'q1', episodeId: 'm1' }],
    radioBookmarksV2: { 'm1::abc': { positionSec: 15 } }
  });
  assert.equal(migrated.stateRevision, 7);
  assert.equal(migrated.myAudioTracks.length, 1);
  assert.equal(migrated.radioMoments.length, 1);

  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(cssSrc, /min-width:\s*44px;\s*min-height:\s*44px;/);

  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /practiceMomentForTwoMinutes/);
  assert.match(appSrc, /showStaleConflictDraftDialog/);
  assert.match(appSrc, /queue:\s*slice\.selectedIds/);
});
