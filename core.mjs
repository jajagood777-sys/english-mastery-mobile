/** English Cultivation: pure, testable data transforms. No network or private data. */
export const VERSION = 4.3;
export const APP_VERSION = '5.7.0';
export const REPORT_SCHEMA_VERSION = 1;
export const REVIEW_DAYS = { K: 7, V: 3, N: 1 };
export const REQUIRED_WORD_COLUMNS = ['Item_ID','English_Target','Original_Example_EN'];
export function isFullBackup(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.items) && Array.isArray(value.attempts) && Array.isArray(value.sessions));
}
const clean = value => String(value ?? '').trim();
const listValue = value => Array.isArray(value) ? value.map(clean).filter(Boolean) : clean(value).split(/[;|]/).map(clean).filter(Boolean);

export function parseCSV(raw) {
  const input = String(raw ?? '').replace(/^\uFEFF/, '');
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') {
      if (field.trim()) throw Error(`Unexpected quotation mark near character ${i + 1}.`);
      quoted = true;
    } else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => clean(v))) rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw Error('The CSV has an unclosed quoted value.');
  if (row.length || field.length) { row.push(field); if (row.some(v => clean(v))) rows.push(row); }
  if (!rows.length) throw Error('This file contains no CSV rows.');
  const headers = rows.shift().map(v => clean(v));
  if (new Set(headers).size !== headers.length) throw Error('The CSV contains repeated column names.');
  const records = rows.map((values, i) => {
    if (values.length !== headers.length) throw Error(`CSV row ${i + 2}: expected ${headers.length} values, found ${values.length}.`);
    return Object.fromEntries(headers.map((h, j) => [h, clean(values[j])]));
  });
  return { headers, records };
}
export function detectCSVType(headers) {
  if (REQUIRED_WORD_COLUMNS.every(h => headers.includes(h))) return 'word';
  if (headers.includes('sentence')) return 'sentence';
  throw Error('CSV must contain either Item_ID, English_Target, Original_Example_EN or a sentence column.');
}
export function normalized(s) {
  return clean(s).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}
