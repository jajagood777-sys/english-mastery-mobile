import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,APP_VERSION,parseCSV, recordsFromCSV, sentencesFromText, mergeItems, wordPrompt, sentenceCloze, sentenceClozeParts, recordsFromLearningPack, dateKeyInTimeZone, nextDue, buildQueue, validateBackup,migrateBackupPayload,buildBattleReport,battleReportMarkdown,compareAnswer,scheduleReview,makeCSV,homeSummary,readingSelectionContext,readingCardId,persistState,mergeBackupState,isFullBackup,mergeReadingMarks,readingMarkId,safeSourceUrl,normalizeSourceMeta,makeWeakness,mergeWeaknesses,mergeTransferAttempts,buildTransferAnalytics,transferEvidenceStatus} from '../core.mjs';
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
 assert.equal(report.report_id,'report:session-1'); assert.equal(report.active_seconds,1200); assert.deepEqual(report.mode_breakdown,{words:1,sentences:1,listening:0}); assert.deepEqual(report.ratings_summary,{K:1,V:0,N:1}); assert.equal(report.skipped_items,1); assert.equal(report.prompt_stats.first_attempt_independent,2); assert.match(battleReportMarkdown(report),/Central Immortal Aperture/);
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

test('V4.3 release markers and honest home summary are available',()=>{
 const summary=homeSummary({items:[{id:'due',kind:'word',status:'V',dueAt:'2026-10-01T00:00:00Z'},{id:'new',kind:'word',status:'UNTESTED',dueAt:null}],sessions:[{endedAt:'2026-10-30T05:00:00Z',activeMs:600000}],dailyPack:{title:'Today',itemIds:['new']}},new Date('2026-10-30T06:00:00Z'));
 assert.equal(VERSION,4.3);assert.equal(APP_VERSION,'5.1.1');
 assert.deepEqual(summary,{due:1,newItems:1,weak:1,todayMinutes:10,packItems:1});
});

test('V4.3 distinguishes a complete backup from a daily learning pack',()=>{
 assert.equal(isFullBackup({items:[],attempts:[],sessions:[]}),true);
 assert.equal(isFullBackup({items:[{type:'word'}],pack_id:'today'}),false);
});

test('journey battle reports aggregate only unique stage-session attempts and split listening',()=>{
 const session={id:'journey:p1:1',startedAt:'2026-10-31T00:00:00Z',endedAt:'2026-10-31T01:00:00Z',activeMs:3600000,mode:'journey',packId:'p1'};
 const items=[...Array.from({length:8},(_,i)=>({id:`w${i}`,kind:'word',target:`word${i}`,source:'pack'})),...Array.from({length:5},(_,i)=>({id:`s${i}`,kind:'sentence',text:`Sentence ${i}`,source:'pack'})),...Array.from({length:4},(_,i)=>({id:`l${i}`,kind:'sentence',module:'listening',text:`Listen ${i}`,source:'pack'}))];
 const attempts=items.map((item,i)=>({id:`a${i}`,sessionId:i<8?'sw':i<13?'ss':'sl',itemId:item.id,kind:item.kind,status:i%3===0?'K':i%3===1?'V':'N',answer:item.kind==='word'?item.target:item.text,referenceAnswer:item.kind==='word'?item.target:item.text,promptType:item.module==='listening'?'listening':'recall',at:'2026-10-31T00:10:00Z',retry_answer:i===0?'word0 again':'',retried_after_error:i===0}));
 attempts.push({...attempts[0],id:'outside',sessionId:'other'}); attempts.push({...attempts[1],id:'duplicate',sessionId:'sw'});
 const report=buildBattleReport({session,attempts,items,allowedSessionIds:['sw','ss','sl','sl'],now:new Date('2026-10-31T01:00:00Z')});
 assert.equal(report.attempts.length,17); assert.equal(report.total_rated_attempts,17); assert.deepEqual(report.mode_breakdown,{words:8,sentences:5,listening:4});
 assert.equal(report.ratings_summary.K+report.ratings_summary.V+report.ratings_summary.N,17); assert.ok(report.attempts.every(row=>['sw','ss','sl'].includes(row.session_id))); assert.equal(report.attempts.find(row=>row.attempt_id==='a16').prompt_type,'listening');
});

test('unrated journey actions remain explicit and do not inflate K/V/N',()=>{
 const report=buildBattleReport({session:{id:'j',startedAt:'2026-10-31T00:00:00Z',endedAt:'2026-10-31T00:01:00Z',activeMs:60000,mode:'journey'},attempts:[{id:'a',sessionId:'s',itemId:'w',kind:'word',status:null,answer:'',skipped:true,at:'2026-10-31T00:00:30Z'}],allowedSessionIds:['s'],items:[{id:'w',kind:'word',target:'address'}]});
 assert.equal(report.total_rated_attempts,0); assert.equal(report.unrated_attempts,1); assert.deepEqual(report.ratings_summary,{K:0,V:0,N:0}); assert.equal(report.attempts[0].rating,'UNRATED');
});

