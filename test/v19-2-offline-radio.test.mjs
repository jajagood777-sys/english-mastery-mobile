import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  RADIO_SOURCE_LABELS,
  resolveRadioSourceLabel,
  episodeBookmarkKey,
  resolveVersionedBookmark,
  findSentenceStartForTime,
  searchEpisodeSegments,
  createRadioMoment,
  mergeRadioQueue,
  createEpisodeCoverageTracker,
  shouldTriggerCloudPreload,
  planRawAudioImport,
  reorderMyAudioTrack,
  renameMyAudioTrack,
  formatRadioImportSummary
} from '../radio-offline.mjs';
import { normalizeSpeechText, speechTextHash } from '../speech-clips.mjs';
import { readZipStore } from '../handover.mjs';
import { buildRadioPlaylist, buildRadioPodcastEpisodes } from '../radio.mjs';
import { APP_VERSION, validateBackup, mergeBackupState } from '../core.mjs';

test('v20.3.3 Scenario 1 & 4: Content-addressed episode matching prevents Ep3 shift misplay & stale bookmark jump', () => {
  assert.equal(APP_VERSION, '20.3.3');
  const oldTracks = buildRadioPlaylist({ channel: 'notebook_spoken', scope: 'all', items: [], vocabularyPractice: [], vocabularyAttempts: [], speeches: [] });
  const oldEps = buildRadioPodcastEpisodes(oldTracks, { channel: 'notebook_spoken', maxChars: 3600 });
  assert.equal(oldEps.length, 7);

  // Insert brand-new content at the beginning of the channel
  const shiftedTracks = [{ id: 'new-top', badge: 'NEW', title: 'New Opening Episode', text: 'Brand new opening episode inserted at head of channel. '.repeat(65) }, ...oldTracks];
  const newEps = buildRadioPodcastEpisodes(shiftedTracks, { channel: 'notebook_spoken', maxChars: 3600 });

  const oldEp3Hash = crypto.createHash('sha256').update(oldEps[2].text).digest('hex');
  const newEp3Hash = crypto.createHash('sha256').update(newEps[2].text).digest('hex');
  assert.notEqual(oldEp3Hash, newEp3Hash, 'Shifted Ep 3 must have a distinct content hash');

  // Bookmark saved for old Ep 3 must NOT match new Ep 3
  const bmKeyOld = episodeBookmarkKey('notebook_spoken:ep3', oldEp3Hash);
  const bookmarks = {
    [bmKeyOld]: { episodeId: 'notebook_spoken:ep3', contentHash: oldEp3Hash, positionSec: 94.5, durationSec: 237 }
  };
  assert.equal(resolveVersionedBookmark(bookmarks, 'notebook_spoken:ep3', oldEp3Hash).positionSec, 94.5);
  assert.equal(resolveVersionedBookmark(bookmarks, 'notebook_spoken:ep3', newEp3Hash), null, 'Old bookmark must NOT jump into shifted Ep 3');
});

test('v20.3.3 Scenario 2: Offline-Only mode & My Audio enforce ZERO cloud TTS calls; 40s cloud preload defaults OFF and honors all safety guards', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('let radioAutoPreloadNext = false;'), 'Cloud 40s preload MUST default to false');
  assert.ok(appSrc.includes('radioOfflineOnly'), 'Offline-only mode must exist in app.js');

  // Default OFF
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: false, offlineOnly: false, channel: 'notebook_spoken',
    isPlaying: true, isPaused: false, durationSec: 200, currentTimeSec: 170, hasNextEpisode: true
  }), false);

  // Offline-Only blocks preload even if cloudPreloadEnabled is true
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: true, channel: 'notebook_spoken',
    isPlaying: true, isPaused: false, durationSec: 200, currentTimeSec: 170, hasNextEpisode: true
  }), false);

  // My Audio NEVER triggers cloud preload
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: false, channel: 'my_audio',
    isPlaying: true, isPaused: false, durationSec: 200, currentTimeSec: 170, hasNextEpisode: true
  }), false);

  // Sleep timer imminent (<= 45s remaining) blocks preload
  const now = 1_700_000_000_000;
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: false, channel: 'notebook_spoken',
    isPlaying: true, isPaused: false, sleepDeadlineMs: now + 30_000, nowMs: now,
    durationSec: 200, currentTimeSec: 170, hasNextEpisode: true
  }), false);

  // Single-episode loop or paused or inFlight or >40s remaining blocks preload
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: false, channel: 'notebook_spoken',
    isPlaying: true, isPaused: true, durationSec: 200, currentTimeSec: 170, hasNextEpisode: true
  }), false);
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: false, channel: 'notebook_spoken',
    isPlaying: true, isPaused: false, singleLoop: true, durationSec: 200, currentTimeSec: 170, hasNextEpisode: true
  }), false);
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: false, channel: 'notebook_spoken',
    isPlaying: true, isPaused: false, durationSec: 200, currentTimeSec: 150, hasNextEpisode: true
  }), false);

  // Valid trigger: playing, <= 40s left, sleep timer safe, not local, not inFlight
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true, offlineOnly: false, channel: 'notebook_spoken',
    isPlaying: true, isPaused: false, sleepDeadlineMs: now + 600_000, nowMs: now,
    durationSec: 200, currentTimeSec: 165, hasNextEpisode: true, nextAlreadyLocal: false, inFlight: false
  }), true);
});