export function stableHash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
export function safeSourceUrl(value) {
  const raw=clean(value); if(!raw) return null;
  try { const url=new URL(raw); if(!['http:','https:'].includes(url.protocol)) return null; return url.toString(); }
  catch { return null; }
}
const sourceValue=(raw,...keys)=>{for(const key of keys){if(raw?.[key]!==undefined&&raw?.[key]!==null&&clean(raw[key]))return raw[key];}return '';};
export function normalizeSourceMeta(raw={},fallback={}) {
  const sourcePick=(...keys)=>sourceValue(raw,...keys)||sourceValue(fallback,...keys);
  const seconds=Number(sourcePick('youtubeStartSeconds','youtube_start_seconds'));
  const videoId=clean(sourcePick('youtubeVideoId','youtube_video_id')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,24)||null;
  return {
    sourceType:clean(sourcePick('sourceType','source_type'))||'unknown',
    sourceId:clean(sourcePick('sourceId','source_id'))||null,
    sourceItemId:clean(sourcePick('sourceItemId','source_item_id'))||null,
    sourceName:clean(sourcePick('sourceName','source_name'))||null,
    sourceUrl:safeSourceUrl(sourcePick('sourceUrl','source_url')),
    sourceLocator:clean(sourcePick('sourceLocator','source_locator'))||null,
    sourceDate:clean(sourcePick('sourceDate','source_date'))||null,
    youtubeVideoId:videoId,
    youtubeStartSeconds:Number.isFinite(seconds)&&seconds>=0?Math.floor(seconds):null,
    learningGoal:clean(sourcePick('learningGoal','learning_goal'))||null
  };
}
function normalizeExamMeta(raw={}) {
  const numbers=listValue(raw.questionNumbers||raw.question_numbers);
  return {
    examSource:clean(raw.examSource||raw.exam_source)||null,
    examType:clean(raw.examType||raw.exam_type)||null,
    testNumber:clean(raw.testNumber||raw.test_number)||null,
    skill:clean(raw.skill)||null,
    questionId:clean(raw.questionId||raw.question_id)||null,
    questionNumbers:numbers.length?numbers:null,
    questionType:clean(raw.questionType||raw.question_type)||null,
    answerConstraints:clean(raw.answerConstraints||raw.answer_constraints)||null,
    sourcePage:clean(raw.sourcePage||raw.source_page)||null,
    isAuthenticIelts:Boolean(raw.isAuthenticIelts??raw.is_authentic_ielts)
  };
}
function normalizeReviewMeta(raw={}) {
  const role=clean(raw.practiceRole||raw.practice_role);
  return {
    practiceRole:role||null,
    reviewId:clean(raw.reviewId||raw.review_id)||null,
    reviewOf:clean(raw.reviewOf||raw.review_of)||null,
    previousReportId:clean(raw.previousReportId||raw.previous_report_id)||null,
    previousAttemptId:clean(raw.previousAttemptId||raw.previous_attempt_id)||null,
    previousDate:clean(raw.previousDate||raw.previous_date)||null,
    previousStatus:clean(raw.previousStatus||raw.previous_status)||null,
    evidenceType:clean(raw.evidenceType||raw.evidence_type)||null,
    weaknessType:clean(raw.weaknessType||raw.weakness_type)||null,
    reviewRound:Number.isFinite(Number(raw.reviewRound??raw.review_round))?Number(raw.reviewRound??raw.review_round):null,
    reviewInstruction:clean(raw.reviewInstruction||raw.review_instruction)||null
  };
}
export function weaknessId(raw={}) {
  const source=normalizeSourceMeta(raw); const target=normalized(sourceValue(raw,'targetExpression','target_expression','target'));
  return `weakness:${stableHash([source.sourceType,source.sourceId,source.sourceItemId,target].join('|'))}`;
}
const allowedRetrievalStatuses=new Set(['UNTESTED','LEARNING','PROMPTED','INDEPENDENT_RECALL','TRANSFER_VERIFIED','REVIEW_DUE']);
export function makeWeakness(raw={}) {
  const source=normalizeSourceMeta(raw); const contexts=Array.isArray(raw.contexts)?raw.contexts.map((context,index)=>({id:clean(context.id)||`context:${index+1}`,prompt:clean(context.prompt),referenceAnswer:clean(context.referenceAnswer||context.reference_answer||context.modelAnswer||context.model_answer),hints:listValue(context.hints||context.hint),source:normalizeSourceMeta(context.source||context)})).filter(context=>context.prompt):[];
  const retrieval=clean(raw.retrievalStatus||raw.retrieval_status)||'UNTESTED';
  return {id:clean(raw.id)||weaknessId(raw),...source,targetExpression:clean(raw.targetExpression||raw.target_expression||raw.target),skillType:clean(raw.skillType||raw.skill_type)||'Unclassified',taskType:clean(raw.taskType||raw.task_type)||'general_transfer',evidenceType:clean(raw.evidenceType||raw.evidence_type)||'unmeasured',retrievalStatus:allowedRetrievalStatuses.has(retrieval)?retrieval:'UNTESTED',nextReviewAt:clean(raw.nextReviewAt||raw.next_review_at)||null,lastTransferAt:clean(raw.lastTransferAt||raw.last_transfer_at)||null,contexts,createdAt:clean(raw.createdAt||raw.created_at)||new Date().toISOString()};
}
export function mergeWeaknesses(existing=[],incoming=[]) {
  const out=[]; const byId=new Map();
  for(const raw of [...(Array.isArray(existing)?existing:[]),...(Array.isArray(incoming)?incoming:[])]){
    const item=makeWeakness(raw),prior=byId.get(item.id);
    if(!prior){byId.set(item.id,item);out.push(item);continue;}
    const contextMap=new Map(prior.contexts.map(context=>[context.id,context])); item.contexts.forEach(context=>{if(!contextMap.has(context.id))contextMap.set(context.id,context);});
    prior.contexts=[...contextMap.values()];
    for(const key of ['sourceType','sourceId','sourceItemId','sourceName','sourceUrl','sourceLocator','sourceDate','youtubeVideoId','youtubeStartSeconds','learningGoal','targetExpression','skillType']) if(!prior[key]&&item[key])prior[key]=item[key];
  }
  return out;
}
export function normalizeTransferAttempt(raw={}) {
  const at=clean(raw.at||raw.createdAt||raw.created_at)||new Date().toISOString();
  const pick=(...values)=>values.map(value=>clean(value)).find(Boolean)||'';
  const firstAnswer=pick(raw.firstAnswer,raw.first_answer,raw.answer);
  const retryAnswer=pick(raw.retryAnswer,raw.retry_answer,raw.selfCorrection,raw.self_correction);
  const taskId=pick(raw.taskId,raw.task_id,raw.contextId,raw.context_id)||null;
  const id=clean(raw.id)||`transfer-attempt:${stableHash([raw.weaknessId||raw.weakness_id||'',taskId||'',at,firstAnswer].join('|'))}`;
  const sourceSnapshot=raw.sourceSnapshot||raw.source_snapshot||null;
  return {...raw,id,weaknessId:clean(raw.weaknessId||raw.weakness_id)||null,contextId:clean(raw.contextId||raw.context_id)||null,taskId,packId:pick(raw.packId,raw.pack_id)||null,journeyId:pick(raw.journeyId,raw.journey_id)||null,taskType:pick(raw.taskType,raw.task_type,sourceSnapshot?.taskType,sourceSnapshot?.task_type)||'general_transfer',...normalizeExamMeta(raw),...normalizeReviewMeta(raw),prompt:pick(raw.prompt,raw.question)||null,targetExpression:pick(raw.targetExpression,raw.target_expression)||null,firstAnswer,firstSubmittedAt:pick(raw.firstSubmittedAt,raw.first_submitted_at,raw.at)||at,hintUsed:Boolean(raw.hintUsed??raw.hint_used??raw.promptUsed??raw.prompt_used),hintEvents:Array.isArray(raw.hintEvents)?raw.hintEvents:Array.isArray(raw.hint_events)?raw.hint_events:[],referenceViewed:Boolean(raw.referenceViewed??raw.reference_viewed??raw.modelAnswerViewed??raw.model_answer_viewed),referenceViewedAt:pick(raw.referenceViewedAt,raw.reference_viewed_at,raw.modelAnswerViewedAt,raw.model_answer_viewed_at)||null,referenceAnswer:pick(raw.referenceAnswer,raw.reference_answer,raw.modelAnswer,raw.model_answer)||null,retryAnswer,retrySubmittedAt:pick(raw.retrySubmittedAt,raw.retry_submitted_at,raw.selfCorrectedAt,raw.self_corrected_at)||null,rating:['K','V','N'].includes(raw.rating)?raw.rating:null,evidenceType:clean(raw.evidenceType||raw.evidence_type)||null,autoCheck:raw.autoCheck||raw.auto_check||null,at,delayed:Boolean(raw.delayed),sourceSnapshot,recordingOnly:Boolean(raw.recordingOnly||raw.recording_only),skipped:Boolean(raw.skipped)};
}
export function mergeTransferAttempts(existing=[],incoming=[]) {
  const out=[]; const byId=new Map();
  for(const raw of [...(Array.isArray(existing)?existing:[]),...(Array.isArray(incoming)?incoming:[])]){const item=normalizeTransferAttempt(raw),prior=byId.get(item.id);if(!prior){byId.set(item.id,item);out.push(item);continue;}for(const key of ['weaknessId','contextId','taskId','packId','journeyId','taskType','examSource','examType','testNumber','skill','questionId','questionNumbers','questionType','answerConstraints','sourcePage','practiceRole','reviewId','reviewOf','previousReportId','previousAttemptId','previousDate','previousStatus','weaknessType','reviewRound','reviewInstruction','prompt','targetExpression','firstAnswer','firstSubmittedAt','referenceViewedAt','referenceAnswer','retryAnswer','retrySubmittedAt','rating','evidenceType','autoCheck','sourceSnapshot'])if(!prior[key]&&item[key])prior[key]=item[key];prior.hintUsed=prior.hintUsed||item.hintUsed;prior.referenceViewed=prior.referenceViewed||item.referenceViewed;prior.delayed=prior.delayed||item.delayed;prior.recordingOnly=prior.recordingOnly||item.recordingOnly;prior.skipped=prior.skipped||item.skipped;prior.hintEvents=[...prior.hintEvents,...item.hintEvents];}
  return out;
}
export function transferEvidenceStatus(attempt={}) {
  if(!attempt||!attempt.firstAnswer&&!attempt.retryAnswer)return 'UNTESTED';
  if(attempt.delayed&&!attempt.hintUsed&&!attempt.referenceViewed&&attempt.rating==='K')return 'TRANSFER_VERIFIED';
  if(attempt.rating==='K'&&!attempt.hintUsed&&!attempt.referenceViewed)return 'INDEPENDENT_RECALL';
  if(attempt.hintUsed||attempt.referenceViewed)return 'PROMPTED';
  return attempt.rating?'LEARNING':'UNTESTED';
}
export function buildTransferAnalytics({weaknesses=[],transferAttempts=[],now=Date.now()}={}) {
  const rows=mergeTransferAttempts([],transferAttempts), due=mergeWeaknesses([],weaknesses).filter(item=>item.nextReviewAt&&new Date(item.nextReviewAt).getTime()<=new Date(now).getTime()).length;
  const measured=rows.filter(row=>row.firstAnswer||row.retryAnswer); const categories={}; const sources={};
  for(const row of rows){const weakness=(Array.isArray(weaknesses)?weaknesses:[]).find(item=>item.id===row.weaknessId)||{};const category=weakness.skillType||'Unclassified',source=weakness.sourceType||'unknown';categories[category]=(categories[category]||0)+1;sources[source]=(sources[source]||0)+1;}
  const independentRows=rows.filter(row=>!row.hintUsed&&!row.referenceViewed&&(row.firstAnswer||row.retryAnswer));
  const promptedRows=rows.filter(row=>(row.hintUsed||row.referenceViewed)&&(row.firstAnswer||row.retryAnswer));
  const retryRows=rows.filter(row=>row.retryAnswer);
  const delayedRows=rows.filter(row=>row.delayed);
  return {counts:{total:rows.length,measured:measured.length,unmeasured:rows.length-measured.length,independent:independentRows.filter(row=>row.rating==='K').length,prompted:promptedRows.filter(row=>row.rating==='K').length,retry:retryRows.filter(row=>row.rating==='K').length,delayed:delayedRows.filter(row=>row.rating==='K').length},denominators:{independent:independentRows.length,prompted:promptedRows.length,retry:retryRows.length,delayed:delayedRows.length},due,byCategory:categories,bySource:sources};
}
function baseRecord(item) {
  const importedAt = item.importedAt || item.createdAt || new Date().toISOString(); return { status:'UNTESTED', attempts:0, lastAt:null, dueAt:null, intervalDays:0, successStreak:0, errorCount:0, learningStage:'new', promptCount:0, viewedAnswerCount:0, createdAt:importedAt, importedAt, ...item };
}
export function recordsFromCSV(raw, { includeExamples = true, source = 'Imported CSV' } = {}) {
  const parsed = parseCSV(raw); const type = detectCSVType(parsed.headers);
  const items = []; const errors = [];
  parsed.records.forEach((r, i) => {
    try {
      if (type === 'word') {
        const id = clean(r.Item_ID); const target = clean(r.English_Target); const example = clean(r.Original_Example_EN);
        if (!id || !target || !example) throw Error('Item ID, target and English example are required.');
        items.push(baseRecord({ id:`w:${id}:${stableHash(normalized(target+'|'+example))}`, sourceItemId:id, kind:'word', contentType:'Words', group:clean(r.Group) || 'Vocabulary', target, cue:clean(r.Diagnostic_Cue_ZH), example, source, evidence:clean(r.Evidence_Group), tags:clean(r.Tags||r.Tag||r.Topic).split(/[;|]/).map(clean).filter(Boolean), meaningZh:clean(r.Meaning_ZH||r.meaning_zh||r.Diagnostic_Cue_ZH), definitionEn:clean(r.Definition_EN||r.definition_en), partOfSpeech:clean(r.Part_of_Speech||r.part_of_speech), collocations:listValue(r.Collocations||r.collocations), acceptedAnswers:listValue(r.Accepted_Answers||r.accepted_answers), difficulty:clean(r.Difficulty||r.difficulty), learningStage:clean(r.learning_stage)||'new' }));
        if (includeExamples && example.length >= 12 && example.length <= 400) items.push(baseRecord({ id:`s:${stableHash(normalized(example))}`, kind:'sentence', contentType:'Sentences', text:example, group:clean(r.Group) || 'Examples', source:`${source} · ${id}` }));
      } else {
        const sentence = clean(r.sentence);
        if (sentence.length < 10 || sentence.length > 800) throw Error('Sentence must be 10–800 characters.');
        items.push(baseRecord({ id:`s:${stableHash(normalized(sentence))}`, kind:'sentence', contentType:'Sentences', text:sentence, source:clean(r.source) || source, group:clean(r.topic) || 'Sentences', tags:clean(r.tags||r.Tags||r.topic).split(/[;|]/).map(clean).filter(Boolean), clozeTarget:clean(r.cloze_target||r.Cloze_Target||r.target), clozeAnswer:clean(r.cloze_answer||r.Cloze_Answer), learningStage:clean(r.learning_stage||r.Learning_Stage)||'new' }));
      }
    } catch (err) { errors.push(`Row ${i + 2}: ${err.message}`); }
  });
  if (!items.length) throw Error(`No valid items found. ${errors[0] || ''}`);
  return { items, errors, sourceType: type, sourceRows: parsed.records.length };
}
const abbreviations = ['mr','mrs','ms','dr','prof','e.g','i.e','etc','vs','st','jr','sr','fig','no'];
export function sentencesFromText(raw, {source='Pasted text'}={}) {
  const text = String(raw || '').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/```[\s\S]*?```/g,' ') 
    .replace(/^#{1,6}\s+.*$/gm,' ').replace(/^\s*[-*+]\s+/gm,'').replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1');
  const safe = text.replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|Fig|No)\./gi,m=>m.replace('.','<DOT>'))
    .replace(/\b(?:e\.g|i\.e)\./gi,m=>m.replaceAll('.','<DOT>'));
  const chunks = safe.replace(/([.!?][\"”']?)\s+(?=[\"“'A-Z0-9])/g,'$1\n').split(/\n+/);
  const results=[]; const seen=new Set();
  for (const v of chunks) {
    const s=v.replaceAll('<DOT>','.').replace(/^[\s\-—]+/,'').trim();
    if (s.length<18 || s.length>400 || s.split(/\s+/).length<4 || /^\d+[.)]/.test(s) || abbreviations.includes(s.toLowerCase())) continue;
    const key=normalized(s); if(seen.has(key)) continue;
    seen.add(key);results.push(baseRecord({id:`s:${stableHash(key)}`,kind:'sentence',contentType:'Reading Materials',text:s,source,group:'Reading', tags:['Reading Materials'], learningStage:'new'}));
  }
  return {items:results, errors:[], sourceRows: results.length, sourceType:'text'};
}
export function mergeItems(existing, incoming) {
  const seen = new Set(existing.map(x => x.id)); const out = [...existing]; let added=0, skipped=0;
  for(const x of incoming){if(seen.has(x.id)){skipped++;continue;}seen.add(x.id);out.push(x);added++;}
  return {items:out,added,skipped};
}
function escapeRE(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
/** Reuse a previously learned card when a new daily file contains the same exercise. */
export function mergeDailyPackItems(existing=[], incoming=[]) {
  const out=[...existing],byId=new Map(out.map(item=>[item.id,item.id])),byContent=new Map();
  const contentKey=item=>item.kind==='word'
    ? `w|${normalized(item.target)}|${normalized(item.example)}`
    : `s|${item.module||'sentences'}|${normalized(item.text)}|${normalized(item.clozeTarget||item.clozeAnswer||'')}`;
  for(const item of out){const key=contentKey(item);if(!byContent.has(key))byContent.set(key,item.id);}
  const ids=[];let added=0,skipped=0;
  for(const item of incoming){
    const key=contentKey(item),id=byId.get(item.id)||byContent.get(key);
    if(id){const prior=out.find(row=>row.id===id);if(item.practiceRole==='review'&&prior){const assignments=Array.isArray(prior.reviewAssignments)?prior.reviewAssignments:[];if(!assignments.some(row=>row.reviewId&&row.reviewId===item.reviewId))prior.reviewAssignments=[...assignments,{...normalizeReviewMeta(item),taskId:item.id}];}ids.push(id);skipped++;continue;}
    out.push(item);byId.set(item.id,item.id);byContent.set(key,item.id);ids.push(item.id);added++;
  }
  return {items:out,itemIds:[...new Set(ids)],added,skipped};
}

export function wordPrompt(item) {
  const example=clean(item.example),target=clean(item.target);
  if(target){
    const p=new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRE(target)})(?=$|[^\\p{L}\\p{N}])`,'iu');
    if(p.test(example)) return {question:example.replace(p,(all,prefix)=>`${prefix}________`),fallback:false};
  }
  return {question:'Write a natural English word or expression that matches the meaning clue.',fallback:true};
}
export function sentenceCloze(sentence) {
  const words = String(sentence).match(/\b[A-Za-z][A-Za-z'-]*\b/g)||[];
  if(words.length<5)return sentence;
  const selected = new Set();
  for (let i=2;i<words.length;i+=4) selected.add(i);
  let n=0;
  return String(sentence).replace(/\b[A-Za-z][A-Za-z'-]*\b/g,w => selected.has(n++)?'________':w);
}

export function sentenceClozeParts(sentence, target='') {
  const text = String(sentence || '').trim(); const wanted = clean(target);
  if (!wanted) return null;
  const pattern = wanted.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${pattern})(?=$|[^\\p{L}\\p{N}])`,'iu').exec(text);
  if (!match) return null;
  const start = match.index + match[1].length; const found = match[2];
  return {question:`${text.slice(0,start)}_____ ${text.slice(start + found.length)}`.replace(/\s+/g,' ').trim(), answer:found};
}
export function dateKeyInTimeZone(value, timeZone='Asia/Shanghai') {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function homeSummary(state, now = new Date()) {
  const items = (Array.isArray(state?.items) ? state.items : []).filter(item => !item.archived && !item.paused);
  const sessions = Array.isArray(state?.sessions) ? state.sessions : [];
  const todayKey = dateKeyInTimeZone(now);
  const todayMinutes = Math.round(sessions.filter(session => dateKeyInTimeZone(session.endedAt) === todayKey).reduce((sum, session) => sum + Number(session.activeMs || 0), 0) / 60000);
  const packIds = new Set(Array.isArray(state?.dailyPack?.itemIds) ? state.dailyPack.itemIds : []);
  return {
    due: items.filter(item => isDue(item, now)).length,
    newItems: items.filter(item => item.status === 'UNTESTED' || item.learningStage === 'new').length,
    weak: items.filter(item => item.status === 'N' || item.status === 'V').length,
    todayMinutes,
    packItems: packIds.size ? items.filter(item => packIds.has(item.id)).length : 0
  };
}
export function readingSelectionContext(sourceText, selectedText, {startHint=0, paragraphIndex=0} = {}) {
  const source = String(sourceText || '').replace(/\s+/g,' ').trim();
  const selected = String(selectedText || '').replace(/\s+/g,' ').trim();
  if (!source || !selected) return null;
  const start = source.indexOf(selected, Math.max(0, Number(startHint) || 0));
  if (start < 0) return null;
  const end = start + selected.length;
  const boundaries = [];
  const sentenceEnd = /[.!?](?:["'”’)]*)?(?=\s|$)/g;
  let match;
  while ((match = sentenceEnd.exec(source))) boundaries.push({start: boundaries.at(-1)?.end || 0, end: match.index + match[0].length});
  if (!boundaries.length || boundaries.at(-1).end < source.length) boundaries.push({start: boundaries.at(-1)?.end || 0, end: source.length});
  const containing = boundaries.find(segment => start >= segment.start && start < segment.end) || boundaries.at(-1);
  const finalSegment = boundaries.find(segment => end > segment.start && end <= segment.end) || boundaries.at(-1);
  const crossSentence = containing !== finalSegment;
  return {selected, context:source.slice(containing.start, finalSegment.end).trim(), start, end, paragraphIndex:Number(paragraphIndex)||0, crossSentence};
}
export function readingContextForSelection(sourceText, selectedText) {
  return readingSelectionContext(sourceText, selectedText)?.context || '';
}
export function readingCardId(input, selectedText='', positionalKind='word') {
  const value = typeof input === 'object' ? input : {readingId:input, target:selectedText, kind:positionalKind};
  const {readingId='', kind='word', target='', context='', source=''} = value;
  return `${kind === 'sentence' ? 's' : 'w'}:reading:${stableHash([readingId, source, kind, normalized(target), normalized(context)].join('|'))}`;
}
export function readingMarkId(mark={}) {
  return `mark:reading:${stableHash([mark.readingId||'', mark.normalizedWord||normalized(mark.wordText||''), mark.paragraphIndex||0, mark.position||0].join('|'))}`;
}
export function mergeReadingMarks(existing=[], incoming=[]) {
  const out=[]; const byId=new Map();
  for(const mark of [...(Array.isArray(existing)?existing:[]), ...(Array.isArray(incoming)?incoming:[])]) {
    if(!mark || typeof mark!=='object') continue;
    const normalizedWord=normalized(mark.normalizedWord||mark.wordText||'');
    if(!mark.readingId||!normalizedWord||!String(mark.originalSentence||'').trim()) continue;
    const id=readingMarkId({...mark,normalizedWord});
    const prior=byId.get(id);
    const next={...mark,id,normalizedWord,savedStatus:mark.savedStatus==='SAVED'||prior?.savedStatus==='SAVED'?'SAVED':'UNSAVED',savedItemId:mark.savedItemId||prior?.savedItemId||null};
    if(prior){Object.assign(prior,next);}else{byId.set(id,next);out.push(next);}
  }
  return out;
}
export function persistState(storage, key, state, previousRaw=null) {
  const serialized = typeof state === 'string' ? state : JSON.stringify(state);
  try { storage.setItem(key, serialized); return {ok:true, serialized}; }
  catch (error) {
    if (previousRaw !== null) { try { storage.setItem(key, previousRaw); } catch {} }
    return {ok:false, error:error instanceof Error ? error.message : String(error), serialized};
  }
}
export function mergeBackupState(current={}, restored={}) {
  const mergedItems = mergeItems(Array.isArray(current.items) ? current.items : [], Array.isArray(restored.items) ? restored.items : []);
  const uniqueBy = (rows, key) => {
    const out=[]; const seen=new Set();
    for(const row of rows.filter(Boolean)) {
      const value=row?.[key];
      if(value===undefined||value===null||value===''){out.push(row);continue;}
      if(seen.has(value))continue; seen.add(value); out.push(row);
    }
    return out;
  };
  const readings = uniqueBy([...(Array.isArray(current.readings) ? current.readings : []), ...(Array.isArray(restored.readings) ? restored.readings : [])], 'id');
  const readingMarks = mergeReadingMarks(current.readingMarks, restored.readingMarks);
  const readingChecks = uniqueBy([...(Array.isArray(current.readingChecks)?current.readingChecks:[]),...(Array.isArray(restored.readingChecks)?restored.readingChecks:[])], 'id');
  const weaknesses = mergeWeaknesses(current.weaknesses, restored.weaknesses);
  const transferAttempts = mergeTransferAttempts(current.transferAttempts, restored.transferAttempts);
  const packHistory = uniqueBy([...(Array.isArray(current.packHistory) ? current.packHistory : []), ...(Array.isArray(restored.packHistory) ? restored.packHistory : []), current.dailyPack, restored.dailyPack], 'packId');
  return {
    ...current,
    items:mergedItems.items,
    attempts:uniqueBy([...(current.attempts||[]), ...(restored.attempts||[])], 'id'),
    sessions:uniqueBy([...(current.sessions||[]), ...(restored.sessions||[])], 'id'),
    reports:uniqueBy([...(current.reports||[]), ...(restored.reports||[])], 'report_id'),
    readings,
    readingMarks,
    readingChecks,
    weaknesses,
    transferAttempts,
    dailyPack:current.dailyPack || restored.dailyPack || null,
    packHistory,
    dailyJourney: current.dailyJourney || restored.dailyJourney || null,
    settings:{...(restored.settings||{}),...(current.settings||{})}
  };
}
export function mergeReadings(existing=[], incoming=[]) {
  const out = Array.isArray(existing) ? [...existing] : [];
  const ids = new Set(out.map(reading => reading?.id).filter(Boolean));
  const texts = new Set(out.map(reading => normalized(reading?.text)).filter(Boolean));
  for (const reading of (Array.isArray(incoming) ? incoming : [])) {
    if (!reading || typeof reading.text !== 'string' || !reading.text.trim()) continue;
    const key = normalized(reading.text);
    if ((reading.id && ids.has(reading.id)) || texts.has(key)) continue;
    out.push(reading); if (reading.id) ids.add(reading.id); texts.add(key);
  }
  return out;
}
/** Build a read-only view of words saved from the Reading Chamber.
 * Never infer N from an untested reading mark, and do not alter study cards.
 */
export function collectSavedReadingWords(items = [], marks = [], readings = []) {
  const names = new Map((Array.isArray(readings) ? readings : []).map(row => [String(row?.id || ''), String(row?.title || '')]));
  const marksByCard = new Map();
  for (const mark of (Array.isArray(marks) ? marks : [])) {
    if (!mark || mark.savedStatus !== 'SAVED' || !mark.savedItemId) continue;
    const id = String(mark.savedItemId);
    if (!marksByCard.has(id)) marksByCard.set(id, mark);
  }
  const found = [], seen = new Set();
  for (const item of (Array.isArray(items) ? items : [])) {
    if (!item || item.kind !== 'word' || !item.readingId) continue;
    const id = String(item.id || '');
    const target = String(item.target || item.originalText || '').trim();
    if (!id || !target || seen.has(id)) continue;
    seen.add(id);
    const mark = marksByCard.get(id);
    found.push({
      id,
      target,
      sourceTitle: String(item.sourceTitle || names.get(String(item.readingId)) || item.source || '').trim(),
      originalSentence: String(item.context || item.example || mark?.originalSentence || '').trim(),
      readingId: String(item.readingId),
      packId: String(item.packId || mark?.packId || ''),
      status: ['K','V','N'].includes(item.status) ? item.status : 'UNTESTED',
      savedAt: String(mark?.markedAt || item.createdAt || '').trim()
    });
  }
  return found.reverse();
}
/** Text only leaves the user's device when they deliberately copy or share it. */
export function readingVocabularyHandoff(rows = [], {exportedAt = ''} = {}) {
  const entries = Array.isArray(rows) ? rows : [];
  const lines = [
    '# 言道修炼殿｜阅读生词回传',
    '导出时间（设备）：' + (exportedAt || '未提供'),
    '项目：阅读时保存的生词卡片（' + entries.length + ' 条）',
    '重要说明：保存生词不代表做错或已经掌握；UNTESTED 表示尚未经过测试，不能推定为 N。',
    '供中央仙窍使用：按卡片ID和来源去重，优先安排真实 V/N 或未测词的独立提取，并用新语境出题；本次复制不等于同步至 Sheets/Notion。',
    ''
  ];
  entries.forEach((row, index) => {
    const status = ['K','V','N'].includes(row.status) ? row.status : 'UNTESTED';
    lines.push(
      String(index + 1) + '. ' + String(row.target || '').trim(),
      '   K/V/N：' + (status === 'UNTESTED' ? '未测试（UNTESTED）' : status),
      '   阅读来源：' + (row.sourceTitle || '未记录'),
      '   原文例句：' + (row.originalSentence || '未记录'),
      '   阅读ID：' + (row.readingId || '未记录'),
      '   卡片ID：' + (row.id || '未记录'),
      '   学习包ID：' + (row.packId || '未记录'),
      '   保存时间：' + (row.savedAt || '未记录'),
      ''
    );
  });
  return lines.join('\n').trim() + '\n';
}

export function recordsFromLearningPack(value, {source='Central Immortal Aperture'} = {}) {
  if(!value||typeof value!=='object'||!Array.isArray(value.items)) throw Error('学习包 JSON 缺少 items 列表。');
  if(value.items.length>1000)throw Error('单份学习包最多包含 1000 项卡片。');
  if(value.readings!==undefined&&!Array.isArray(value.readings))throw Error('readings 必须是阅读文章数组。');
  if((value.readings||[]).length>20)throw Error('单份学习包最多包含 20 篇阅读文章。');
  const packId=clean(value.pack_id)||`pack:${stableHash(JSON.stringify(value.items)+'|'+JSON.stringify(value.readings||[]))}`;
  const title=clean(value.title)||'今日综合英语学习包';
  const importedAt=new Date().toISOString();
  const errors=[],items=[],readings=[];
  const transferTasks=[];
  const inferTaskType=(raw,tags)=>{const explicit=normalized(raw.task_type||raw.taskType||'').replaceAll('-','_').replaceAll(' ','_');if(['speaking','writing','grammar','reading_to_speaking','general_transfer'].includes(explicit))return explicit;const joined=tags.map(tag=>normalized(tag).replaceAll('-','_').replaceAll(' ','_'));if(joined.some(tag=>tag.includes('reading_to_speaking')||tag.includes('retell')))return 'reading_to_speaking';if(joined.some(tag=>tag.includes('speaking')||tag.includes('oral')))return 'speaking';if(joined.some(tag=>tag.includes('writing')||tag.includes('essay')))return 'writing';if(joined.some(tag=>tag.includes('grammar')||tag.includes('syntax')))return 'grammar';return 'general_transfer';};
  if(value.transfer_tasks!==undefined&&!Array.isArray(value.transfer_tasks)) errors.push('transfer_tasks 必须是数组；已跳过迁移挑战。');
  for(const [index,raw] of (Array.isArray(value.transfer_tasks)?value.transfer_tasks:[]).entries()){
    if(!raw||typeof raw!=='object'||!clean(raw.prompt||raw.question)){errors.push(`迁移挑战第 ${index+1} 项缺少 prompt。`);continue;}
    const prompt=clean(raw.prompt||raw.question),reference=clean(raw.model_answer||raw.modelAnswer||raw.reference_answer||raw.referenceAnswer);
    if(prompt.length>1200||reference.length>1200){errors.push(`迁移挑战第 ${index+1} 项过长。`);continue;}
    const taskId=clean(raw.id)||`transfer-${index+1}`;
    const taskSource=normalizeSourceMeta(raw,{sourceType:'daily_pack',sourceId:packId,sourceItemId:taskId,sourceName:clean(value.source)||source});
    const taskHints=Array.isArray(raw.hints)?raw.hints.map(clean).filter(Boolean).slice(0,3):listValue(raw.hint);
    const taskTags=Array.isArray(raw.tags)?raw.tags.map(clean).filter(Boolean):listValue(raw.tags);
    const taskType=inferTaskType(raw,taskTags);
    const contexts=Array.isArray(raw.contexts)&&raw.contexts.length?raw.contexts.slice(0,6).map((context,cIndex)=>({id:clean(context?.id)||`${taskId}:context-${cIndex+1}`,prompt:clean(context?.prompt||context?.question),referenceAnswer:clean(context?.model_answer||context?.modelAnswer||context?.reference_answer||context?.referenceAnswer),hints:Array.isArray(context?.hints)?context.hints.map(clean).filter(Boolean).slice(0,3):listValue(context?.hint),source:normalizeSourceMeta(context,taskSource)})).filter(context=>context.prompt):[{id:`${taskId}:context-1`,prompt,referenceAnswer:reference,hints:taskHints,source:taskSource}];
    transferTasks.push({id:taskId,prompt,referenceAnswer:reference,acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),hints:taskHints,sourceItemIds:listValue(raw.source_item_ids||raw.sourceItemIds),tags:taskTags,taskType,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),...taskSource,contexts});
  }
  const planned=Number(value.recommended_minutes??value.target_minutes??0);
  const recommendedMinutes=Number.isFinite(planned)&&planned>0?Math.max(5,Math.min(180,Math.round(planned))):null;
  value.items.forEach((raw,index)=>{
    try{
      if(!raw||typeof raw!=='object')throw Error('学习项目必须是对象。');
      const type=clean(raw.type||raw.kind).toLowerCase();
      const sourceName=clean(raw.source||raw.source_name||raw.sourceName||value.source)||source;
      const sourceId=clean(raw.id||raw.item_id)||`${packId}:${index+1}`;
      const tags=(Array.isArray(raw.tags)?raw.tags:clean(raw.tags).split(/[;|]/)).map(clean).filter(Boolean);
      const itemSource=normalizeSourceMeta(raw,{sourceType:'daily_pack',sourceId:packId,sourceItemId:sourceId,sourceName});
      if(type==='word'){
        const target=clean(raw.target||raw.english_target||raw.text),example=clean(raw.example||raw.example_en||raw.sentence);
        if(!target||!example||target.length>150||example.length>800)throw Error('word 需要 target、example，且长度必须合理。');
        items.push(baseRecord({id:`w:pack:${stableHash(packId+'|'+sourceId)}`,sourceItemId:sourceId,packId,packTitle:title,kind:'word',module:'words',contentType:'Words',target,example,cue:clean(raw.cue||raw.hint_zh),group:clean(raw.group)||'Daily pack',source:sourceName,...itemSource,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),evidence:clean(raw.evidence),tags,meaningZh:clean(raw.meaning_zh||raw.meaningZh||raw.hint_zh||raw.cue),definitionEn:clean(raw.definition_en||raw.definitionEn),partOfSpeech:clean(raw.part_of_speech||raw.partOfSpeech),collocations:listValue(raw.collocations),acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),learningStage:clean(raw.learning_stage||raw.learningStage)||'new',importedAt}));
      }else if(type==='sentence'||type==='listening'){
        const text=clean(raw.text||raw.sentence||raw.english);
        if(text.length<10||text.length>800)throw Error('句子或听力材料需要长度 10–800 的英文文本。');
        const module=type==='listening'?'listening':'sentences';
        items.push(baseRecord({id:`s:pack:${stableHash(packId+'|'+sourceId+'|'+module+'|'+normalized(text))}`,sourceItemId:sourceId,packId,packTitle:title,kind:'sentence',module,contentType:module==='listening'?'Listening':'Sentences',text,source:sourceName,...itemSource,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),group:clean(raw.group)||'Daily pack',clozeTarget:clean(raw.cloze_target||raw.clozeTarget||raw.target),clozeAnswer:clean(raw.cloze_answer||raw.clozeAnswer),acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),tags,learningStage:clean(raw.learning_stage||raw.learningStage)||'new',importedAt}));
      }else throw Error('type 仅支持 word、sentence 或 listening。');
    }catch(error){errors.push(`第 ${index+1} 项：${error.message}`);}
  });
  (value.readings||[]).forEach((raw,index)=>{
    try{
      if(!raw||typeof raw!=='object')throw Error('阅读文章必须是对象。');
      const text=clean(raw.text||raw.content),articleTitle=clean(raw.title);
      if(!articleTitle||text.length<20||text.length>40000)throw Error('readings 需要 title 和长度 20–40000 的英文正文。');
      const sourceId=clean(raw.id)||`reading-${index+1}`;
      const questions=(Array.isArray(raw.questions)?raw.questions:[]).slice(0,6).map((question,qIndex)=>({id:clean(question?.id)||`${sourceId}:q${qIndex+1}`,type:clean(question?.type||'open').toLowerCase()==='choice'?'choice':'open',prompt:clean(question?.prompt||question?.question),options:Array.isArray(question?.options)?question.options.map(clean).filter(Boolean).slice(0,6):[],answer:clean(question?.answer||question?.correct_answer||question?.correctAnswer),acceptedAnswers:listValue(question?.accepted_answers||question?.acceptedAnswers),modelAnswer:clean(question?.model_answer||question?.modelAnswer),explanation:clean(question?.explanation),...normalizeReviewMeta({...raw,...question}),...normalizeExamMeta({...raw,...question,questionId:question?.id||`${sourceId}:q${qIndex+1}`})})).filter(question=>question.prompt);
      const readingSource=normalizeSourceMeta(raw,{sourceType:'reading',sourceId:packId,sourceItemId:sourceId,sourceName:clean(raw.source||value.source)||source});
      readings.push({id:`reading:pack:${stableHash(packId+'|'+sourceId)}`,sourceId,title:articleTitle,text,source:clean(raw.source||value.source)||source,packId,questions,createdAt:importedAt,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),...readingSource});
    }catch(error){errors.push(`阅读第 ${index+1} 篇：${error.message}`);}
  });
  const unique=[],seen=new Set();
  for(const item of items){
    const key=item.kind==='word'?`word|${normalized(item.target)}`:`${item.module}|${normalized(item.text)}`;
    if(seen.has(key)){errors.push(`重复项目：${item.sourceItemId||item.id}`);continue;}
    seen.add(key);unique.push(item);
  }
  const uniqueReadings=[],seenReading=new Set();
  for(const reading of readings){
    const key=normalized(reading.text);
    if(seenReading.has(key)){errors.push(`重复阅读：${reading.title}`);continue;}
    seenReading.add(key);uniqueReadings.push(reading);
  }
  if(!unique.length&&!uniqueReadings.length)throw Error(`学习包没有可导入项目。${errors[0]||''}`);
  return {items:unique,readings:uniqueReadings,transferTasks,errors,sourceType:'pack',sourceRows:value.items.length,pack:{packId,title,createdAt:clean(value.created_at)||null,source:clean(value.source)||source,language:clean(value.language)||'en',recommendedMinutes,readingIds:uniqueReadings.map(x=>x.id),listeningIds:unique.filter(x=>x.module==='listening').map(x=>x.id),transferTasks, schemaVersion:clean(value.schema_version)||'1'}};
}

