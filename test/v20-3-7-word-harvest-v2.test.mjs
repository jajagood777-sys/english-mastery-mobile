import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  splitSentenceWithHighlight,
  buildHarvestQuizOptions,
  buildHarvestAiGlossPrompt,
  parseHarvestAiGlossResponse
} from '../reading-harvest.mjs';

test('v20.4.7: splitSentenceWithHighlight bolds exact target word inside original sentence', () => {
  const segs = splitSentenceWithHighlight('Nadia was an apprentice at the botanical station.', 'botanical');
  const hit = segs.find(s => s.highlight);
  assert.ok(hit, 'target word must be highlighted');
  assert.equal(hit.text, 'botanical');
  assert.equal(segs.map(s => s.text).join(''), 'Nadia was an apprentice at the botanical station.');
});

test('v20.4.7: buildHarvestQuizOptions returns 3 unique deterministic options including target', () => {
  const marks = [
    { wordText: 'oasis' },
    { wordText: 'botanical' },
    { wordText: 'amber' },
    { wordText: 'gauge' }
  ];
  const opts1 = buildHarvestQuizOptions('botanical', { marks });
  const opts2 = buildHarvestQuizOptions('botanical', { marks });
  assert.equal(opts1.length, 3);
  assert.deepEqual(opts1, opts2);
  assert.ok(opts1.includes('botanical'));
  assert.equal(new Set(opts1.map(x => x.toLowerCase())).size, 3);
});

test('v20.4.7: parseHarvestAiGlossResponse extracts ZH, EN, and CHUNK cleanly', () => {
  const prompt = buildHarvestAiGlossPrompt('gauge', 'The gauge read slightly low.');
  assert.match(prompt, /ZH:/);
  const parsed = parseHarvestAiGlossResponse('ZH: 仪表、测量计\nEN: an instrument for measuring pressure or level\nCHUNK: pressure gauge');
  assert.equal(parsed.zh, '仪表、测量计');
  assert.equal(parsed.en, 'an instrument for measuring pressure or level');
  assert.equal(parsed.chunk, 'pressure gauge');
});

test('v20.4.7: app.js and styles.css wire Encode-First Word Harvest 2.0 and clear triage cards', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(process.cwd(), 'styles.css'), 'utf8');
  assert.match(appSrc, /fetchHarvestInlineGloss/);
  assert.match(appSrc, /splitSentenceWithHighlight/);
  assert.match(appSrc, /buildHarvestQuizOptions/);
  assert.match(appSrc, /harvest-triage-card/);
  assert.match(cssSrc, /\.harvest-meaning-box/);
  assert.match(cssSrc, /\.harvest-choice-btn\.is-correct/);
});
