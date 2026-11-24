import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('v20.0.1 Chunk Assembly resets chunkPickIds in grade() and guards empty submit from skipping', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /s\.index\+\+;s\.step=null;s\.draft='';s\.chunkPickIds=\[\];/);
  assert.match(app, /请先点选下方语块拼出句子，或点「跳过并揭晓」。/);
  assert.match(app, /已拼句子（已选 \$\{pickedObjs\.length\} \/ \$\{chunkPack\.shuffled\.length\} 块/);
});

test('v20.0.1 Vocab progress no longer auto-loops misleading 15-word warm-up counter', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /if\(!vocabBatchTargetCount&&tasks\.length>20\)vocabBatchTargetCount=/);
  assert.doesNotMatch(app, /本组热身剩/);
  assert.match(app, /本段剩 \$\{batchLeft\} 题/);
});