export function normalizeAnswer(value) {
  return clean(value).toLocaleLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[.,!?;:]+$/g,'').replace(/\s+/g,' ');
}
function answerKey(value) { return normalizeAnswer(value).replace(/[^\p{L}\p{N}]+/gu,''); }
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const cur=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=cur;}}return row[b.length];}
export function compareAnswer(user, reference, {accepted=[]} = {}) {
  const rawUser=clean(user), rawReference=clean(reference); if(!rawUser) return {status:'blank',user:rawUser,reference:rawReference,message:'没有填写答案。'};
  const userNorm=normalizeAnswer(rawUser), refNorm=normalizeAnswer(rawReference);
  if(rawUser===rawReference) return {status:'correct',user:rawUser,reference:rawReference,message:'答案正确。'};
  if(userNorm===refNorm) return {status:'case_or_punctuation',user:rawUser,reference:rawReference,message:'内容一致，只有大小写或标点不同。'};
  const acceptedNorm=accepted.map(normalizeAnswer); if(acceptedNorm.includes(userNorm)) return {status:'correct',user:rawUser,reference:rawReference,message:'答案符合允许表达。'};
  if(answerKey(rawUser)===answerKey(rawReference)) return {status:'case_or_punctuation',user:rawUser,reference:rawReference,message:'内容一致，只有大小写或标点不同。'};
  const distance=editDistance(answerKey(rawUser),answerKey(rawReference));
  if(distance===1&&answerKey(rawReference).length>=4) return {status:'minor_spelling',user:rawUser,reference:rawReference,message:'可能有一个拼写差异，请比较参考表达。'};
  return {status:'incorrect',user:rawUser,reference:rawReference,message:'答案与参考表达不同，请自行比较。'};
}
export function nextDue(status, now = new Date()) {
  if (!REVIEW_DAYS[status]) throw Error('Invalid K/V/N status.');
  const start = new Date(now);return new Date(start.getTime()+REVIEW_DAYS[status]*86400000).toISOString();
}

