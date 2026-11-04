import test from 'node:test';
import assert from 'node:assert/strict';
import {handoverEntries,zipStore,crc32} from '../handover.mjs';

test('Central handover ZIP keeps reports separate and excludes recordings by default',()=>{
 const pack=handoverEntries({report:{report_id:'r1',session_id:'s1',pack_id:'p1'},feedback:{feedback_schema_version:'1.0'}});const zip=zipStore(pack.entries);
 assert.deepEqual(pack.manifest,{handover_schema_version:'1.0',generated_at:pack.manifest.generated_at,report_id:'r1',session_id:'s1',pack_id:'p1',includes_recordings:false,recording_count:0,privacy:'local export only; no automatic upload',unknowns:['AI scoring and external sync are not performed by the website'],source_pack_included:false,source_pack_id:null,source_pack_schema_version:null,source_pack_sha256:null,source_pack_provenance:null,source_pack_unavailable_reason:'original imported source pack is unavailable for this older Journey'});
 assert.equal(zip.entries.some(row=>row.name.startsWith('recordings/')),false);assert.equal(zip.bytes[0],0x50);assert.equal(zip.bytes[1],0x4b);assert.ok(crc32(new Uint8Array([1,2,3]))>0);
});

test('Central handover includes explicitly selected recordings and manifest metadata',()=>{
 const pack=handoverEntries({report:{report_id:'r2'},recordings:[{id:'recording:two',mimeType:'audio/webm',bytes:new Uint8Array([7,8])}]});const zip=zipStore(pack.entries);const row=zip.entries.find(item=>item.name.startsWith('recordings/'));
 assert.equal(pack.manifest.includes_recordings,true);assert.equal(pack.manifest.recording_count,1);assert.equal(row.size,2);assert.match(row.name,/recording_two\.webm/);
});
