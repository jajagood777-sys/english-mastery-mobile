import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPackSpeakingQaEpisodes, buildRadioPlaylist } from '../radio.mjs';

test('v19.7.0: buildPackSpeakingQaEpisodes generates structured Q/A qaSegments for Question Bank & Mock Examiner', () => {
  const eps = buildPackSpeakingQaEpisodes([
    {
      id: '20261115-T01',
      task_type: 'speaking',
      prompt: 'Describe a time when you discovered that information you believed was unreliable.',
      model_answer: 'I once heard that warm milk before bed helps you sleep better, but my own experience showed a discrepancy.'
    }
  ]);
  assert.equal(eps.length, 1);
  assert.ok(Array.isArray(eps[0].qaSegments));
  assert.equal(eps[0].qaSegments.length, 2);
  assert.equal(eps[0].qaSegments[0].role, 'Q');
  assert.equal(eps[0].qaSegments[1].role, 'A');
});

test('v19.7.0: buildRadioPlaylist surfaces readingMarks as reading_vocab audio flashcards', () => {
  const tracks = buildRadioPlaylist({
    channel: 'sentences_listening',
    readingMarks: [
      { wordText: 'lighthouse', originalSentence: 'The villagers had stopped using the lighthouse thirty years earlier.', sourceTitle: 'Blackwater Point' },
      { wordText: 'archivist', originalSentence: 'Mara, a volunteer archivist, was hesitant to investigate.', sourceTitle: 'Blackwater Point' }
    ]
  });
  assert.ok(tracks.some(t => t.kind === 'reading_vocab' && t.title === 'lighthouse'));
  assert.ok(tracks.some(t => t.kind === 'reading_vocab' && t.title === 'archivist'));
});

test('v19.7.0: app.js hydrates pack speaking Qs into Question Bank and preserves FullGreen pagehide/reading guards', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /let readingBlurMode = false;/);
  assert.match(app, /let retellingRefVisible = \{\};/);
  assert.match(app, /if\(s\|\|journeyStage\(\)\)saveV19ExactResume/);
  assert.match(app, /ep\?\.fromLearningPack && Array\.isArray\(ep\.qaSegments\)/);
  assert.match(app, /allPackTransferTasks/);
});
