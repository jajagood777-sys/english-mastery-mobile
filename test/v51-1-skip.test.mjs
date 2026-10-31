import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recordsFromLearningPack} from '../core.mjs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/v51-1-006.json',import.meta.url),'utf8'));

test('V5.1.1 006 fixture keeps the speaking → reading-to-speaking → writing → grammar order',()=>{
  const out=recordsFromLearningPack(fixture);
  assert.deepEqual(out.transferTasks.map(task=>task.id),['EN-V51-006-T01','EN-V51-006-T02','EN-V51-006-T03','EN-V51-006-T04']);
  assert.deepEqual(out.transferTasks.map(task=>task.taskType),['speaking','reading_to_speaking','writing','grammar']);
});

test('V5.1.1 routes every transfer advance through the safe boundary function',()=>{
  assert.match(app,/function advanceTransferTask\(/);
  assert.match(app,/btn\('跳过本题',\(\)=>advanceTransferTask\(\{action:'skip'\}\)/);
  assert.match(app,/function finishTransferStage\(/);
  assert.match(app,/j\.transferIndex=tasks\.length/);
  assert.match(app,/j\.transferSkippedTaskIds/);
  assert.match(app,/j\.transferDraft=String\(j\.transferDraft\|\|''\)/);
});

test('V5.1.1 has a recoverable render path instead of clearing to a blank work area',()=>{
  assert.match(app,/function renderError\(error\)/);
  assert.match(app,/返回学习总览/);
  assert.match(app,/恢复当前学习/);
  assert.match(app,/function renderTransferRecovery\(/);
  assert.match(app,/if\(recordingController\?\.recorder\?\.state==='recording'\)/);
});
