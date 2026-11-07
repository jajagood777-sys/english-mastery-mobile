import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {accessSync,constants} from 'node:fs';

const executablePath=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(path=>{try{accessSync(path,constants.X_OK);return true;}catch{return false;}});
if(!executablePath)throw Error('Chromium is not installed');
const section={id:'S1',storyId:'G-SYN',storyTitle:'Synthetic story',title:'Arrival',paperFirst:true,availability:{vocabulary:1,cloze:0,grammar:0,comprehension:0,spokenPhrases:0,deferredPhrases:1,goldenSentences:0,speaking:0,writing:1,retelling:0,audioSegments:0},vocabulary:[{id:'v1',type:'vocabulary',target:'endow',definitionEn:'to provide a quality or ability',example:'The experience may endow her with patience.',acceptedAnswers:[]}],cloze:[],grammar:[],comprehension:[],spokenPhrases:[{id:'p2',type:'spoken_phrase',prompt:'Deferred phrase.',practiceEligible:false,archiveStatus:'ARCHIVED_NOT_STUDIED'}],goldenSentences:[],speakingQuestions:[],writing:[{id:'w1',type:'writing',prompt:'Describe the change in 80 words.',referenceAnswer:'A short practice response.',acceptedAnswers:[]}],retelling:null,audioSegments:[],storyBeats:[]};
const state={version:4.3,items:[],attempts:[],sessions:[],reports:[],readings:[],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],packHistory:[],dailyPack:{packId:'PACK-STORY-SYN',title:'Synthetic paper story',itemIds:[],readingIds:[],transferTasks:[],spellingTasks:[],storyPractice:{version:1,packId:'PACK-STORY-SYN',stories:[{id:'G-SYN',title:'Synthetic story',source:'Synthetic',sections:[section]}]}},dailyJourney:null,paperStoryPractice:null,activeSession:null,settings:{duration:5,onboardingSeen:true,retryAfterError:true,newLimit:10,reviewLimit:20}};
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await page.addInitScript(value=>localStorage.setItem('central-english-mastery.v2',JSON.stringify(value)),state);
 await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Practice this Section'}).click();
 assert.match(await page.locator('#app').innerText(),/纸上故事练习/);
 assert.match(await page.locator('#app').innerText(),/Meaning: to provide a quality or ability/);
 assert.doesNotMatch(await page.locator('#app').innerText(),/The experience may endow her with patience/);
 const input=page.locator('textarea').last();await input.fill('endow');await page.getByRole('button',{name:/提交答案并查看参考/}).click();
 assert.match(await page.locator('#app').innerText(),/Reference: endow/);await page.getByRole('button',{name:/K ·/}).click();
 const writing=page.locator('textarea').last();await writing.fill('This independent draft describes a change in a simple synthetic practice story with a clear reason and result.');await page.getByRole('button',{name:/提交原始稿并查看参考/}).click();assert.match(await page.locator('#app').innerText(),/Practice data only/);await page.getByRole('button',{name:/V ·/}).click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));assert.equal(stored.paperStoryPractice.finishedAt!==null,true);assert.equal(stored.reports.at(-1).paper_reading_time_measured,false);assert.equal(stored.reports.at(-1).attempts[0].firstAnswer,'endow');assert.equal(stored.reports.at(-1).story_practice.spoken_phrase_limit,10);
 console.log('PAPER STORY BROWSER PASS · 390x844 · direct exercises, immutable first answers, paper-first timing');
}finally{await browser.close();}
