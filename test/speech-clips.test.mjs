import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('native speech covers words, examples, sentences and stories',()=>{
 const app=read('app.js');
 assert.match(app,/function speakEnglish\(/);
 assert.match(app,/speechButton\(item\.target\)/);
 assert.match(app,/speechButton\(item\.example\)/);
 assert.match(app,/speechControls\(reading\.text/);
 assert.match(app,/window\.speechSynthesis/);
 assert.doesNotMatch(app,/Gemini|KOKORO|neuralSpeech|createPrivateTTSClient/);
});

test('native speech keeps asynchronous voices and device fallback',()=>{
 const app=read('app.js');
 assert.match(app,/voiceschanged/);
 assert.match(app,/availableVoices\.find\(voice=>voice\.localService\)/);
 assert.match(app,/voice\?\.lang\|\|'en-US'/);
 assert.match(app,/浏览器默认语音/);
});

test('learning package import remains local and independent of speech',()=>{
 const app=read('app.js');
 assert.match(app,/recordsFromLearningPack/);
 assert.match(app,/function chooseImport/);
 assert.match(app,/central-english-mastery\.v2/);
 assert.doesNotMatch(app,/GEMINI_API_KEY|TTS_PAIRING_CODE/);
});
