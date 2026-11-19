import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const file=process.argv[2]||'examples/v22-smart-choice-110.json';
const errors=[];
let pack;
try{pack=JSON.parse(await readFile(resolve(file),'utf8'));}catch(error){console.error(`PACK INVALID: ${error.message}`);process.exit(1);}
if(pack.schema_version!=='2.0')errors.push(`schema_version must be 2.0, got ${JSON.stringify(pack.schema_version)}`);
if(!pack.pack_id)errors.push('missing pack_id');
const idSets=[['items',pack.items],['readings',pack.readings],['transfer_tasks',pack.transfer_tasks],['archive',pack.archive],['spelling_tasks',pack.spelling_tasks]];
for(const [name,rows] of idSets){if(rows===undefined)continue;if(!Array.isArray(rows))errors.push(`${name} must be an array`);else{const ids=rows.map(x=>x?.id).filter(Boolean),dupes=ids.filter((id,i)=>ids.indexOf(id)!==i);if(dupes.length)errors.push(`${name} duplicate IDs: ${[...new Set(dupes)].join(', ')}`);rows.forEach((row,i)=>{if(!row?.id)errors.push(`${name}[${i}] missing id`);});}}
for(const [name,rows] of [['items',pack.items],['transfer_tasks',pack.transfer_tasks],['spelling_tasks',pack.spelling_tasks]])for(const [i,row] of (rows||[]).entries()){
 const opts=row?.options||row?.choices||[];if(Array.isArray(opts)){const norm=opts.map(x=>String(x?.text??x).trim().toLowerCase()).filter(Boolean);if(new Set(norm).size!==norm.length)errors.push(`${name}[${i}] duplicate options`);}
 const explanation=row?.explanation??row?.explanation_en??row?.rationale??row?.english_distinction;if(row?.options&&(!String(explanation||'').trim()))errors.push(`${name}[${i}] empty explanation`);
}
if(!Array.isArray(pack.archive)&&!Array.isArray(pack.original_word_archive)&&!Array.isArray(pack.originalWordArchive)&&!Array.isArray(pack.original_word_items_read_only_archive))errors.push('archive is missing (expected archive or original_word_archive)');
if(!Array.isArray(pack.transfer_tasks))errors.push('transfer_tasks is missing');
if(errors.length){console.error(JSON.stringify({file,errors},null,2));process.exit(1);}
console.log(JSON.stringify({file,valid:true,schema_version:pack.schema_version,items:pack.items?.length||0,readings:pack.readings?.length||0,transfer_tasks:pack.transfer_tasks?.length||0,archive:(pack.archive||pack.original_word_archive||pack.originalWordArchive||pack.original_word_items_read_only_archive||[]).length},null,2));
