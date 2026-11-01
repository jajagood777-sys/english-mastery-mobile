import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
import assert from 'node:assert/strict';
const bin=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(p=>{try{accessSync(p,constants.X_OK);return true;}catch{return false;}});
if(!bin)throw Error('No Chromium executable');
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+e.message));
await page.addInitScript(()=>{
 const calls=[];
 window.__nativeSpeechCalls=calls;
 class TestUtterance{constructor(text){this.text=text;this.lang='';this.voice=null;this.rate=1;this.onend=null;this.onerror=null;}}
 Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:TestUtterance});
 let voicesReady=false;const voices=[{name:'iPhone English',lang:'en-US',localService:true,voiceURI:'iphone-en-us'},{name:'Alex',lang:'en-US',localService:true,voiceURI:'alex-en-us'}];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>voicesReady?voices:[],addEventListener:(event,callback)=>{if(event==='voiceschanged')queueMicrotask(()=>{voicesReady=true;callback();});},speak:utter=>{calls.push({text:utter.text,lang:utter.lang,rate:utter.rate,voiceURI:utter.voice?.voiceURI||null});queueMicrotask(()=>utter.onend?.());},cancel:()=>calls.push({action:'cancel'}),pause:()=>calls.push({action:'pause'}),resume:()=>calls.push({action:'resume'}),speaking:false,paused:false}});
 const key='central-english-mastery.v2';localStorage.setItem(key,JSON.stringify({version:4.3,items:[{id:'w:native-regression',kind:'word',target:'clarity',example:'Clarity helps people understand each other.',status:'K',attempts:1}],attempts:[{id:'attempt:native-regression',itemId:'w:native-regression',status:'K'}],sessions:[],reports:[],readings:[{id:'reading:native-regression',title:'A quiet morning',text:'A quiet morning can change the rhythm of an entire day.'}],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],dailyPack:null,dailyJourney:null,packHistory:[],activeSession:null,settings:{duration:40,speechRate:0.9}}));
});
try{
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.locator('nav button[data-page="more"]').click();
 await page.getByRole('button',{name:'打开设置'}).click();
 await page.getByRole('heading',{name:'学习设置'}).waitFor();
 const selector=page.locator('#native-voice-select');const optionCount=await selector.locator('option').count();assert.ok(optionCount===0||optionCount>=2);if(optionCount>=2){assert.match(await selector.locator('option').first().textContent(),/iPhone English \(en-US\)/);await selector.selectOption('alex-en-us');}await page.getByRole('button',{name:'试听声音'}).click();if(optionCount>=2){await page.waitForFunction(()=>window.__nativeSpeechCalls?.some(row=>row.text));const first=await page.evaluate(()=>window.__nativeSpeechCalls.find(row=>row.text));assert.equal(first.lang,'en-US');assert.equal(first.voiceURI,'alex-en-us');assert.ok(first.text.includes('Hello!'));assert.ok(first.text.includes('practice English'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')).settings.speechVoiceURI),'alex-en-us');}else{assert.equal(await page.evaluate(()=>typeof window.speechSynthesis?.speak),'function');}
 await page.getByRole('button',{name:'停止朗读'}).click();
 await page.locator('nav button[data-page="reading"]').click();await page.getByRole('heading',{name:'阅读英语材料'}).waitFor();await page.getByRole('button',{name:/朗读英文/}).click();
 await page.waitForFunction(()=>window.__nativeSpeechCalls.filter(row=>row.text).length>=2);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')||'{}'));assert.equal(saved.items[0].id,'w:native-regression');assert.equal(saved.readings[0].id,'reading:native-regression');
 assert.deepEqual(errors,[]);console.log('REAL APP NATIVE SPEECH WIRING PASS');console.log('LEARNER DATA PERSISTENCE PASS');
}finally{await browser.close();}
