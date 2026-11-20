import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {shanghaiDateStamp,validRecordingBlob,isCurrentAiLookup,runtimeEntryMode} from '../release-safety.mjs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('v19.1.1 export date uses Asia/Shanghai, including UTC midnight boundary',()=>{
  assert.equal(shanghaiDateStamp(new Date('2026-11-20T16:30:00Z')),'2026-11-21');
  assert.equal(shanghaiDateStamp(new Date('2026-11-20T15:59:59Z')),'2026-11-20');
  assert.equal(shanghaiDateStamp(new Date('2026-01-01T01:00:00Z')),'2026-01-01');
  assert.doesNotMatch(app,/new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/);
  assert.ok((app.match(/shanghaiDateStamp\(\)/g)||[]).length>=4);
});

test('v19.1.1 keyboard Enter submission does not trigger during IME composition',()=>{
  const handlers=(app.match(/(?:input|window)\.addEventListener\(['"]keydown['"][^\n]*/g)||[]);
  assert.ok(handlers.length>=5);
  assert.equal(handlers.filter(s=>s.includes('e.isComposing || e.keyCode === 229')).length,handlers.length-1);
  assert.match(app,/window\.addEventListener\("keydown", e => \{\s*if \(e\.isComposing \|\| e\.keyCode === 229\) return;/);
});

test('v19.1.1 AI lookup discards stale, edited-query and closed-drawer replies',()=>{
  assert.equal(isCurrentAiLookup(4,4,'critical','critical',true),true);
  assert.equal(isCurrentAiLookup(3,4,'critical','critical',true),false);
  assert.equal(isCurrentAiLookup(4,4,'critical','critic',true),false);
  assert.equal(isCurrentAiLookup(4,4,'critical','critical',false),false);
  assert.match(app,/const requestId = \+\+aiDictRequestSerial/);
  assert.match(app,/invalidateAiDictRequest\(\); window\.__yandaoAiDrawerMode/);
  assert.match(app,/if \(!isCurrentAiLookup\(/);
});

test('v19.1.1 setup shows current isolated PWA or Safari entry; offline precache has guard',()=>{
  assert.equal(runtimeEntryMode({standalone:true}),'主屏幕独立 PWA');
  assert.equal(runtimeEntryMode({standalone:false}),'Safari 标签页');
  assert.match(app,/runtime-entry-notice/);
  assert.match(app,/本机学习记录、录音和缓存彼此隔离/);
  assert.match(sw,/\.\/release-safety\.mjs/);
  assert.match(sw,/static-v19\.1\.1/);
});

function recordingHarness(size=7,includeAudioTracks=true){
  const messages=[], saved=[], revoked=[],listeners=new Map();
  const track={onended:null,stop(){this.stopped=true;}};
  const stream={getTracks:()=>[track]};
  if(includeAudioTracks)stream.getAudioTracks=()=>[track];
  const recorderBox={current:null};
  class FakeRecorder{
    constructor(){this.state='inactive';this.mimeType='audio/webm';recorderBox.current=this;}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable?.({data:{size}});this.onstop?.();}
  }
  class FakeBlob{constructor(chunks){this.size=chunks.reduce((a,x)=>a+x.size,0);}}
  const doc={hidden:false,addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type);}};
  const ctx={
    recordingCapability:()=>({supported:true,mimeType:'audio/webm'}),
    stopSpeech(){},stopActiveAudio(){},stopLocalAudio(){},
    navigator:{mediaDevices:{getUserMedia:async()=>stream}},
    MediaRecorder:FakeRecorder, Blob:FakeBlob, document:doc,
    activeRecordingPanel:()=>({}),refreshRecordingPanel(){},
    putRecording:async (_meta,blob)=>{saved.push(blob);return {id:'r1'};},
    validRecordingBlob,notify:message=>messages.push(message),
    URL:{createObjectURL:()=>`blob:mock${revoked.length}`,revokeObjectURL:url=>revoked.push(url)},
    Audio:class {},getRecording:async()=>({blob:{size:8}}),
    activeLocalAudio:null,Date,Promise
  };
  const start=app.indexOf('let recordingController=null;');
  const end=app.indexOf('async function exportLocalRecording(id)',start);
  assert.ok(start>=0&&end>start);
  const sliced=app.slice(start,end)
    .replace(/function activeRecordingPanel\(meta\)\{[^\n]*\}/,'function activeRecordingPanel(){return {replaceWith(){}};}')
    .replace(/function refreshRecordingPanel\(meta\)\{[^\n]*\}/,'function refreshRecordingPanel(){}');
  vm.runInNewContext(`${sliced}\nglobalThis.api={startActiveRecording,stopActiveRecording,stopLocalAudio,playLocalRecording};`,ctx);
  const flush=()=>new Promise(r=>setImmediate(r));
  return {ctx,doc,track,recorderBox,messages,saved,revoked,listeners,flush};
}

test('v19.1.1 stores only nonempty recordings stopped normally',async()=>{
  const h=recordingHarness(9);await h.ctx.api.startActiveRecording({});
  assert.equal(h.ctx.api.stopActiveRecording(),true);await h.flush();
  assert.equal(h.saved.length,1);
  assert.ok(h.messages.some(x=>x.includes('录音已保存在本机')));
  assert.equal(h.listeners.has('visibilitychange'),false);
});

test('v19.1.1 blocks 0-byte recordings without false saved confirmation',async()=>{
  const h=recordingHarness(0);await h.ctx.api.startActiveRecording({});
  h.ctx.api.stopActiveRecording();await h.flush();
  assert.equal(h.saved.length,0);
  assert.ok(h.messages.some(x=>x.includes('请重新录制')));
  assert.ok(!h.messages.some(x=>x.includes('录音已保存在本机')));
});

test('v19.1.1 blocks terminated mic track, background interruption and pagehide without saving',async()=>{
  for(const how of ['track','hidden','pagehide']){
    const h=recordingHarness(10);await h.ctx.api.startActiveRecording({});
    if(how==='track')h.track.onended();
    if(how==='hidden'){h.doc.hidden=true;h.listeners.get('visibilitychange')();}
    if(how==='pagehide')h.ctx.api.stopActiveRecording({renderAfter:false});
    await h.flush();
    assert.equal(h.saved.length,0,how);
    assert.ok(h.messages.some(x=>x.includes('请重新录制')),how);
  }
});

test('v19.1.1 supports MediaStream mocks or devices without getAudioTracks',async()=>{
  const h=recordingHarness(12,false);
  await h.ctx.api.startActiveRecording({});
  assert.equal(h.ctx.api.stopActiveRecording(),true);
  await h.flush();
  assert.equal(h.saved.length,1);
});

test('v19.1.1 validates 0-byte blobs and interruptions',()=>{
  assert.equal(validRecordingBlob({size:0}),false);
  assert.equal(validRecordingBlob(null),false);
  assert.equal(validRecordingBlob({size:21},true),false);
  assert.equal(validRecordingBlob({size:21}),true);
});

test('v19.1.1 audio ObjectURLs are revoked on stop, ended, error',async()=>{
  for(const how of ['stop','ended','error']){
    const h=recordingHarness();
    let audio=null;
    h.ctx.Audio=class {constructor(url){this.url=url;audio=this;}pause(){}play(){return Promise.resolve();}};
    await h.ctx.api.playLocalRecording('r1');
    assert.ok(audio);
    if(how==='stop')h.ctx.api.stopLocalAudio();
    if(how==='ended')audio.onended();
    if(how==='error')audio.onerror();
    assert.equal(h.revoked.length,1,how);
    h.ctx.api.stopLocalAudio();assert.equal(h.revoked.length,1,`${how}: no double-revoke`);
  }
});
