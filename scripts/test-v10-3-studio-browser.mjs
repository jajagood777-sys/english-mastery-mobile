import {chromium} from 'playwright-core';
import {accessSync,constants} from 'node:fs';
import {mkdtemp,readFile,writeFile,copyFile,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=new URL('..',import.meta.url).pathname;
const executablePath=['/usr/bin/chromium','/usr/bin/google-chrome','/opt/google/chrome/chrome'].find(path=>{try{accessSync(path,constants.X_OK);return true;}catch{return false;}});
if(!executablePath)throw Error('No Chromium executable');
const sourceManifest=JSON.parse(await readFile(join(root,'speech-assets/speech-manifest.json'),'utf8'));
const clips=sourceManifest.clips.filter(row=>row.voice==='af_heart').slice(0,3);if(clips.length<3)throw Error('Synthetic Heart fixtures are missing');
const temp=await mkdtemp(join(tmpdir(),'yan-dao-v10-3-studio-')),stage=join(temp,'stage');await mkdir(join(stage,'audio'),{recursive:true});
const pack={schema_version:'2.0',pack_id:'SYNTH-V10-3-STUDIO',title:'Synthetic Listening Studio',source:'Synthetic test only',items:[{id:'l1',type:'listening',text:clips.map(row=>row.text).join('\n\n')}],readings:[],transfer_tasks:[]};
const packRaw=JSON.stringify(pack,null,2)+'\n';await writeFile(join(stage,'learning-pack.json'),packRaw);for(const clip of clips)await copyFile(join(root,'speech-assets',clip.file),join(stage,'audio',clip.file));
const manifest={version:1,source:'synthetic browser fixture',pack_id:pack.pack_id,clips:clips.map((clip,index)=>({...clip,packId:pack.pack_id,sourceId:'l1',category:'listening',segmentIndex:index,segmentCount:clips.length}))};const manifestRaw=JSON.stringify(manifest,null,2)+'\n';await writeFile(join(stage,'speech-manifest.json'),manifestRaw);await writeFile(join(stage,'package-info.json'),JSON.stringify({package_type:'yan-dao-daily-speech-pack',package_version:1,schema_version:'2.0',pack_id:pack.pack_id,audio_manifest:'speech-manifest.json',audio_directory:'audio/',manifest_sha256:createHash('sha256').update(manifestRaw).digest('hex')},null,2)+'\n');
const zipPath=join(temp,'studio.zip');const zip=spawnSync('zip',['-q','-r',zipPath,'learning-pack.json','speech-manifest.json','package-info.json','audio'],{cwd:stage,encoding:'utf8'});if(zip.status!==0)throw Error(zip.stderr||'zip failed');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:390,height:844}});await page.addInitScript(()=>{window.__audioPlays=[];HTMLMediaElement.prototype.play=function(){window.__audioPlays.push(this.src||'');setTimeout(()=>this.dispatchEvent(new Event('ended')),0);return Promise.resolve();};});
try{await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded'});await page.locator('nav button[data-page="more"]').click();await page.getByRole('button',{name:'资料库'}).click();await page.locator('input[type="file"]').first().setInputFiles(zipPath);await page.getByRole('button',{name:'确认导入一份文件并开始综合学习'}).click();await page.getByRole('heading',{name:'专注修炼'}).waitFor();const buttons=page.getByRole('button',{name:/片段 \d+ · 朗读/});assert.equal(await buttons.count(),3);for(let i=0;i<3;i++){await buttons.nth(i).evaluate(button=>button.click());await page.waitForFunction(expected=>window.__audioPlays.length>=expected,i+1);}assert.ok(await page.evaluate(()=>window.__audioPlays.every(src=>src.startsWith('blob:'))));console.log('V10.3.1 LISTENING STUDIO NATURAL SEGMENTS PASS');}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
