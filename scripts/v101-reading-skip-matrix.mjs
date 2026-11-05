import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
for(const count of [3,5,14,40]){
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();
 const reading={id:`r-${count}`,title:`Synthetic ${count}`,text:'Synthetic reading text long enough for browser testing.',source:'Synthetic',questions:Array.from({length:count},(_,i)=>({id:`q${i+1}`,type:'choice',prompt:`Question ${i+1}`,options:['Correct','Wrong'],answer:'Correct'}))};
 const state={version:4.3,items:[],attempts:[],sessions:[],reports:[],readings:[reading],readingMarks:[],readingChecks:[],weaknesses:[],transferAttempts:[],packHistory:[],dailyPack:null,dailyJourney:null,activeSession:null,settings:{onboardingSeen:true}};
 await p.addInitScript(s=>localStorage.setItem('central-english-mastery.v2',JSON.stringify(s)),state);await p.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'阅读',exact:true}).click();await p.getByRole('button',{name:'开始可选小测'}).click();
 for(let i=0;i<count;i++){await p.getByRole('button',{name:'跳过本题'}).click();}
 let stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));assert.equal(stored.readingChecks[0].status,'partial');assert.equal(stored.readingChecks[0].events.length,count);await p.getByRole('button',{name:'继续补做未完成题目'}).click();
 for(let i=0;i<count;i++){await p.locator('input[type=radio]').first().check();await p.getByRole('button',{name:'提交答案'}).click();if(i<count-1&&!await p.getByRole('button',{name:'提交答案'}).count())await p.getByRole('button',{name:'继续补做未完成题目'}).click();}
 stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));assert.equal(stored.readingChecks[0].status,'completed');assert.equal(stored.readingChecks[0].answers.length,count);assert.equal(stored.readingChecks[0].events.length,count*2);await c.close();console.log(`READING SKIP MATRIX ${count} PASS`);
}
await b.close();
