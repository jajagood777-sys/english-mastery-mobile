import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RADIO_CHANNELS,
  RADIO_SPEED_PRESETS,
  BUILT_IN_YOUTUBE_SPEECHES,
  BUILT_IN_NOTEBOOK_SPOKEN,
  computeSegmentWatchdogMs,
  buildRadioPlaylist
} from '../radio.mjs';
import { APP_VERSION } from '../core.mjs';

test('15.4.0 Walkman channels replace legacy buttons with YouTube Motivational Speeches & Notebook Spoken', () => {
  assert.equal(APP_VERSION, '15.4.0');
  assert.equal(RADIO_CHANNELS.length, 4);
  const ids = RADIO_CHANNELS.map(c => c.id);
  assert.deepEqual(ids, ['weak_sniper', 'youtube_speeches', 'sentences_listening', 'notebook_spoken']);
  assert.equal(RADIO_SPEED_PRESETS.length, 3);
  assert.ok(RADIO_SPEED_PRESETS.some(p => p.rate === 0.8));
});

test('15.4.0 YouTube motivational speeches and Notebook spoken playlists populate with grounded content', () => {
  assert.ok(BUILT_IN_YOUTUBE_SPEECHES.length >= 14);
  assert.ok(BUILT_IN_NOTEBOOK_SPOKEN.length >= 10);

  const ytTracks = buildRadioPlaylist({ channel: 'youtube_speeches' });
  assert.equal(ytTracks.length, BUILT_IN_YOUTUBE_SPEECHES.length);
  assert.ok(ytTracks.some(t => /make your bed/i.test(t.text) && t.sourceUrl.includes('yaQZFhrW0fU')));
  assert.ok(ytTracks.some(t => /fall forward/i.test(t.text) && t.sourceUrl.includes('tbnzAVRZ9Xc')));
  assert.equal(ytTracks.every(t => t.exposureOnly === true), true);

  const nbTracks = buildRadioPlaylist({ channel: 'notebook_spoken' });
  assert.equal(nbTracks.length, BUILT_IN_NOTEBOOK_SPOKEN.length);
  assert.ok(nbTracks.some(t => /friendship/i.test(t.text)));
  assert.ok(nbTracks.some(t => /Long Dialogue/i.test(t.title)));
  assert.equal(nbTracks.every(t => t.exposureOnly === true), true);
});

test('15.4.0 watchdog timeout scales safely and prevents iOS Safari track-3 deadlocks', () => {
  const shortMs = computeSegmentWatchdogMs('follow through', 0.9);
  const slowLongMs = computeSegmentWatchdogMs('If you make your bed every morning you will have accomplished the first task of the day and it will encourage you to do another task.', 0.8);
  assert.ok(shortMs >= 12000);
  assert.ok(slowLongMs > shortMs);
  assert.ok(slowLongMs <= 45000);
});

test('15.4.0 app.js uses persistent unlocked audio element, Gemini TTS priority, prefetch, and watchdog', () => {
  const appCode = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appCode, /unlockRadioAudio/);
  assert.match(appCode, /navigator\.audioSession/);
  assert.match(appCode, /fetchGeminiAudioUrl/);
  assert.match(appCode, /prefetchNextRadioTrack/);
  assert.match(appCode, /computeSegmentWatchdogMs/);
  assert.match(appCode, /POCKET RADIO \(15\.4\.0\)/);
});
