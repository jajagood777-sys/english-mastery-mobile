import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../core.mjs',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
test('US female voice curation keeps only regular neutral voices',()=>{
  const declaration=app.match(/const US_FEMALE_VOICE_NAMES=(\/.*?\/i);/);
  assert.ok(declaration,'voice whitelist is present');
  const re=new RegExp(declaration[1].slice(1,-2),'i');
  for(const good of ['Ava','Allison','Samantha','Samantha (Enhanced)','Noelle','Joelle'])assert.ok(re.test(good),good);
  for(const novelty of ['Grandma','Grandpa','Boing','Jester','Whisper','Bells','Zarvox','Albert','Rocko','Sandy'])assert.equal(re.test(novelty),false,novelty);
  assert.match(app,/US_FEMALE_VOICE_NAMES\.test\(voice\.name/);
});
test('curation does not rewrite learner state and publishes fresh PWA cache',()=>{
 assert.match(core,/APP_VERSION = '5\.3\.1'/);
 assert.match(sw,/english-cultivation-static-v5\.3\.1/);
 assert.match(app,/const STORE='central-english-mastery\.v2'/);
});
