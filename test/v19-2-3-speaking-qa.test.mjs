import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RADIO_CHANNELS } from '../radio.mjs';
import {
  parseSubtitleTimestamp,
  detectSubtitleSpeakerRole,
  parseSubtitleText,
  findActiveSegmentIndex,
  shouldAutoPauseAfterQuestion,
  pairAudioAndSubtitleFiles,
  planRawAudioImport,
  shouldTriggerCloudPreload,
  resolveRadioSourceLabel
} from '../radio-offline.mjs';

test('v19.8.1 RADIO_CHANNELS upgrades slot 1 to speaking_qa (🎤 口语问答·同步字幕)', () => {
  assert.equal(RADIO_CHANNELS.length, 4);
  assert.equal(RADIO_CHANNELS[0].id, 'speaking_qa');
  assert.match(RADIO_CHANNELS[0].label, /口语问答/);
  assert.equal(resolveRadioSourceLabel({ channel: 'speaking_qa' }), '节目原声');
  assert.equal(shouldTriggerCloudPreload({
    cloudPreloadEnabled: true,
    offlineOnly: false,
    channel: 'speaking_qa',
    isPlaying: true,
    durationSec: 200,
    currentTimeSec: 175,
    hasNextEpisode: true
  }), false);
});

test('v19.8.1 SRT & WebVTT parser extracts monotonic cues and Q/A speaker roles cleanly', () => {
  assert.equal(parseSubtitleTimestamp('00:01:12,500'), 72.5);
  assert.equal(parseSubtitleTimestamp('02:05.250'), 125.25);

  const srt = `\uFEFF1
00:00:00,500 --> 00:00:04,200
Examiner: Do you prefer living in a big city or a small town?

2
00:00:04,600 --> 00:00:11,800
Candidate: To be honest, I'd lean towards a mid-sized city because it offers convenience without feeling overwhelming.
`;
  const srtCues = parseSubtitleText(srt);
  assert.equal(srtCues.length, 2);
  assert.equal(srtCues[0].role, 'Q');
  assert.equal(srtCues[0].speaker, 'Examiner');
  assert.equal(srtCues[0].startSec, 0.5);
  assert.equal(srtCues[0].endSec, 4.2);
  assert.equal(srtCues[1].role, 'A');
  assert.equal(srtCues[1].speaker, 'Candidate');

  const vtt = `WEBVTT

NOTE Band 7 Speaking Practice

00:00.000 --> 00:03.500 align:start
<v Q>What do you usually do to wind down after work?</v>

00:03.800 --> 00:10.400
<v A>I usually go for a brisk walk and listen to an English podcast to clear my head.</v>
`;
  const vttCues = parseSubtitleText(vtt);
  assert.equal(vttCues.length, 2);
  assert.equal(vttCues[0].role, 'Q');
  assert.equal(vttCues[1].role, 'A');
  assert.match(vttCues[1].text, /brisk walk/);
});

test('v19.8.1 Active cue lookup respects ±offset and Q-end auto-pause fires once per question', () => {
  const segs = [
    { index: 0, startSec: 0, endSec: 4.0, role: 'Q', speaker: 'Examiner', text: 'Do you enjoy cooking?' },
    { index: 1, startSec: 4.5, endSec: 12.0, role: 'A', speaker: 'Candidate', text: 'Yes, I find it quite relaxing on weekends.' }
  ];
  assert.equal(findActiveSegmentIndex(segs, 2.0, { offsetSec: 0 }), 0);
  assert.equal(findActiveSegmentIndex(segs, 4.3, { offsetSec: 0.4 }), 1);

  const paused = new Set();
  const hit = shouldAutoPauseAfterQuestion(segs, 3.7, 4.02, { pauseAfterQ: true, pausedIndices: paused });
  assert.equal(hit.shouldPause, true);
  assert.equal(hit.segmentIndex, 0);
  paused.add(hit.segmentIndex);

  // Does not re-trigger for same Q segment
  const second = shouldAutoPauseAfterQuestion(segs, 3.9, 4.1, { pauseAfterQ: true, pausedIndices: paused });
  assert.equal(second.shouldPause, false);

  // Never pauses on A segment end or seek jump (>4s)
  const onA = shouldAutoPauseAfterQuestion(segs, 11.7, 12.1, { pauseAfterQ: true, pausedIndices: new Set() });
  assert.equal(onA.shouldPause, false);
  const onSeek = shouldAutoPauseAfterQuestion(segs, 0.2, 6.0, { pauseAfterQ: true, pausedIndices: new Set() });
  assert.equal(onSeek.shouldPause, false);
});

