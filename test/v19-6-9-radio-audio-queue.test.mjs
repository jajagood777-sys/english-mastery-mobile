import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPackSpeakingQaEpisodes, stripSpeakingPromptInstructions } from '../radio.mjs';

test('v19.8.0: buildPackSpeakingQaEpisodes keeps rawText for offline MP3 hash matching while cleaning qaSegments', () => {
  const rawPrompt = "ORIGINAL IELTS Part 2 Retake: Describe a time when you discovered that a popular claim or advice online was unreliable. Speak 75–100 seconds (focus on fixing: uncountable 'do some research').";
  const model = "A while ago, I came across a popular claim. It sounded plausible.";
  const eps = buildPackSpeakingQaEpisodes([{
    id: '20261123-T01',
    taskType: 'speaking',
    prompt: rawPrompt,
    referenceAnswer: model
  }]);
  assert.equal(eps.length, 1);
  // episode.text MUST keep rawPrompt so speech-manifest.json SHA-256 matches pre-built learning pack MP3s!
  assert.ok(eps[0].text.includes('ORIGINAL IELTS Part 2 Retake:'));
  assert.ok(eps[0].cleanText && !eps[0].cleanText.includes('ORIGINAL IELTS'));
  // Subtitles remain clean
  const qSegs = eps[0].qaSegments.filter(s => s.role === 'Q');
  assert.equal(qSegs.length, 1);
  assert.ok(!qSegs[0].text.includes('Speak 75'));
});

test('v19.8.0: app.js clears single-track subtitles on track change, falls back offline lookup, and adds cross-channel queue picker', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('for (const candidate of [episode.cleanText, episode.modelAnswer].filter(Boolean))'));
  assert.ok(appSrc.includes('radioActiveEpisodeHash !== `track:${curTrackKey}`'));
  assert.ok(appSrc.includes('🎛️ 自选跨频道节目加入待听队列'));
  assert.ok(appSrc.includes('▶ 按队列顺序连播'));
});
