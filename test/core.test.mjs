import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV, recordsFromCSV, sentencesFromText, mergeItems, wordPrompt, sentenceCloze, sentenceClozeParts, recordsFromLearningPack, dateKeyInTimeZone, nextDue, buildQueue, validateBackup,migrateBackupPayload,buildBattleReport,battleReportMarkdown,compareAnswer,scheduleReview,makeCSV} from '../core.mjs';
test('UTF8 BOM, quoted comma and escaped quotes, multiline CSV',()=>{
 const text='\uFEFFItem_ID,English_Target,Original_Example_EN\r\nA01,address,"We need to address the problem, not ignore it."\r\nA02,quote,"She said ""Hello"".\nThen she left."';
 const parsed=parseCSV(text); assert.equal(parsed.records.length,2);assert.equal(parsed.records[0].English_Target,'address');assert.match(parsed.records[1].Original_Example_EN,/"Hello"/);
});
test('real 7-column source maps vocabulary and optional sentence examples',()=>{
 const source='Item_ID,Group,English_Target,Diagnostic_Cue_ZH,Original_Example_EN,Status_KVN_Unassessed,Evidence_Group\nA01,Meanings,address,处理,We need to address the problem.,UNTESTED,ref';
 const x=recordsFromCSV(source,{source:'fixture.csv'});assert.equal(x.items.length,2);assert.equal(x.items[0].status,'UNTESTED');assert.equal(x.items[1].kind,'sentence');
 const y=recordsFromCSV(source,{includeExamples:false});assert.equal(y.items.length,1);
});
test('sentence CSV + pasted text with abbreviations and duplicate cleaning',()=>{
 const x=recordsFromCSV('sentence,source,topic\n"English learning takes consistent effort.",Story,Motivation',{includeExamples:false});assert.equal(x.items[0].kind,'sentence');
 const y=sentencesFromText('Dr. Smith studies language learning. English improves through daily practice. English improves through daily practice.');assert.ok(y.items.some(x=>x.text.startsWith('Dr. Smith'))); assert.equal(y.items.length,2);
});
test('merge is idempotent and never changes recorded attempts',()=>{
 const first={id:'w:A01',status:'N',attempts:4,dueAt:'2026-11-01T00:00:00Z'};
 const result=mergeItems([first],[{id:'w:A01',status:'UNTESTED',attempts:0},{id:'w:A02',status:'UNTESTED'}]);
 assert.equal(result.added,1);assert.equal(result.skipped,1);assert.deepEqual(result.items[0],first);
});
test('cloze hides target and sentence cloze leaves readable context',()=>{
 assert.equal(wordPrompt({target:'account for',example:'Three factors account for the change.'}).question,'Three factors ________ the change.');
 assert.equal(wordPrompt({target:'address',example:'Please read this carefully.'}).fallback,true);
 const s=sentenceCloze('The best way to improve your English is to practise a little every day.');assert.ok(s.includes('________'));assert.ok(s.includes('improve'));
});
test('review order is due then untested, dates deterministic',()=>{
 const due='2026-10-29T12:00:00Z';const now=Date.parse('2026-10-30T12:00:00Z');
 assert.deepEqual(buildQueue([{id:'a',kind:'word',status:'K',dueAt:null},{id:'b',kind:'word',status:'UNTESTED',dueAt:null},{id:'c',kind:'word',status:'N',dueAt:due}],'words',now),['c','b','a']);
 assert.equal(nextDue('N',new Date('2026-10-30T00:00:00Z')),'2026-10-31T00:00:00.000Z');
});
test('backup validation rejects invalid IDs and restores safe records',()=>{
 const payload={items:[{id:'s:1',kind:'sentence',text:'Sentence',status:'K'}],attempts:[],sessions:[]};const b=validateBackup(payload);assert.equal(b.items.length,1);assert.equal(b.activeSession,null);
 assert.throws(()=>validateBackup({...payload,items:[payload.items[0],payload.items[0]]}),/duplicate/);
});
test('history CSV export safely quotes commas and newlines',()=>{
 const csv=makeCSV([{answer:'hello, world\nagain'}],['answer']);const parsed=parseCSV(csv);assert.equal(parsed.records[0].answer,'hello, world\nagain');
});
test('legacy V1 storage migrates cards, review history, and dates without losing status',()=>{
 const legacy={
  words:[{itemId:'A01',target:'address',cue:'处理',example:'We need to address the problem.',status:'V',nextReview:'2026-11-02'}],
  sentences:[{id:'sentence-A01',text:'We need to address the problem.',source:'Vocabulary examples',status:'N',nextReview:'2026-10-31'}],
  history:[{id:'review-1',itemId:'A01',type:'word',rating:'K',answer:'address',at:'2026-10-30T10:00:00.000Z'}],
  sessions:[{id:'session-1',startedAt:'2026-10-30T09:00:00.000Z',seconds:120,items:1}],settings:{goalMinutes:20}
 };
 const out=migrateBackupPayload(legacy);
 assert.equal(out.items.length,2); assert.equal(out.attempts.length,1); assert.equal(out.items.find(x=>x.kind==='word').status,'K'); assert.equal(out.items.find(x=>x.kind==='word').attempts,1); assert.equal(out.sessions[0].activeMs,120000);
});
test('legacy-shaped malformed backup is rejected',()=>{assert.throws(()=>migrateBackupPayload({words:[],sentences:[],history:'bad'}),/legacy/i)});

