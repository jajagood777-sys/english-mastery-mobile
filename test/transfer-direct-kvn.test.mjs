import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../core.mjs',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('daily transfer shows initial answer then reference, directly followed by K/V/N',()=>{
  const start=app.indexOf('function renderTransferChallenge(){');
  const end=app.indexOf('function submitTransferRecordingOnly(){',start);
  assert.ok(start>=0 && end>start);
  const ui=app.slice(start,end);
  assert.match(ui,/你的初答：/);
  assert.match(ui,/参考表达：/);
  assert.ok(ui.indexOf('你的初答：') < ui.indexOf('参考表达：'));
  assert.match(ui,/请根据真实回忆自评/);
  assert.ok(ui.indexOf('参考表达：') < ui.indexOf('请根据真实回忆自评'));
  for(const obsolete of ['查看参考表达','自我修正 / 修改稿','暂不修改，保留初稿','保存自我修正','role:\'retry\''])
    assert.ok(!ui.includes(obsolete), 'obsolete post-submit control: '+obsolete);
  for(const rating of ["['K','本次自评掌握'","['V','模糊'","['N','不会'"])
    assert.ok(ui.includes(rating));
});
test('independent weakness transfer also skips correction UI but preserves K/V/N',()=>{
  const start=app.indexOf('function renderTransferPractice(){');
  const end=app.indexOf('function submitWeaknessRecordingOnly(',start);
  assert.ok(start>=0 && end>start);
  const ui=app.slice(start,end);
  assert.match(ui,/第一次回答：/);
  assert.match(ui,/参考表达：/);
  assert.ok(ui.indexOf('第一次回答：') < ui.indexOf('参考表达：'));
  assert.match(ui,/rateWeaknessTransfer\(active,rating\)/);
  for(const obsolete of ['查看参考表达','独立重答 / 自我修正','修改稿（原稿会保留）'])
    assert.ok(!ui.includes(obsolete),obsolete);
});
test('first-answer evidence survives and the reference is marked displayed only after submit',()=>{
  for(const marker of ['function submitTransfer(answer)','function submitTransferRecordingOnly()','function submitWeaknessTransfer(active,answer)','function submitWeaknessRecordingOnly(active)'])
    assert.match(app,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(app,/firstAnswer:j\.transferDraft/);
  assert.match(app,/firstAnswer:String\(answer\|\|''\)/);
  assert.match(app,/recordingIds:ids/);
  assert.equal((app.match(/referenceViewed:true/g)||[]).length,4);
});
test('new app and PWA cache versions match',()=>{
  assert.match(core,/APP_VERSION = '10\.3\.3'/);
  assert.match(sw,/english-cultivation-static-v10\.3\.3/);
});