test('v20.3.3 Scenario B/C/F: Real sentence rewind vs explicit 5s fallback, moment bookmarks (-3s context), commute queue & honest listening coverage', () => {
  const segs = [
    { startSec: 0, endSec: 8.4, text: 'First sentence here.' },
    { startSec: 8.4, endSec: 17.2, text: 'Second sentence about phonics.' },
    { startSec: 17.2, endSec: 26.0, text: 'Third sentence conclusion.' }
  ];
  // 1st tap inside sentence 2 -> jumps to sentence 2 start (8.4s)
  const tap1 = findSentenceStartForTime(segs, 13.5, { lastTapAtMs: 0, nowMs: 10_000 });
  assert.equal(tap1.mode, 'sentence');
  assert.equal(tap1.targetSec, 8.4);
  assert.equal(tap1.label, '再听这句');

  // Double-tap within 2.6s -> jumps to sentence 1 start (0s)
  const tap2 = findSentenceStartForTime(segs, 8.6, { lastTapAtMs: 10_000, nowMs: 11_200 });
  assert.equal(tap2.mode, 'sentence');
  assert.equal(tap2.targetSec, 0);

  // No real timestamps -> explicit fallback "退 5 秒" (never fake alignment!)
  const fb = findSentenceStartForTime([], 14.0);
  assert.equal(fb.mode, 'fallback_5s');
  assert.equal(fb.targetSec, 9.0);
  assert.equal(fb.label, '退 5 秒');

  // Sentence search inside episode
  const hits = searchEpisodeSegments(segs, 'phonics');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].startSec, 8.4);

  // Moment bookmark starts 3s earlier for context
  const m = createRadioMoment({ channel: 'notebook_spoken', episodeId: 'ep1', contentHash: 'abc', title: 'Ep 1', timeSec: 15.0, sentenceText: 'Second sentence about phonics.' });
  assert.equal(m.resumeAtSec, 12.0);

  // Commute queue play-next insertion
  const q1 = mergeRadioQueue([], { channel: 'notebook_spoken', episodeId: 'ep1', title: 'Ep 1', startSec: 0 });
  const q2 = mergeRadioQueue(q1, { channel: 'my_audio', episodeId: 'my1', title: 'My MP3', startSec: 12 }, { playNext: true });
  assert.equal(q2[0].episodeId, 'my1');

  // Honest listening coverage: replaying 10s ten times => actualListeningSec=100, coveredSec=10
  const tracker = createEpisodeCoverageTracker();
  for (let rep = 0; rep < 10; rep++) {
    for (let s = 0; s < 10; s++) {
      tracker.recordPlaybackStep(s, s + 1, 1000);
    }
  }
  // Seek jump (+50s in 1s) must be ignored
  tracker.recordPlaybackStep(10, 60, 1000);
  const snap = tracker.snapshot(100);
  assert.equal(snap.actualListeningSec, 100);
  assert.equal(snap.coveredSec, 10);
  assert.equal(snap.coveragePct, 10);

  // Provenance labeling never mislabels synthesized speech as original voice
  assert.equal(resolveRadioSourceLabel({ channel: 'my_audio' }), RADIO_SOURCE_LABELS.original_audio);
  assert.equal(resolveRadioSourceLabel({ fromOfflinePack: true, engine: 'onnxruntime-q8-cmudict-ipa' }), RADIO_SOURCE_LABELS.kokoro_offline);
  assert.equal(resolveRadioSourceLabel({ fromOfflinePack: false }), RADIO_SOURCE_LABELS.cloud_tts);
});

