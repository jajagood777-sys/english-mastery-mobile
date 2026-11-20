/** Browser regression: a single daily-pack ZIP starts a vocabulary-first Journey
 * and resumes it without deleting pre-existing learner records. */
import { chromium } from 'playwright-core';
import { accessSync, constants, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { zipStore } from '../handover.mjs';

const bin = ['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome']
  .find(path => { try { accessSync(path, constants.X_OK); return true; } catch { return false; } });
if (!bin) throw Error('No Chromium executable');

const pack = JSON.parse(readFileSync(new URL('../examples/v60-four-in-one-pack.json', import.meta.url), 'utf8'));
pack.pack_id = 'CI-SYNTHETIC-ONE-ZIP-RESUME';
pack.vocabulary_practice = [{
  id: 'ci-vocab-composure',
  target: 'composure',
  type: 'definition_recognition',
  prompt: 'Which word means remaining calm under pressure?',
  options: [{id:'A',text:'composure'},{id:'B',text:'confusion'},{id:'C',text:'distress'}],
  correct_option_ids: ['A'],
  explanation_en: 'Composure means staying calm and in control when something is difficult.'
}];
const payload = new TextEncoder().encode(JSON.stringify(pack));
const zip = zipStore([{ name:'learning-pack.json', bytes:payload }]);
assert.ok(zip.bytes.length > payload.length);

const browser = await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage({ viewport:{width:390,height:844} });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', dialog => dialog.accept());
await page.addInitScript(() => {
  const legacy={version:4.3,items:[{id:'w:legacy-ci',kind:'word',target:'legacy',example:'Older learning must remain intact.',status:'K',attempts:1}],
    attempts:[],sessions:[],reports:[],readings:[],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],
    dailyPack:null,dailyJourney:null,packHistory:[],activeSession:null,settings:{duration:30,speechRate:.9,onboardingSeen:true,theme:'system'}};
  if(!localStorage.getItem('central-english-mastery.v2'))localStorage.setItem('central-english-mastery.v2',JSON.stringify(legacy));
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],addEventListener:()=>{},speak:()=>{},cancel:()=>{},pause:()=>{},resume:()=>{},speaking:false,paused:false}});
  class U { constructor(text){this.text=text;} }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:U});
});
try {
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.locator('nav button[data-page="more"]').click();
  await page.getByRole('button',{name:/资料库/}).click();
  await page.getByRole('heading',{name:'资料库',exact:true}).waitFor();
  await page.locator('input[type="file"][accept*=".zip"]').setInputFiles({name:'ci-synthetic-daily-pack.zip',mimeType:'application/zip',buffer:Buffer.from(zip.bytes)});
  await page.waitForFunction(id => {const s=JSON.parse(localStorage.getItem('central-english-mastery.v2')||'{}');return s.dailyPack?.packId===id;},pack.pack_id,{timeout:20000});
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.ok(original.items.some(item=>item.id==='w:legacy-ci'&&item.status==='K'),'Existing K record must survive import');
  assert.ok(original.dailyPack.vocabularyPractice.length>=1,'ZIP vocabulary task should be accepted');
  assert.ok(original.dailyPack.readingIds.length>=1,'ZIP reading should be accepted');
  assert.equal(original.dailyJourney?.packId,pack.pack_id,'ZIP import should start a Journey');
  assert.equal(original.dailyJourney.steps[0],'vocabulary','ZIP should start at the vocabulary module');
  const journeyId=original.dailyJourney.id;
  await page.reload({waitUntil:'domcontentloaded'});
  const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(resumed.dailyJourney.id,journeyId,'Reload must preserve the same in-progress Journey');
  assert.equal(resumed.items.find(item=>item.id==='w:legacy-ci')?.status,'K','Reload must preserve original mastery status');
  await page.locator('nav button[data-page="home"]').click();
  await page.getByRole('button',{name:'开始／继续今日完整学习',exact:true}).click();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(after.dailyJourney.id,journeyId,'Continue must resume rather than creating a duplicate Journey');
  assert.deepEqual(errors,[],'App should not emit unhandled browser errors');
  console.log('ONE ZIP VOCABULARY-FIRST JOURNEY, RELOAD & SAFE RESUME PASS');
} finally { await browser.close(); }
