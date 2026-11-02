import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../core.mjs',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
test('native voice selection prefers actual en-US device voices without hardcoded names',()=>{
  assert.match(app,/en-US/);
  assert.match(app,/availableVoices\.find\(voice=>voice\.localService\)/);
  assert.doesNotMatch(app,/US_FEMALE_VOICE_NAMES/);
});
test('curation does not rewrite learner state and publishes fresh PWA cache',()=>{
 assert.match(core,/APP_VERSION = '6\.2\.0'/);
 assert.match(sw,/english-cultivation-static-v6\.2\.0/);
 assert.match(app,/const STORE='central-english-mastery\.v2'/);
});
