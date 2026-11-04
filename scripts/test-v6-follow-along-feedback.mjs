import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
import assert from 'node:assert/strict';

const bin=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(path=>{try{accessSync(path,constants.X_OK);return true;}catch{return false;}});
if(!bin)throw Error('No Chromium executable');
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.addInitScript(()=>{
  const calls=[];window.__speechCalls=calls;window.__clipboard='';window.__audioEvents=[];
  class TestUtterance{constructor(text){this.text=text;this.lang='';this.voice=null;this.rate=1;this.onend=null;this.onerror=null;}}
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:TestUtterance});
  const voices=[{name:'Test English',lang:'en-US',localService:true,voiceURI:'test-en-us'}];
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>voices,addEventListener:()=>{},speak:utter=>{calls.push({text:utter.text});queueMicrotask(()=>utter.onend?.());},cancel:()=>{},pause:()=>{},resume:()=>{},speaking:false,paused:false}});
  const originalPlay=HTMLMediaElement.prototype.play,originalPause=HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.play=function(...args){window.__audioEvents.push({type:'play',src:this.src||''});return originalPlay.apply(this,args).catch(error=>{window.__audioEvents.push({type:'play-error',name:error.name});throw error;});};
  HTMLMediaElement.prototype.pause=function(...args){window.__audioEvents.push({type:'pause',src:this.src||''});return originalPause.apply(this,args);};
  class FakeMediaRecorder{static isTypeSupported=type=>type==='audio/webm;codecs=opus';constructor(){this.state='inactive';this.mimeType='audio/webm;codecs=opus';this.ondataavailable=null;this.onstop=null;}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['synthetic recording'],{type:this.mimeType})});queueMicrotask(()=>this.onstop?.());}}
  Object.defineProperty(window,'MediaRecorder',{configurable:true,value:FakeMediaRecorder});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>{window.__trackStopped=true;}}]})}});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__clipboard=value;}}});
  const pack={version:4.3,items:[{id:'listening-v6',kind:'sentence',module:'listening',contentType:'Listening',text:'A short sentence for follow along practice.',audioUrl:'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',status:'UNTESTED',learningStage:'new',attempts:0,createdAt:'2026-11-02T00:00:00Z'}],attempts:[],sessions:[],reports:[],readings:[],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],dailyPack:{packId:'pack-v6-follow-along',title:'V6 follow-along fixture',itemIds:['listening-v6'],readingIds:[],transferTasks:[],recommendedMinutes:5},dailyJourney:null,packHistory:[],activeSession:null,settings:{duration:5,speechRate:.9,theme:'system',onboardingSeen:true,retryAfterError:true,newLimit:10,reviewLimit:20}};
  localStorage.setItem('central-english-mastery.v2',JSON.stringify(pack));
});
try{
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'开始／继续今日完整学习'}).click();
  await page.waitForSelector('audio[aria-label="真实听力音频"]');
  await page.waitForFunction(()=>{const audio=document.querySelector('audio[aria-label="真实听力音频"]');return audio&&Number.isFinite(audio.duration)&&audio.duration>0;},{timeout:20000});
  assert.equal(await page.locator('.listening-speaking-studio').count(),1);
  assert.ok(await page.getByRole('button',{name:/片段 1 · 朗读/}).count());
  assert.ok(await page.getByRole('button',{name:'听参考音频'}).count());
  await page.getByRole('button',{name:'开始跟读录音'}).click();
  await page.getByRole('button',{name:'停止录音'}).click();
  await page.waitForFunction(()=>document.body.innerText.includes('录音已保存在本机。'));
  await page.getByRole('button',{name:'听我的初答'}).click();
  await page.waitForFunction(()=>window.__audioEvents.some(event=>event.type==='pause'));
  assert.equal(await page.evaluate(()=>window.__trackStopped),true);
  await page.getByRole('button',{name:'开始听写'}).click();
  await page.getByRole('textbox',{name:'听写答案'}).fill('A short sentence for follow along practice.');
  await page.getByRole('button',{name:'查看原文并对照'}).click();
  await page.getByRole('button',{name:/^K/}).click();
  await page.getByRole('button',{name:'完成并查看综合战报'}).click();
  await page.getByRole('heading',{name:'本次修炼完成'}).waitFor();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  const report=stored.reports.at(-1),attempt=report?.attempts?.find(row=>row.item_id==='listening-v6');
  assert.ok(attempt?.recording_ids?.length,'recording ID missing from report');
  await page.locator('details.report-export-options summary').click();
  assert.equal(await page.locator('details.report-export-options').evaluate(node=>node.open),true);
  await page.getByRole('button',{name:'生成下次学习依据'}).click();
  const feedback=JSON.parse(await page.evaluate(()=>window.__clipboard));
  assert.equal(feedback.feedback_schema_version,'1.0');assert.equal(feedback.report_id,report.report_id);assert.equal(feedback.is_learning_pack,false);
  console.log('V6 FOLLOW-ALONG RECORDING AND FEEDBACK PASS');
}finally{await browser.close();}
