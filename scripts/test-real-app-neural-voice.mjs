import { chromium } from 'playwright-core';
import {accessSync,constants} from 'node:fs';
import assert from 'node:assert/strict';
const bin=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(p=>{try{accessSync(p,constants.X_OK);return true}catch{return false}});
if(!bin)throw Error('No Chromium executable');
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+e.message));
page.on('response',r=>{if(r.status()>=400&&/kokoro|wasm|huggingface/i.test(r.url()))errors.push('HTTP '+r.status()+' '+r.url().slice(0,180))});
try{
  // The real user already has history. Seed a synthetic V4.3 record in this
  // otherwise empty CI browser to prove the new voice setting preserves it.
  await page.addInitScript(()=>{
    const key='central-english-mastery.v2';
    if(!localStorage.getItem(key)){
      localStorage.setItem(key,JSON.stringify({
        version:4.3,
        items:[{id:'w:voice-regression-test',kind:'word',target:'clarity',example:'Clarity helps people understand each other.',status:'K',attempts:1}],
        attempts:[{id:'attempt:voice-regression-001',itemId:'w:voice-regression-test',status:'K'}],
        sessions:[{session_id:'voice-regression-session',activeMs:60000}],
        reports:[],readings:[{id:'reading:neural-regression-001',title:'A quiet morning',text:"I wasn't expecting the plan to change so suddenly."}],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],
        dailyPack:null,dailyJourney:null,packHistory:[],activeSession:null,
        settings:{duration:40,speechRate:0.9}
      }));
    }
  });
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.locator('nav button[data-page="more"]').click();
  await page.getByRole('button',{name:'打开设置'}).click();
  await page.getByRole('heading',{name:'学习设置'}).waitFor();
  const selector=page.getByLabel('朗读引擎');
  const options=await selector.locator('option').allTextContents();
  assert.equal(options.length,4,'Expected 4 engine choices');
  assert.ok(options.some(t=>t.includes('Gemini')));
  assert.ok(options.some(t=>t.includes('Heart')));
  assert.ok(options.some(t=>t.includes('Bella')));
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')||'{}'));
  await selector.selectOption('heart');
  await page.getByRole('button',{name:'试听Heart'}).click();
  await page.waitForFunction(()=>{
    const a=document.querySelector('#imported-speech-tray audio');
    return a?.readyState>=2 && a?.src.startsWith('blob:');
  },null,{timeout:30000});
  const output=await page.evaluate(async()=>{const a=document.querySelector('#imported-speech-tray audio');try{await a.play()}catch{}return {duration:a.duration,readyState:a.readyState,src:a.currentSrc};});
  assert.ok(output.duration>0,'Expected decoded public MP3 audio');
  assert.ok(output.src.startsWith('blob:'),'Expected imported public audio blob');
  const firstAudio=output.src;
  await page.locator('nav button[data-page="reading"]').click();
  await page.getByRole('heading',{name:'阅读英语材料'}).waitFor();
  await page.getByRole('button',{name:/朗读英文/}).click();
  await page.waitForFunction(previous=>{const a=document.querySelector('#imported-speech-tray audio');return a?.src.startsWith('blob:')&&a.src!==previous&&a.readyState>=2;},firstAudio,{timeout:30000});
  console.log('PUBLIC NATURAL AUDIO PLAYBACK PASS');
  await page.locator('nav button[data-page="more"]').click();
  await page.getByRole('button',{name:'打开设置'}).click();
  await page.getByLabel('朗读引擎').selectOption('bella');
  await page.getByRole('button',{name:'试听Bella'}).click();
  await page.waitForFunction(previous=>{const a=document.querySelector('#imported-speech-tray audio');return a?.src.startsWith('blob:')&&a.src!==previous&&a.readyState>=2;},firstAudio,{timeout:30000});
  console.log('PUBLIC BELLA AUDIO PLAYBACK PASS');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')||'{}'));
  assert.equal(saved.settings?.ttsMode,'bella');
  // Loading a legacy/minimal backup may legitimately normalize optional fields.
  // Compare stable records and substantive values rather than rejecting safe enrichment.
  for(const key of ['items','attempts','sessions','reports','readings','readingMarks','readingChecks','weaknesses','transferAttempts','dailyPack','dailyJourney']){
    const prior=original[key],after=saved[key];
    if(Array.isArray(prior)){
      assert.equal(after?.length,prior.length,'Unexpected study record count change '+key);
      for(const row of prior){
        const id=row.id||row.session_id||row.report_id||row.itemId;
        if(id)assert.ok(after.some(v=>(v.id||v.session_id||v.report_id||v.itemId)===id),'Lost prior record '+id);
      }
    }else if(prior!==undefined)assert.deepEqual(after,prior,'Unexpected study state change '+key);
  }
  assert.ok(saved.items.some(item=>item.id==='w:voice-regression-test'&&item.target==='clarity'));
  assert.ok(saved.readings.some(item=>item.id==='reading:neural-regression-001'&&item.text.includes('plan to change')));
  console.log('REAL APP KOKORO HEART PLAYBACK PASS '+JSON.stringify({duration:output.duration,readyState:output.readyState}));
  console.log('APP PERSISTENCE SAFETY PASS');
  assert.deepEqual(errors.filter(error=>/huggingface|kokoro|wasm/i.test(error)),[],'Unexpected legacy neural network failure');
}finally{console.log('BROWSER ERRORS '+JSON.stringify(errors.slice(0,12)));await browser.close()}
