import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('public speech manifest and local importer use one content-addressed format',()=>{
 const clips=read('speech-clips.mjs'),generator=read('scripts/generate-public-speech.mjs');
 assert.match(clips,/speech-assets\/speech-manifest\.json/);
 assert.match(clips,/speechTextHash\(text\)/);
 assert.match(clips,/fileSha256/);
 assert.match(clips,/unzipPackage/);
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
