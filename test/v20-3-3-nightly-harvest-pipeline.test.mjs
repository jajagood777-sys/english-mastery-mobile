import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_VERSION,
  collectReadingMarkEvidence,
  buildBattleReport,
  battleReportMarkdown,
  buildCentralLearningFeedback
} from '../core.mjs';
import { buildRadioPlaylist } from '../radio.mjs';

test('v20.4.0 collectReadingMarkEvidence, buildBattleReport, battleReportMarkdown, and buildCentralLearningFeedback preserve Word Harvest Bridge triage fields', () => {
  assert.equal(APP_VERSION, '20.4.0');
  const readings = [{ id: 'r1', title: 'Oasis Edge', text: 'Nadia was a new **apprentice** at the botanical station, and she walked the narrow aisle.' }];
  const readingMarks = [
    {
      id: 'mark:1',
      readingId: 'r1',
      wordText: 'aisle',
      normalizedWord: 'aisle',
      originalSentence: 'She walked the narrow aisle.',
      sourceTitle: 'Oasis Edge',
      paragraphIndex: 0,
      position: 50,
      savedStatus: 'SAVED',
      savedItemId: 'w:1',
      harvestTier: 'promote',
      harvestRecalled: false,
      harvestedAt: '2026-11-27T01:00:00.000Z',
      packId: 'EN-DAILY-20261126'
    },
    {
      id: 'mark:2',
      readingId: 'r1',
      wordText: 'clockwork',
      normalizedWord: 'clockwork',
      originalSentence: 'Its morning routine ran like clockwork.',
      sourceTitle: 'Oasis Edge',
      paragraphIndex: 0,
      position: 10,
      savedStatus: 'UNSAVED',
      harvestTier: 'drop',
      harvestRecalled: true,
      harvestedAt: '2026-11-27T01:01:00.000Z',
      packId: 'EN-DAILY-20261126'
    }
  ];

  const evidence = collectReadingMarkEvidence(readingMarks, readings, []);
  assert.equal(evidence.length, 2);
  assert.equal(evidence[0].harvestTier, 'promote');
  assert.equal(evidence[0].harvestRecalled, false);
  assert.equal(evidence[1].harvestTier, 'drop');
  assert.equal(evidence[1].harvestRecalled, true);

  const report = buildBattleReport({
    session: { id: 'sess-2033', startedAt: '2026-11-27T00:00:00Z', endedAt: '2026-11-27T00:25:00Z', activeMs: 1500000, mode: 'journey' },
    attempts: [],
    items: [],
    readings,
    readingMarks
  });
  const md = battleReportMarkdown(report);
  assert.match(md, /收割分流：🔥明日必考（挖空回忆：未想起）/);
  assert.match(md, /收割分流：🗑️略过（挖空回忆：想起来）/);

  const feedback = buildCentralLearningFeedback({ report });
  assert.equal(feedback.reading_vocabulary_evidence.items[0].harvest_tier, 'promote');
  assert.equal(feedback.reading_vocabulary_evidence.items[0].harvest_recalled, false);
  assert.equal(feedback.reading_vocabulary_evidence.items[1].harvest_tier, 'drop');
});

test('v20.4.0 buildRadioPlaylist excludes dropped reading marks while keeping promoted and untriaged marks', () => {
  const tracks = buildRadioPlaylist({
    channel: 'sentences_listening',
    readingMarks: [
      { wordText: 'aisle', originalSentence: 'She walked the narrow aisle.', harvestTier: 'promote' },
      { wordText: 'clockwork', originalSentence: 'Routine ran like clockwork.', harvestTier: 'drop' },
      { wordText: 'footing', originalSentence: 'She found steady footing.' }
    ]
  });
  assert.ok(tracks.some(t => t.kind === 'reading_vocab' && t.title === 'aisle'));
  assert.ok(tracks.some(t => t.kind === 'reading_vocab' && t.title === 'footing'));
  assert.ok(!tracks.some(t => t.kind === 'reading_vocab' && t.title === 'clockwork'), 'dropped mark must not pollute radio flashcards');
});

test('v20.4.0 app.js renders reading marks across Sentence Focus and bold-markdown paragraphs and skips already-harvested marks in legacy recall queue', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function resolveMarkStartInText\(/);
  assert.match(app, /function appendMarkedReadingSegment\(/);
  assert.match(app, /if\(\['promote','passive','drop'\]\.includes\(mark\.harvestTier\)\)continue;/);
});
