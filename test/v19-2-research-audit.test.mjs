import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_VERSION,
  compareAnswer,
  persistState,
  addActiveInterval,
  summarizeSessionTime,
  replayFsrsShadowHistory
} from '../core.mjs';

test('v20.1.0 Blind Grading Audit: accepts UK/US variants & curly quotes while rejecting meaning-changing errors', () => {
  assert.equal(APP_VERSION, '20.1.0');
  // Accepted UK/US variants (preserves original user text verbatim)
  const uk1 = compareAnswer('colour', 'color');
  assert.equal(uk1.status, 'correct');
  assert.equal(uk1.variant_accepted, true);
  assert.equal(uk1.user, 'colour');

  const uk2 = compareAnswer('We need to organise the programme.', 'We need to organize the program.');
  assert.equal(uk2.status, 'correct');
  assert.equal(uk2.variant_accepted, true);

  // Holdout UK/US pair
  const uk3 = compareAnswer('neighbour', 'neighbor');
  assert.equal(uk3.status, 'correct');

  // iPhone smart apostrophe / quote normalization
  const smartQ = compareAnswer('don’t', "don't");
  assert.equal(smartQ.status, 'case_or_punctuation');

  // Meaning-changing / tense errors MUST still be rejected
  assert.equal(compareAnswer('leave', 'live').status, 'incorrect');
  assert.equal(compareAnswer('go', 'went').status, 'incorrect');
  assert.equal(compareAnswer('borrow', 'lend').status, 'incorrect');
});

test('v20.1.0 Cross-Tab Stale-Write Guard: older tab revision cannot overwrite newer saved learning state', () => {
  const mem = new Map();
  const storage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v)
  };
  const first = persistState(storage, 'store', { stateRevision: 1, attempts: [{ id: 'a1' }] });
  assert.equal(first.ok, true);
  const newer = persistState(storage, 'store', { stateRevision: 2, attempts: [{ id: 'a1' }, { id: 'a2' }] });
  assert.equal(newer.ok, true);
  // Stale tab still at revision 1 tries to overwrite revision 3
  const stale = persistState(storage, 'store', { stateRevision: 1, attempts: [{ id: 'a1' }] });
  assert.equal(stale.ok, false);
  assert.equal(stale.conflict, 'stale_tab_revision');
  assert.equal(JSON.parse(mem.get('store')).attempts.length, 2);
});

test('v20.1.0 Cross-Midnight Asia/Shanghai Continuation & Unstamped FSRS Exclusion', () => {
  // 2026-11-21 23:59:59.500+08:00 to 2026-11-22 00:00:00.500+08:00 (1000ms split across Beijing midnight)
  const start = Date.parse('2026-11-21T23:59:59.500+08:00');
  const end = Date.parse('2026-11-22T00:00:00.500+08:00');
  const buckets = addActiveInterval({}, start, end, 1800);
  assert.equal(buckets['2026-11-21'], 500);
  assert.equal(buckets['2026-11-22'], 500);
  const total = summarizeSessionTime([{ activeMs: 1000, activeByDay: buckets }], '2026-11-21', '2026-11-22');
  assert.equal(total.knownMs, 1000, 'Cross-midnight active ms must be counted exactly once');

  // Missing timestamp or prompted attempt must NOT fabricate FSRS history
  const shadow = replayFsrsShadowHistory([
    { item_id: 'w:1', rating: 'K', prompt_used: false, viewed_answer: false, at: '' },
    { item_id: 'w:2', rating: 'K', prompt_used: true, viewed_answer: false, at: '2026-11-21T12:00:00+08:00' }
  ], new Date('2026-11-22T12:00:00+08:00'));
  assert.equal(shadow.qualifiedIndependentEvents, 0);
  assert.equal(shadow.trackedCards, 0);
});

test('v20.1.0 iPhone 14 Pro Max Guards: IME composition Enter, visualViewport keyboard-open & SW non-destructive update', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('e.isComposing'), 'IME composition Enter guard required');
  assert.ok(appSrc.includes('v19-keyboard-open'), 'visualViewport keyboard-open class required');
  assert.ok(appSrc.includes("addEventListener('controllerchange'"), 'SW non-destructive controllerchange notice required');
  assert.ok(cssSrc.includes('html.v19-keyboard-open .mobile-nav'), 'Keyboard-open bottom nav hide rule required');
});