test('v19.8.1 pairAudioAndSubtitleFiles matches by stem and routes subtitled audio to speaking_qa', () => {
  const files = [
    { name: 'IELTS_Band7_Ep1.mp3' },
    { name: 'ielts_band7_ep1.vtt' },
    { name: 'Solo_Podcast.m4a' }
  ];
  const res = pairAudioAndSubtitleFiles(files);
  assert.equal(res.pairs.length, 2);
  assert.equal(res.pairs[0].subtitleFile?.name, 'ielts_band7_ep1.vtt');
  assert.equal(res.pairs[1].subtitleFile, null);
  assert.equal(res.orphanSubtitles.length, 0);

  // Convenience single-pair even with different filenames
  const single = pairAudioAndSubtitleFiles([{ name: 'audio_raw.mp3' }, { name: 'english_subs.srt' }]);
  assert.equal(single.pairs[0].subtitleFile?.name, 'english_subs.srt');

  const planned = planRawAudioImport([], {
    filename: 'IELTS_Band7_Ep1.mp3',
    audioSha256: 'abc123def4567890',
    bytes: 500000,
    durationSec: 185,
    hasSubtitles: true,
    segmentCount: 24,
    hasQaRoles: true,
    subtitleName: 'ielts_band7_ep1.vtt'
  });
  assert.equal(planned.action, 'add');
  assert.equal(planned.track.channel, 'speaking_qa');
  assert.equal(planned.track.hasSubtitles, true);
  assert.equal(planned.track.segmentCount, 24);
});

test('v19.8.1 UI & CSS guards: synced scrolling subtitles, recenter button, Q&A pause, mask answers & SRT/VTT picker', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(appSrc, /function syncRadioSubtitlesDom\(/);
  assert.match(appSrc, /radio-subtitle-panel/);
  assert.match(appSrc, /radio-subtitle-list/);
  assert.match(appSrc, /radio-sub-recenter-btn/);
  assert.match(appSrc, /radioPauseAfterQ/);
  assert.match(appSrc, /radioHideAnswers/);
  assert.match(appSrc, /radioSentenceLoopIdx/);
  assert.match(appSrc, /\.srt,\.vtt/);
  assert.match(cssSrc, /\.radio-subtitle-list/);
  assert.match(cssSrc, /\.radio-sub-line\.is-active/);
  assert.match(cssSrc, /\.radio-sub-line\.is-masked/);
});

test('v19.8.1 iPhone Pocket Radio mobile viewport lock, episode switcher strip, wrapped download actions & stale subtitle reset', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(css, /max-width:\s*min\(520px,\s*calc\(100vw - 20px\)\)/);
  assert.match(css, /\.pocket-radio-panel,\s*\.radio-now-playing,\s*\.radio-subtitle-panel\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.radio-sub-recenter-btn\[hidden\][\s\S]*display:\s*none\s*!important;/);
  assert.match(css, /\.radio-dl-actions\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(app, /radio-view-tabs/);
  assert.match(app, /radio-qa-append-bar/);
  assert.match(app, /radioActiveSegments = \[\];/);
});

test('v19.8.1 Music-player playlist & Q&A chapter question picker keep transport controls visible', () => {
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(css, /\.radio-view-tabs\s*\{/);
  assert.match(css, /\.radio-playlist-row\b/);
  assert.match(css, /\.radio-question-row\b/);
  assert.match(app, /radioPlayerTab/);
  assert.match(app, /radio-playlist-list/);
  assert.match(app, /radio-question-list/);
  assert.match(app, /💬 选问题/);
  assert.match(app, /🎵 歌单/);
});

test('v19.8.1 Cross-episode question bank, random mock examiner, in-place iOS search & savedPos pause guard', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /hydrateSpeakingQaQuestionBank/);
  assert.match(app, /🎲 随机抽一题考我/);
  assert.match(app, /radioPrevTimeForPause = savedPos;/);
  assert.match(app, /populatePlaylistRows\(\);/);
  assert.match(app, /populateQuestionRows\(\);/);
  assert.match(app, /renderScriptHits\(\);/);
  assert.doesNotMatch(app, /radioPlaylistFilter = searchInp\.value;\s*render\(\)/);
  assert.doesNotMatch(app, /radioSearchQuery = searchInp\.value;\s*render\(\)/);
});
