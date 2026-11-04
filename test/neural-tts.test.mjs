import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('native speech is the only active reading path',()=>{
 const app=load('app.js');
 assert.match(app,/window\.speechSynthesis/);
 assert.match(app,/SpeechSynthesisUtterance/);
 assert.match(app,/utter\.lang=voice\?\.lang\|\|'en-US'/);
 assert.match(app,/voiceschanged/);
 assert.match(app,/native-voice-select/);
 assert.match(app,/speechVoiceURI/);
 assert.match(app,/utter\.voice=voice/);
 assert.match(app,/speechVoiceLabel/);
 assert.match(app,/speakEnglish/);
 assert.match(app,/Hello! Let's practice English together/);
 assert.doesNotMatch(app,/Gemini|KOKORO|neuralSpeech|createPrivateTTSClient/);
 assert.doesNotMatch(app,/fetch\(/);
});

test('native speech preserves explicit stop, pause, resume and speed controls',()=>{
 const app=load('app.js');
 assert.match(app,/window\.speechSynthesis\.cancel\(\)/);
 assert.match(app,/window\.speechSynthesis\.pause\(\)/);
 assert.match(app,/window\.speechSynthesis\.resume\(\)/);
 assert.match(app,/speechRate/);
 assert.match(app,/btn\('停止朗读'/);
});

test('learner storage contract remains unchanged while speech is native',()=>{
 const core=load('core.mjs'),app=load('app.js');
 assert.match(core,/VERSION = 4\.3/);
 assert.match(core,/APP_VERSION = '10\.0\.0'/);
 assert.match(app,/const STORE='central-english-mastery\.v2'/);
 assert.match(app,/function save\(\)/);
});
