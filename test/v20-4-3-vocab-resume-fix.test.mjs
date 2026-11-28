import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../core.mjs';
import { buildHomeResumeBanner } from '../ux-100.mjs';

test('v20.4.7 bumps APP_VERSION and sw.js CACHE', () => {
  assert.match(APP_VERSION, /^20\.4\.(3|4|5|6|7)$/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /english-cultivation-static-v20\.4\.(3|4|5|6|7)/);
});

test('v20.4.7 ux-100 Home CTA uses vocabularyIndex & skips already-answered tasks instead of sticking on #1', () => {
  const tasks = [
    { id: 'v1', target: 'excessive' },
    { id: 'v2', target: 'ferry' },
    { id: 'v3', target: 'insulated' }
  ];
  // Case A: vocabularyIndex stuck at 0, but v1 & v2 already attempted -> should show #3
  const resA = buildHomeResumeBanner({
    dailyPack: { packId: 'P1', vocabularyPractice: tasks },
    dailyJourney: {
      packId: 'P1',
      steps: ['vocabulary', 'reading'],
      index: 0,
      vocabularyIndex: 0,
      vocabularyAttempts: [{ taskId: 'v1', packId: 'P1' }, { taskId: 'v2', packId: 'P1' }]
    }
  });
  assert.equal(resA.primaryLabel, '继续词汇阶段 · 第 3 题');

  // Case B: all tasks attempted -> should offer completion transition
  const resB = buildHomeResumeBanner({
    dailyPack: { packId: 'P1', vocabularyPractice: tasks },
    dailyJourney: {
      packId: 'P1',
      steps: ['vocabulary', 'reading'],
      index: 0,
      vocabularyIndex: 0,
      vocabularyAttempts: tasks.map(t => ({ taskId: t.id, packId: 'P1' }))
    }
  });
  assert.equal(resB.primaryLabel, '完成词汇收尾 → 进入下一模块');
});

test('v20.4.7 app.js advances vocabularyIndex to first unanswered task on resume', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function findNextUnansweredVocabIndex\(tasks, journey, globalAttempts = \[\]\)/);
  assert.match(app, /j\.vocabularyIndex=findNextUnansweredVocabIndex\(tasks,j,data\.vocabularyAttempts\);/);
});
