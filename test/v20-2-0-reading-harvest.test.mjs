import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HARVEST_TRIAGE_TIERS,
  buildContextualCloze,
  resolveHarvestOfflineGloss,
  buildHarvestCard,
  summarizeHarvestProgress,
  filterMarksForTomorrowPack
} from '../reading-harvest.mjs';
import { mergeReadingMarks } from '../core.mjs';

test('v20.4.9 reading-harvest builds contextual cloze, resolves offline gloss, and tracks 3-way triage', () => {
  assert.equal(HARVEST_TRIAGE_TIERS.length, 3);
  const cloze = buildContextualCloze('A calm sense of purpose seemed to pervade the quiet study hall.', 'pervade');
  assert.equal(cloze, 'A calm sense of purpose seemed to ______ the quiet study hall.');

  const gloss = resolveHarvestOfflineGloss('pervade', {
    archive: [{ expression: 'pervade', senseEn: 'To spread through every part of something.' }]
  });
  assert.match(gloss, /spread through/i);

  const card = buildHarvestCard(
    { id: 'm1', wordText: 'pervade', originalSentence: 'A calm sense of purpose seemed to pervade the quiet study hall.' },
    { archive: [{ expression: 'pervade', senseEn: 'To spread through every part of something.' }] }
  );
  assert.equal(card.triage, 'pending');
  assert.equal(card.clozedSentence, cloze);
  assert.match(card.senseEn, /spread through/i);
});

test('v20.4.9 summarizeHarvestProgress and filterMarksForTomorrowPack exclude passive/drop and keep promoted/legacy marks', () => {
  const marks = [
    { id: '1', wordText: 'pervade', harvestTier: 'promote', harvestRecalled: true },
    { id: '2', wordText: 'insulated', harvestTier: 'passive', harvestRecalled: false },
    { id: '3', wordText: 'oasis', harvestTier: 'drop', harvestRecalled: true },
    { id: '4', wordText: 'bracket', harvestTier: null }
  ];
  const sum = summarizeHarvestProgress(marks);
  assert.equal(sum.total, 4);
  assert.equal(sum.harvested, 3);
  assert.equal(sum.pending, 1);
  assert.equal(sum.promoted, 1);
  assert.equal(sum.passive, 1);
  assert.equal(sum.dropped, 1);
  assert.equal(sum.recalledCount, 2);
  assert.equal(sum.completed, false);

  const tomorrow = filterMarksForTomorrowPack(marks);
  assert.deepEqual(tomorrow.map(m => m.wordText), ['pervade', 'bracket']);
});

test('v20.4.9 mergeReadingMarks preserves harvestTier, harvestRecalled, and harvestedAt across backup merge', () => {
  const merged = mergeReadingMarks(
    [{
      readingId: 'r1',
      wordText: 'pervade',
      originalSentence: 'A calm sense of purpose seemed to pervade the hall.',
      paragraphIndex: 0,
      position: 10,
      harvestTier: 'promote',
      harvestRecalled: true,
      harvestedAt: '2026-11-26T08:00:00.000Z'
    }],
    [{
      readingId: 'r1',
      wordText: 'pervade',
      originalSentence: 'A calm sense of purpose seemed to pervade the hall.',
      paragraphIndex: 0,
      position: 10
    }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].harvestTier, 'promote');
  assert.equal(merged[0].harvestRecalled, true);
  assert.equal(merged[0].harvestedAt, '2026-11-26T08:00:00.000Z');
});

test('v20.4.9 app.js, styles.css, and sw.js wire Word Harvest Bridge cleanly', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(appSrc, /function renderReadingWordHarvestBridge\(/);
  assert.match(appSrc, /reading-harvest\.mjs/);
  assert.match(appSrc, /读后生词收割台/);
  assert.match(cssSrc, /\.reading-harvest-bridge/);
  assert.match(cssSrc, /\.harvest-triage-bar/);
  assert.match(swSrc, /\.\/reading-harvest\.mjs/);
  assert.match(swSrc, /english-cultivation-static-v20\.4\.9/);
});
