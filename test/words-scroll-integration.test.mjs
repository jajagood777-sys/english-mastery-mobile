import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('merged word-recall controls retain independent hint evidence',()=>{
  const start=app.indexOf('function recordWordPromptEvent(');
  const end=app.indexOf('function sentenceStyleOptions(',start);
  assert.ok(start>=0 && end>start, 'word hint evidence handler must survive scroll changes');
  const portion=app.slice(start,end);
  for(const marker of ['semantic_hint','form_hint','reference_answer','compareWordAnswer'])
    assert.match(portion,new RegExp(marker));
});
test('merged recording controls update locally without replacing the entire page',()=>{
  const start=app.indexOf('async function startActiveRecording(');
  const end=app.indexOf('function stopActiveRecording(',start);
  assert.ok(start>=0&&end>start);
  const source=app.slice(start,end);
  assert.match(source,/recorder\.start\(\);refreshRecordingPanel\(meta\)/);
  assert.match(source,/if\(controller\.renderAfterStop\)refreshRecordingPanel\(meta\)/);
  assert.doesNotMatch(source,/recorder\.start\(\);render\(\)/);
});
test('merged page retains focus guard, scroll anchor and service-worker precache',()=>{
  assert.match(app,/captureStableViewport\(app,target,window\)/);
  assert.match(app,/restoreStableViewport\(app,viewport,window\)/);
  assert.match(app,/document\.activeElement!==input/);
  assert.match(sw,/\.\/scroll-stability\.mjs/);
});
