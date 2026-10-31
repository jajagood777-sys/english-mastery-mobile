import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const skillRoot=join(root,'.agents','skills');
const packCli=join(skillRoot,'english-daily-master-pack-qa','scripts','validate-daily-pack.mjs');

test('four scoped Codex skill manifests and pinned licenses exist',()=>{
 for(const name of ['playwright','gh-fix-ci','frontend-design','english-daily-master-pack-qa']){
  const filename=join(skillRoot,name,'SKILL.md');
  assert.equal(existsSync(filename),true,filename);
  const md=readFileSync(filename,'utf8');
  assert.match(md,/^---\s*\nname:\s*["']?[a-z][a-z0-9-]*/);
  assert.match(md,/description:/);
  if(name!=='english-daily-master-pack-qa')assert.equal(existsSync(join(skillRoot,name,'LICENSE.txt')),true);
 }
 assert.equal(existsSync(join(skillRoot,'playwright','scripts','playwright_cli.sh')),true);
 assert.equal(existsSync(join(skillRoot,'gh-fix-ci','scripts','inspect_pr_checks.py')),true);
});
test('daily master pack QA accepts the actual original four-module sample',()=>{
 const sample=join(root,'examples','english-daily-master-pack.json');
 const run=spawnSync(process.execPath,[packCli,sample],{cwd:root,encoding:'utf8',timeout:12000});
 assert.equal(run.status,0,run.stderr||run.stdout);
 const report=JSON.parse(run.stdout);
 assert.equal(report.valid,true);
 assert.equal(report.counts.words,2);
 assert.equal(report.counts.sentences,2);
 assert.equal(report.counts.readings,1);
 assert.equal(report.counts.listening,2);
 assert.equal(report.minutes,40);
});
test('daily master pack QA rejects missing IDs and invalid sentence cloze targets',()=>{
 const folder=mkdtempSync(join(tmpdir(),'english-skill-qa-'));
 const filepath=join(folder,'pack.json');
 try{
  const sample=JSON.parse(readFileSync(join(root,'examples','english-daily-master-pack.json'),'utf8'));
  sample.items[1].id=sample.items[0].id;
  sample.items[2].cloze_target='not in the English sentence';
  writeFileSync(filepath,JSON.stringify(sample),'utf8');
  const run=spawnSync(process.execPath,[packCli,filepath],{cwd:root,encoding:'utf8',timeout:12000});
  assert.equal(run.status,1,run.stderr||run.stdout);
  const result=JSON.parse(run.stdout);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x=>x.includes('Duplicate id')));
  assert.ok(result.errors.some(x=>x.includes('cloze target')));
 }finally{rmSync(folder,{recursive:true,force:true});}
});