test('reading marks deduplicate by occurrence without changing saved state',()=>{
 const mark={readingId:'r1',sourceTitle:'Story',paragraphIndex:0,wordText:'Address',normalizedWord:'address',originalSentence:'We address the issue.',position:3,markedAt:'2026-10-31T00:00:00Z',savedStatus:'UNSAVED'};
 const a={...mark,id:readingMarkId(mark)}; const b={...mark,wordText:' address ',normalizedWord:'address',id:readingMarkId({...mark,wordText:' address '})};
 const saved={...a,savedStatus:'SAVED',savedItemId:'w:1'}; const out=mergeReadingMarks([saved],[b,{...mark,position:20,id:readingMarkId({...mark,position:20})}]);
 assert.equal(out.length,2); assert.equal(out.find(x=>x.id===a.id).savedStatus,'SAVED'); assert.notEqual(readingMarkId(mark),readingMarkId({...mark,position:20}));
});

test('V4.2 reading selection uses the containing sentence and flags cross-sentence selections',()=>{
 const one=readingSelectionContext('We address the problem. The team reviews the evidence.', 'address');
 assert.equal(one.context,'We address the problem.'); assert.equal(one.crossSentence,false); assert.equal(one.start,3);
 const cross=readingSelectionContext('We address the problem. The team reviews the evidence.', 'problem. The team');
 assert.equal(cross.crossSentence,true); assert.equal(cross.context,'We address the problem. The team reviews the evidence.');
 assert.equal(readingSelectionContext('We address the problem.','missing'),null);
});

test('V4.2 reading cards have stable context-aware IDs',()=>{
 const a=readingCardId({readingId:'reading:1',kind:'word',target:'address',context:'We address the problem.'});
 const b=readingCardId({readingId:'reading:1',kind:'word',target:' address ',context:'We address the problem.'});
 const c=readingCardId({readingId:'reading:1',kind:'word',target:'address',context:'We address the evidence.'});
 assert.equal(a,b); assert.notEqual(a,c);
});

test('V4.2 persistence reports failure and attempts rollback',()=>{
 const calls=[];const storage={setItem(k,v){calls.push([k,v]);if(calls.length===1)throw Error('quota');}};
 const result=persistState(storage,'state','new','old');
 assert.equal(result.ok,false); assert.equal(calls.length,2); assert.deepEqual(calls[1],['state','old']);
});

test('V4.2 backup merge retains readings, pack metadata, history and existing progress',()=>{
 const current={items:[{id:'w:1',kind:'word',target:'address',status:'N',attempts:2}],attempts:[{id:'a:1'}],sessions:[{id:'s:1'}],reports:[{report_id:'r:1'}],readings:[{id:'reading:1',text:'One.'}],dailyPack:{packId:'today',title:'Today'},packHistory:[{packId:'today'}],settings:{theme:'night'}};
 const restored={items:[{id:'w:1',kind:'word',target:'address',status:'UNTESTED'},{id:'w:2',kind:'word',target:'evidence'}],attempts:[{id:'a:1'},{id:'a:2'}],sessions:[{id:'s:1'},{id:'s:2'}],reports:[{report_id:'r:1'},{report_id:'r:2'}],readings:[{id:'reading:1',text:'One.'},{id:'reading:2',text:'Two.'}],dailyPack:{packId:'later',title:'Later'},packHistory:[{packId:'later'}],settings:{theme:'day'}};
 const merged=mergeBackupState(current,restored);
 assert.equal(merged.items.find(x=>x.id==='w:1').attempts,2); assert.equal(merged.items.length,2); assert.equal(merged.attempts.length,2); assert.equal(merged.sessions.length,2); assert.equal(merged.reports.length,2); assert.equal(merged.readings.length,2); assert.equal(merged.dailyPack.packId,'today'); assert.equal(merged.packHistory.length,2); assert.equal(merged.settings.theme,'night');
});

test('V4.2 backup validation keeps reading and pack defaults explicit',()=>{
 const out=validateBackup({items:[],attempts:[],sessions:[],readings:[{id:'reading:1',title:'Story',text:'A short story.',source:'Local'}],dailyPack:{packId:'p1',title:'Today'},packHistory:[{packId:'p1',title:'Today'}]});
 assert.equal(out.readings[0].text,'A short story.'); assert.equal(out.dailyPack.packId,'p1'); assert.equal(out.packHistory.length,1);
 assert.throws(()=>validateBackup({items:[],attempts:[],sessions:[],readings:[{id:'bad'}]}),/reading/i);
});

