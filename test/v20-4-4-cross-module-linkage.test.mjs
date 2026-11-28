import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../core.mjs';
import { buildHomeResumeBanner } from '../ux-100.mjs';
import { collectCrossModuleLexicon, matchCrossModuleWordsInText } from '../cross-link.mjs';

test('v20.4.6 bumps APP_VERSION and registers cross-link.mjs in sw.js', () => {
  assert.equal(APP_VERSION, '20.4.6');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /english-cultivation-static-v20\.4\.6/);
  assert.match(sw, /'\.\/cross-link\.mjs'/);
  assert.match(sw, /'\.\/release-safety\.mjs'/);
});

test('v20.4.6 preserves legacy spelling Home CTA for scripts/test-spelling-progress.mjs', () => {
  const res = buildHomeResumeBanner({
    dailyPack: { packId: 'P1', spellingTasks: [{ id: 's1', target: 'scramble' }] },
    dailyJourney: {
      packId: 'P1',
      steps: ['spelling'],
      index: 0,
      spellingIndex: 0,
      finishedAt: null
    }
  });
  assert.equal(res.primaryLabel, '开始／继续今日完整学习');
});

test('v20.4.6 cross-module linkage matches vocab misses, reading marks & historical learned words', () => {
  const data = {
    dailyPack: {
      packId: 'P1',
      vocabularyPractice: [
        { id: 'v1', target: 'persevere', is_review_mistake: true },
        { id: 'v2', target: 'rebuttal' }
      ],
      spellingTasks: [{ id: 's1', target: 'scramble' }]
    },
    dailyJourney: {
      packId: 'P1',
      vocabularyAttempts: [{ taskId: 'v2', packId: 'P1', correct: false }]
    },
    readingMarks: [{ word: 'allegiance', status: 'N' }],
    masteredVocabWords: ['vicious']
  };
  const lex = collectCrossModuleLexicon(data);
  const text = 'He scrambled over the rocks, offering a sharp rebuttal while his vicious rival tested his allegiance and forced him to persevere.';
  const hits = matchCrossModuleWordsInText(text, lex, 10);
  const keys = hits.map(h => h.key);
  assert.ok(keys.includes('rebuttal'));
  assert.ok(keys.includes('allegiance'));
  assert.ok(keys.includes('scramble'));
  assert.ok(keys.includes('persevere'));
  assert.ok(keys.includes('vicious'));
  // Missed vocab should rank ahead of mastered pool
  assert.ok(keys.indexOf('rebuttal') < keys.indexOf('vicious'));
});