export function scheduleReview(status, item = {}, now = new Date()) {
  if (!REVIEW_DAYS[status]) throw Error('Invalid K/V/N status.');
  const previous = Number(item.intervalDays || 0);
  let intervalDays;
  if (item.learningStage === 'new' || item.learningStage === 'learning') {
    intervalDays = status === 'K' ? 2 : 1;
  } else if (status === 'N') intervalDays = 1;
  else if (status === 'V') intervalDays = previous ? Math.max(2, Math.min(5, Math.round(previous * 0.6))) : 3;
  else intervalDays = previous ? Math.min(30, Math.max(7, Math.round(previous * 1.8))) : 7;
  const due = new Date(new Date(now).getTime() + intervalDays * 86400000).toISOString();
  return {dueAt:due, intervalDays};
}
export function isDue(item, now=Date.now()) {return !!item.dueAt && new Date(item.dueAt).getTime() <= now;}
export function buildQueue(items,mode='mixed',now=Date.now()) {
  const f=items.filter(i=>mode==='mixed'||i.kind===(mode==='words'?'word':'sentence'));
  const unique=[...new Map(f.map(item=>[item.id,item])).values()];
  return unique.sort((a,b)=>{
    const rank=x=>isDue(x,now)?0:x.status==='UNTESTED'?1:x.status==='N'?2:x.status==='V'?3:4;
    return rank(a)-rank(b) || (new Date(a.dueAt||'9999')-new Date(b.dueAt||'9999')) || a.id.localeCompare(b.id);
  }).map(x=>x.id);
}
export function migrateLegacyState(legacy) {
  if (!legacy || typeof legacy !== 'object' || !Array.isArray(legacy.words) || !Array.isArray(legacy.sentences) || !Array.isArray(legacy.history)) {
    throw Error('Invalid legacy English Mastery backup.');
  }
  const wordIds = new Map();
  const sentenceIds = new Map();
  const items = [];
  const safeStatus = value => ['K','V','N'].includes(value) ? value : 'UNTESTED';
  const safeDate = value => value ? new Date(value).toISOString() : null;
  const attemptsFor = (oldId, type) => legacy.history.filter(h => h.itemId === oldId && h.type === type);
  for (const old of legacy.words) {
    const oldId = String(old.itemId || old.id || '').trim();
    const target = clean(old.target || old.English_Target);
    const example = clean(old.example || old.Original_Example_EN);
    if (!oldId || !target || !example) continue;
    const id = `w:legacy:${stableHash(normalized(oldId+'|'+target+'|'+example))}`;
    wordIds.set(oldId, id);
    const attempts = attemptsFor(oldId, 'word');
    const last = attempts.at(-1);
    items.push(baseRecord({id, sourceItemId:oldId, kind:'word', contentType:'Words', target, example, cue:clean(old.cue), group:clean(old.group)||'Legacy vocabulary', source:'English Mastery v1', evidence:clean(old.evidence), tags:Array.isArray(old.tags)?old.tags:[], status:safeStatus(last?.rating || old.status), attempts:attempts.length, lastAt:safeDate(last?.at), dueAt:safeDate(old.nextReview)}));
  }
  for (const old of legacy.sentences) {
    const oldId = String(old.id || '').trim();
    const text = clean(old.text || old.sentence);
    if (!oldId || !text) continue;
    const id = `s:legacy:${stableHash(normalized(text))}`;
    sentenceIds.set(oldId, id);
    const attempts = attemptsFor(oldId, 'sentence');
    const last = attempts.at(-1);
    items.push(baseRecord({id, kind:'sentence', contentType:'Sentences', text, source:clean(old.source)||'English Mastery v1', group:clean(old.topic)||'Legacy sentences', tags:Array.isArray(old.tags)?old.tags:[], status:safeStatus(last?.rating || old.status), attempts:attempts.length, lastAt:safeDate(last?.at), dueAt:safeDate(old.nextReview)}));
  }
  const attempts = legacy.history.map((h, index) => {
    const itemId = h.type === 'word' ? wordIds.get(String(h.itemId)) : sentenceIds.get(String(h.itemId));
    if (!itemId || !['K','V','N'].includes(h.rating)) return null;
    return {id:`a:legacy:${index}:${stableHash(String(h.at||''))}`, sessionId:h.sessionId || null, itemId, kind:h.type, status:h.rating, answer:clean(h.answer), at:safeDate(h.at)||new Date(0).toISOString()};
  }).filter(Boolean);
  const sessions = (Array.isArray(legacy.sessions) ? legacy.sessions : []).map((s, index) => ({id:s.id || `session:legacy:${index}`, startedAt:s.startedAt || null, endedAt:s.endedAt || s.startedAt || null, activeMs:Math.max(0, Number(s.seconds||0)*1000), mode:'legacy', count:Number(s.items||0), words:0, sentences:0, K:0, V:0, N:0}));
  return validateBackup({version:VERSION, items, attempts, sessions, readings:[], reports:[], activeSession:null, settings:{duration:Number(legacy.settings?.goalMinutes)||20, speechRate:.9, theme:'system', chineseHints:true, retryAfterError:true, newLimit:10, reviewLimit:20}});
}
export function migrateBackupPayload(value) {
  if (value && Array.isArray(value.items) && Array.isArray(value.attempts) && Array.isArray(value.sessions)) return validateBackup(value);
  return migrateLegacyState(value);
}