test('backup round-trip keeps unsaved reading marks and saved card links',()=>{
 const mark={readingId:'r1',sourceTitle:'Story',paragraphIndex:0,wordText:'address',normalizedWord:'address',originalSentence:'We address the issue.',position:3,savedStatus:'SAVED',savedItemId:'w:1'};
 const out=validateBackup({items:[{id:'w:1',kind:'word',target:'address'}],attempts:[],sessions:[],readings:[{id:'r1',title:'Story',text:'We address the issue.'}],readingMarks:[mark]});
 const markId=out.readingMarks[0].id;assert.equal(out.readingMarks.length,1);assert.equal(out.readingMarks[0].savedItemId,'w:1');
 const merged=mergeBackupState(out,{items:[],attempts:[],sessions:[],readingMarks:[{...mark,id:'different',savedStatus:'UNSAVED'}]});
 assert.equal(merged.readingMarks.length,1);assert.equal(merged.readingMarks.find(x=>x.id===markId).savedStatus,'SAVED');
});

test('V4.4 optional transfer tasks and reading questions remain backward-compatible',()=>{
 const out=recordsFromLearningPack({schema_version:'2.0',pack_id:'v44',title:'V4.4 sample',source:'Test',language:'en',recommended_minutes:40,items:[{id:'w1',type:'word',target:'address',example:'We address the issue.'}],transfer_tasks:[{id:'t1',prompt:'How would you address a difficult issue?',model_answer:'I would address it calmly.',hints:['Use the target verb.']}],readings:[{id:'r1',title:'Short story',text:'This is a short English reading passage with enough length.',questions:[{id:'q1',type:'choice',prompt:'What is the main idea?',options:['Practice helps.','Nothing changes.'],answer:'Practice helps.'}]}]});
 assert.equal(out.items.length,1);assert.equal(out.pack.transferTasks.length,1);assert.equal(out.readings[0].questions.length,1);assert.equal(out.readings[0].questions[0].type,'choice');
 const old=recordsFromLearningPack({pack_id:'old-v43',items:[{type:'word',target:'address',example:'We address the issue.'}],readings:[]});assert.deepEqual(old.pack.transferTasks,[]);
});

test('reading comprehension check records merge without touching learning cards',()=>{
 const current={items:[{id:'w',kind:'word',target:'address',status:'K'}],readingChecks:[{id:'reading-check:r1',readingId:'r1',status:'completed',answers:[]}]};
 const restored={items:[],readingChecks:[{id:'reading-check:r1',readingId:'r1',status:'in_progress',answers:[]},{id:'reading-check:r2',readingId:'r2',status:'completed',answers:[]}]};
 const merged=mergeBackupState(current,restored);assert.equal(merged.items[0].status,'K');assert.equal(merged.readingChecks.length,2);assert.equal(merged.readingChecks.find(x=>x.id==='reading-check:r1').status,'completed');
});


test('V5 source links allow only safe HTTP(S) URLs and preserve YouTube timestamps',()=>{
 const meta=normalizeSourceMeta({source_type:'YouTube',source_name:'Lesson',source_url:'https://www.youtube.com/watch?v=abc123',source_locator:'12:30',youtube_video_id:'abc123',youtube_start_seconds:750});
 assert.equal(meta.sourceUrl,'https://www.youtube.com/watch?v=abc123');
 assert.equal(meta.youtubeStartSeconds,750);
 assert.equal(safeSourceUrl('javascript:alert(1)'),null);
 assert.equal(safeSourceUrl('data:text/html,x'),null);
});

test('V5 weakness imports are stable and idempotent without overwriting evidence',()=>{
 const first=makeWeakness({source_type:'reading',source_id:'r1',source_item_id:'w1',target_expression:'address',skill_type:'Collocation',retrieval_status:'UNTESTED',contexts:[{id:'c1',prompt:'Use address in a new context.'}]});
 const second=makeWeakness({source_type:'reading',source_id:'r1',source_item_id:'w1',target_expression:'address',retrieval_status:'TRANSFER_VERIFIED',contexts:[{id:'c2',prompt:'Use address with a different subject.'}]});
 assert.equal(first.id,second.id);
 const merged=mergeWeaknesses([first],[second]);
 assert.equal(merged.length,1);assert.equal(merged[0].retrievalStatus,'UNTESTED');assert.equal(merged[0].contexts.length,2);
});

