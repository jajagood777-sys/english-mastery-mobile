import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {accessSync, constants} from 'node:fs';

const executablePath=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(path=>{try{accessSync(path,constants.X_OK);return true;}catch{return false;}});
if(!executablePath)throw new Error('Chromium is not installed');
const state={version:4.3,items:[
  {id:'w-clarify',kind:'word',target:'clarify',example:'Could you clarify your point?',definitionEn:'to make something easier to understand',partOfSpeech:'verb',collocations:['clarify a point'],status:'UNTESTED',learningStage:'new',attempts:0},
  {id:'w-explain',kind:'word',target:'explain',example:'Please explain the result.',meaningZh:'解释；说明',status:'UNTESTED',learningStage:'new',attempts:0}
],attempts:[],sessions:[],reports:[],readings:[],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],packHistory:[],dailyPack:{packId:'synthetic-words-recall',title:'Synthetic word recall',itemIds:['w-clarify','w-explain'],readingIds:[],transferTasks:[],spellingTasks:[]},dailyJourney:null,activeSession:null,settings:{duration:5,onboardingSeen:true,retryAfterError:true,newLimit:10,reviewLimit:20}};
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await page.addInitScript(value=>localStorage.setItem('central-english-mastery.v2',JSON.stringify(value)),state);
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/一键开始今日完整学习/}).click();
  await page.getByRole('button',{name:'开始回忆'}).click();
  const firstText=await page.locator('#app').innerText();
  assert.match(firstText,/Meaning: to make something easier to understand/);
  assert.match(firstText,/Part of speech: verb/);
  assert.match(firstText,/Context: Could you _____ your point/);
  assert.doesNotMatch(firstText,/Meaning:.*clarify/i);
  await page.locator('input[type="text"]').fill('clarify');
  await page.getByRole('button',{name:'检查答案'}).click();
  assert.match(await page.locator('#app').innerText(),/答案正确|答案符合允许表达/);
  await page.getByRole('button',{name:/K/}).last().click();
  let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(stored.attempts.at(-1).prompt_used,false);
  assert.equal(stored.attempts.at(-1).initial_check.status,'correct');
  await page.getByRole('button',{name:'开始回忆'}).click();
  const fallbackText=await page.locator('#app').innerText();
  assert.match(fallbackText,/Meaning source: imported pack/);
  assert.match(fallbackText,/Context: Please _____ the result/);
  await page.getByRole('button',{name:/需要帮助？显示额外语境/}).click();
  stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(stored.activeSession.promptEvents.at(-1).type,'semantic_hint');
  await page.getByRole('button',{name:/显示形式线索/}).click();
  await page.getByRole('button',{name:/查看参考答案/}).click();
  await page.getByRole('button',{name:/V/}).last().click();
  stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(stored.attempts.at(-1).initial_check.status,'blank');
  assert.equal(stored.attempts.at(-1).prompt_used,true);
  assert.equal(stored.attempts.at(-1).viewed_answer,true);
  assert.equal(stored.attempts.at(-1).prompt_events.at(-1).type,'reference_answer');
  console.log('WORDS RECALL BROWSER PASS · 390x844 · semantic clue, safe fallback, tiered evidence');
}finally{await browser.close();}