export function validateBackup(value){
  if(!value||typeof value!=='object'||!Array.isArray(value.items)||!Array.isArray(value.attempts)||!Array.isArray(value.sessions)) throw Error('Invalid English Mastery backup.');
  if(value.items.length>100000||value.attempts.length>500000)throw Error('Backup exceeds safety limits.');
  const ids=new Set();
  for(const item of value.items){
    if(typeof item.id!=='string'||item.id.length>300||ids.has(item.id)||!['word','sentence'].includes(item.kind))throw Error('Backup has an invalid or duplicate study item.');
    if(item.kind==='word'&&typeof item.target!=='string')throw Error('Backup has invalid vocabulary data.');
    if(item.kind==='sentence'&&typeof item.text!=='string')throw Error('Backup has invalid sentence data.');
    ids.add(item.id);
  }
  if(value.readings!==undefined&&!Array.isArray(value.readings)) throw Error('Backup has invalid reading data.');
  const readings=(value.readings||[]).map(reading=>{
    if(!reading||typeof reading!=='object'||typeof reading.id!=='string'||typeof reading.text!=='string') throw Error('Backup has invalid reading data.');
    return {...reading,title:clean(reading.title)||'Imported reading',source:clean(reading.source)||'Local material'};
  });
  if(value.packHistory!==undefined&&!Array.isArray(value.packHistory)) throw Error('Backup has invalid learning-pack history.');
  const packHistory=(value.packHistory||[]).filter(Boolean).map(pack=>{if(typeof pack!=='object'||!clean(pack.packId))throw Error('Backup has invalid learning-pack history.');return {...pack,packId:clean(pack.packId)};});
  const dailyPack=value.dailyPack===null||value.dailyPack===undefined?null:(typeof value.dailyPack==='object'&&clean(value.dailyPack.packId)?value.dailyPack: (()=>{throw Error('Backup has invalid learning-pack metadata.');})());
  if(value.readingMarks!==undefined&&!Array.isArray(value.readingMarks)) throw Error('Backup has invalid reading-mark data.');
  if(value.weaknesses!==undefined&&!Array.isArray(value.weaknesses)) throw Error('Backup has invalid weakness data.');
  if(value.transferAttempts!==undefined&&!Array.isArray(value.transferAttempts)) throw Error('Backup has invalid transfer-attempt data.');
  const readingMarks=mergeReadingMarks(value.readingMarks||[]);
  const weaknesses=mergeWeaknesses(value.weaknesses||[],[]);
  const transferAttempts=mergeTransferAttempts(value.transferAttempts||[],[]);
  const journey=value.dailyJourney;
  const dailyJourney=journey&&typeof journey==='object'&&typeof journey.packId==='string'&&Array.isArray(journey.steps)&&journey.steps.every(x=>['words','sentences','reading','listening','transfer'].includes(x))?{
    ...journey,readingRunning:false,readingLastTick:null,readingMs:Math.max(0,Number(journey.readingMs)||0),
    index:Math.max(0,Math.min(journey.steps.length,Number(journey.index)||0)),
    completed:Array.isArray(journey.completed)?journey.completed.filter(x=>x&&typeof x.stage==='string'):[],
    sessionIds:Array.isArray(journey.sessionIds)?journey.sessionIds.filter(x=>typeof x==='string'):[],
    readingDoneIds:Array.isArray(journey.readingDoneIds)?journey.readingDoneIds.filter(x=>typeof x==='string'):[],
    transferAttempts:mergeTransferAttempts(journey.transferAttempts||[],[])
  }:null;
  const items=value.items.map(item=>({...item,learningStage:item.learningStage||((item.attempts||0)>0?'review':'new'),promptCount:Number(item.promptCount||0),viewedAnswerCount:Number(item.viewedAnswerCount||0),acceptedAnswers:listValue(item.acceptedAnswers),collocations:listValue(item.collocations),archived:Boolean(item.archived),paused:Boolean(item.paused)}));
  return {version:VERSION,items,attempts:value.attempts,sessions:value.sessions,readings,readingMarks,readingChecks:Array.isArray(value.readingChecks)?value.readingChecks:[],weaknesses,transferAttempts,reports:Array.isArray(value.reports)?value.reports:[],dailyPack,packHistory,dailyJourney,activeSession:null,settings:{duration:40,speechRate:.9,theme:'system',chineseHints:true,retryAfterError:true,newLimit:10,reviewLimit:20,...(value.settings||{})}};
}

