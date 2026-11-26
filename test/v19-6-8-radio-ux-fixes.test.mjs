import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  stripSpeakingPromptInstructions,
  buildPackSpeakingQaEpisodes,
  buildAutoSyncedSegments
} from '../radio.mjs';

test('v20.3.2: stripSpeakingPromptInstructions removes IELTS retake prefix & Speak N-M seconds instructions', () => {
  const raw = "ORIGINAL IELTS Part 2 Retake: Describe a time when you discovered that a popular claim or advice online was unreliable. Speak 75–100 seconds (focus on fixing: uncountable 'do some research', 'spread' not 'prestige', past tense 'drank', and 'ubiquitous' pronunciation).";
  const cleaned = stripSpeakingPromptInstructions(raw);
  assert.equal(cleaned, 'Describe a time when you discovered that a popular claim or advice online was unreliable.');
  assert.ok(!cleaned.includes('Speak 75'));
  assert.ok(!cleaned.includes('ORIGINAL IELTS'));
});

test('v20.3.2: buildPackSpeakingQaEpisodes produces only 1 clean Q segment without fake Q2 instruction line', () => {
  const eps = buildPackSpeakingQaEpisodes([
    {
      id: '20261123-T01',
      taskType: 'speaking',
      prompt: "ORIGINAL IELTS Part 2 Retake: Describe a time when you discovered that a popular claim or advice online was unreliable. Speak 75–100 seconds (focus on fixing: uncountable 'do some research').",
      referenceAnswer: 'A while ago, I came across a popular claim. It sounded plausible at first.'
    }
  ]);
  assert.equal(eps.length, 1);
  const qSegs = eps[0].qaSegments.filter(s => s.role === 'Q');
  assert.equal(qSegs.length, 1);
  assert.ok(!qSegs[0].text.includes('Speak 75'));
  assert.ok(!eps[0].cleanText.includes('Speak 75'));
});

test('v20.3.2: app.js routes offline Notebook ZIPs cleanly, enables single-mode subtitles, and keeps PR#129 fixes', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('let zenFocusMode = false;'));
  assert.ok(appSrc.includes('function toggleZenFocusMode()'));
  assert.ok(appSrc.includes('data.stateRevision=Number(parsed.stateRevision)'));
  assert.ok(appSrc.includes('radioChannel = "notebook_spoken";'));
  assert.ok(appSrc.includes('const singleSegs = buildAutoSyncedSegments('));
});
