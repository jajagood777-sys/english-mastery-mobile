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
  await page.getByRole('button',{name:'导入今日总学习包'}).click();
  await page.locator('input[type="file"][accept*=".zip"]').setInputFiles(p);
  await page.getByRole('heading',{name:/触控词汇 1 \/ 2/}).waitFor({timeout:20000});
  let saved=await state();
  assert.equal(saved.dailyPack.packId,packId);
  assert.equal(saved.dailyPack.vocabularyPractice.length,2);
  assert.deepEqual(saved.dailyJourney.steps.slice(0,2),['vocabulary','sentences']);
  assert.equal(saved.dailyJourney.index,0);
  await page.locator('.vocab-option-btn').filter({hasText:'composed'}).click();
  saved=await state();
  assert.equal(saved.dailyJourney.vocabularyAttempts.length,1);
  assert.equal(saved.dailyJourney.vocabularyAttempts[0].selectedOptionId,'A');
  assert.equal(saved.dailyJourney.vocabularyAttempts[0].countsAsMasteryK,false);
  await page.getByRole('button',{name:/继续下一题/}).click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'开始／继续今日完整学习'}).click();
  await page.getByRole('heading',{name:/触控词汇 2 \/ 2/}).waitFor({timeout:10000});
  await page.locator('.vocab-option-btn').filter({hasText:'nuance'}).click();
  saved=await state();
  assert.equal(saved.dailyJourney.vocabularyAttempts.length,2);
  assert.equal(saved.dailyJourney.vocabularyAttempts[0].selectedOptionId,'A','Refresh must retain the first answer');
  await page.getByRole('button',{name:/完成触控词汇，自动进入下一模块/}).click();
  saved=await state();
  assert.equal(saved.dailyJourney.index,1);
  assert.equal(saved.dailyJourney.completed[0].stage,'vocabulary');
  assert.equal(saved.dailyJourney.completed[0].count,2);
  assert.equal(saved.dailyJourney.vocabularyAttempts.filter(x=>x.countsAsMasteryK).length,0);
  assert.ok(saved.activeSession?.journeyId===saved.dailyJourney.id,'Next existing Journey stage should begin automatically');

  // Separate isolated browser context: never overwrite localStorage in a running app and reload,
  // because beforeunload is allowed to flush the currently running Journey back to disk.
  const legacyState={...saved,activeSession:null,vocabularyAttempts:[],
    dailyJourney:{id:'journey:legacy-synthetic',packId,startedAt:'2026-11-17T00:00:00Z',
      steps:['sentences'],index:0,completed:[],sessionIds:[],readingMs:0,speechMs:0,
      readingDoneIds:[],spellingAttempts:[],transferAttempts:[],transferMs:0,
      finishedAt:null,targetMinutes:20}};
  const legacyPage=await browser.newPage({viewport:{width:390,height:844}});
  const legacyErrors=[];
  legacyPage.on('pageerror',e=>legacyErrors.push(e.message));
  await legacyPage.addInitScript(state=>{
    localStorage.setItem('central-english-mastery.v2',JSON.stringify(state));
  },legacyState);
  await legacyPage.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await legacyPage.getByRole('button',{name:'开始／继续今日完整学习'}).click();
  await legacyPage.getByRole('heading',{name:/触控词汇 1 \/ 2/}).waitFor({timeout:10000});
  const migrated=await legacyPage.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(migrated.dailyJourney.id,'journey:legacy-synthetic');
  assert.deepEqual(migrated.dailyJourney.steps.slice(0,2),['vocabulary','sentences']);
  assert.equal(migrated.dailyJourney.completed.length,0);
  assert.equal(migrated.dailyJourney.vocabularyAttempts.length,0);
  assert.equal(legacyErrors.length,0,'Legacy page errors: '+legacyErrors.join(' | '));
  await legacyPage.close();
  assert.equal(errors.length,0,'Unexpected runtime errors: '+errors.join(' | '));
  console.log('ONE ZIP -> VOCABULARY -> NEXT JOURNEY STAGE; REFRESH + LEGACY MIGRATION PASS');
}finally{
  await browser.close();
}