export function buildBattleReport({session, attempts, items=[], allowedSessionIds=null, timezone='Asia/Shanghai', appVersion=APP_VERSION, now=new Date(), readingMarks=[], readings=[], readingChecks=[], weaknesses=[], transferAttempts=[]}) {
  const itemMap = new Map((Array.isArray(items)?items:[]).map(item => [item.id, item]));
  const allowed = new Set((Array.isArray(allowedSessionIds)?allowedSessionIds:[session.id]).filter(Boolean));
  const seen = new Set(); const fingerprints = new Set();
  const sessionAttempts = (Array.isArray(attempts)?attempts:[]).filter(attempt => {
    const key=attempt.id?`id:${attempt.id}`:'';
    const fingerprint=`${attempt.sessionId||''}|${attempt.itemId||''}|${attempt.at||''}|${attempt.answer||''}|${attempt.status||''}|${attempt.promptType||''}`;
    if(!allowed.has(attempt.sessionId)||seen.has(key)||fingerprints.has(fingerprint)) return false;
    if(key)seen.add(key); fingerprints.add(fingerprint); return true;
  });
  const detail = sessionAttempts.map(attempt => {
    const item = itemMap.get(attempt.itemId) || {};
    const listening=attempt.promptType==='listening'||item.module==='listening';
    return {
      attempt_id: attempt.id,
      session_id: attempt.sessionId || null,
      item_id: attempt.itemId,
      content_type: attempt.kind,
      module: listening?'listening':attempt.kind==='word'?'words':'sentences',
      target: item.target || item.text || '',
      source: item.source || 'Unknown source',
      prompt_type: attempt.promptType || (attempt.kind === 'word' ? 'cloze' : 'recall'),
      user_answer: attempt.answer || '',
      reference_answer: attempt.referenceAnswer || item.target || item.text || '',
      rating: ['K','V','N'].includes(attempt.status)?attempt.status:'UNRATED',
      skipped: Boolean(attempt.skipped),
      initial_check: attempt.initial_check || null,
      retry_answer: attempt.retry_answer || '',
      retry_check: attempt.retry_check || null,
      retried_after_error: Boolean(attempt.retried_after_error),
      prompt_used: Boolean(attempt.prompt_used),
      prompt_events: Array.isArray(attempt.prompt_events)?attempt.prompt_events:[],
      viewed_chinese: Boolean(attempt.viewed_chinese),
      viewed_answer: Boolean(attempt.viewed_answer),
      evidence_type: attempt.evidence_type || (attempt.viewed_answer?'viewed_answer':attempt.prompt_used?'prompted':'independent_retrieval'),
      learning_stage_before: attempt.learning_stage_before || null,
      learning_stage_after: attempt.learning_stage_after || null,
      tags: item.tags || [],
      attempt_timestamp: attempt.at,
      suggested_review_date: item.dueAt || null
    };
  });
  const ratedAttempts = sessionAttempts.filter(attempt => ['K','V','N'].includes(attempt.status));
  const count = rating => ratedAttempts.filter(attempt => attempt.status === rating).length;
  const words = detail.filter(attempt => attempt.module === 'words').length;
  const sentences = detail.filter(attempt => attempt.module === 'sentences').length;
  const listening = detail.filter(attempt => attempt.module === 'listening').length;
  const skipped = sessionAttempts.filter(attempt => attempt.skipped).length;
  const reviewItems = {due_tomorrow:[], review_soon:[], stronger_recall:[], needing_practice:[]};
  for (const attempt of detail) {
    if (attempt.rating === 'N') reviewItems.needing_practice.push(attempt.item_id);
    else if (attempt.rating === 'V') reviewItems.review_soon.push(attempt.item_id);
    else if (attempt.rating === 'K') reviewItems.stronger_recall.push(attempt.item_id);
    if (attempt.suggested_review_date && attempt.rating === 'N') reviewItems.due_tomorrow.push(attempt.item_id);
  }
  const reportId = `report:${session.id}`;
  return {
    schema_version: REPORT_SCHEMA_VERSION,
    report_id: reportId,
    session_id: session.id,
    created_at: now.toISOString(),
    timezone,
    source_app: 'English Cultivation',
    app_version: appVersion,
    started_at: session.startedAt,
    ended_at: session.endedAt || now.toISOString(),
    active_seconds: Math.max(0, Math.round(Number(session.activeMs || 0) / 1000)),
    mode: session.mode,
    pack_id: session.packId || null,
    mode_breakdown: {words, sentences, listening},
    learning_breakdown: {new_items:sessionAttempts.filter(a=>a.learning_stage_before==='new').length, learning_stage_items:sessionAttempts.filter(a=>a.learning_stage_before==='learning').length, review_items:sessionAttempts.filter(a=>['review','long_term'].includes(a.learning_stage_before)).length},
    prompt_stats: {prompted:sessionAttempts.filter(a=>a.prompt_used).length, viewed_chinese:sessionAttempts.filter(a=>a.viewed_chinese).length, viewed_answer:sessionAttempts.filter(a=>a.viewed_answer).length, retried_after_error:sessionAttempts.filter(a=>a.retried_after_error).length, first_attempt_independent:sessionAttempts.filter(a=>!a.prompt_used&&!a.viewed_answer).length},
    total_rated_attempts: ratedAttempts.length,
    unrated_attempts: sessionAttempts.length-ratedAttempts.length,
    skipped_items: skipped,
    ratings_summary: {K:count('K'), V:count('V'), N:count('N')},
    attempts: detail,
    review_items: reviewItems,
    next_practice: {priority:['due_tomorrow','needing_practice','review_soon','untested'], source:'local review records'},
    session_ids: [...allowed],
    reading_analysis: {
      articles: (Array.isArray(readings)?readings:[]).map(reading=>({reading_id:reading.id,title:reading.title||'Untitled',source:reading.source||'Local material',...normalizeExamMeta(reading),questions:(reading.questions||[]).map(question=>({id:question.id,prompt:question.prompt,type:question.type,answer:question.answer,examSource:question.examSource,examType:question.examType,testNumber:question.testNumber,skill:question.skill,questionId:question.questionId||question.id,questionNumbers:question.questionNumbers,questionType:question.questionType,answerConstraints:question.answerConstraints,sourcePage:question.sourcePage,isAuthenticIelts:question.isAuthenticIelts}))})),
      marks: Array.isArray(readingMarks)?readingMarks.filter(mark=>!session.packId||!mark.packId||mark.packId===session.packId):[],
      comprehension_checks: Array.isArray(readingChecks)?readingChecks:[]
    },
    transfer_attempts: mergeTransferAttempts([],transferAttempts),
    transfer_evidence: buildTransferAnalytics({weaknesses,transferAttempts,now}),
    data_quality: {actual_active_time:true, duplicate_attempts_checked:true, semantic_score:false, unrated_preserved:true},
    sync_status: 'NOT_SUBMITTED'
  };
}
export function battleReportMarkdown(report) {
  const r = report.ratings_summary || {K:0,V:0,N:0};
  const inline = value => String(value ?? '').replaceAll('|','\\|').replaceAll('\n','<br>');
  const block = value => { const text=String(value ?? '').trim(); return text ? text.split('\n').map(line=>`  ${line}`).join('\n') : '  （未提交）'; };
  const transferType = value => ({writing:'Writing',speaking:'Speaking',grammar:'Grammar',reading_to_speaking:'Reading to Speaking',general_transfer:'Transfer'})[value] || 'Transfer';
  const readingChecks = (report.reading_analysis?.comprehension_checks||[]).flatMap(check=>(check.answers||[]).map(answer=>`- ${inline(answer.questionId||'未命名题目')} · 原答：${inline(answer.answer)} · 判定：${inline(answer.autoCheck?.status||'未判定')} · 提交：${inline(answer.at||'未记录')}`));
  const readingExamLines = (report.reading_analysis?.articles||[]).flatMap(article=>article.examSource?[`- ${inline(article.examSource)} · ${inline(article.examType||'')} · ${inline(article.testNumber||'')} · ${inline(article.skill||'')} · ${article.isAuthenticIelts?'原版真题':'练习材料'} · ${inline(article.sourcePage||'页码未记录')}`,...(article.questions||[]).map(question=>`  - ${inline(question.questionId||question.id)} · ${inline(question.questionType||question.type||'')} · ${inline(question.prompt||'')}`)]:[]);
  const transferLines = (report.transfer_attempts||[]).flatMap((attempt,index)=>[
    `### 题目 ${index+1}｜${transferType(attempt.taskType)} · ${inline(attempt.taskId||attempt.contextId||'未命名任务')}`,
    `- 学习包：${inline(attempt.packId||report.pack_id||'未记录')} · Journey：${inline(attempt.journeyId||report.session_id||'未记录')}`,
    `- 题目原文：${inline(attempt.prompt||'未记录')}`,
    ...(attempt.examSource?[`- IELTS来源：${inline(attempt.examSource)} · ${inline(attempt.examType||'')} · ${inline(attempt.testNumber||'')} · ${inline(attempt.skill||'')} · 题目ID：${inline(attempt.questionId||attempt.taskId||'未记录')} · ${attempt.isAuthenticIelts?'原版真题':'练习材料'}`]:[]),
    ...(attempt.practiceRole==='review'?[`- 回炉来源：${inline(attempt.reviewOf||'历史证据待核验')} · 历史报告：${inline(attempt.previousReportId||'未记录')} · 历史作答：${inline(attempt.previousAttemptId||'未记录')} · 日期：${inline(attempt.previousDate||'未记录')} · 状态：${inline(attempt.previousStatus||'待核验')} · 证据：${inline(attempt.evidenceType||'未记录')} · 第 ${inline(attempt.reviewRound||'未记录')} 轮`]:[]),
    `- 原始英文初稿（${attempt.firstSubmittedAt||'未记录'}）：`, block(attempt.firstAnswer || (attempt.recordingOnly?'录音未转写':'')),
    `- 使用提示：${attempt.hintUsed?'是':'否'} · 查看参考答案：${attempt.referenceViewed?'是':'否'}${attempt.referenceViewedAt?`（${attempt.referenceViewedAt}）`:''}`,
    `- 参考答案：${inline(attempt.referenceAnswer||'未记录')}`,
    `- 修改稿：${attempt.retryAnswer?`已提交（${attempt.retrySubmittedAt||'时间未记录'}）`:'未提交'}`, ...(attempt.retryAnswer?[block(attempt.retryAnswer)]:[]),
    `- K/V/N 自评：${attempt.rating||'未自评'} · AI 评分：未评分，待中央仙窍批改`,
    `- 状态：${attempt.skipped?'跳过':attempt.firstAnswer||attempt.recordingOnly?'已提交':'未提交'} · 录音：${attempt.recordingOnly?'已保存但未转写':'无文字录音记录'}`,
    ''
  ]);
  const lines = [
    `# English Cultivation Battle Report`, ``,
    `- Report ID: ${report.report_id}`, `- Session ID: ${report.session_id}`, `- Date: ${report.created_at}`, `- Time zone: ${report.timezone}`,
    `- Active study time: ${report.active_seconds} seconds`, `- Mode: ${report.mode}`, `- Words: ${report.mode_breakdown?.words||0}`, `- Sentences: ${report.mode_breakdown?.sentences||0}`, `- Listening: ${report.mode_breakdown?.listening||0}`,
    `- Rated attempts: ${report.total_rated_attempts}`, `- Unrated attempts: ${report.unrated_attempts||0}`, `- Skipped items: ${report.skipped_items}`, `- K / V / N: ${r.K} / ${r.V} / ${r.N}`, `- First independent answers: ${report.prompt_stats?.first_attempt_independent||0}`, `- Prompted answers: ${report.prompt_stats?.prompted||0}`, `- Chinese hints viewed: ${report.prompt_stats?.viewed_chinese||0}`, `- Viewed-answer flows: ${report.prompt_stats?.viewed_answer||0}`, `- Retry-after-error flows: ${report.prompt_stats?.retried_after_error||0}`, ``,
    ...(Array.isArray(report.module_coverage)?[
      '## 今日综合学习模块', '',
      `- Recommended time (not a completion condition): ${report.target_minutes||'not set'} minutes`,
      `- Actual reading time: ${report.reading_seconds||0} seconds`,
      `- Completed reading articles (self-reported): ${report.reading_completed||0}`,
      ...report.module_coverage.map(m=>`- ${m.label||m.stage}: ${m.status==='completed'?'completed':m.status==='partial'?'partially completed':'skipped'}; ${m.count??0} items`),
      ''
    ]:[]),
    `## Practice details`, ``, `| 项目 | 类型 | 评价 | 初答 | 检查 | 重练 | 复习 |`, `|---|---|---|---|---|---|---|`,
    ...(report.attempts || []).map(a => `| ${(a.target||a.item_id||'').replaceAll('|','\\|')} | ${a.module||a.content_type} | ${a.rating} | ${(a.user_answer||'').replaceAll('|','\\|').replaceAll('\n',' ')} | ${a.initial_check?.status||''} | ${a.retried_after_error?'是':'否'} | ${a.suggested_review_date||''} |`),
    ...(report.reading_analysis?.marks?.length?[``, `## Reading vocabulary marks`, ``, ...report.reading_analysis.marks.map(mark=>`- ${mark.wordText||mark.normalizedWord} · ${mark.savedStatus==='SAVED'?'已保存为卡片':'尚未保存'} · ${mark.originalSentence||''}`)]:[]),
    ...(readingExamLines.length?[``, `## IELTS reading source`, ``, ...readingExamLines]:[]),
    ...(readingChecks.length?[``, `## IELTS / reading comprehension checks`, ``, ...readingChecks]:[]),
    ...(report.transfer_attempts?.length?[``, `## Transfer challenge`, ``, ...transferLines]:[]),
    ``, `## Review recommendations`, ``, `- Due tomorrow: ${(report.review_items?.due_tomorrow || []).length}`,
    `- Needs practice: ${(report.review_items?.needing_practice || []).length}`, `- Review soon: ${(report.review_items?.review_soon || []).length}`, `- Stronger recall: ${(report.review_items?.stronger_recall || []).length}`, ``,
    `## Central Immortal Aperture handoff`, ``,
    `请中央仙窍处理这份 English Cultivation 学习战报。先检查 report_id 和 session_id，避免重复录入。然后把真实训练时间与 K/V/N 数据同步到原有 Google Sheets，把重点错误和学习总结保存到原有 Notion，并将正式报告按现有归档规则保存到 Google Drive。所有写入都必须回读验证，失败事项明确标注，不得凭空填补学习记录。`
  ];
  return lines.join('\n');
}

export function makeCSV(rows,columns){
  const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
  return '\uFEFF'+[columns.map(q).join(','),...rows.map(row=>columns.map(c=>q(row[c])).join(','))].join('\r\n');
}