test('V5 transfer evidence keeps independent and prompted denominators separate',()=>{
 const weakness=makeWeakness({id:'weak-1',target_expression:'address',source_type:'writing'});
 const attempts=mergeTransferAttempts([],[
  {id:'ta-1',weaknessId:weakness.id,firstAnswer:'I address it.',hintUsed:false,referenceViewed:false,rating:'K',evidenceType:'independent_recall',at:'2026-10-30T00:00:00Z'},
  {id:'ta-2',weaknessId:weakness.id,firstAnswer:'address',hintUsed:true,referenceViewed:true,retryAnswer:'I would address it.',rating:'K',evidenceType:'prompted',at:'2026-10-31T00:00:00Z'}
 ]);
 const analytics=buildTransferAnalytics({weaknesses:[weakness],transferAttempts:attempts,now:new Date('2026-10-31T12:00:00Z')});
 assert.equal(analytics.denominators.independent,1);assert.equal(analytics.denominators.prompted,1);assert.equal(analytics.denominators.retry,1);assert.equal(analytics.counts.unmeasured,0);assert.equal(transferEvidenceStatus(attempts[0]),'INDEPENDENT_RECALL');
});

test('V5 daily pack source metadata and optional weaknesses survive backup validation',()=>{
 const pack=recordsFromLearningPack({schema_version:'2.0',pack_id:'src-pack',source:'Story index',items:[{id:'w1',type:'word',target:'address',example:'We address the issue.',source_type:'Notion',source_id:'G0336',source_url:'https://notion.so/g0336',source_locator:'Part 2',skill_type:'Collocation'}],transfer_tasks:[{id:'t1',prompt:'Use address in a new context.',model_answer:'I would address it.',source_type:'YouTube',source_url:'https://youtube.com/watch?v=abc123',youtube_video_id:'abc123',youtube_start_seconds:42}]});
 assert.equal(pack.items[0].sourceType,'Notion');assert.equal(pack.items[0].sourceUrl,'https://notion.so/g0336');assert.equal(pack.transferTasks[0].youtubeStartSeconds,42);
 const restored=validateBackup({items:[],attempts:[],sessions:[],weaknesses:[{id:'weak-1',target_expression:'address',retrieval_status:'UNTESTED'}],transferAttempts:[{id:'ta-1',weakness_id:'weak-1',first_answer:'I would address it.'}]});
 assert.equal(restored.weaknesses[0].id,'weak-1');assert.equal(restored.transferAttempts[0].firstAnswer,'I would address it.');
});

test('V5 battle reports include optional transfer evidence without changing legacy IDs',()=>{
 const weakness=makeWeakness({id:'weak-report',target_expression:'address',source_type:'writing'});
 const report=buildBattleReport({session:{id:'s-v5',startedAt:'2026-10-31T00:00:00Z',endedAt:'2026-10-31T00:01:00Z',activeMs:60000,mode:'transfer'},attempts:[],weaknesses:[weakness],transferAttempts:[{id:'ta-v5',weaknessId:weakness.id,firstAnswer:'I address it.',rating:'K',evidenceType:'independent_recall'}]});
 assert.equal(report.report_id,'report:s-v5');assert.equal(report.transfer_attempts.length,1);assert.equal(report.transfer_evidence.counts.independent,1);
});

test('V5 transfer tasks preserve optional alternate contexts for delayed re-testing',()=>{
 const out=recordsFromLearningPack({pack_id:'contexts',items:[{type:'word',target:'address',example:'We address the issue.'}],transfer_tasks:[{id:'t-contexts',prompt:'Use address in work.',model_answer:'I address the issue at work.',contexts:[{id:'life',prompt:'Use address in daily life.',model_answer:'I address the problem at home.',hints:['Use a different setting.']}]}]});
 assert.equal(out.pack.transferTasks[0].contexts.length,1);assert.equal(out.pack.transferTasks[0].contexts[0].id,'life');
});

test('V5 analytics does not count hint-only unanswered rows as measured',()=>{
 const analytics=buildTransferAnalytics({weaknesses:[makeWeakness({id:'weak-hint'})],transferAttempts:[{id:'hint-only',weaknessId:'weak-hint',hintUsed:true,referenceViewed:false,firstAnswer:'',retryAnswer:''}]});
 assert.equal(analytics.denominators.prompted,0);assert.equal(analytics.counts.prompted,0);
});

test('V5.1 transfer task types classify speaking writing grammar and reading-to-speaking conservatively',()=>{
 const out=recordsFromLearningPack({pack_id:'types',items:[{type:'word',target:'address',example:'We address the issue.'}],transfer_tasks:[{id:'s',prompt:'Speak for a minute.',task_type:'speaking'},{id:'w',prompt:'Write an argument.',tags:['writing']},{id:'g',prompt:'Transform the sentence.',tags:['grammar']},{id:'r',prompt:'Retell the story.',tags:['reading-to-speaking']},{id:'u',prompt:'Use it elsewhere.'}]});
 assert.deepEqual(out.pack.transferTasks.map(x=>x.taskType),['speaking','writing','grammar','reading_to_speaking','general_transfer']);
});
