import test from 'node:test';
import assert from 'node:assert/strict';
import {handoverEntries,readZipStore,sha256Hex,zipStore} from '../handover.mjs';

const source={schema_version:'2.0',pack_id:'EN-SYNTH-61',title:'Synthetic source pack',items:[{id:'w1',type:'word',target:'nuance',example:'The nuance matters.',definition_en:'a small but important difference'}],readings:[{id:'r1',title:'Synthetic reading',text:'A short synthetic reading passage.'}],spelling_tasks:[{id:'sp1',target:'nuance',prompt_mode:'meaning_to_spelling',definition_en:'a small but important difference'}],transfer_tasks:[{id:'t1',task_type:'writing',prompt:'Write one sentence.'}]};

test('Issue 61 handover includes the exact imported source pack and verifies its hash',async()=>{
  const raw=JSON.stringify(source,null,2)+'\n',bytes=new TextEncoder().encode(raw),hash=await sha256Hex(bytes);
  const {entries,manifest}=handoverEntries({report:{report_id:'report:s61',session_id:'s61',pack_id:'EN-SYNTH-61',transfer_attempts:[]},pack:{packId:'EN-SYNTH-61'},sourcePack:{bytes,packId:'EN-SYNTH-61',schemaVersion:'2.0',sha256:hash,provenance:{type:'imported_daily_pack',fileName:'synthetic.json'}},feedback:{feedback_schema_version:'1.0'}});
  const read=readZipStore(zipStore(entries).bytes),packEntry=read.find(entry=>entry.name==='learning-pack.json'),savedManifest=JSON.parse(new TextDecoder().decode(read.find(entry=>entry.name==='manifest.json').bytes));
  assert.equal(new TextDecoder().decode(packEntry.bytes),raw);assert.equal(savedManifest.source_pack_included,true);assert.equal(savedManifest.source_pack_id,'EN-SYNTH-61');assert.equal(savedManifest.source_pack_schema_version,'2.0');assert.equal(savedManifest.source_pack_sha256,await sha256Hex(packEntry.bytes));assert.deepEqual(JSON.parse(new TextDecoder().decode(packEntry.bytes)),source);
});

test('Issue 61 older Journeys export safely with an explicit unavailable source reason',()=>{
  const {entries,manifest}=handoverEntries({report:{report_id:'report:old',session_id:'old',pack_id:'old-pack',transfer_attempts:[]},pack:{packId:'old-pack'},recordings:[]});
  assert.equal(manifest.source_pack_included,false);assert.match(manifest.source_pack_unavailable_reason,/unavailable|older Journey/i);assert.equal(entries.some(entry=>entry.name==='learning-pack.json'),false);
});

test('Issue 61 refuses to attach a source pack with a different report ID',()=>{
  const bytes=new TextEncoder().encode(JSON.stringify({...source,pack_id:'other-pack'}));
  const {entries,manifest}=handoverEntries({report:{report_id:'report:mismatch',session_id:'mismatch',pack_id:'EN-SYNTH-61',transfer_attempts:[]},sourcePack:{bytes,packId:'other-pack',schemaVersion:'2.0'}});
  assert.equal(manifest.source_pack_included,false);assert.match(manifest.source_pack_unavailable_reason,/does not match/i);assert.equal(entries.some(entry=>entry.name==='learning-pack.json'),false);
});

test('ZIP readback rejects a corrupted source pack instead of treating it as verified',()=>{
  const raw=JSON.stringify(source),bytes=new TextEncoder().encode(raw);
  const {entries}=handoverEntries({report:{report_id:'synthetic',session_id:'synthetic',pack_id:'EN-SYNTH-61'},sourcePack:{bytes,packId:'EN-SYNTH-61'}});
  const original=zipStore(entries).bytes;
  assert.equal(readZipStore(original).find(entry=>entry.name==='learning-pack.json')?.bytes.length,bytes.length);
  const broken=original.slice();
  const sourceIndex=entries.findIndex(entry=>entry.name==='learning-pack.json');
  assert.ok(sourceIndex>=0);
  const enc=new TextEncoder();
  const prefix=entries.slice(0,sourceIndex).reduce((sum,entry)=>sum+30+enc.encode(entry.name).length+entry.bytes.length,0);
  const sourceOffset=prefix+30+enc.encode(entries[sourceIndex].name).length;
  broken[sourceOffset+5]^=0x01;
  assert.throws(()=>readZipStore(broken),/integrity check failed \(CRC32\)/);
});

test('ZIP readback rejects a corrupted CRC header even when bytes are present',()=>{
  const original=zipStore([{name:'test.txt',bytes:new TextEncoder().encode('safe synthetic content')}]).bytes;
  assert.equal(new TextDecoder().decode(readZipStore(original)[0].bytes),'safe synthetic content');
  const broken=original.slice();
  broken[14]^=0x01;
  assert.throws(()=>readZipStore(broken),/integrity check failed \(CRC32\)/);
});
