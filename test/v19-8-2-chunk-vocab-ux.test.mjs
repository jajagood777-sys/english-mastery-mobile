import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('v20.4.1 Chunk Assembly resets chunkPickIds in grade() and guards empty submit from skipping', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /s\.index\+\+;s\.step=null;s\.draft='';s\.chunkPickIds=\[\];/);
  assert.match(app, /请先点选下方语块拼出句子，或点「跳过并揭晓」。/);
  assert.match(app, /已拼句子（已选 \$\{pickedObjs\.length\} \/ \$\{chunkPack\.shuffled\.length\} 块/);
});

test('v20.4.1 Vocab progress no longer auto-loops misleading 15-word warm-up counter', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /if\(!vocabBatchTargetCount&&tasks\.length>20\)vocabBatchTargetCount=/);
  assert.doesNotMatch(app, /本组热身剩/);
  assert.match(app, /本段剩 \$\{batchLeft\} 题/);
});

test('v20.4.1 Chunk Assembly strictly resets chunkPickIds in grade() and guards by chunkItemId per item', () => {
  const appSrc = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const gradeLine = appSrc.split('\n').find(l => l.startsWith('function grade('));
  assert.ok(gradeLine && gradeLine.includes('s.chunkPickIds=[]') && gradeLine.includes('s.chunkItemId=null'), 'grade() must reset s.chunkPickIds and s.chunkItemId on every item transition');
  assert.ok(appSrc.includes('s.chunkItemId!==item.id'), 'buildSentenceQuestion must reset s.chunkPickIds whenever item.id changes');
});
