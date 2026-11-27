import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildPackSpeakingQaEpisodes,
  buildRadioPodcastEpisodes,
  buildAutoSyncedSegments,
  rescaleSyncedSegments,
  BUILT_IN_YOUTUBE_SPEECHES
} from '../radio.mjs';

test('v20.3.4: buildAutoSyncedSegments splits learning pack speaking Q&A into sentence-level Q/A segments', () => {
  const eps = buildPackSpeakingQaEpisodes([
    {
      id: 'spk-1',
      taskType: 'speaking',
      prompt: 'Describe a time when you discovered that a popular claim was misleading. What happened?',
      referenceAnswer: 'A couple of years ago, I saw a viral post claiming a miracle study hack. At first it sounded convincing. However, when I checked the primary research, the data told a completely different story.'
    }
  ], { packTitle: '2026-11-23 通勤包' });
  assert.equal(eps.length, 1);
  const segs = eps[0].qaSegments;
  assert.ok(Array.isArray(segs) && segs.length >= 4, 'expected sentence-level Q + A segments');
  assert.equal(segs[0].role, 'Q');
  assert.equal(segs[0].startSec, 0);
  assert.ok(segs.some(s => s.role === 'A' && s.text.includes('viral post')));
  assert.ok(segs.every(s => s.autoTimed === true && s.endSec > s.startSec));
});

test('v20.3.4: buildAutoSyncedSegments generates synced subtitles for YouTube speeches, sentences, and Notebook channels', () => {
  const ytEps = buildRadioPodcastEpisodes(BUILT_IN_YOUTUBE_SPEECHES.slice(0, 3), { channel: 'youtube_speeches' });
  assert.ok(ytEps.length >= 1);
  const segs = buildAutoSyncedSegments(ytEps[0]);
  assert.ok(segs.length >= 6, 'expected multi-sentence segments across YouTube speeches');
  assert.equal(segs[0].startSec, 0);
  assert.ok(segs[0].speaker.includes('Make Your Bed'));
  for (let i = 1; i < segs.length; i++) {
    assert.ok(segs[i].startSec >= segs[i - 1].startSec, 'monotonic startSec');
  }
});

test('v20.3.4: buildAutoSyncedSegments ignores raw audio stub text without transcript', () => {
  const rawEp = {
    id: 'raw:1',
    isOriginalAudio: true,
    tracksIncluded: [{ title: 'voice.mp3', text: '原始音频文件（无文字稿，仅存本机）' }]
  };
  assert.deepEqual(buildAutoSyncedSegments(rawEp), []);
});

test('v20.3.4: rescaleSyncedSegments proportionally calibrates timestamps to real audio.duration', () => {
  const segs = buildAutoSyncedSegments({
    fromLearningPack: true,
    questionPrompt: 'Do you enjoy reading?',
    modelAnswer: 'Yes, I read every evening before bed. It helps me unwind and expand my vocabulary.'
  }, 30);
  const rescaled = rescaleSyncedSegments(segs, 79.4);
  assert.equal(rescaled.length, segs.length);
  assert.equal(rescaled[0].startSec, 0);
  assert.equal(rescaled[rescaled.length - 1].endSec, 79.4);
  assert.ok(rescaled[1].startSec > segs[1].startSec);
});

test('v20.3.4: app.js wires universal synced subtitles across all playback modes and rescales on loadedmetadata', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('buildAutoSyncedSegments'));
  assert.ok(appSrc.includes('rescaleSyncedSegments'));
  assert.ok(appSrc.includes('resolveEpisodeSyncedSegments'));
  assert.ok(appSrc.includes('rescaleSyncedSegments(radioActiveSegments, audio.duration)'));
});