test('battle report is derived from actual session attempts and has stable identity',()=>{
 const session={id:'session-1',startedAt:'2026-10-30T01:00:00.000Z',endedAt:'2026-10-30T01:20:00.000Z',activeMs:1200000,mode:'mixed'};
 const items=[{id:'w:1',kind:'word',target:'address',source:'CSV',dueAt:'2026-10-31T00:00:00.000Z'},{id:'s:1',kind:'sentence',text:'Practice matters.',source:'Story'}];
 const attempts=[{id:'a1',sessionId:'session-1',itemId:'w:1',kind:'word',status:'K',answer:'address',at:'2026-10-30T01:05:00.000Z'},{id:'a2',sessionId:'session-1',itemId:'s:1',kind:'sentence',status:'N',answer:'',skipped:true,at:'2026-10-30T01:10:00.000Z'}];
 const report=buildBattleReport({session,attempts,items,now:new Date('2026-10-30T01:20:00.000Z')});
 assert.equal(report.report_id,'report:session-1'); assert.equal(report.active_seconds,1200); assert.deepEqual(report.mode_breakdown,{words:1,sentences:1}); assert.deepEqual(report.ratings_summary,{K:1,V:0,N:1}); assert.equal(report.skipped_items,1); assert.equal(report.prompt_stats.first_attempt_independent,2); assert.match(battleReportMarkdown(report),/Central Immortal Aperture/);
});
test('v2 backup remains compatible with v3 report defaults',()=>{const out=migrateBackupPayload({items:[],attempts:[],sessions:[],settings:{duration:20}});assert.deepEqual(out.reports,[]);assert.equal(out.settings.theme,'system')});

test('sentence fill mode returns one visible blank and exact missing word',()=>{const parts=sentenceClozeParts('Consistent practice is more important than occasional bursts of motivation.','occasional');assert.equal(parts.answer,'occasional');assert.ok(parts.question.includes('_____'));assert.ok(!parts.question.includes(parts.answer));});
test('daily learning pack JSON imports words and sentences with stable pack IDs',()=>{const pack={schema_version:1,pack_id:'today-1',title:'Today English Pack',source:'Central Immortal Aperture',language:'en',items:[{id:'w1',type:'word',target:'address',example:'We need to address the problem.',hint_zh:'处理'},{id:'s1',type:'sentence',text:'Consistent practice matters every day.'}]};const out=recordsFromLearningPack(pack);assert.equal(out.items.length,2);assert.equal(out.pack.packId,'today-1');assert.equal(out.items[0].packId,'today-1');assert.equal(out.items[1].kind,'sentence');});

