import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {KOKORO_VOICES,splitNeuralSpeech,createNeuralSpeech} from '../neural-tts.mjs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Kokoro voices are real model IDs and cannot fall through to Safari',()=>{
 assert.deepEqual(KOKORO_VOICES,{heart:'af_heart',bella:'af_bella'});
 const app=load('app.js');
 assert.match(app,/voiceOverride\|\|data.settings\?\.ttsMode\|\|'device'/);
 assert.match(app,/neuralSpeech\.speak\(value,KOKORO_VOICES\[mode\]\)/);
 assert.match(app,/朗读引擎/);
 assert.match(app,/试听Heart/);
 assert.match(app,/试听Bella/);
 assert.match(app,/下载／加载自然语音模型/);
 assert.match(app,/function stopSpeech\(\).*neuralSpeech\.stop\(\)/);
});
test('Neural splitting avoids long uninterrupted generation requests',()=>{
 assert.deepEqual(splitNeuralSpeech('Hi there! How are you?'),['Hi there!','How are you?']);
 const long='Every day we learn a little more, even when the journey is difficult. '.repeat(16);
 const chunks=splitNeuralSpeech(long,180);
 assert.ok(chunks.length>5);
 assert.equal(chunks.join(' ').replace(/\s+/g,' '),long.trim().replace(/\s+/g,' '));
 assert.ok(chunks.every(x=>x.length<=180));
 assert.deepEqual(splitNeuralSpeech(''),[]);
});
test('No network or model download until explicit action',()=>{
 let called=0;
 const engine=createNeuralSpeech({importEngine:async()=>{called++;throw new Error('network denied')}});
 assert.equal(engine.ready(),false);
 assert.match(engine.status(),/尚未加载/);
 assert.equal(called,0);
});
test('Speech model cache is excluded from destructive PWA cache cleanup',()=>{
 const sw=load('sw.js');
 assert.match(sw,/startsWith\('english-cultivation-static-'\)/);
 assert.match(sw,/kokoro-preview\/runtime\//);
 assert.doesNotMatch(sw,/filter\(k=>k!==CACHE\)/);
 const index=load('index.html');
 assert.match(index,/wasm-unsafe-eval/);
 assert.match(index,/media-src 'self' blob:/);
});
test('Learning database schema remains unchanged, neural mode is optional',()=>{
 const core=load('core.mjs'),app=load('app.js');
 assert.match(core,/VERSION = 4\.3/);
 assert.match(core,/APP_VERSION = '5\.4\.0'/);
 assert.match(app,/const STORE='central-english-mastery\.v2'/);
 assert.match(app,/ttsMode\|\|'device'/);
});
