import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSentenceChunks } from '../core.mjs';

test('v19.8.2 buildSentenceChunks splits sentence into 3-6 shuffled chunks that reconstruct exact original text', () => {
  const s = 'Despite the unexpected delay, the team managed to deliver the prototype on schedule.';
  const res = buildSentenceChunks(s);
  assert.ok(res);
  assert.ok(res.ordered.length >= 4 && res.ordered.length <= 6);
  assert.equal(res.ordered.join(' '), s);
  assert.equal(res.shuffled.length, res.ordered.length);
  const reassembled = res.shuffled.slice().sort((a, b) => a.order - b.order).map(c => c.text).join(' ');
  assert.equal(reassembled, s);
  assert.equal(buildSentenceChunks('Hi'), null);
});

test('v19.8.2 app.js puts reading before sentences in new Journeys, uses 10-item retry lag, adds Chunk Assembly and Mastered Auto-Skip', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /'words','reading',\.\.\.\(data\.dailyPack\?\.spellingTasks/);
  assert.match(app, /showAtIndex:Math\.min\(tasks\.length,j\.vocabularyIndex\+10\)/);
  assert.match(app, /\['chunks','语块拼句','点选语块免打字'\]/);
  assert.match(app, /语块拼句 · CHUNK ASSEMBLY/);
  assert.match(app, /function isVocabMastered/);
  assert.match(app, /function toggleVocabMastered/);
  assert.match(app, /✓ 斩词/);
});