test('answer comparison distinguishes exact, case punctuation, typo, and incorrect',()=>{assert.equal(compareAnswer('Address','address').status,'case_or_punctuation');assert.equal(compareAnswer('address.','address').status,'case_or_punctuation');assert.equal(compareAnswer('adress','address').status,'minor_spelling');assert.equal(compareAnswer('avoid','address').status,'incorrect');assert.equal(compareAnswer('','address').status,'blank');});
test('adaptive review scheduling stays explainable and bounded',()=>{const first=scheduleReview('K',{} ,new Date('2026-10-30T00:00:00Z'));assert.equal(first.intervalDays,7);const later=scheduleReview('K',{intervalDays:14},new Date('2026-10-30T00:00:00Z'));assert.equal(later.intervalDays,25);const vague=scheduleReview('V',{intervalDays:14},new Date('2026-10-30T00:00:00Z'));assert.equal(vague.intervalDays,5);assert.equal(scheduleReview('N',{intervalDays:30}).intervalDays,1);});
test('daily pack quality check reports duplicate normalized content without duplicating cards',()=>{const out=recordsFromLearningPack({pack_id:'q',items:[{id:'1',type:'sentence',text:'Practice every day with focus.'},{id:'2',type:'sentence',text:' practice every day with focus. '},{id:'3',type:'word',target:'address',example:'We address the problem.'}]});assert.equal(out.items.length,2);assert.equal(out.errors.length,1);assert.match(out.errors[0],/重复/);});
test('CSV tags are preserved for local filters',()=>{const x=recordsFromCSV('Item_ID,Group,English_Target,Diagnostic_Cue_ZH,Original_Example_EN,Tags\nA1,Vocabulary,address,,We address the issue.,IELTS;Daily');assert.deepEqual(x.items[0].tags,['IELTS','Daily']);});
test('new learning metadata stays explicit and does not imply mastery',()=>{const out=recordsFromLearningPack({pack_id:'learn-1',items:[{id:'w1',type:'word',target:'address',example:'We address the issue.',meaning_zh:'处理',definition_en:'deal with a problem',part_of_speech:'verb',collocations:['address a problem'],accepted_answers:['deal with']}]});const item=out.items[0];assert.equal(item.learningStage,'new');assert.equal(item.status,'UNTESTED');assert.equal(item.meaningZh,'处理');assert.deepEqual(item.acceptedAnswers,['deal with']);});
test('battle report markdown exposes learning-stage and prompt provenance',()=>{const report=buildBattleReport({session:{id:'s2',startedAt:'2026-10-30T00:00:00Z',endedAt:'2026-10-30T00:01:00Z',activeMs:60000,mode:'words'},attempts:[{id:'a',sessionId:'s2',itemId:'w',kind:'word',status:'K',answer:'address',prompt_used:true,viewed_answer:true,retried_after_error:false,learning_stage_before:'new',at:'2026-10-30T00:00:30Z'}],items:[{id:'w',kind:'word',target:'address',source:'Pack',dueAt:null}],now:new Date('2026-10-30T00:01:00Z')});const md=battleReportMarkdown(report);assert.match(md,/Prompted answers: 1/);assert.match(md,/Viewed-answer flows: 1/);});

test('explicit sentence target is required for cloze and Beijing date keys cross UTC boundaries correctly',()=>{assert.equal(sentenceClozeParts('We need to address the problem.','address').answer,'address');assert.equal(sentenceClozeParts('We need to address the problem.','solve'),null);assert.equal(dateKeyInTimeZone('2026-10-29T16:30:00.000Z'),'2026-10-30');assert.equal(dateKeyInTimeZone('2026-10-30T15:59:59.000Z'),'2026-10-30');assert.equal(dateKeyInTimeZone('2026-10-30T16:00:00.000Z'),'2026-10-31');});
