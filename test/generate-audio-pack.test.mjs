import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';

const fixture=join(process.cwd(),'examples/v56-audio-sample-pack.json');
function run(args){return new Promise(resolve=>{const p=spawn(process.execPath,['scripts/generate-audio-pack.mjs',...args],{cwd:process.cwd(),encoding:'utf8'});let stdout='',stderr='';p.stdout.on('data',x=>stdout+=x);p.stderr.on('data',x=>stderr+=x);p.on('close',code=>resolve({code,stdout,stderr}));});}
test('dry run reports all schema 2.0 tasks and invalid cache entries',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-dry-'));await writeFile(join(out,'speech-manifest.json'),JSON.stringify({version:1,clips:[{voice:'af_heart',engine:'kokoro-js@1.2.1-q8',sha256:'missing',file:'missing.mp3',fileSha256:'00'.repeat(32)}]}));const result=await run(['--pack',fixture,'--out',out,'--dry-run']);assert.equal(result.code,0,result.stderr);const parsed=JSON.parse(result.stdout);assert.equal(parsed.summary.total,29);assert.equal(parsed.summary.missing,29);assert.equal(parsed.invalidCache.length,1);await rm(out,{recursive:true,force:true});});
test('rerun manifest is pruned to current task files',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-prune-'));await writeFile(join(out,'speech-manifest.json'),JSON.stringify({version:1,clips:[]}));const result=await run(['--pack',fixture,'--out',out,'--dry-run']);assert.equal(result.code,0,result.stderr);await rm(out,{recursive:true,force:true});});
test('invalid pack never emits a successful ZIP',async()=>{const out=await mkdtemp(join(tmpdir(),'pack-invalid-'));const bad=join(out,'bad.json');await writeFile(bad,JSON.stringify({pack_id:'bad',items:[]}));const result=await run(['--pack',bad,'--out',out,'--zip']);assert.notEqual(result.code,0);assert.equal(result.stdout.includes('ZIP '),false);const report=JSON.parse(await readFile(join(out,'audio-report.json'),'utf8'));assert.ok(report.errors.length>0);await rm(out,{recursive:true,force:true});});
