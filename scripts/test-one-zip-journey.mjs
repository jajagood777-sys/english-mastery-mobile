import {chromium} from 'playwright-core';
import {accessSync,constants,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const bin=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome']
  .find(p=>{try{accessSync(p,constants.X_OK);return true;}catch{return false;}});
if(!bin)throw Error('No isolated Chromium executable');
const packId='SYNTHETIC-ONE-ZIP-JOURNEY-DO-NOT-IMPORT';
const pack={schema_version:'2.0',pack_id:packId,title:'Synthetic ZIP integration only',
  items:[{id:'CI-S01',type:'sentence',text:'She maintained her composure during the interview.'}],
  vocabulary_practice:[
    {id:'CI-V01',type:'contextual_cloze',prompt:'Choose the word: She stayed ____ during the interview.',
      options:[{id:'A',text:'composed'},{id:'B',text:'distracted'},{id:'C',text:'furious'},{id:'D',text:'uncertain'}],
      correct_option_ids:['A'],explanation_en:'Composed describes staying calm.'},
    {id:'CI-V02',type:'definition_recognition',prompt:'Which word means a subtle difference?',
      options:[{id:'A',text:'volume'},{id:'B',text:'nuance'},{id:'C',text:'volume control'},{id:'D',text:'effort'}],
      correct_option_ids:['B'],explanation_en:'Nuance means a subtle difference.'}
  ],readings:[],speeches:[],transfer_tasks:[],recommended_minutes:20};
const p=join(mkdtempSync(join(tmpdir(),'yandao-onezip-')),'test-journey.zip');
const py='import sys,json,zipfile\np=json.loads(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"w",compression=zipfile.ZIP_DEFLATED) as z:\n z.writestr("learning-pack.json",json.dumps(p,ensure_ascii=False))\n z.writestr("package-info.json",json.dumps({"schema_version":"2.0","pack_id":p["pack_id"]}))\n';
execFileSync('python3',['-c',py,JSON.stringify(pack),p]);
assert.ok(readFileSync(p).length>100);
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',dialog=>dialog.accept());
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
try{
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'导入唯一ZIP学习包'}).click();
  await page.locator('input[type="file"][accept*=".zip"]').setInputFiles(p);
  await page.getByRole('heading',{name:'触控炼词'}).waitFor({timeout:20000});
  let saved=await state();
  assert.equal(saved.dailyPack.packId,packId);
  assert.equal(saved.dailyPack.vocabularyPractice.length,2);
  assert.deepEqual(saved.dailyJourney.steps.slice(0,2),['vocabulary','sentences']);
  assert.equal(saved.dailyJourney.index,0);
  await page.locator('.vocab-choice').filter({hasText:'composed'}).click();
  await page.getByRole('button',{name:'提交识别答案'}).click();
  saved=await state();
  assert.equal(saved.vocabularyAttempts.length,1);
  assert.equal(saved.vocabularyAttempts[0].firstAnswer,'A');
  assert.equal(saved.vocabularyAttempts[0].rating,null);
  await page.getByRole('button',{name:'继续下一题'}).click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'开始／继续今日完整学习'}).click();
  await page.getByRole('heading',{name:'触控炼词'}).waitFor({timeout:10000});
  await page.locator('.vocab-choice').filter({hasText:'nuance'}).click();
  await page.getByRole('button',{name:'提交识别答案'}).click();
  saved=await state();
  assert.equal(saved.vocabularyAttempts.length,2);
  assert.equal(saved.vocabularyAttempts[0].firstAnswer,'A','Refresh must retain the first answer');
  await page.getByRole('button',{name:'进入Journey下一阶段'}).click();
  saved=await state();
  assert.equal(saved.dailyJourney.index,1);
  assert.equal(saved.dailyJourney.completed[0].stage,'vocabulary');
  assert.equal(saved.dailyJourney.completed[0].count,2);
  assert.equal(saved.vocabularyAttempts.filter(x=>x.rating==='K').length,0);
  assert.ok(saved.activeSession?.journeyId===saved.dailyJourney.id,'Next existing Journey stage should begin automatically');

  // Legacy ongoing V22 has no vocabulary stage. Resume inserts, never discards an existing step or answer.
  await page.evaluate(({id})=>{
    const key='central-english-mastery.v2',s=JSON.parse(localStorage.getItem(key));
    s.activeSession=null;
    s.vocabularyAttempts=[];
    s.dailyJourney={id:'journey:legacy-synthetic',packId:id,startedAt:'2026-11-17T00:00:00Z',
      steps:['sentences'],index:0,completed:[],sessionIds:[],readingMs:0,speechMs:0,
      readingDoneIds:[],spellingAttempts:[],transferAttempts:[],transferMs:0,
      finishedAt:null,targetMinutes:20};
    localStorage.setItem(key,JSON.stringify(s));
  },{id:packId});
  await page.reload({waitUntil:'domcontentloaded'});
  console.log('LEGACY BEFORE RESUME',JSON.stringify({journey:(await state()).dailyJourney,packId:(await state()).dailyPack?.packId}));
  await page.getByRole('button',{name:'开始／继续今日完整学习'}).click();
  console.log('LEGACY AFTER RESUME',JSON.stringify({journey:(await state()).dailyJourney,packId:(await state()).dailyPack?.packId,errors}));
  await page.getByRole('heading',{name:'触控炼词'}).waitFor({timeout:10000});
  saved=await state();
  assert.equal(saved.dailyJourney.id,'journey:legacy-synthetic');
  assert.deepEqual(saved.dailyJourney.steps.slice(0,2),['vocabulary','sentences']);
  assert.equal(saved.dailyJourney.completed.length,0);
  assert.equal(errors.length,0,'Unexpected runtime errors: '+errors.join(' | '));
  console.log('ONE ZIP -> VOCABULARY -> NEXT JOURNEY STAGE; REFRESH + LEGACY MIGRATION PASS');
}finally{
  await browser.close();
}
