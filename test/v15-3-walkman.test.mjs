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

test('16.2.0 Walkman channels replace legacy buttons with YouTube Motivational Speeches & Notebook Spoken', () => {
  assert.equal(APP_VERSION, '16.2.0');
  assert.equal(RADIO_CHANNELS.length, 4);
  const ids = RADIO_CHANNELS.map(c => c.id);
  assert.deepEqual(ids, ['weak_sniper', 'youtube_speeches', 'sentences_listening', 'notebook_spoken']);
  assert.equal(RADIO_SPEED_PRESETS.length, 3);
  assert.ok(RADIO_SPEED_PRESETS.some(p => p.rate === 0.8));
});

test('16.2.0 YouTube motivational speeches and Notebook spoken playlists populate with grounded content', () => {
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

test('16.2.0 watchdog timeout scales safely and prevents iOS Safari track-3 deadlocks', () => {
  const shortMs = computeSegmentWatchdogMs('follow through', 0.9);
  const slowLongMs = computeSegmentWatchdogMs('If you make your bed every morning you will have accomplished the first task of the day and it will encourage you to do another task.', 0.8);
  assert.ok(shortMs >= 12000);
  assert.ok(slowLongMs > shortMs);
  assert.ok(slowLongMs <= 45000);
});

test('16.2.0 app.js uses persistent unlocked audio element, Gemini TTS priority, prefetch, and watchdog', () => {
  const appCode = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appCode, /unlockRadioAudio/);
  assert.match(appCode, /navigator\.audioSession/);
  assert.match(appCode, /fetchGeminiAudioUrl/);
  assert.match(appCode, /prefetchNextRadioTrack/);
  assert.match(appCode, /computeSegmentWatchdogMs/);
  assert.match(appCode, /POCKET RADIO/);
});


test('16.2.0 fetchWithTimeoutAndRetry automatically retries transient 503 and succeeds', async () => {
  const { fetchWithTimeoutAndRetry } = await import('../ai-tutor.mjs');
  let calls = 0;
  const mockFetch = async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 503, text: async () => 'busy' };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const resp = await fetchWithTimeoutAndRetry(mockFetch, 'https://example.test/api', {}, { timeoutMs: 2000, retries: 1, retryDelayMs: 5 });
  assert.equal(resp.ok, true);
  assert.equal(calls, 2);
});

test('16.2.0 next-gen engine uses debounced draft saves, persistent Reading Gemini audio, dynamic theme-color, and SWR service worker', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(app, /function scheduleDraftSave\(/);
  assert.match(app, /function flushDraftSave\(/);
  assert.match(app, /readingGeminiAudioEl/);
  assert.match(app, /unlockReadingGeminiAudio/);
  assert.match(app, /meta\[name="theme-color"\]/);
  assert.match(sw, /request\.mode==='navigate'/);
  assert.match(sw, /kokoro-preview\/runtime\//);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /rel="preconnect" href="https:\/\/generativelanguage\.googleapis\.com"/);
});


test('16.2.0 audit guards: blob silent unlock, no audio.pause() unlock race, and no backdrop-filter on .site-header', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(app, /getSilentWavBlobUrl\(\)/);
  assert.doesNotMatch(app, /\.src\s*=\s*SILENT_WAV_DATA_URI/);
  assert.doesNotMatch(app, /elAudio\.pause\(\);\s*elAudio\.muted\s*=\s*false/);
  assert.match(app, /stopSpeech\(\);unlockReadingGeminiAudio\(\);/);
  const headerBlocks = [...css.matchAll(/\.site-header\s*\{[^}]*\}/g)].map(m => m[0]);
  assert.ok(headerBlocks.length >= 1);
  for (const blk of headerBlocks) {
    assert.doesNotMatch(blk, /backdrop-filter\s*:/, '.site-header must not use backdrop-filter or iOS Safari traps position:fixed mobile-nav');
  }
});

test('16.2.0 podcast bundler merges entire YouTube & Notebook channels into 1-RPD episodes', async () => {
  const { buildRadioPodcastEpisodes } = await import('../radio.mjs');
  const ytTracks = buildRadioPlaylist({ channel: 'youtube_speeches' });
  const ytEpisodes = buildRadioPodcastEpisodes(ytTracks, { channel: 'youtube_speeches', maxChars: 3600 });
  assert.ok(ytEpisodes.length >= 1 && ytEpisodes.length <= 2);
  assert.equal(ytEpisodes.reduce((s, e) => s + e.trackCount, 0), ytTracks.length);
  assert.equal(ytEpisodes[0].exposureOnly, true);

  const nbTracks = buildRadioPlaylist({ channel: 'notebook_spoken' });
  const nbEpisodes = buildRadioPodcastEpisodes(nbTracks, { channel: 'notebook_spoken', maxChars: 3600 });
  assert.equal(nbEpisodes.length, 1);
  assert.equal(nbEpisodes[0].trackCount, nbTracks.length);
});

test('16.2.0 dual-model 429 relay, 4200-char TTS spec, cache key stability, and daily quota counter', async () => {
  const {
    GEMINI_TTS_DEFAULT_MODEL,
    GEMINI_TTS_FALLBACK_MODEL,
    GEMINI_TTS_MAX_CHARS,
    buildGeminiTtsRequestSpec,
    synthesizeGeminiSpeech,
    makeTtsCacheKey,
    recordTtsApiCall,
    getDailyTtsUsage
  } = await import('../ai-tutor.mjs');

  assert.equal(GEMINI_TTS_DEFAULT_MODEL, 'gemini-3.8-flash-lite-tts');
  assert.equal(GEMINI_TTS_FALLBACK_MODEL, 'gemini-3.8-flash-tts');
  assert.ok(GEMINI_TTS_MAX_CHARS >= 4000);

  const longText = 'Practice every day. '.repeat(180);
  const spec = buildGeminiTtsRequestSpec(longText, { provider: 'google_ai', apiKey: 'AQ.TestKey1234', ttsVoice: 'Kore' });
  assert.ok(JSON.parse(spec.init.body).contents[0].parts[0].text.length > 3000);

  // 429 on primary model automatically relays to fallback model with independent quota
  let calls = 0;
  const mockFetch = async (url) => {
    calls++;
    if (calls === 1) {
      assert.match(url, /gemini-3\.8-flash-lite-tts/);
      return { ok: false, status: 429, text: async () => 'RESOURCE_EXHAUSTED' };
    }
    assert.match(url, /gemini-3\.8-flash-tts/);
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.from([1, 2, 3, 4]).toString('base64') } }]
          }
        }]
      })
    };
  };
  const audio = await synthesizeGeminiSpeech('Hello podcast world.', { provider: 'google_ai', apiKey: 'AQ.TestKey1234' }, mockFetch);
  assert.equal(calls, 2);
  assert.equal(audio.modelUsed, 'gemini-3.8-flash-tts');

  assert.equal(makeTtsCacheKey('Hello  world', 'Kore'), makeTtsCacheKey('Hello world', 'Kore'));
  const mem = new Map();
  const fakeStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(getDailyTtsUsage(fakeStorage).count, 0);
  recordTtsApiCall('gemini-3.8-flash-lite-tts', fakeStorage);
  assert.equal(getDailyTtsUsage(fakeStorage).count, 1);

  const appCode = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appCode, /readPersistentTtsAudio/);
  assert.match(appCode, /writePersistentTtsAudio/);
  assert.match(appCode, /buildAudioScrubberBar/);
  assert.match(appCode, /playRadioPodcastAt/);
  assert.match(appCode, /next.length>3800/);
});
