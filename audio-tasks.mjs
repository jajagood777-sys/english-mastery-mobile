import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {recordsFromLearningPack} from './core.mjs';
import {splitSpeechSegments} from './speech-clips.mjs';
import {englishSpellingCue} from './english-first.mjs';
export {splitSpeechSegments};
export const DEFAULT_AUDIO_ENGINE='kokoro-js@1.2.1-q8';
export const DEFAULT_AUDIO_VOICE='af_heart';
export function normalizeSpeechText(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export function speechTextHash(text){return createHash('sha256').update(normalizeSpeechText(text)).digest('hex');}
function task({packId,sourceId,category,text,voice,engineVersion,readingId=null,segmentIndex=null,segmentCount=null,refs=[]}){const normalizedText=normalizeSpeechText(text);return {packId,sourceId,category,text:normalizedText,normalizedText,textHash:speechTextHash(normalizedText),voice,engineVersion,readingId,segmentIndex,segmentCount,sourceRefs:refs,hasAudio:false,needsGeneration:true};}
export function extractAudioTasks(pack,{voice=DEFAULT_AUDIO_VOICE,engineVersion=DEFAULT_AUDIO_ENGINE,existingManifest=[]}={}){
 const errors=[];let normalized;
 try{normalized=recordsFromLearningPack(pack);}catch(error){return {packId:String(pack?.pack_id||''),tasks:[],errors:[error.message],summary:{total:0,existing:0,missing:0}};}
 const packId=normalized.pack.packId,tasks=[],seen=new Map();
 const add=(input)=>{const normalizedText=normalizeSpeechText(input.text);if(!normalizedText)return;const row=task({...input,packId,voice,engineVersion,text:normalizedText});const key=`${row.voice}|${row.engineVersion}|${row.textHash}`;const prior=seen.get(key);if(prior){prior.sourceRefs.push(...(input.refs||[]));return;}seen.set(key,row);tasks.push(row);};
 for(const item of normalized.items){if(item.kind==='word'){add({sourceId:item.sourceItemId||item.id,category:'words',text:item.target,refs:[`${item.id}:target`]});add({sourceId:item.sourceItemId||item.id,category:'examples',text:item.example,refs:[`${item.id}:example`]});if(item.definitionEn)add({sourceId:item.sourceItemId||item.id,category:'definitions',text:item.definitionEn,refs:[`${item.id}:definition_en`]});}else if(item.kind==='sentence'){const category=item.module==='listening'?'listening':'sentences';const segments=category==='listening'?splitSpeechSegments(item.text):[item.text];segments.forEach((text,index)=>add({sourceId:item.sourceItemId||item.id,category,text,segmentIndex:category==='listening'?index:null,segmentCount:category==='listening'?segments.length:null,refs:[`${item.id}${category==='listening'?`:segment:${index}`:''}`]}));}}
 // The website plays englishSpellingCue(task).audioText, NOT the raw cue_en.
 // Share this exact construction (including mode prefixes and masked cloze)
 // with the app to keep manifest SHA-256 and the real audio button in sync.
 for(const spelling of normalized.spellingTasks||[]){
  const cue=englishSpellingCue(spelling);
  if(cue.audioText)add({sourceId:spelling.id,category:'spelling_clues',text:cue.audioText,refs:[`${spelling.id}:audio_text`]});
  else errors.push(`拼写任务 ${spelling.id} 缺少可朗读英文提示；请补充可验证的 cue_en 或含目标词的例句。`);
 }
 for(const reading of normalized.readings){const segments=splitSpeechSegments(reading.text);segments.forEach((text,index)=>add({sourceId:reading.sourceId||reading.id,category:'reading',text,readingId:reading.id,segmentIndex:index,segmentCount:segments.length,refs:[`${reading.id}:segment:${index}`]}));if(!segments.length)errors.push(`阅读 ${reading.id} 没有可朗读段落。`);}
 for(const transfer of normalized.transferTasks){add({sourceId:transfer.id,category:'transfer',text:transfer.prompt,refs:[`${transfer.id}:prompt`]});if(transfer.referenceAnswer)add({sourceId:transfer.id,category:'transfer',text:transfer.referenceAnswer,refs:[`${transfer.id}:reference`]});for(const context of transfer.contexts||[]){add({sourceId:transfer.id,category:'transfer',text:context.prompt,refs:[`${transfer.id}:${context.id}:prompt`]});if(context.referenceAnswer)add({sourceId:transfer.id,category:'transfer',text:context.referenceAnswer,refs:[`${transfer.id}:${context.id}:reference`]});}}
 const existing=new Set((existingManifest||[]).filter(x=>x.voice===voice&&x.engine===engineVersion).map(x=>x.sha256||x.textHash));for(const row of tasks){row.hasAudio=existing.has(row.textHash);row.needsGeneration=!row.hasAudio;}
 const byCategory={};for(const row of tasks){const c=byCategory[row.category]||{total:0,existing:0,missing:0};c.total++;if(row.hasAudio)c.existing++;else c.missing++;byCategory[row.category]=c;}
 return {packId,tasks,errors,summary:{total:tasks.length,existing:tasks.filter(x=>x.hasAudio).length,missing:tasks.filter(x=>x.needsGeneration).length},byCategory};
}


export async function validateCachedClip(row, outputDir, {voice = row?.voice, engine = row?.engine} = {}) {
 try {
  if (!row || row.voice !== voice) return {valid:false, reason:'voice mismatch'};
  if (row.engine !== engine) return {valid:false, reason:'engine mismatch'};
  if (typeof row.text !== 'string' || !row.text.trim() || !/^[a-f0-9]{64}$/i.test(String(row.sha256||'')) || speechTextHash(row.text) !== row.sha256) return {valid:false, reason:'untrusted text hash'};
  if (!/^[a-f0-9]{64}$/i.test(String(row.fileSha256||''))) return {valid:false, reason:'missing file SHA-256'};
  if (!row.file || !/^[A-Za-z0-9._-]+\.mp3$/i.test(row.file)) return {valid:false, reason:'unsafe or missing file'};
  const filePath=join(outputDir,row.file), bytes=await readFile(filePath), info=await stat(filePath);
  if (!info.isFile() || bytes.length===0) return {valid:false, reason:'missing file'};
  const fileSha256=createHash('sha256').update(bytes).digest('hex');
  if (row.fileSha256 !== fileSha256) return {valid:false, reason:'file hash mismatch'};
  if (row.bytes != null && Number(row.bytes) !== bytes.length) return {valid:false, reason:'file size mismatch'};
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,codec_type','-of','json',filePath],{encoding:'utf8'});
  if (probe.status!==0) return {valid:false, reason:'MP3 decode failed'};
  const parsed=JSON.parse(probe.stdout||'{}'), stream=parsed.streams?.find(x=>x.codec_type==='audio'), duration=Number(parsed.format?.duration);
  if (!stream || stream.codec_name !== 'mp3' || !(duration>0)) return {valid:false, reason:'MP3 codec or duration invalid'};
  return {valid:true, fileSha256, bytes:bytes.length, duration};
 } catch (error) { return {valid:false, reason:error.code==='ENOENT'?'missing file':error.message}; }
}
