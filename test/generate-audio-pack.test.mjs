import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const hasFfprobe=spawnSync('ffprobe',['-version']).status===0;

const fixture=join(process.cwd(),'examples/v56-audio-sample-pack.json');
function run(args){return new Promise(resolve=>{const p=spawn(process.execPath,['scripts/generate-audio-pack.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});let stdout='',stderr='';p.stdout.on('data',x=>stdout+=x);p.stderr.on('data',x=>stderr+=x);p.on('close',code=>resolve({code,stdout,stderr}));});}
test('dry run reports all schema 2.0 tasks and invalid cache entries',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-dry-'));await writeFile(join(out,'speech-manifest.json'),JSON.stringify({version:1,clips:[{voice:'af_heart',engine:'kokoro-js@1.2.1-q8',sha256:'missing',file:'missing.mp3',fileSha256:'00'.repeat(32)}]}));const result=await run(['--pack',fixture,'--out',out,'--dry-run']);assert.equal(result.code,0,result.stderr);const parsed=JSON.parse(result.stdout);assert.equal(parsed.summary.total,29);assert.equal(parsed.summary.missing,29);assert.equal(parsed.invalidCache.length,1);await rm(out,{recursive:true,force:true});});
test('rerun manifest is pruned to current task files',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-prune-'));await writeFile(join(out,'speech-manifest.json'),JSON.stringify({version:1,clips:[]}));const result=await run(['--pack',fixture,'--out',out,'--dry-run']);assert.equal(result.code,0,result.stderr);await rm(out,{recursive:true,force:true});});
test('invalid pack never emits a successful ZIP',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-invalid-'));const bad=join(out,'bad.json');await writeFile(bad,JSON.stringify({pack_id:'bad',items:[]}));const result=await run(['--pack',bad,'--out',out,'--zip']);assert.notEqual(result.code,0);assert.equal(result.stdout.includes('ZIP '),false);const report=JSON.parse(await readFile(join(out,'audio-report.json'),'utf8'));assert.ok(report.errors.length>0);await rm(out,{recursive:true,force:true});});
test('rerun replaces an existing ZIP instead of retaining stale audio members',{skip:!hasFfprobe},async()=>{
 const {cp,writeFile:write,readFile:read,rm:remove,mkdir}=await import('node:fs/promises'); const {spawnSync}=await import('node:child_process');
 const out=await mkdtemp(join(tmpdir(),'pack-zip-prune-')); await cp('speech-assets',out,{recursive:true});
 let result=await run(['--pack',fixture,'--out',out,'--zip']); assert.equal(result.code,0,result.stderr);
 const zip=join(out,'V56-PUBLIC-AUDIO-SAMPLE-heart-audio.zip'); await write(join(out,'stale.mp3'),Buffer.from('stale')); assert.equal(spawnSync('zip',['-q',zip,'stale.mp3'],{cwd:out}).status,0);
 result=await run(['--pack',fixture,'--out',out,'--zip']); assert.equal(result.code,0,result.stderr);
 const listing=spawnSync('unzip',['-Z1',zip],{encoding:'utf8'}).stdout.split('\n').filter(Boolean); assert.equal(listing.filter(x=>x.startsWith('audio/')&&x!=='audio/').length,29); assert.equal(listing.includes('stale.mp3'),false); await remove(out,{recursive:true,force:true});
});
test('generator rejects non-schema-2.0 packs before synthesis',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-schema-'));const bad=join(out,'bad.json');const pack=JSON.parse(await readFile(fixture,'utf8'));pack.schema_version='1.0';await writeFile(bad,JSON.stringify(pack));const result=await run(['--pack',bad,'--out',out,'--zip']);assert.notEqual(result.code,0);assert.equal(result.stdout.includes('ZIP '),false);await rm(out,{recursive:true,force:true});});
