import {copyFile,mkdir,readFile,readdir,rm,stat,writeFile,rename} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {validateCachedClip,DEFAULT_AUDIO_ENGINE,DEFAULT_AUDIO_VOICE} from '../audio-tasks.mjs';

const args=process.argv.slice(2).reduce((out,arg,index,list)=>{if(arg.startsWith('--'))out[arg.slice(2)]=list[index+1]?.startsWith('--')?'true':list[index+1]??'true';return out;},{});
const sourceDir=resolve(String(args.source||'')),cacheDir=resolve(String(args.cache||'')),voice=String(args.voice||DEFAULT_AUDIO_VOICE),engine=String(args.engine||DEFAULT_AUDIO_ENGINE);
const maxFiles=Math.max(1,Number(args['max-files']||5000)),maxBytes=Math.max(1,Number(args['max-bytes']||1_500_000_000)),maxAgeDays=Math.max(1,Number(args['max-age-days']||90));
if(!args.source||!args.cache){console.error('Usage: node scripts/update-audio-cache.mjs --source <clean-output> --cache <audio-library> [--voice] [--engine] [--max-files] [--max-bytes] [--max-age-days]');process.exit(2);} else {
 const now=new Date(),nowIso=now.toISOString(),cutoff=now.getTime()-maxAgeDays*86400000;await mkdir(cacheDir,{recursive:true});
 const readManifest=async dir=>{try{const parsed=JSON.parse(await readFile(join(dir,'speech-manifest.json'),'utf8'));return Array.isArray(parsed.clips)?parsed.clips:[];}catch{return[];}};
 const prior=await readManifest(cacheDir),source=await readManifest(sourceDir),byKey=new Map(),invalidCache=[];
 for(const row of prior.filter(x=>x.voice===voice&&x.engine===engine)){const checked=await validateCachedClip(row,cacheDir,{voice,engine});if(checked.valid)byKey.set(`${row.voice}|${row.engine}|${row.sha256}`,{...row,fileSha256:checked.fileSha256,bytes:checked.bytes,duration:checked.duration});else invalidCache.push({file:row.file,sha256:row.sha256,reason:checked.reason});}
 let added=0,reused=0,invalidSource=0;
 for(const row of source.filter(x=>x.voice===voice&&x.engine===engine)){
  const checked=await validateCachedClip(row,sourceDir,{voice,engine});if(!checked.valid){invalidSource++;continue;}
  const key=`${row.voice}|${row.engine}|${row.sha256}`,existing=byKey.get(key);await copyFile(join(sourceDir,row.file),join(cacheDir,row.file));
  byKey.set(key,{...row,fileSha256:checked.fileSha256,bytes:checked.bytes,duration:checked.duration,createdAt:existing?.createdAt||nowIso,lastUsedAt:nowIso});if(existing)reused++;else added++;
 }
 const rows=[...byKey.values()].filter(row=>{const stamp=Date.parse(row.lastUsedAt||row.createdAt||row.lastVerifiedAt||'');return !Number.isFinite(stamp)||stamp>=cutoff;});
 rows.sort((a,b)=>Date.parse(b.lastUsedAt||b.createdAt||'')-Date.parse(a.lastUsedAt||a.createdAt||''));
 let kept=[],totalBytes=0;for(const row of rows){if(kept.length>=maxFiles||totalBytes+Number(row.bytes||0)>maxBytes)continue;kept.push(row);totalBytes+=Number(row.bytes||0);}
 const keepFiles=new Set(kept.map(x=>x.file));for(const name of await readdir(cacheDir)){if(name.endsWith('.mp3')&&!keepFiles.has(name))await rm(join(cacheDir,name),{force:true});}
 const manifest={version:1,source:'validated Kokoro audio cache',generatedAt:nowIso,voice,engine,limits:{maxFiles,maxBytes,maxAgeDays},clips:kept};const manifestTmp=join(cacheDir,'.speech-manifest.json.tmp');await writeFile(manifestTmp,JSON.stringify(manifest,null,2)+'\n');await rename(manifestTmp,join(cacheDir,'speech-manifest.json'));
 const report={generatedAt:nowIso,voice,engine,added,reused,invalidCache:invalidCache.length,invalidSource,kept:kept.length,bytes:totalBytes,evicted:rows.length-kept.length};console.log(JSON.stringify(report));
 if(invalidSource)process.exitCode=1;
}
