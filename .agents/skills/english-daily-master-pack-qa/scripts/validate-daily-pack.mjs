#!/usr/bin/env node
// No network access or writes. Calls the website's real JSON pack parser.
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {recordsFromLearningPack} from '../../../../core.mjs';

export function inspectMasterPack(source) {
  const errors=[],warnings=[];
  if(!source||typeof source!=='object'||Array.isArray(source))return {valid:false,errors:['Pack must be a JSON object.'],warnings,counts:{}};
  if(source.schema_version!=='2.0')errors.push('schema_version must be "2.0".');
  if(typeof source.pack_id!=='string'||!source.pack_id.trim())errors.push('pack_id must be a stable nonempty string.');
  if(typeof source.title!=='string'||!source.title.trim())errors.push('title is required.');
  if(typeof source.source!=='string'||!source.source.trim())warnings.push('The top-level source is missing or blank; ensure every exercise has a truthful source.');
  if(source.language!=='en')warnings.push('Expected language: "en".');
  if(!Array.isArray(source.items))errors.push('items must be an array.');
  if(!Array.isArray(source.readings))errors.push('readings must be an array.');
  const minutes=Number(source.recommended_minutes);
  if(!Number.isFinite(minutes)||minutes<=0||minutes>180)errors.push('recommended_minutes must be >0 and <=180.');
  const ids=new Set();
  for(const [category,list] of [['items',source.items],['readings',source.readings]]) {
    if(!Array.isArray(list))continue;
    list.forEach((item,i)=>{
      if(!item||typeof item!=='object')return;
      const id=typeof item.id==='string'?item.id.trim():'';
      if(!id){warnings.push(`${category}[${i}] has no stable id.`);return;}
      if(ids.has(id))errors.push(`Duplicate id: ${id}`);
      ids.add(id);
      if(category==='items'&&item.type==='word'&&item.target&&item.example&&!String(item.example).toLocaleLowerCase('en').includes(String(item.target).toLocaleLowerCase('en')))warnings.push(`word ${id}: target does not occur verbatim in example (may be inflected).`);
      if(category==='items'&&item.type==='sentence'){
        const target=item.cloze_target||item.cloze_answer;
        if(target&&!String(item.text||'').toLocaleLowerCase('en').includes(String(target).toLocaleLowerCase('en')))errors.push(`sentence ${id}: cloze target is absent from text.`);
      }
    });
  }
  let parsed=null;
  try{parsed=recordsFromLearningPack(source);}catch(e){errors.push(`Website parser rejected file: ${e.message}`);}
  if(parsed&&parsed.errors.length)errors.push(...parsed.errors.map(x=>`Website parser: ${x}`));
  const items=parsed?.items||[];
  const counts={words:items.filter(x=>x.kind==='word').length,sentences:items.filter(x=>x.kind==='sentence'&&x.module!=='listening').length,readings:parsed?.readings?.length||0,listening:items.filter(x=>x.module==='listening').length};
  for(const [type,count] of Object.entries(counts))if(!count)warnings.push(`No ${type} module content; app must mark this stage missing, not completed.`);
  return {valid:errors.length===0,pack_id:source.pack_id||null,minutes:Number.isFinite(minutes)?minutes:null,counts,errors,warnings};
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  const path=process.argv[2];
  if(!path){console.error('Usage: node .agents/skills/english-daily-master-pack-qa/scripts/validate-daily-pack.mjs <pack.json>');process.exit(2);}
  try{
    if(statSync(path).size>1024*1024)throw Error('File exceeds 1 MiB quality-review limit.');
    const data=JSON.parse(readFileSync(path,'utf8'));
    const summary=inspectMasterPack(data);
    console.log(JSON.stringify(summary,null,2));
    if(!summary.valid)process.exitCode=1;
  }catch(error){console.error('Validation failed: '+error.message);process.exitCode=1;}
}
