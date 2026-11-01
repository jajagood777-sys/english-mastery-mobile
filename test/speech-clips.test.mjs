import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('public speech manifest and local importer use one content-addressed format',()=>{
 const clips=read('speech-clips.mjs'),generator=read('scripts/generate-public-speech.mjs');
 assert.match(clips,/speech-assets\/speech-manifest\.json/);
 assert.match(clips,/speechTextHash\(text\)/);
 assert.match(clips,/fileSha256/);
 assert.match(clips,/unpackSpeechZip/);
 assert.match(generator,/speech-manifest\.json/);
 assert.match(generator,/af_heart/);assert.match(generator,/af_bella/);
 assert.match(generator,/libmp3lame/);assert.match(generator,/fileSha256/);
});
test('speech fallback is real and word cards expose word plus example controls',()=>{
 const app=read('app.js');
 assert.match(app,/function speakDevice\(text\)/);
 assert.match(app,/speakDevice\(value\)/);
 assert.match(app,/speechButton\(item\.target\)/);
 assert.match(app,/clipSpeech\.speak\(value,KOKORO_VOICES\[mode\]\)/);
});
test('V5.6 pack generator is incremental and public workflow is privacy-gated',()=>{
 const script=read('scripts/generate-audio-pack.mjs'),workflow=read('.github/workflows/generate-audio-pack.yml'),app=read('app.js');
 assert.match(script,/--pack/);assert.match(script,/ffprobe/);assert.match(script,/failed/);assert.match(script,/audio-report\.json/);assert.match(script,/speech-manifest\.json/);
 assert.match(workflow,/examples\/\*\.json/);assert.match(workflow,/upload-artifact/);assert.match(app,/当前学习包自然配音覆盖率/);assert.match(app,/导入每日学习包 ZIP/);
});

test('on-demand Heart generation is wired without system fallback in Heart mode',()=>{const app=read('app.js'),clips=read('speech-clips.mjs'),neural=read('neural-tts.mjs');assert.match(clips,/pendingGeneration/);assert.match(clips,/on-demand-kokoro/);assert.match(neural,/generate,?speak/);assert.match(app,/当前文字没有可用的Heart音频/);assert.doesNotMatch(app,/已使用设备兼容朗读/);});

test('Gemini audio uses a distinct engine cache key and WAV client path',()=>{const clips=read('speech-clips.mjs'),client=read('private-tts-client.mjs'),worker=read('worker/src/index.mjs'),app=read('app.js');assert.match(clips,/speechClipKey/);assert.match(clips,/engine=KOKORO_SPEECH_ENGINE/);assert.match(clips,/on-demand-gemini/);assert.ok(client.includes('audio\\/'));assert.match(client,/wav/);assert.match(worker,/gemini-3\.8-flash-tts/);assert.match(worker,/x-goog-api-key/);assert.match(app,/Gemini云端/);assert.match(app,/GEMINI_TTS_ENGINE/);});