test('v20.1.0 Pocket Radio iOS Safari & Double-Voice Regression Guard: single audio owner, structured decode/autoplay recovery, and ArrayBuffer IndexedDB cache', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const aiSrc = fs.readFileSync(new URL('../ai-tutor.mjs', import.meta.url), 'utf8');

  // Bug 1 fix: IndexedDB stores iOS-safe ArrayBuffer bytes and supports single-entry eviction on decode_error
  assert.ok(aiSrc.includes('export async function deletePersistentTtsAudio'), 'ai-tutor.mjs must export deletePersistentTtsAudio');
  assert.ok(aiSrc.includes('new Blob([rec.bytes]'), 'readPersistentTtsAudio must reconstruct fresh Blob from stored ArrayBuffer bytes');
  assert.ok(appSrc.includes('async function evictGeminiAudioCache'), 'app.js must support evicting corrupted cached audio');
  assert.ok(appSrc.includes('playRes.reason === "decode_error" && entry.fromCache && !retryFresh'), 'playRadioPodcastAt must auto-evict corrupted cache and retry once instead of looping on autoplay prompt');
  assert.ok(appSrc.includes('err?.name === "NotAllowedError"'), 'playUrlOnRadioAudio must distinguish NotAllowedError from decode_error');
  assert.ok(!appSrc.includes('try { elA.load(); } catch {}'), 'playUrlOnRadioAudio must not call elA.load() synchronously before elA.play() on iOS Safari');

  // Bug 2 fix: zero overlapping double voices on track/episode/channel switch and zero untracked new Audio()
  assert.ok(appSrc.includes('function stopAllRadioPlayback()'), 'app.js must define unified stopAllRadioPlayback()');
  assert.match(appSrc, /async function playRadioPodcastAt\([\s\S]{0,120}stopAllRadioPlayback\(\);/, 'playRadioPodcastAt must silence prior audio immediately');
  assert.match(appSrc, /async function playRadioTrackAt\([\s\S]{0,80}stopAllRadioPlayback\(\);/, 'playRadioTrackAt must silence prior audio immediately');
  const playUrlFn = appSrc.slice(appSrc.indexOf('function playUrlOnRadioAudio('), appSrc.indexOf('async function playRadioSegment('));
  assert.ok(!playUrlFn.includes('new Audio('), 'playUrlOnRadioAudio must never spawn untracked new Audio() instances that cause double voices');
  assert.ok(appSrc.includes('if(document.hidden){radioAudioUnlocked=false;}'), 'visibilitychange(hidden) must reset radioAudioUnlocked for iOS');
});

test('v20.1.0 Offline Radio Pack ZIP & Seamless Preload Guard: offline-first af_heart playback, ArrayBuffer clip storage, pure audio ZIP import & next-episode preload', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const scSrc = fs.readFileSync(new URL('../speech-clips.mjs', import.meta.url), 'utf8');
  assert.ok(scSrc.includes('export async function hasLocalSpeechClip'), 'speech-clips.mjs must export hasLocalSpeechClip');
  assert.ok(scSrc.includes('new Blob([local.bytes]'), 'speech-clips.mjs must reconstruct Blob from iOS-safe ArrayBuffer bytes');
  assert.ok(appSrc.includes('async function importOfflineRadioZipFile'), 'app.js must support importing pure offline radio audio ZIP packs');
  assert.ok(appSrc.includes('📦 导入离线音频包 ZIP'), 'Pocket Radio drawer must expose one-tap offline audio ZIP import');
  assert.ok(appSrc.includes('offlineRec = await getSpeechClipRecord(episode.text, "af_heart")'), 'playRadioPodcastAt must check offline af_heart audio pack BEFORE cloud AI TTS');
  assert.ok(appSrc.includes('async function maybePreloadNextPodcastEpisode'), 'app.js must support seamless next-episode preloading');
  assert.ok(appSrc.includes('radioAutoPreloadNext'), 'app.js must expose seamless preload toggle');
});
