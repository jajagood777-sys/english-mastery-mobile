import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RADIO_CHANNELS,
  RADIO_SPEED_PRESETS,
  BUILT_IN_YOUTUBE_SPEECHES,
  BUILT_IN_NOTEBOOK_SPOKEN,
  computeSegmentWatchdogMs,
  buildRadioPlaylist,
  createRadioPlaybackClock
} from '../radio.mjs';
import { APP_VERSION } from '../core.mjs';

test('20.4.1 Walkman channels replace legacy buttons with YouTube Motivational Speeches & Notebook Spoken', () => {
  assert.equal(APP_VERSION, '20.4.1');
  assert.equal(RADIO_CHANNELS.length, 4);
  const ids = RADIO_CHANNELS.map(c => c.id);
  assert.deepEqual(ids, ['speaking_qa', 'youtube_speeches', 'sentences_listening', 'notebook_spoken']);
  assert.equal(RADIO_SPEED_PRESETS.length, 3);
  assert.ok(RADIO_SPEED_PRESETS.some(p => p.rate === 0.8));
});

test('20.4.1 YouTube motivational speeches and Notebook spoken playlists populate with grounded content', () => {
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

test('20.4.1 watchdog timeout scales safely and prevents iOS Safari track-3 deadlocks', () => {
  const shortMs = computeSegmentWatchdogMs('follow through', 0.9);
  const slowLongMs = computeSegmentWatchdogMs('If you make your bed every morning you will have accomplished the first task of the day and it will encourage you to do another task.', 0.8);
  assert.ok(shortMs >= 12000);
  assert.ok(slowLongMs > shortMs);
  assert.ok(slowLongMs <= 45000);
});

test('20.4.1 app.js uses persistent unlocked audio element, Gemini TTS priority, prefetch, and watchdog', () => {
  const appCode = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appCode, /unlockRadioAudio/);
  assert.match(appCode, /navigator\.audioSession/);
  assert.match(appCode, /fetchGeminiAudioUrl/);
  assert.match(appCode, /prefetchNextRadioTrack/);
  assert.match(appCode, /computeSegmentWatchdogMs/);
  assert.match(appCode, /POCKET RADIO/);
});


test('20.4.1 fetchWithTimeoutAndRetry automatically retries transient 503 and succeeds', async () => {
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

test('20.4.1 next-gen engine uses debounced draft saves, persistent Reading Gemini audio, dynamic theme-color, and SWR service worker', () => {
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


test('20.4.1 audit guards: blob silent unlock, no audio.pause() unlock race, and no backdrop-filter on .site-header', () => {
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

test('20.4.1 podcast bundler merges entire YouTube & Notebook channels into 1-RPD episodes', async () => {
  const { buildRadioPodcastEpisodes } = await import('../radio.mjs');
  const ytTracks = buildRadioPlaylist({ channel: 'youtube_speeches' });
  const ytEpisodes = buildRadioPodcastEpisodes(ytTracks, { channel: 'youtube_speeches', maxChars: 3600 });
  assert.ok(ytEpisodes.length >= 20);
  assert.equal(ytEpisodes.reduce((s, e) => s + e.trackCount, 0), ytTracks.length);
  assert.equal(ytEpisodes[0].exposureOnly, true);

  const nbTracks = buildRadioPlaylist({ channel: 'notebook_spoken' });
  const nbEpisodes = buildRadioPodcastEpisodes(nbTracks, { channel: 'notebook_spoken', maxChars: 3600 });
  assert.ok(nbEpisodes.length >= 6);
  assert.equal(nbEpisodes.reduce((sum, ep) => sum + ep.trackCount, 0), nbTracks.length);
});

test('20.4.1 dual-model 429 relay, 4200-char TTS spec, cache key stability, and daily quota counter', async () => {
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

test('20.4.1 flagship dual-engine SiliconFlow TTS, audio bookmarks, expanded libraries, and CSP guard', async () => {
  const {
    SILICONFLOW_TTS_ENDPOINT,
    SILICONFLOW_TTS_VOICES,
    buildSiliconFlowTtsRequestSpec,
    synthesizeSiliconFlowSpeech,
    synthesizeCloudSpeech,
    saveAudioBookmark,
    loadAudioBookmark,
    clearAudioBookmark
  } = await import('../ai-tutor.mjs');

  assert.equal(SILICONFLOW_TTS_VOICES.length, 8);
  const sfSpec = buildSiliconFlowTtsRequestSpec('Stay hungry, stay foolish.', {
    ttsEngine: 'siliconflow',
    siliconflowApiKey: 'sk-test-siliconflow-1234',
    siliconflowVoice: 'FunAudioLLM/CosyVoice2-0.5B:anna'
  });
  assert.equal(sfSpec.url, SILICONFLOW_TTS_ENDPOINT);
  assert.match(sfSpec.init.headers.Authorization, /Bearer sk-test-siliconflow-1234/);

  const mockMp3 = new Uint8Array([0x49, 0x44, 0x33, 0x04]);
  const sfRes = await synthesizeCloudSpeech('Hello SiliconFlow.', {
    ttsEngine: 'siliconflow',
    siliconflowApiKey: 'sk-test-siliconflow-1234'
  }, async () => ({ ok: true, arrayBuffer: async () => mockMp3.buffer }));
  assert.equal(sfRes.mimeType, 'audio/mpeg');
  assert.equal(sfRes.bytes.byteLength, 4);

  // Audio bookmarks persist, restore, and auto-clear near end
  const mem = new Map();
  const fakeStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveAudioBookmark('ep:1', 85, 240, fakeStorage);
  assert.equal(loadAudioBookmark('ep:1', fakeStorage), 85);
  saveAudioBookmark('ep:1', 238, 240, fakeStorage);
  assert.equal(loadAudioBookmark('ep:1', fakeStorage), 0);
  saveAudioBookmark('ep:2', 40, 200, fakeStorage);
  clearAudioBookmark('ep:2', fakeStorage);
  assert.equal(loadAudioBookmark('ep:2', fakeStorage), 0);

  // Expanded YouTube (20 tracks) & Notebook Spoken (21 tracks)
  assert.ok(BUILT_IN_YOUTUBE_SPEECHES.length >= 20);
  assert.ok(BUILT_IN_NOTEBOOK_SPOKEN.length >= 21);
  assert.ok(BUILT_IN_YOUTUBE_SPEECHES.some(t => /stay hungry/i.test(t.text)));
  assert.ok(BUILT_IN_NOTEBOOK_SPOKEN.some(t => /narrow it down/i.test(t.text)));

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /connect-src[^;]*https:\/\/api\.siliconflow\.cn/);
  const appCode = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appCode, /home-week-strip/);
  assert.match(appCode, /reading-scroll-bar/);
  assert.match(appCode, /readingFontSize/);
  assert.match(appCode, /saveAudioBookmark/);
});

test('20.4.1 stability fixes: dual-engine single-track, pause bookmark flush, pause-aware watchdog, and clean page/stop teardown', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.equal(APP_VERSION, '20.4.1');
  // 1. Single-track prefetch & playback use dual-engine isCloudTtsReady + activeTtsVoiceForKey
  assert.doesNotMatch(appSrc, /function prefetchNextRadioTrack[\s\S]{0,400}isGeminiTtsReady/);
  assert.doesNotMatch(appSrc, /async function playRadioSegment[\s\S]{0,400}isGeminiTtsReady/);
  assert.match(appSrc, /makeTtsCacheKey\(firstSeg, activeTtsVoiceForKey\(cfg\)\)/);
  // 2. stopGeminiAudio cleans readingAudioStatus & handlers
  assert.match(appSrc, /function stopGeminiAudio\(\)\{geminiPlaybackToken\+\+;readingAudioStatus='';activeReadingBookmarkId='';/);
  assert.match(appSrc, /geminiAudioEl\.ontimeupdate=null;geminiAudioEl\.onloadedmetadata=null;/);
  // 3. setPage resets radio/reading state & removes reading scroll listener
  assert.match(appSrc, /radioPaused=false;radioAudioStatus='';readingAudioStatus='';activeReadingBookmarkId='';/);
  assert.match(appSrc, /window\.removeEventListener\('scroll',window\.__ydReadScroll\)/);
  // 4. Reading audio clears bookmark on natural completion
  assert.match(appSrc, /elA\.onended=\(\)\=>\{if\(i===0\)clearAudioBookmark\(readBmId\);/);
  // 5. Pause flushes bookmarks immediately for both podcast & reading
  assert.match(appSrc, /function pausePocketRadio\(\) \{[\s\S]{0,300}saveAudioBookmark\(curEp\.id/);
  assert.match(appSrc, /function pauseSpeech\(\)\{[\s\S]{0,220}saveAudioBookmark\(activeReadingBookmarkId/);
  // 6. Watchdog re-arms instead of killing paused podcast playback
  assert.match(appSrc, /if \(radioPaused && radioPlaying === myPlayToken\)/);
  // 7. MediaSession version string updated to 17.1
  assert.doesNotMatch(appSrc, /言道修炼殿 16\.0/);
  assert.match(appSrc, /言道修炼殿 18\.2 随身听/);
});

test('20.4.1 Apple HIG minimal craft: decluttered microcopy, editorial reading rhythm, and tactile CSS polish', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.equal(APP_VERSION, '20.4.1');
  // Decluttered key copy across Home, Reading, Vocabulary, Settings, More
  assert.doesNotMatch(appSrc, /自由单项加练与明细（日常只需点上方/);
  assert.doesNotMatch(appSrc, /Roediger & Karpicke/);
  assert.doesNotMatch(appSrc, /安全说明：API Key 仅保存在当前手机浏览器的独立本地空间中/);
  assert.match(appSrc, /自由单项加练与更多入口/);
  assert.match(appSrc, /双击或长按英文词即可标词或 AI 查词。/);
  // Apple HIG minimal craft CSS rules present without breaking site-header backdrop guard
  assert.match(cssSrc, /v20\.4\.1 Apple HIG Minimal Craft/);
  assert.match(cssSrc, /max-width:\s*65ch/);
  assert.match(cssSrc, /transform:\s*scale\(0\.982\)/);
});

test('20.4.1 Playwright real-app E2E selector guard: preserves all E2E headings and voice preview button', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /试听 Gemini 声音/);
  assert.match(appSrc, /h\('h1','学习设置'\)/);
  assert.match(appSrc, /h\('h1','阅读英语材料'\)/);
  assert.match(appSrc, /h\('h1','阅读时保存的生词'\)/);
  assert.match(appSrc, /h\('h2','本机数据安全检查'\)/);
  assert.match(appSrc, /最近一次主动发起JSON备份：/);
});

test('20.4.1 Pocket Radio includes ~100-minute YouTube motivational speech library and ±5s seek buttons', async () => {
  const { buildRadioPodcastEpisodes } = await import('../radio.mjs');
  const ytTracks = buildRadioPlaylist({ channel: 'youtube_speeches' });
  const totalWords = ytTracks.reduce((sum, t) => sum + ((t.text.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length), 0);
  const totalMinutes = totalWords / 145;
  assert.ok(totalMinutes >= 95, `Expected >= 95 minutes of YouTube speeches, got ${totalMinutes.toFixed(1)}`);
  const ytEpisodes = buildRadioPodcastEpisodes(ytTracks, { channel: 'youtube_speeches', maxChars: 3600 });
  assert.ok(ytEpisodes.length >= 20);
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /function seekPocketRadio\(/);
  assert.match(appSrc, /aria-label",.*?"后退 5 秒"/);
  assert.match(appSrc, /aria-label",.*?"前进 5 秒"/);
});

test('20.4.1 podcast playback clock records 0s on failed synthesis and ~30s for 30s play + 60s pause', () => {
  // Scenario A: waited 10s for synthesis that failed before playback ever started -> 0s & 0 clips
  const failedClock = createRadioPlaybackClock();
  failedClock.onPlaybackPausedOrStopped(10_000);
  const failedSnap = failedClock.snapshot(10_000);
  assert.equal(failedSnap.activeMs, 0);
  assert.equal(failedSnap.clipsPlayed, 0);

  // Scenario B: played 30s, then paused 60s -> ~30s active, not 90s
  const playClock = createRadioPlaybackClock();
  playClock.onPlaybackStarted(100_000, { clips: 15, channel: 'youtube_speeches:podcast' });
  playClock.onPlaybackPausedOrStopped(130_000);
  const pausedSnap = playClock.snapshot(190_000);
  assert.equal(pausedSnap.activeMs, 30_000);
  assert.equal(pausedSnap.clipsPlayed, 15);

  // Verify app.js wires onActualPlay and does not increment clipsPlayed before synthesis
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /(?:elA|audio)\.onplaying = markStarted;/);
  assert.match(appSrc, /let episodeCounted = false;/);
  assert.match(appSrc, /describeHandoverRecordings/);
});
