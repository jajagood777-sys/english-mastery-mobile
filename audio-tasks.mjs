import {createHash} from 'node:crypto';
import {recordsFromLearningPack} from './core.mjs';
export const DEFAULT_AUDIO_ENGINE='kokoro-js@1.2.1-q8';
export const DEFAULT_AUDIO_VOICE='af_heart';
export function normalizeSpeechText(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export function speechTextHash(text){return createHash('sha256').update(normalizeSpeechText(text)).digest('hex');}
export function splitSpeechSegments(text,max=260){
 const clean=String(text??'').replace(/\r/g,'').trim();if(!clean)return [];
 const paragraphs=clean.split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean),out=[];
 for(const paragraph of paragraphs){const sentences=paragraph.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[paragraph];let segment='';for(const sentence of sentences){const part=sentence.trim();if(!part)continue;if(segment&&segment.length+part.length+1>max){out.push(segment);segment='';}if(part.length<=max)segment=segment?`${segment} ${part}`:part;else{let words=part.split(/\s+/);for(const word of words){if(segment&&segment.length+word.length+1>max){out.push(segment);segment='';}segment=segment?`${segment} ${word}`:word;}}}if(segment)out.push(segment);}
 return out;
}
function task({packId,sourceId,category,text,voice,engineVersion,readingId=null,segmentIndex=null,segmentCount=null,refs=[]}){const normalizedText=normalizeSpeechText(text);return {packId,sourceId,category,text:normalizedText,normalizedText,textHash:speechTextHash(normalizedText),voice,engineVersion,readingId,segmentIndex,segmentCount,sourceRefs:refs,hasAudio:false,needsGeneration:true};}
export function extractAudioTasks(pack,{voice=DEFAULT_AUDIO_VOICE,engineVersion=DEFAULT_AUDIO_ENGINE,existingManifest=[]}={}){
 const errors=[];let normalized;
 try{normalized=recordsFromLearningPack(pack);}catch(error){return {packId:String(pack?.pack_id||''),tasks:[],errors:[error.message],summary:{total:0,existing:0,missing:0}};}
 const packId=normalized.pack.packId,tasks=[],seen=new Map();
 const add=(input)=>{const normalizedText=normalizeSpeechText(input.text);if(!normalizedText)return;const row=task({...input,packId,voice,engineVersion,text:normalizedText});const key=`${row.voice}|${row.engineVersion}|${row.textHash}`;const prior=seen.get(key);if(prior){prior.sourceRefs.push(...(input.refs||[]));return;}seen.set(key,row);tasks.push(row);};
 for(const item of normalized.items){if(item.kind==='word'){add({sourceId:item.sourceItemId||item.id,category:'words',text:item.target,refs:[`${item.id}:target`]});add({sourceId:item.sourceItemId||item.id,category:'examples',text:item.example,refs:[`${item.id}:example`]});if(item.definitionEn)add({sourceId:item.sourceItemId||item.id,category:'definitions',text:item.definitionEn,refs:[`${item.id}:definition_en`]});}else if(item.kind==='sentence')add({sourceId:item.sourceItemId||item.id,category:item.module==='listening'?'listening':'sentences',text:item.text,refs:[item.id]});}
 for(const reading of normalized.readings){const segments=splitSpeechSegments(reading.text);segments.forEach((text,index)=>add({sourceId:reading.sourceId||reading.id,category:'reading',text,readingId:reading.id,segmentIndex:index,segmentCount:segments.length,refs:[`${reading.id}:segment:${index}`]}));if(!segments.length)errors.push(`阅读 ${reading.id} 没有可朗读段落。`);}
 for(const transfer of normalized.transferTasks){add({sourceId:transfer.id,category:'transfer',text:transfer.prompt,refs:[`${transfer.id}:prompt`]});if(transfer.referenceAnswer)add({sourceId:transfer.id,category:'transfer',text:transfer.referenceAnswer,refs:[`${transfer.id}:reference`]});for(const context of transfer.contexts||[]){add({sourceId:transfer.id,category:'transfer',text:context.prompt,refs:[`${transfer.id}:${context.id}:prompt`]});if(context.referenceAnswer)add({sourceId:transfer.id,category:'transfer',text:context.referenceAnswer,refs:[`${transfer.id}:${context.id}:reference`]});}}
 const existing=new Set((existingManifest||[]).filter(x=>x.voice===voice&&x.engine===engineVersion).map(x=>x.sha256||x.textHash));for(const row of tasks){row.hasAudio=existing.has(row.textHash);row.needsGeneration=!row.hasAudio;}
 const byCategory={};for(const row of tasks){const c=byCategory[row.category]||{total:0,existing:0,missing:0};c.total++;if(row.hasAudio)c.existing++;else c.missing++;byCategory[row.category]=c;}
 return {packId,tasks,errors,summary:{total:tasks.length,existing:tasks.filter(x=>x.hasAudio).length,missing:tasks.filter(x=>x.needsGeneration).length},byCategory};
}
