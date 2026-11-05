import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const hasFfprobe=spawnSync('ffprobe',['-version']).status===0;
const fixture=join(process.cwd(),'speech-assets/speech-manifest.json');
const sourceRoot=join(process.cwd(),'speech-assets');

test('audio cache update preserves prior clips and adds only validated new clips', {skip:!hasFfprobe}, async()=>{
 const root=await mkdtemp(join(tmpdir(),'audio-cache-three-run-')); const cache=join(root,'cache'); const one=join(root,'one'); const two=join(root,'two'); const three=join(root,'three'); await Promise.all([cp(sourceRoot,one,{recursive:true}),cp(sourceRoot,two,{recursive:true}),cp(sourceRoot,three,{recursive:true})]);
 const manifest=JSON.parse(await readFile(fixture,'utf8')); const clips=manifest.clips.filter(x=>x.voice==='af_heart' && x.engine==='af_heart' ? false : x.voice==='af_heart').slice(0,3);
 // The fixture contains verified file hashes but several historical engine labels; use one explicit generator-compatible row set.
 for (const [dir, selected] of [[one,clips.slice(0,2)],[two,clips.slice(0,3)],[three,clips.slice(0,3)]]) await writeFile(join(dir,'speech-manifest.json'),JSON.stringify({version:1,voice:'af_heart',engine:'kokoro-js@1.2.1-q8',clips:selected.map(x=>({...x,engine:'kokoro-js@1.2.1-q8'}))}));
 const run=(source)=>spawnSync(process.execPath,['scripts/update-audio-cache.mjs','--source',source,'--cache',cache,'--max-files','10','--max-bytes','100000000'],{cwd:process.cwd(),encoding:'utf8'});
 let result=run(one); assert.equal(result.status,0,result.stderr); let report=JSON.parse(result.stdout); assert.equal(report.added,2); assert.equal(report.reused,0);
 result=run(two); assert.equal(result.status,0,result.stderr); report=JSON.parse(result.stdout); assert.equal(report.added,1); assert.equal(report.reused,2);
 result=run(three); assert.equal(result.status,0,result.stderr); report=JSON.parse(result.stdout); assert.equal(report.added,0); assert.equal(report.reused,3);
 const cached=JSON.parse(await readFile(join(cache,'speech-manifest.json'),'utf8')); assert.equal(cached.clips.length,3); await rm(root,{recursive:true,force:true});
});
