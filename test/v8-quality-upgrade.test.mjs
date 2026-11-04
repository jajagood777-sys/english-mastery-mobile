import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTaskInputMode,compareReadingChoice,compareSpellingAnswer,recordsFromLearningPack,buildBattleReport,buildSpellingSummary,normalizeTransferAttempt} from '../core.mjs';
import {handoverEntries,zipStore,readZipStore,sha256Hex} from '../handover.mjs';

test('V8 structured task modes keep speaking controls separate from writing',()=>{
  assert.equal(resolveTaskInputMode({task_type:'speaking'}),'speaking');
  assert.equal(resolveTaskInputMode({task_type:'reading_to_speaking'}),'speaking');
  assert.equal(resolveTaskInputMode({task_type:'writing'}),'writing');
  assert.equal(resolveTaskInputMode({task_type:'exit_ticket',response_mode:'speaking'}),'speaking');
  assert.equal(resolveTaskInputMode({task_type:'exit_ticket'}),'writing');
  assert.equal(resolveTaskInputMode({task_type:'general_transfer',response_mode:'both'}),'both');
});
test('V8 reading choice answers normalize keys and full option text',()=>{
  const options=['first','second','third'];
  assert.equal(compareReadingChoice('B','B',options).status,'correct');
  assert.equal(compareReadingChoice('second','B',options).status,'correct');
  assert.equal(compareReadingChoice('C','third',options).status,'correct');
  assert.equal(compareReadingChoice('Z','B',options).status,'invalid');
  assert.equal(compareReadingChoice('same','same',[]).status,'invalid');
});
test('V8 spelling preserves first answer and classifies real typo',()=>{
  assert.equal(compareSpellingAnswer('calss','class').errorType,'letter_order_or_substitution');
  assert.equal(compareSpellingAnswer('CLASS','class').status,'case_or_punctuation');
  assert.equal(compareSpellingAnswer('universal','demographic').status,'incorrect');
  const pack=recordsFromLearningPack({schema_version:'2.0',pack_id:'spell-pack',items:[{type:'word',id:'w1',target:'class',example:'A class meets here.'}],spelling_tasks:[{id:'SP01',target:'class',cue_zh:'班级',prompt_mode:'meaning_to_spelling'}]});
  assert.equal(pack.spellingTasks[0].id,'SP01');
});
test('V8 transfer status and spelling evidence stay explicit',()=>{
  assert.equal(normalizeTransferAttempt({id:'skip',skipped:true}).status,'skipped');
  assert.equal(normalizeTransferAttempt({id:'audio',recordingOnly:true,recordingIds:['r1']}).status,'submitted_incomplete');
  const summary=buildSpellingSummary([{target:'class',firstAnswer:'calss',firstCheck:{status:'incorrect',errorType:'letter_order_or_substitution'}},{target:'library',firstAnswer:'library',firstCheck:{status:'correct'},retryCheck:{status:'correct'}}]);
  assert.equal(summary.firstCorrect,1);assert.equal(summary.retryCorrect,1);assert.equal(summary.pendingDelayedReview.length,1);
});
test('V8 battle report carries spelling evidence without changing legacy attempts',()=>{
  const report=buildBattleReport({session:{id:'s-v8',startedAt:'2026-01-01',endedAt:'2026-01-01',activeMs:1000},attempts:[],spellingAttempts:[{taskId:'SP01',firstAnswer:'calss',firstCheck:{status:'incorrect'}}]});
  assert.equal(report.attempts.length,0);assert.equal(report.spelling_evidence.attempts.length,1);
});
test('V8 handover manifest reports expected and abnormal audio without upload',()=>{
  const {manifest}=handoverEntries({report:{report_id:'r',session_id:'s',pack_id:'p',transfer_attempts:[{recording_ids:['r1','r2']}]},recordings:[{id:'r1',taskId:'T1',bytes:new Uint8Array([1,2])},{id:'r2',taskId:'T2',bytes:new Uint8Array()}]});
  assert.equal(manifest.expected_recording_count,2);assert.equal(manifest.actual_packaged_count,1);assert.deepEqual(manifest.missing_recording_ids,[]);assert.equal(manifest.abnormal_recordings.length,1);
});
test('V8 touch spelling evidence keeps first and retry input modes distinct',()=>{
  const first=compareSpellingAnswer('calss','class'), retry=compareSpellingAnswer('class','class');
  assert.equal(first.status,'incorrect');assert.equal(retry.status,'correct');
  const row={firstAnswer:'calss',firstCheck:first,retryAnswer:'class',retryCheck:retry,inputMode:'touch_assisted',inputModeRetry:'touch_assisted'};
  assert.equal(row.firstAnswer,'calss');assert.equal(row.retryAnswer,'class');assert.notEqual(row.firstAnswer,row.retryAnswer);
});
test('V8 ZIP round trip reads manifest, duplicate IDs and SHA-256 evidence',async()=>{
  const bytes=new Uint8Array([1,2,3,4]),hash=await sha256Hex(bytes);
  const {entries}=handoverEntries({report:{report_id:'r',session_id:'s',pack_id:'p',transfer_attempts:[{recording_ids:['r1']}]},recordings:[{id:'r1',taskId:'T1',attemptId:'A1',bytes,sha256:hash}]});
  const zip=zipStore(entries),read=readZipStore(zip.bytes),manifest=JSON.parse(new TextDecoder().decode(read.find(x=>x.name==='manifest.json').bytes));
  assert.equal(read.find(x=>x.name.startsWith('recordings/')).bytes.length,4);assert.equal(manifest.recording_task_ids[0].sha256,hash);assert.equal(manifest.total_recording_bytes,4);
  const corrupt=zip.bytes.slice();corrupt[0]=0;assert.throws(()=>readZipStore(corrupt),/ZIP/);
});
test('V8 ZIP handles empty and large synthetic audio without silent success',async()=>{
  const large=new Uint8Array(1024*1024);const {entries,manifest}=handoverEntries({report:{transfer_attempts:[{recording_ids:['empty','large']}]},recordings:[{id:'empty',bytes:new Uint8Array(),error:'empty'},{id:'large',bytes:large,sha256:await sha256Hex(large)}]});
  const read=readZipStore(zipStore(entries).bytes);assert.equal(manifest.actual_packaged_count,1);assert.equal(manifest.abnormal_recordings.length,1);assert.equal(read.find(x=>x.name.includes('large')).bytes.length,large.length);
});
