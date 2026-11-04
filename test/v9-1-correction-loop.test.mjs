import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSpellingSummary,normalizeTransferAttempt} from '../core.mjs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('V9.1 existing Journey keeps correction inside the original task surface',()=>{
  assert.match(app,/retryBox\(container,item,s/);
  assert.match(app,/retryCompleted/);
  assert.match(app,/retrySubmittedAt/);
  assert.match(app,/第一次答案|原答案|retry-box/);
  assert.doesNotMatch(app,/创建新的错词复习页|开始错词复习/);
});

test('V9.1 correction evidence keeps first error and retry success separate',()=>{
  const summary=buildSpellingSummary([{taskId:'sp-1',firstAnswer:'exausting',firstCheck:{status:'incorrect',errorType:'missing_letter'},retryAnswer:'exhausting',retryCheck:{status:'correct'}}]);
  assert.equal(summary.firstCorrect,0);assert.equal(summary.firstIncorrect,1);assert.equal(summary.retryCorrect,1);assert.deepEqual(summary.pendingDelayedReview,[]);
});

test('V9.1 open transfer answers remain unassessed instead of becoming objective errors',()=>{
  const row=normalizeTransferAttempt({id:'t-1',taskType:'writing',firstAnswer:'A thoughtful answer.',rating:null,autoCheck:{status:'unassessed'}});
  assert.equal(row.rating,null);assert.equal(row.status,'submitted');
});
