import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPackSpeakingQaEpisodes, buildRadioPlaylist } from '../radio.mjs';

test('v20.3.6: buildPackSpeakingQaEpisodes converts daily pack speaking tasks into playable Q&A episodes', () => {
  const eps = buildPackSpeakingQaEpisodes([
    {
      id: 'T01',
      task_type: 'speaking',
      prompt: 'ORIGINAL IELTS Part 2-style: Describe a time when you verified a rumour.',
      model_answer: 'I once checked a rumour about warm milk before bed and found it was mostly psychological.',
      target_phrases: ['plausible', 'discrepancy']
    },
    { id: 'W01', task_type: 'writing', prompt: 'Write an essay.' }
  ], { packTitle: 'V22 Lite' });
  assert.equal(eps.length, 1);
  assert.equal(eps[0].fromLearningPack, true);
  assert.equal(eps[0].isOriginalAudio, false);
  assert.equal(eps[0].hasQaRoles, true);
  assert.equal(eps[0].tracksIncluded.length, 2);
  assert.match(eps[0].text, /warm milk before bed/);
});

test('v20.3.6: sentences_listening radio channel pulls missed/skipped vocab, pack readings, and speaking models', () => {
  const tracks = buildRadioPlaylist({
    channel: 'sentences_listening',
    vocabularyPractice: [
      { id: 'v1', target: 'pivotal', archivedExample: 'A single timestamp became pivotal.', targetSense: 'Extremely important' },
      { id: 'v2', target: 'known', archivedExample: 'Already mastered word.', targetSense: 'Known' }
    ],
    vocabularyAttempts: [
      { taskId: 'v1', skipped: true, correct: false },
      { taskId: 'v2', skipped: false, correct: true }
    ],
    readings: [
      { id: 'r1', title: 'Blackwater Point', text: 'The villagers had stopped using the lighthouse thirty years earlier. Its metal shutter had been sealed.' }
    ],
    transferTasks: [
      { id: 't1', taskType: 'speaking', prompt: 'Describe a rumour', referenceAnswer: 'A plausible story is not the same as verified information.' }
    ]
  });
  assert.ok(tracks.some(t => t.kind === 'vocab' && t.title === 'pivotal'));
  assert.ok(!tracks.some(t => t.kind === 'vocab' && t.title === 'known'));
  assert.ok(tracks.some(t => t.kind === 'reading' && /lighthouse/.test(t.text)));
  assert.ok(tracks.some(t => t.kind === 'speaking_model' && /plausible story/.test(t.text)));
});
