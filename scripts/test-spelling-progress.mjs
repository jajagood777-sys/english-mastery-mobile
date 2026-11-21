import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
import assert from 'node:assert/strict';
const binary=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome']
  .find(p=>{try{accessSync(p,constants.X_OK);return true;}catch{return false;}});
if(!binary)throw Error('No Chromium executable');
const browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:430,height:932}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const PACK='SYNTHETIC-SPELLING-CI';
const tasks=[
 {id:'sp1',target:'scramble',promptMode:'meaning_to_spelling',cueEn:'to act quickly to deal with a problem',packId:PACK},
 {id:'sp2',target:'nuance',promptMode:'meaning_to_spelling',cueEn:'a subtle difference in meaning',packId:PACK},
 {id:'sp3',target:'class',promptMode:'audio_to_spelling',ttsText:'class',packId:PACK}
];
const state={version:4.3,items:[],attempts:[],sessions:[],reports:[],readings:[],readingMarks:[],readingChecks:[],
 weaknesses:[],transferAttempts:[],dailyPack:{packId:PACK,title:'Synthetic spelling evidence',itemIds:[],
 readingIds:[],spellingTasks:tasks,transferTasks:[],recommendedMinutes:5},
 dailyJourney:null,packHistory:[],activeSession:null,
 settings:{duration:5,speechRate:0.9,theme:'system',onboardingSeen:true,retryAfterError:true,newLimit:10,reviewLimit:20}};
try{
 await page.addInitScript(({key,data})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(data));},
 {key:'central-english-mastery.v2',data:state});
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'开始／继续今日完整学习'}).click();
 await page.getByText('第 1 / 3 题').waitFor();
 await page.locator('.answer-input').fill('scramble');
 await page.getByRole('button',{name:'提交首次拼写'}).click();
 await page.getByText('第 2 / 3 题').waitFor();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
 assert.equal(saved.dailyJourney.spellingAttempts.length,1);
 assert.equal(saved.dailyJourney.spellingAttempts[0].firstAnswer,'scramble');
 assert.ok(saved.dailyJourney.spellingAttempts[0].firstSubmittedAt);
 assert.equal(saved.dailyJourney.spellingIndex,1);
 await page.locator('.answer-input').fill('nuence');
 await page.getByRole('button',{name:'提交首次拼写'}).click();
 await page.getByText('你的首次拼写：nuence').waitFor();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
 assert.equal(saved.dailyJourney.spellingIndex,1);
 assert.equal(saved.dailyJourney.spellingAttempts.length,2);
 assert.equal(saved.dailyJourney.spellingAttempts[1].firstCheck.status,'incorrect');
 await page.locator('.answer-input').fill('nuance');
 await page.getByRole('button',{name:'保存纠错拼写'}).click();
 await page.getByText('第 3 / 3 题').waitFor();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
 assert.equal(saved.dailyJourney.spellingAttempts[1].firstAnswer,'nuence');
 assert.equal(saved.dailyJourney.spellingAttempts[1].retryAnswer,'nuance');
 assert.equal(saved.dailyJourney.spellingIndex,2);
 assert.equal(await page.locator('h2').filter({hasText:'Listen to the word'}).count(),1);
 assert.equal(await page.locator('h2').filter({hasText:'class'}).count(),0);
 await page.locator('.answer-input').fill('class');
 await page.getByRole('button',{name:'提交首次拼写'}).click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
 assert.equal(saved.dailyJourney.spellingAttempts.length,3);
 assert.equal(saved.dailyJourney.spellingAttempts.filter(x=>x.skipped).length,0);
 assert.ok(saved.dailyJourney.completed.some(x=>x.stage==='spelling'&&x.count===3));
 console.log('SPELLING CORRECT ADVANCE, WRONG RETRY, FINAL PROGRESS: PASS');
 // Exercise recovery without altering the user: a synthetic V9.0.1 row lacks firstSubmittedAt.
 await page.evaluate(({first})=>{
   const key='central-english-mastery.v2',saved=JSON.parse(localStorage.getItem(key));
   saved.dailyPack.spellingTasks=[first];
   saved.dailyJourney={id:'legacy-journey',packId:saved.dailyPack.packId,startedAt:'2026-11-04T06:00:00Z',
     steps:['spelling'],index:0,completed:[],sessionIds:[],spellingIndex:0,
     spellingAttempts:[{id:'legacy-answer',taskId:first.id,packId:saved.dailyPack.packId,
       sessionId:'legacy-journey',firstAnswer:first.target,firstCheck:{status:'correct'},retryAnswer:'',retryCheck:null}],
     readingMs:0,readingRunning:false,readingDoneIds:[],transferAttempts:[],transferSkippedTaskIds:[],
     transferMs:0,targetMinutes:5,finishedAt:null};
   saved.activeSession=null;
   localStorage.setItem(key,JSON.stringify(saved));
 },{first:tasks[0]});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'开始／继续今日完整学习'}).click();
 await page.getByText('你的首次拼写：scramble').waitFor();
 assert.equal(await page.locator('.answer-input').count(),0);
 await page.getByRole('button',{name:'进入下一题（首次作答已保存）'}).click();
 const recovered=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
 assert.equal(recovered.dailyJourney.spellingAttempts.length,1);
 assert.equal(recovered.dailyJourney.spellingAttempts[0].id,'legacy-answer');
 assert.ok(recovered.dailyJourney.completed.some(x=>x.stage==='spelling'&&x.count===1));
 assert.deepEqual(errors,[]);
 console.log('LEGACY FIRST ANSWER RECOVERY, NO DUPLICATE/SKIP: PASS');
}finally{await browser.close();}
