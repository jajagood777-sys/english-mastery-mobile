import test from 'node:test';
import assert from 'node:assert/strict';
import {handoverEntries,describeHandoverRecordings,zipStore,readZipStore,crc32} from '../handover.mjs';

test('Central handover ZIP keeps reports separate and excludes recordings by default',()=>{
 const pack=handoverEntries({report:{report_id:'r1',session_id:'s1',pack_id:'p1'},feedback:{feedback_schema_version:'1.0'}});const zip=zipStore(pack.entries);
 assert.deepEqual(pack.manifest,{handover_schema_version:'1.0',generated_at:pack.manifest.generated_at,report_id:'r1',session_id:'s1',pack_id:'p1',includes_recordings:false,recording_count:0,privacy:'local export only; no automatic upload',unknowns:['AI scoring and external sync are not performed by the website'],source_pack_included:false,source_pack_id:null,source_pack_schema_version:null,source_pack_sha256:null,source_pack_provenance:null,source_pack_unavailable_reason:'original imported source pack is unavailable for this older Journey'});
 assert.equal(zip.entries.some(row=>row.name.startsWith('recordings/')),false);assert.equal(zip.bytes[0],0x50);assert.equal(zip.bytes[1],0x4b);assert.ok(crc32(new Uint8Array([1,2,3]))>0);
});

test('Central handover includes explicitly selected recordings and manifest metadata',()=>{
 const pack=handoverEntries({report:{report_id:'r2'},recordings:[{id:'recording:two',mimeType:'audio/webm',bytes:new Uint8Array([7,8])}]});const zip=zipStore(pack.entries);const row=zip.entries.find(item=>item.name.startsWith('recordings/'));
 assert.equal(pack.manifest.includes_recordings,true);assert.equal(pack.manifest.recording_count,1);assert.equal(row.size,2);assert.match(row.name,/recording_two\.webm/);
});

test('handover finds reading retelling and ordinary recordings and reports missing bytes',async()=>{
 const report={attempts:[{recording_ids:['a']}],transfer_attempts:[{recordingIds:['b']}],reading_analysis:{retelling_attempts:[{recordingIds:['c','d']}]}};
 const {manifest,entries}=handoverEntries({report,recordings:[{id:'c',bytes:new Uint8Array([1,2])}]});
 assert.deepEqual(manifest.missing_recording_ids,['a','b','d']);
 assert.equal(readZipStore(zipStore(entries).bytes).find(x=>x.name==='recordings/c.webm').size,2);
});

test('20.3.3 handover recording completeness reports missing reading retelling retry clearly while preserving packaged files', () => {
  const report = {
    report_id: 'report:synthetic-rec',
    session_id: 'session-rec',
    attempts: [],
    transfer_attempts: [],
    reading_analysis: {
      retelling_attempts: [
        {
          id: 'retelling:r1',
          readingId: 'r1',
          firstAnswer: 'Original retelling',
          retryAnswer: 'Retry retelling',
          retrySubmittedAt: '2026-11-20T12:00:00Z',
          recordingIds: ['rec-orig-1', 'rec-retry-2']
        }
      ]
    }
  };
  const { manifest } = handoverEntries({
    report,
    feedback: {},
    recordings: [{ id: 'rec-orig-1', mimeType: 'audio/mp4', bytes: new Uint8Array([1, 2, 3, 4]) }]
  });
  const partial = describeHandoverRecordings({ report, manifest, includeRecordings: true });
  assert.equal(partial.complete, false);
  assert.equal(partial.expectedCount, 2);
  assert.equal(partial.packagedCount, 1);
  assert.deepEqual(partial.missingIds, ['rec-retry-2']);
  assert.match(partial.summaryText, /应有 2 条，已打包 1 条，缺少阅读复述重答/);

  const { manifest: fullManifest } = handoverEntries({
    report,
    feedback: {},
    recordings: [
      { id: 'rec-orig-1', mimeType: 'audio/mp4', bytes: new Uint8Array([1, 2, 3, 4]) },
      { id: 'rec-retry-2', mimeType: 'audio/mp4', bytes: new Uint8Array([5, 6, 7, 8]) }
    ]
  });
  const full = describeHandoverRecordings({ report, manifest: fullManifest, includeRecordings: true });
  assert.equal(full.complete, true);
  assert.match(full.summaryText, /应有 2 条，已打包 2 条/);
});
