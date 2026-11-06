import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
import {mkdtemp,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=new URL('..',import.meta.url).pathname;
const bin=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(path=>{try{accessSync(path,constants.X_OK);return true;}catch{return false;}});
if(!bin)throw Error('No Chromium executable');
const publicManifest=JSON.parse(await readFile(join(root,'speech-assets/speech-manifest.json'),'utf8'));
const clips=publicManifest.clips.filter(row=>row.voice==='af_heart').slice(0,2);
if(clips.length<2)throw Error('Synthetic public Heart fixtures are missing');
const fixture=await mkdtemp(join(tmpdir(),'yan-dao-v10-3-'));
const stage=join(fixture,'stage');await import('node:fs/promises').then(fs=>fs.mkdir(join(stage,'audio'),{recursive:true}));
const pack={schema_version:'2.0',pack_id:'SYNTH-V10-3-BROWSER',title:'Synthetic natural speech browser fixture',source:'Synthetic test only',items:[],readings:[{id:'r1',title:'Synthetic two-segment reading',text:clips.map(row=>row.text).join('\n\n')}],transfer_tasks:[]};
const packRaw=JSON.stringify(pack,null,2)+'\n';await writeFile(join(stage,'learning-pack.json'),packRaw);
for(const clip of clips)await copyFile(join(root,'speech-assets',clip.file),join(stage,'audio',clip.file));
const manifest={version:1,source:'synthetic browser fixture',pack_id:pack.pack_id,clips:clips.map((clip,index)=>({...clip,packId:pack.pack_id,sourceId:'r1',category:'reading',readingId:'r1',segmentIndex:index,segmentCount:clips.length}))};const manifestRaw=JSON.stringify(manifest,null,2)+'\n';await writeFile(join(stage,'speech-manifest.json'),manifestRaw);await writeFile(join(stage,'package-info.json'),JSON.stringify({package_type:'yan-dao-daily-speech-pack',package_version:1,schema_version:'2.0',pack_id:pack.pack_id,audio_manifest:'speech-manifest.json',audio_directory:'audio/',manifest_sha256:createHash('sha256').update(manifestRaw).digest('hex')},null,2)+'\n');
const zipPath=join(fixture,'synthetic-v10-3.zip');const zip=spawnSync('zip',['-q','-r',zipPath,'learning-pack.json','speech-manifest.json','package-info.json','audio'],{cwd:stage,encoding:'utf8'});if(zip.status!==0)throw Error(zip.stderr||'zip failed');
const browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
await page.addInitScript(()=>{window.__audioPlays=[];const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__audioPlays.push(this.src||'');setTimeout(()=>this.dispatchEvent(new Event('ended')),0);return Promise.resolve();};window.__originalAudioPlay=original;});
try{
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});
  await page.locator('nav button[data-page="more"]').click();
  await page.getByRole('button',{name:'资料库'}).click();
  const input=page.locator('input[type="file"]').first();await input.setInputFiles(zipPath);
  await page.getByRole('heading',{name:'导入与管理英语资料'}).waitFor();
  await page.getByText(/自然语音 2\/2 段/).waitFor({timeout:5000});
  const imported=await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('english-cultivation-audio-v1');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('clips','readonly'),get=tx.objectStore('clips').getAll();get.onsuccess=()=>{resolve(get.result.map(row=>({key:row.key,size:row.blob?.size||0,text:row.text})));};get.onerror=()=>reject(get.error);};}));
  assert.deepEqual(imported.map(row=>row.text),clips.map(row=>row.text));
  assert.deepEqual(imported.map(row=>row.size),clips.map(row=>row.bytes));
  const originalPack=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')||'{}'));
  assert.equal(Boolean(originalPack.dailyPack),false);
  await page.getByRole('button',{name:'确认导入一份文件并开始综合学习'}).click();
  await page.getByRole('heading',{name:'英文阅读'}).waitFor({timeout:5000});
  const speechButton=page.getByRole('button',{name:'朗读英文'}).first();await speechButton.evaluate(button=>button.click());
  try{await page.waitForSelector('#imported-speech-tray audio',{timeout:5000});}catch(error){const appText=await page.locator('#app').innerText();console.error('PLAYBACK_DEBUG',JSON.stringify({text:appText.slice(-900),notice:await page.locator('#notice').innerText().catch(()=>''),plays:await page.evaluate(()=>window.__audioPlays),errors}));throw error;}
  await page.waitForFunction(expected=>window.__audioPlays.length>=expected,clips.length,{timeout:5000});
  assert.ok(await page.evaluate(()=>window.__audioPlays.every(src=>src.startsWith('blob:'))),'natural audio blob was not played');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('central-english-mastery.v2')||'{}'));
  assert.equal(state.dailyPack.packId,'SYNTH-V10-3-BROWSER');
  assert.equal(state.dailyPack.sourcePack.raw,packRaw);
  assert.deepEqual(errors,[]);
  console.log('V10.3 BROWSER ZIP IMPORT + IDB CACHE + NATURAL PLAYBACK PASS');
}finally{await browser.close();await rm(fixture,{recursive:true,force:true});}