test('v20.3.3 Raw MP3 Direct Import ("我的音频"): duplicate skip, same-name different-content disambiguation, rename, reorder & backup preservation', () => {
  const existing = [];
  const p1 = planRawAudioImport(existing, { filename: 'podcast.mp3', audioSha256: 'aaaa1111bbbb2222', bytes: 1_500_000, durationSec: 185 });
  assert.equal(p1.action, 'add');
  assert.equal(p1.track.title, 'podcast');
  existing.push(p1.track);

  // Exact same content hash -> skip_duplicate
  const pDup = planRawAudioImport(existing, { filename: 'podcast_copy.mp3', audioSha256: 'aaaa1111bbbb2222', bytes: 1_500_000, durationSec: 185 });
  assert.equal(pDup.action, 'skip_duplicate');

  // Same filename but DIFFERENT content hash -> disambiguated, NEVER overwrites
  const pDiff = planRawAudioImport(existing, { filename: 'podcast.mp3', audioSha256: 'cccc3333dddd4444', bytes: 2_100_000, durationSec: 240 });
  assert.equal(pDiff.action, 'add');
  assert.equal(pDiff.track.title, 'podcast (2)');
  existing.push(pDiff.track);

  // Rename & reorder
  const renamed = renameMyAudioTrack(existing, pDiff.track.id, 'BBC 6 Minute English');
  assert.equal(renamed[1].title, 'BBC 6 Minute English');
  const reordered = reorderMyAudioTrack(renamed, pDiff.track.id, 'up');
  assert.equal(reordered[0].title, 'BBC 6 Minute English');

  // Human-readable import summary
  const summary = formatRadioImportSummary({ importedCount: 7, skippedCount: 0, totalDurationSec: 1505, totalBytes: 6_087_553, unit: '集' });
  assert.match(summary, /7 集可离线播放/);
  assert.match(summary, /25 分 05 秒/);
  assert.match(summary, /5\.8 MB/);

  // Core backup preserves myAudioTracks, radioMoments, radioQueue, radioBookmarksV2
  const valid = validateBackup({
    items: [], attempts: [], sessions: [],
    myAudioTracks: reordered,
    radioMoments: [{ id: 'm1', title: 'Moment' }],
    radioQueue: [{ id: 'q1', episodeId: 'ep1' }],
    radioBookmarksV2: { 'ep1::abc': { positionSec: 42 } }
  });
  assert.equal(valid.myAudioTracks.length, 2);
  assert.equal(valid.radioMoments.length, 1);
  assert.equal(valid.radioQueue.length, 1);
  assert.equal(valid.radioBookmarksV2['ep1::abc'].positionSec, 42);
  const merged = mergeBackupState({ items: [], attempts: [], sessions: [] }, valid);
  assert.equal(merged.myAudioTracks.length, 2);
});

test('v20.3.3 Scenario 6: Real readback of final Notebook_Spoken_7Ep_OfflineRadio_af_heart.zip & SW cold-start precache completeness', async () => {
  // Verify sw.js precaches ALL top-level static imports in app.js (cold-start Airplane Mode guarantee)
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const mod of ['./radio-offline.mjs', './studio.mjs', './handover.mjs', './speech-clips.mjs', './radio.mjs', './ai-tutor.mjs']) {
    assert.ok(swSrc.includes(mod), `sw.js must precache ${mod} for cold-start Airplane Mode launch`);
  }

  // Real readback of our generated Notebook 7-episode offline radio ZIP (when present in workspace parent)
  const zipPath = new URL('../../Notebook_Spoken_7Ep_OfflineRadio_af_heart.zip', import.meta.url);
  if (fs.existsSync(zipPath)) {
    const rawZip = new Uint8Array(fs.readFileSync(zipPath));
    const entries = readZipStore(rawZip);
    const manifestEntry = entries.find(f => f.name === 'speech-manifest.json');
    assert.ok(manifestEntry, 'ZIP must contain speech-manifest.json');
    const manifest = JSON.parse(new TextDecoder().decode(manifestEntry.bytes));
    assert.equal(manifest.version, 1);
    assert.equal(manifest.clips.length, 7);
    const byName = new Map(entries.map(f => [f.name, f]));
    for (const clip of manifest.clips) {
      const f = byName.get(clip.file);
      assert.ok(f, `ZIP must contain ${clip.file}`);
      assert.equal(f.bytes.byteLength, clip.bytes, `${clip.file} byte size must match manifest`);
      const expectedHash = crypto.createHash('sha256').update(normalizeSpeechText(clip.text)).digest('hex');
      assert.equal(expectedHash, clip.sha256, `${clip.file} text sha256 must match website runtime`);
      assert.ok(clip.durationSeconds > 150, `${clip.file} must have real measured duration`);
      assert.ok(Array.isArray(clip.segments) && clip.segments.length >= 5, `${clip.file} must have real measured segment timestamps`);
      for (let i = 1; i < clip.segments.length; i++) {
        assert.ok(clip.segments[i].startSec >= clip.segments[i - 1].endSec - 0.05, `${clip.file} segment timestamps must be monotonic`);
      }
    }
  }
});
