/** English Cultivation: pure, testable data transforms. No network or private data. */
import {normalizeVocabularyPractice, summarizeVocabularyPractice, buildIntraSessionRehearsalQueue} from './vocab.mjs';
import {buildInterferenceRadar} from './cdtl.mjs';
import {analyzeDiscourseAndChunks, analyzeReadingPassageMetrics} from './discourse.mjs';
import {summarizeRadioExposure} from './radio.mjs';
export {analyzeDiscourseAndChunks, analyzeReadingPassageMetrics, buildIntraSessionRehearsalQueue, buildInterferenceRadar};
export const VERSION = 4.3;
export const APP_VERSION = '20.3.5';
export const REPORT_SCHEMA_VERSION = 1;
export const REVIEW_DAYS = { K: 7, V: 3, N: 1 };
export function revealedReadingRecall(row = {}) {
  const word = String(row.word || '').trim();
  const original = String(row.originalSentence || '').trim();
  const prompt = String(row.prompt || '');
  return {word, sentence: original || prompt.replace(/_{3,}/g, word)};
}
/** Resolve the live saved recording state at submission time, not a stale rendered closure. */
export function composeReadingRetellingSubmission({reading, packId = null, current = null, answer = '', at = new Date().toISOString()} = {}) {
  const readingId = reading?.id;
  if (!readingId) return null;
  const firstAnswer = String(answer || '').trim();
  const recordingIds = [...new Set((Array.isArray(current?.recordingIds) ? current.recordingIds : []).filter(id => typeof id === 'string' && id.trim()))];
  if (!firstAnswer && recordingIds.length === 0) return null;
  return {
    ...(current || {}),
    id: current?.id || `retelling:${readingId}:${Date.now()}`,
    readingId,
    packId: reading.packId || packId,
    firstAnswer,
    firstSubmittedAt: current?.firstSubmittedAt || at,
    promptUsed: Boolean(current?.promptUsed),
    referenceViewed: Boolean(current?.referenceViewed),
    recordingIds,
    status: firstAnswer ? 'UNASSESSED' : 'VOICE_UNASSESSED',
    retryAnswer: current?.retryAnswer || '',
    retrySubmittedAt: current?.retrySubmittedAt || null
  };
}

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
export function safeAudioUrl(value) {
  const raw=clean(value); if(!raw) return null;
  try { const url=new URL(raw); return url.protocol==='https:' ? url.toString() : null; }
  catch { return null; }
}
export function isValidAudioLoop(a,b,duration,minLength=0.1) {
  if(a===null||a===undefined||b===null||b===undefined) return false;
  const start=Number(a), end=Number(b), total=Number(duration), minimum=Math.max(0.1,Number(minLength)||0.1);
  return Number.isFinite(start)&&Number.isFinite(end)&&Number.isFinite(total)&&total>0&&start>=0&&end<=total&&end-start>=minimum&&start<end;
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
function normalizeStoryMeta(raw={}) {
  const order=Number(raw.sectionOrder??raw.section_order);
  return {
    storyId:clean(raw.storyId||raw.story_id)||null,
    storyTitle:clean(raw.storyTitle||raw.story_title)||null,
    sectionId:clean(raw.sectionId||raw.section_id)||null,
    sectionOrder:Number.isFinite(order)?order:null,
    sectionTitle:clean(raw.sectionTitle||raw.section_title)||null,
    previousSectionId:clean(raw.previousSectionId||raw.previous_section_id)||null,
    sourceReference:clean(raw.sourceReference||raw.source_reference)||null
  };
}
function storyList(raw,...keys){for(const key of keys){const value=raw?.[key];if(Array.isArray(value))return value;}return []}
function normalizeStoryTask(raw={},type,storyId,sectionId,index){
  const source=typeof raw==='string'?{prompt:raw}:raw||{};
  const prompt=clean(source.prompt||source.question||source.text||source.sentence||source.example);
  const target=clean(source.target||source.answer||source.cloze_answer||source.clozeAnswer);
  if(!prompt&&!target)return null;
  const id=clean(source.id)||`story:${storyId}:${sectionId}:${type}-${index+1}`;
  return {id,type,prompt,target,referenceAnswer:clean(source.reference_answer||source.referenceAnswer||source.model_answer||source.modelAnswer||target),definitionEn:clean(source.definition_en||source.definitionEn||source.meaning_en||source.meaningEn),partOfSpeech:clean(source.part_of_speech||source.partOfSpeech),example:clean(source.example||source.context||source.sentence),acceptedAnswers:listValue(source.accepted_answers||source.acceptedAnswers),hints:listValue(source.hints||source.hint).slice(0,3),collocations:listValue(source.collocations),storyBeats:listValue(source.story_beats||source.storyBeats),answerConstraints:clean(source.answer_constraints||source.answerConstraints),sourceReference:clean(source.source_reference||source.sourceReference),audioUrl:safeAudioUrl(source.audio_url||source.audioUrl),sourceItemId:clean(source.source_item_id||source.sourceItemId)||null,storyId,sectionId,source:clean(source.source)||null};
}
export function normalizeStoryPractice(value={},packId=''){
  const rawStories=Array.isArray(value)?value:Array.isArray(value?.stories)?value.stories:(value&&typeof value==='object'&&(value.story_id||value.storyId)?[value]:[]);
  const stories=[];
  for(const [storyIndex,rawStory] of rawStories.entries()){
    if(!rawStory||typeof rawStory!=='object')continue;
    const storyId=clean(rawStory.story_id||rawStory.storyId||rawStory.id)||`story-${storyIndex+1}`;
    const sections=Array.isArray(rawStory.sections)?rawStory.sections:[];
    const normalizedSections=[];
    for(const [sectionIndex,rawSection] of sections.entries()){
      if(!rawSection||typeof rawSection!=='object')continue;
      const sectionId=clean(rawSection.section_id||rawSection.sectionId||rawSection.id)||`${storyId}:section-${sectionIndex+1}`;
      const sectionTitle=clean(rawSection.title||rawSection.section_title||rawSection.sectionTitle)||`Section ${sectionIndex+1}`;
      const vocabulary=storyList(rawSection,'vocabulary','words','target_words').map((x,i)=>normalizeStoryTask(x,'vocabulary',storyId,sectionId,i)).filter(Boolean);
      const cloze=storyList(rawSection,'cloze_questions','cloze','clozeQuestions').map((x,i)=>normalizeStoryTask(x,'cloze',storyId,sectionId,i)).filter(Boolean);
      const grammar=storyList(rawSection,'grammar_questions','grammar','grammarQuestions').map((x,i)=>normalizeStoryTask(x,'grammar',storyId,sectionId,i)).filter(Boolean);
      const comprehension=storyList(rawSection,'comprehension_questions','comprehension','comprehensionQuestions').map((x,i)=>normalizeStoryTask(x,'comprehension',storyId,sectionId,i)).filter(Boolean);
      const phrases=storyList(rawSection,'spoken_phrases','phrases','spokenPhrases').map((x,i)=>normalizeStoryTask(x,'spoken_phrase',storyId,sectionId,i)).filter(Boolean).map((x,i)=>({...x,practiceEligible:i<10,archiveStatus:i<10?'AVAILABLE':'ARCHIVED_NOT_STUDIED'}));
      const golden=storyList(rawSection,'golden_sentences','goldenSentences').map((x,i)=>normalizeStoryTask(x,'golden_sentence',storyId,sectionId,i)).filter(Boolean);
      const speaking=storyList(rawSection,'ielts_part3_questions','speaking_questions','speakingQuestions').map((x,i)=>normalizeStoryTask(x,'speaking',storyId,sectionId,i)).filter(Boolean);
      const audioSegments=storyList(rawSection,'audio_segments','audioSegments').map((x,i)=>normalizeStoryTask(x,'audio_segment',storyId,sectionId,i)).filter(Boolean);
      const writingRaw=rawSection.writing_prompt||rawSection.writingPrompt||rawSection.writing;
      const writing=writingRaw?(Array.isArray(writingRaw)?writingRaw:[writingRaw]).map((x,i)=>normalizeStoryTask(x,'writing',storyId,sectionId,i)).filter(Boolean):[];
      const retellingRaw=rawSection.retelling||rawSection.story_retelling||rawSection.storyRetelling;
      const retelling=retellingRaw?normalizeStoryTask(typeof retellingRaw==='string'?{prompt:retellingRaw}:retellingRaw,'retelling',storyId,sectionId,0):null;
      const storyText=clean(rawSection.story_text||rawSection.storyText||rawSection.text||rawSection.passage);
      normalizedSections.push({id:sectionId,title:sectionTitle,storyText:storyText||null,order:Number.isFinite(Number(rawSection.order??rawSection.section_order))?Number(rawSection.order??rawSection.section_order):sectionIndex+1,paperFirst:rawSection.paper_first!==false&&rawSection.paperFirst!==false,storyId,source:clean(rawSection.source||rawStory.source)||null,sourceReference:clean(rawSection.source_reference||rawSection.sourceReference||rawStory.source_reference||rawStory.sourceReference)||null,availability:{vocabulary:vocabulary.length,cloze:cloze.length,grammar:grammar.length,comprehension:comprehension.length,spokenPhrases:phrases.filter(x=>x.practiceEligible).length,deferredPhrases:phrases.filter(x=>!x.practiceEligible).length,goldenSentences:golden.length,speaking:speaking.length,writing:writing.length,retelling:retelling?1:0,audioSegments:audioSegments.length},vocabulary,cloze,grammar,comprehension,spokenPhrases:phrases,goldenSentences:golden,speakingQuestions:speaking,writing,retelling,audioSegments,storyBeats:listValue(rawSection.story_beats||rawSection.storyBeats)});
    }
    normalizedSections.sort((a,b)=>a.order-b.order);
    if(normalizedSections.length)stories.push({id:storyId,title:clean(rawStory.title||rawStory.story_title||rawStory.storyTitle)||storyId,source:clean(rawStory.source)||null,sourceReference:clean(rawStory.source_reference||rawStory.sourceReference)||null,packId,sections:normalizedSections});
  }
  return stories.length?{version:1,packId,stories}:null;
}
export function normalizeDialogueScenarios(value=[],packId=''){
  const rows=Array.isArray(value)?value:[];
  return rows.map((raw,index)=>{
    const id=clean(raw?.id||raw?.scenario_id||raw?.scenarioId)||`dialogue-${index+1}`;
    const nodes=Array.isArray(raw?.nodes)?raw.nodes:Array.isArray(raw?.turns)?raw.turns:[];
    return {id,title:clean(raw?.title||raw?.scenario_title)||id,source:clean(raw?.source),nodes:nodes.map((node,n)=>({
      id:clean(node?.id||node?.node_id)||`${id}:round-${n+1}`,round:Number(node?.round||n+1),prompt:clean(node?.prompt||node?.question),referenceAnswer:clean(node?.reference_answer||node?.referenceAnswer||node?.model_answer||node?.modelAnswer),hints:listValue(node?.hints||node?.hint).slice(0,3),nextNodeId:clean(node?.next_node_id||node?.nextNodeId),branches:Array.isArray(node?.branches)?node.branches.map(branch=>({id:clean(branch?.id),label:clean(branch?.label||branch?.prompt),nextNodeId:clean(branch?.next_node_id||branch?.nextNodeId)})).filter(branch=>branch.id||branch.nextNodeId):[]
    })).filter(node=>node.prompt),packId};
  }).filter(row=>row.nodes.length);
}
export function normalizeListeningDiagnostics(value=[],packId=''){
  const rows=Array.isArray(value)?value:[];
  return rows.map((raw,index)=>({id:clean(raw?.id)||`listening-diagnostic-${index+1}`,itemId:clean(raw?.item_id||raw?.itemId),audioSegmentId:clean(raw?.audio_segment_id||raw?.audioSegmentId),prompt:clean(raw?.prompt||raw?.question),retestPrompt:clean(raw?.retest_prompt||raw?.retestPrompt),difficultyOptions:listValue(raw?.difficulty_options||raw?.difficultyOptions||['unknown_vocabulary','sound_recognition','connected_speech','processing_speed','other_unknown']).slice(0,8),revealTextAfterSubmit:raw?.reveal_text_after_submit!==false&&raw?.revealTextAfterSubmit!==false,packId})).filter(row=>row.prompt||row.itemId||row.audioSegmentId);
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
  const status=normalizeTransferStatus(raw);
  return {...raw,id,weaknessId:clean(raw.weaknessId||raw.weakness_id)||null,contextId:clean(raw.contextId||raw.context_id)||null,taskId,packId:pick(raw.packId,raw.pack_id)||null,journeyId:pick(raw.journeyId,raw.journey_id)||null,taskType:pick(raw.taskType,raw.task_type,sourceSnapshot?.taskType,sourceSnapshot?.task_type)||'general_transfer',...normalizeExamMeta(raw),...normalizeReviewMeta(raw),prompt:pick(raw.prompt,raw.question)||null,targetExpression:pick(raw.targetExpression,raw.target_expression)||null,firstAnswer,firstSubmittedAt:pick(raw.firstSubmittedAt,raw.first_submitted_at,raw.at)||at,hintUsed:Boolean(raw.hintUsed??raw.hint_used??raw.promptUsed??raw.prompt_used),hintEvents:Array.isArray(raw.hintEvents)?raw.hintEvents:Array.isArray(raw.hint_events)?raw.hint_events:[],referenceViewed:Boolean(raw.referenceViewed??raw.reference_viewed??raw.modelAnswerViewed??raw.model_answer_viewed),referenceViewedAt:pick(raw.referenceViewedAt,raw.reference_viewed_at,raw.modelAnswerViewedAt,raw.model_answer_viewed_at)||null,referenceAnswer:pick(raw.referenceAnswer,raw.reference_answer,raw.modelAnswer,raw.model_answer)||null,retryAnswer,retrySubmittedAt:pick(raw.retrySubmittedAt,raw.retry_submitted_at,raw.selfCorrectedAt,raw.self_corrected_at)||null,rating:['K','V','N'].includes(raw.rating)?raw.rating:null,evidenceType:clean(raw.evidenceType||raw.evidence_type)||null,status,autoCheck:raw.autoCheck||raw.auto_check||null,at,delayed:Boolean(raw.delayed),sourceSnapshot,recordingOnly:Boolean(raw.recordingOnly||raw.recording_only),recordingIds:Array.isArray(raw.recordingIds)?raw.recordingIds.filter(Boolean):Array.isArray(raw.recording_ids)?raw.recording_ids.filter(Boolean):[],aiCritique:pick(raw.aiCritique,raw.ai_critique)||null,skipped:Boolean(raw.skipped)};
}
export function normalizeTransferStatus(raw={}) {
  const explicit=clean(raw.status||raw.state).toLowerCase();
  if(['not_started','draft','recording','saving','submitted','submitted_incomplete','skipped'].includes(explicit)) return explicit;
  if(raw.skipped) return 'skipped';
  if(raw.recordingOnly && !raw.recordingIds?.length) return 'submitted_incomplete';
  if(raw.recordingOnly || raw.firstAnswer || raw.first_answer || raw.answer) return raw.recordingOnly?'submitted_incomplete':'submitted';
  return 'not_started';
}
export function resolveTaskInputMode(task={}) {
  const explicit=clean(task.response_mode||task.responseMode).toLowerCase();
  if(['speaking','writing','both'].includes(explicit)) return explicit;
  const type=clean(task.task_type||task.taskType).toLowerCase().replaceAll('-','_').replaceAll(' ','_');
  if(type==='speaking'||type==='reading_to_speaking') return 'speaking';
  if(type==='writing'||type==='grammar') return 'writing';
  if(type==='exit_ticket') return 'writing';
  if(type==='general_transfer') return 'both';
  const tags=(Array.isArray(task.tags)?task.tags:[]).map(x=>normalized(x));
  if(tags.some(x=>x.includes('speaking')||x.includes('oral')||x.includes('retell'))) return 'speaking';
  if(tags.some(x=>x.includes('writing')||x.includes('essay'))) return 'writing';
  return 'both';
}
export function normalizeReadingChoiceAnswer(answer, options=[]) {
  const raw=clean(answer); if(!raw) return {valid:false,index:-1,key:null,text:''};
  const list=Array.isArray(options)?options.map(x=>typeof x==='object'?clean(x.text||x.label||x.value):clean(x)).filter(Boolean):[];
  const key=raw.toUpperCase().replace(/[.)、]$/,'');
  if(/^[A-Z]$/.test(key)){const index=key.charCodeAt(0)-65;return index<list.length?{valid:true,index,key,text:list[index]}:{valid:false,index:-1,key,text:''};}
  const index=list.findIndex(x=>normalized(x)===normalized(raw));
  return index>=0?{valid:true,index,key:String.fromCharCode(65+index),text:list[index]}:{valid:false,index:-1,key:null,text:''};
}
export function compareReadingChoice(userAnswer, expectedAnswer, options=[]) {
  const user=normalizeReadingChoiceAnswer(userAnswer,options), expected=normalizeReadingChoiceAnswer(expectedAnswer,options);
  if(!user.valid||!expected.valid) return {status:'invalid',user,expected,message:'阅读选择题答案键或选项文本无效。'};
  return {status:user.index===expected.index?'correct':'incorrect',user,expected};
}
export function compareSpellingAnswer(answer,target) {
  const raw=clean(answer), expected=clean(target), normalize=s=>s.toLocaleLowerCase().replace(/[\u200B\s.,!?;:'"“”‘’_\-]+/g,'');
  if(normalize(raw)===normalize(expected)) return {status:raw===expected?'correct':'case_or_punctuation',errorType:raw===expected?null:'case_or_punctuation',answer:raw,target:expected};
  const a=normalize(raw), b=normalize(expected); let distance=0, i=0,j=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}distance++;if(a[i+1]===b[j])i++;else if(a[i]===b[j+1])j++;else{i++;j++;}}
  distance+=a.length-i+b.length-j;
  const transposed=a.length===b.length&&a.split('').some((ch,index)=>a[index]!==b[index]&&a[index+1]===b[index]&&a[index]===b[index+1]);
  const errorType=transposed?'letter_order_or_substitution':distance===1?(a.length===b.length?'letter_order_or_substitution':a.length<b.length?'missing_letter':'extra_letter'):raw.split(/\s+/).length>1?'word_choice_or_form':'different_answer';
  return {status:'incorrect',errorType,answer:raw,target:expected,distance};
}
/** Reuse the earliest genuinely submitted first answer, including V9.0.1 rows
 * which were stored without firstSubmittedAt. Never reinterpret a skip as tested. */
export function findExistingSpellingAttempt(attempts=[],taskId=''){
  if(!Array.isArray(attempts))return null;
  return attempts.find(row=>row?.taskId===taskId&&!row.skipped&&
    typeof row.firstAnswer==='string'&&row.firstAnswer.trim().length>0&&
    typeof row.firstCheck?.status==='string')||null;
}
export function spellingPassed(check){
  return ['correct','case_or_punctuation'].includes(check?.status);
}
export function createSpellingFirstAttempt(task,answer,{packId='',sessionId='',inputMode='free_text',submittedAt=new Date().toISOString()}={}){
  const value=String(answer??'').trim(),target=String(task?.target??'').trim();
  if(!value||!target)return null;
  const firstCheck=compareSpellingAnswer(value,target);
  return {id:`spelling:${task.id}:${submittedAt}`,taskId:task.id,packId,sessionId,target,
    promptMode:task.promptMode||'',firstAnswer:value,firstCheck,firstSubmittedAt:submittedAt,
    retryAnswer:'',retryCheck:null,hintUsed:false,referenceViewed:false,
    inputMode,activeSeconds:0,completedAt:spellingPassed(firstCheck)?submittedAt:null};
}
export function normalizeSpellingTask(raw={}, index=0, packId='') {
  const target=clean(raw.target||raw.answer); if(!target) return null;
  const mode=clean(raw.prompt_mode||raw.promptMode).toLowerCase()||'meaning_to_spelling';
  if(!['meaning_to_spelling','audio_to_spelling','sentence_cloze'].includes(mode)) return null;
  return {id:clean(raw.id)||`spelling-${index+1}`,type:'spelling',target,promptMode:mode,cueZh:clean(raw.cue_zh||raw.cueZh||raw.hint_zh),cueEn:clean(raw.cue_en||raw.cueEn||raw.definition_en||raw.definitionEn),example:clean(raw.example),additionalContexts:listValue(raw.additional_contexts||raw.additionalContexts),ttsText:clean(raw.tts_text||raw.ttsText)||target,sourceItemId:clean(raw.source_item_id||raw.sourceItemId)||null,packId};
}
export function buildSpellingSummary(attempts=[]) {
  const rows=Array.isArray(attempts)?attempts:[], first=rows.filter(r=>r.firstCheck?.status==='correct'||r.first_check?.status==='correct'), retry=rows.filter(r=>r.retryCheck?.status==='correct'||r.retry_check?.status==='correct'), errors={};
  rows.forEach(r=>{const type=r.firstCheck?.errorType||r.first_check?.error_type;if(type)errors[type]=(errors[type]||0)+1;});
  return {total:rows.length,firstCorrect:first.length,firstIncorrect:rows.filter(r=>r.firstAnswer!==undefined&&!first.includes(r)).length,retryCorrect:retry.length,errorTypes:Object.entries(errors).sort((a,b)=>b[1]-a[1]).map(([type,count])=>({type,count})),pendingDelayedReview:rows.filter(r=>r.firstCheck?.status==='incorrect'&&!r.retryCheck).map(r=>r.target).filter(Boolean)};
}
export function mergeTransferAttempts(existing=[],incoming=[]) {
  const out=[]; const byId=new Map();
  for(const raw of [...(Array.isArray(existing)?existing:[]),...(Array.isArray(incoming)?incoming:[])]){const item=normalizeTransferAttempt(raw),prior=byId.get(item.id);if(!prior){byId.set(item.id,item);out.push(item);continue;}for(const key of ['weaknessId','contextId','taskId','packId','journeyId','taskType','examSource','examType','testNumber','skill','questionId','questionNumbers','questionType','answerConstraints','sourcePage','practiceRole','reviewId','reviewOf','previousReportId','previousAttemptId','previousDate','previousStatus','weaknessType','reviewRound','reviewInstruction','prompt','targetExpression','firstAnswer','firstSubmittedAt','referenceViewedAt','referenceAnswer','retryAnswer','retrySubmittedAt','rating','evidenceType','autoCheck','aiCritique','sourceSnapshot'])if(!prior[key]&&item[key])prior[key]=item[key];prior.hintUsed=prior.hintUsed||item.hintUsed;prior.referenceViewed=prior.referenceViewed||item.referenceViewed;prior.delayed=prior.delayed||item.delayed;prior.recordingOnly=prior.recordingOnly||item.recordingOnly;prior.skipped=prior.skipped||item.skipped;prior.recordingIds=[...(prior.recordingIds||[]),...(item.recordingIds||[])].filter((id,index,array)=>array.indexOf(id)===index);prior.hintEvents=[...prior.hintEvents,...item.hintEvents];}
  return out;
}
export function transferEvidenceStatus(attempt={}) {
  if(!attempt||!attempt.firstAnswer&&!attempt.retryAnswer)return 'UNTESTED';
  // A reference revealed only AFTER the first answer cannot have prompted that answer.
  const referencePrompted=Boolean(attempt.referenceViewed&&!attempt.referenceDisplayedAutomatically);
  if(attempt.delayed&&!attempt.hintUsed&&!referencePrompted&&attempt.rating==='K')return 'TRANSFER_VERIFIED';
  if(attempt.rating==='K'&&!attempt.hintUsed&&!referencePrompted)return 'INDEPENDENT_RECALL';
  if(attempt.hintUsed||referencePrompted)return 'PROMPTED';
  return attempt.rating?'LEARNING':'UNTESTED';
}
export function buildTransferAnalytics({weaknesses=[],transferAttempts=[],now=Date.now()}={}) {
  const rows=mergeTransferAttempts([],transferAttempts), due=mergeWeaknesses([],weaknesses).filter(item=>item.nextReviewAt&&new Date(item.nextReviewAt).getTime()<=new Date(now).getTime()).length;
  const measured=rows.filter(row=>row.firstAnswer||row.retryAnswer); const categories={}; const sources={};
  for(const row of rows){const weakness=(Array.isArray(weaknesses)?weaknesses:[]).find(item=>item.id===row.weaknessId)||{};const category=weakness.skillType||'Unclassified',source=weakness.sourceType||'unknown';categories[category]=(categories[category]||0)+1;sources[source]=(sources[source]||0)+1;}
  const independentRows=rows.filter(row=>!row.hintUsed&&!(row.referenceViewed&&!row.referenceDisplayedAutomatically)&&(row.firstAnswer||row.retryAnswer));
  const promptedRows=rows.filter(row=>(row.hintUsed||(row.referenceViewed&&!row.referenceDisplayedAutomatically))&&(row.firstAnswer||row.retryAnswer));
  const retryRows=rows.filter(row=>row.retryAnswer);
  const delayedRows=rows.filter(row=>row.delayed);
  return {counts:{total:rows.length,measured:measured.length,unmeasured:rows.length-measured.length,independent:independentRows.filter(row=>row.rating==='K').length,prompted:promptedRows.filter(row=>row.rating==='K').length,retry:retryRows.filter(row=>row.rating==='K').length,delayed:delayedRows.filter(row=>row.rating==='K').length},denominators:{independent:independentRows.length,prompted:promptedRows.length,retry:retryRows.length,delayed:delayedRows.length},due,byCategory:categories,bySource:sources};
}
export function buildMasteryAnalytics({items=[],attempts=[],sessions=[],transferAttempts=[],now=new Date()}={}) {
  const rows=Array.isArray(attempts)?attempts:[];const itemRows=new Map();rows.forEach(row=>{const list=itemRows.get(row.itemId)||[];list.push(row);itemRows.set(row.itemId,list);});
  const evidence={UNTESTED:0,exposed:0,independentCorrect:0,promptedCorrect:0,correctedAfterError:0,delayedReviewSuccess:0,delayedReviewPending:0,skipped:0,unmeasured:0};const unmeasured=[];
  for(const item of (Array.isArray(items)?items:[])){
    const history=itemRows.get(item.id)||[];if(!history.length){evidence.UNTESTED++;continue;}evidence.exposed++;
    const answered=history.filter(row=>!row.skipped&&(row.answer||row.retry_answer));const independent=answered.some(row=>row.status==='K'&&!row.prompt_used&&!row.viewed_answer&&!row.promptUsed&&!row.viewedAnswer);const prompted=answered.some(row=>row.status==='K'&&(row.prompt_used||row.viewed_answer||row.promptUsed||row.viewedAnswer));const corrected=history.some(row=>!row.skipped&&row.retried_after_error&&['correct','case_or_punctuation'].includes(row.retry_check?.status));
    if(independent)evidence.independentCorrect++;else if(prompted)evidence.promptedCorrect++;if(corrected)evidence.correctedAfterError++;if(!answered.length){if(history.some(row=>row.skipped))evidence.skipped++;else{evidence.unmeasured++;unmeasured.push(item.id);}}else if(!answered.some(row=>['K','V','N'].includes(row.status))){evidence.unmeasured++;unmeasured.push(item.id);}
  }
  for(const row of (Array.isArray(transferAttempts)?transferAttempts:[])){if(row.delayed&&row.rating==='K')evidence.delayedReviewSuccess++;else if(row.firstAnswer||row.retryAnswer){const delayedDate=row.nextReviewAt||row.delayedAt;if(delayedDate&&!row.delayed)evidence.delayedReviewPending++;}}
  const current=new Date(now).getTime();const windowStats=days=>{const cutoff=current-days*86400000;const recent=(Array.isArray(sessions)?sessions:[]).filter(row=>{const at=new Date(row.endedAt||row.startedAt||0).getTime();return Number.isFinite(at)&&at>=cutoff&&at<=current;});return {sessions:recent.length,activeSeconds:Math.round(summarizeSessionTime(sessions,dateKeyInTimeZone(new Date(cutoff)),dateKeyInTimeZone(new Date(current))).knownMs/1000),tasks:recent.reduce((sum,row)=>sum+Number(row.count||0),0),rated:recent.reduce((sum,row)=>sum+Number(row.K||0)+Number(row.V||0)+Number(row.N||0),0)};};
  const errors={};for(const row of rows){if(row.status==='N'||row.initial_check?.status==='incorrect'||row.retry_check?.status==='incorrect'){const key=clean(row.errorType||row.error_type||row.taskType||row.kind||'unclassified');errors[key]=(errors[key]||0)+1;}}for(const row of (Array.isArray(transferAttempts)?transferAttempts:[])){if(row.rating==='N'||row.autoCheck?.status==='incorrect'){const key=clean(row.weaknessType||row.taskType||'transfer');errors[key]=(errors[key]||0)+1;}}
  return {evidence,windows:{days7:windowStats(7),days30:windowStats(30)},errors:Object.entries(errors).sort((a,b)=>b[1]-a[1]).map(([type,count])=>({type,count})),unmeasured,notes:['这些指标只由本机真实作答、提示、重答和延迟复测字段推导。','UNTESTED、阅读接触和自评不会自动变成掌握。']};
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

export function wordPrompt(item={}, {definitionEn=''} = {}) {
  const example=clean(item.example),target=clean(item.target);
  const definition=clean(definitionEn||item.definitionEn||item.definition_en);
  const meaningZh=clean(item.meaningZh||item.meaning_zh||item.cue||item.hint_zh);
  const accepted=listValue(item.acceptedAnswers||item.accepted_answers);
  const answerConfidence=definition||accepted.length?'high':meaningZh?'medium':target&&example?'low':'none';
  const clueSource=definition?'definition_en':meaningZh?'pack_meaning_zh':target&&example?'context_only':'none';
  const metadata={target,definitionEn:definition,meaningZh,partOfSpeech:clean(item.partOfSpeech||item.part_of_speech),collocations:listValue(item.collocations),acceptedAnswers:accepted,clueSource,answerConfidence};
  if(target){
    const p=new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRE(target)})(?=$|[^\\p{L}\\p{N}])`,'iu');
    if(p.test(example)) return {question:example.replace(p,(all,prefix)=>`${prefix}________`),fallback:false,...metadata};
  }
  return {question:'Write a natural English word or expression that matches the meaning clue.',fallback:true,...metadata};
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
const CLOZE_STOPWORDS = new Set([
  'about','after','again','against','almost','along','already','always','among','another','around',
  'because','before','behind','below','between','beyond','cannot','could','during','either','enough',
  'every','first','found','great','having','house','however','might','never','nothing','often','other',
  'people','place','right','shall','should','since','small','still','their','there','these','thing',
  'think','those','though','three','through','today','under','until','using','where','which','while',
  'whose','within','without','world','would','write','years','young'
]);
export function autoSentenceClozeParts(sentence, target='') {
  const explicit = sentenceClozeParts(sentence, target);
  if (explicit) return explicit;
  const text = String(sentence || '').trim();
  if (!text) return null;
  const words = text.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
  if (!words.length) return null;
  const candidates = words.filter(w => w.length >= 5 && !CLOZE_STOPWORDS.has(w.toLowerCase()));
  const pool = candidates.length ? candidates : words.filter(w => w.length >= 4);
  const pick = (pool.length ? pool : words).slice().sort((a, b) => b.length - a.length)[0];
  return pick ? sentenceClozeParts(text, pick) : null;
}
export function buildSentenceChunks(sentence = '') {
  const text = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const words = text.split(' ').filter(Boolean);
  if (words.length < 3) return null;
  const targetChunkCount = words.length <= 6 ? 3 : words.length <= 10 ? 4 : words.length <= 15 ? 5 : 6;
  const baseSize = Math.floor(words.length / targetChunkCount);
  let extra = words.length % targetChunkCount;
  const ordered = [];
  let cursor = 0;
  for (let i = 0; i < targetChunkCount && cursor < words.length; i++) {
    const take = baseSize + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    ordered.push(words.slice(cursor, cursor + take).join(' '));
    cursor += take;
  }
  const indexed = ordered.map((chunk, idx) => ({ id: `c${idx}`, text: chunk, order: idx }));
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = ((seed * 31) + text.charCodeAt(i)) >>> 0;
  const shuffled = indexed.slice();
  for (let k = shuffled.length - 1; k > 0; k--) {
    seed = ((seed * 1664525) + 1013904223) >>> 0;
    const j = seed % (k + 1);
    [shuffled[k], shuffled[j]] = [shuffled[j], shuffled[k]];
  }
  if (shuffled.length > 1 && shuffled.every((c, i) => c.order === i)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return { ordered, shuffled, answer: text };
}
export function dateKeyInTimeZone(date = new Date(), timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}
/** Allocate only observed, bounded foreground intervals to actual Beijing dates. */
export function addActiveInterval(buckets, start, end, maxMs=1800) {
  const result={...(buckets&&typeof buckets==='object'?buckets:{})};
  const stop=Number(end),previous=Number(start);
  if(!Number.isFinite(stop)||!Number.isFinite(previous)||stop<=previous)return result;
  let cursor=Math.max(previous,stop-Math.max(0,maxMs));
  while(cursor<stop){const nextMidnight=(Math.floor((cursor+28800000)/86400000)+1)*86400000-28800000;const next=Math.min(stop,nextMidnight);const key=dateKeyInTimeZone(cursor);if(!key)break;result[key]=(Number(result[key])||0)+(next-cursor);cursor=next;}
  return result;
}
export function summarizeSessionTime(sessions=[],startDay,endDay=startDay){
  let knownMs=0,unknownMs=0;
  for(const session of Array.isArray(sessions)?sessions:[]){const total=Math.max(0,Number(session?.activeMs)||0);const buckets=session?.activeByDay;
    if(buckets&&typeof buckets==='object'&&!Array.isArray(buckets)){let allocated=0;for(const [day,value] of Object.entries(buckets)){const ms=Math.max(0,Number(value)||0);allocated+=ms;if(day>=startDay&&day<=endDay)knownMs+=ms;}unknownMs+=Math.max(0,total-allocated);}
    else {const start=dateKeyInTimeZone(session?.startedAt),end=dateKeyInTimeZone(session?.endedAt);if(start&&start===end){if(start>=startDay&&start<=endDay)knownMs+=total;}else unknownMs+=total;}
  }
  return {knownMs,unknownMs};
}
export function readingQuestionProgress(readings=[],checks=[]){let total=0,answered=0,skipped=0,unassessed=0;for(const reading of readings){const rows=(checks||[]).find(x=>x.readingId===reading.id)?.answers||[];for(const question of reading.questions||[]){total++;const row=rows.find(x=>x.questionId===question.id);if(!row)continue;if(row.skipped){skipped++;continue;}if(String(row.answer??'').trim()){answered++;if(row.autoCheck?.status==='unassessed')unassessed++;}}}return {total,answered,skipped,unassessed,remaining:Math.max(0,total-answered-skipped)};}
export function transferTaskProgressState(task,rows=[]){const matching=rows.filter(row=>(!task.packId||!row.packId||row.packId===task.packId)&&(row.taskId===task.id||row.weaknessId===`weakness:transfer:${task.id}`));if(!matching.length)return 'NOT_STARTED';const active=matching.filter(row=>!row.skipped);if(!active.length)return 'SKIPPED';const row=active.at(-1);if(row.status==='recording'||row.status==='saving'||row.status==='draft')return 'IN_PROGRESS';if(row.recordingOnly&&!(row.recordingIds||[]).length&&!row.firstAnswer)return 'PARTIAL';if(row.recordingOnly||(row.recordingIds||[]).length&&!row.firstAnswer)return 'UNASSESSED';if(row.firstAnswer||row.retryAnswer)return row.autoCheck?.status==='unassessed'?'UNASSESSED':'COMPLETED';return 'PARTIAL';}
export function homeSummary(state, now = new Date()) {
  const items = (Array.isArray(state?.items) ? state.items : []).filter(item => !item.archived && !item.paused);
  const sessions = [...(Array.isArray(state?.sessions) ? state.sessions : [])];
  if(state?.activeSession?.running)sessions.push(state.activeSession);
  const journey=state?.dailyJourney;if(journey&&!journey.finishedAt)for(const prefix of ['vocabulary','reading','speech','transfer'])sessions.push({startedAt:journey.startedAt,activeMs:journey[`${prefix}Ms`],activeByDay:journey[`${prefix}ActiveByDay`]});
  const todayKey = dateKeyInTimeZone(now);
  const time=summarizeSessionTime(sessions,todayKey);const todayMinutes=Math.round(time.knownMs/60000);
  const packIds = new Set(Array.isArray(state?.dailyPack?.itemIds) ? state.dailyPack.itemIds : []);
  const vocabTasks = Array.isArray(state?.dailyPack?.vocabularyPractice) ? state.dailyPack.vocabularyPractice : [];
  const activePackItems = packIds.size ? items.filter(item => packIds.has(item.id)).length : 0;
  return {
    due: items.filter(item => isDue(item, now)).length,
    newItems: items.filter(item => item.status === 'UNTESTED' || item.learningStage === 'new').length + vocabTasks.length,
    weak: items.filter(item => item.status === 'N' || item.status === 'V').length,
    todayMinutes,unallocatedActiveMs:time.unknownMs,
    packItems: activePackItems + vocabTasks.length
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
    const next={...mark,id,normalizedWord,savedStatus:mark.savedStatus==='SAVED'||prior?.savedStatus==='SAVED'?'SAVED':'UNSAVED',savedItemId:mark.savedItemId||prior?.savedItemId||null,harvestTier:mark.harvestTier||prior?.harvestTier||null,harvestRecalled:typeof mark.harvestRecalled==='boolean'?mark.harvestRecalled:(typeof prior?.harvestRecalled==='boolean'?prior.harvestRecalled:null),harvestedAt:mark.harvestedAt||prior?.harvestedAt||null};
    if(prior){Object.assign(prior,next);}else{byId.set(id,next);out.push(next);}
  }
  return out;
}
export function persistState(storage, key, state, previousRaw=null) {
  let payload = state;
  if (payload && typeof payload === 'object' && typeof storage?.getItem === 'function') {
    try {
      const existingRaw = storage.getItem(key);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        const existingRev = Number(existing?.stateRevision || 0);
        const incomingRev = Number(payload.stateRevision || 0);
        if (existingRev > 0 && incomingRev > 0 && incomingRev < existingRev) {
          return {ok:false, conflict:'stale_tab_revision', error:'检测到另一标签页有更新的学习记录，已阻止旧页面覆盖。', serialized:null};
        }
        payload = { ...payload, stateRevision: Math.max(existingRev, incomingRev) + 1 };
      }
    } catch {}
  }
  let serialized;
  try { serialized = typeof payload === 'string' ? payload : JSON.stringify(payload); }
  catch (error) { return {ok:false, error:error instanceof Error ? error.message : String(error), serialized:null}; }
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
  const speeches = uniqueBy([...(current.speeches||[]),...(restored.speeches||[])], 'id');
  const speechAttempts=uniqueBy([...(current.speechAttempts||[]),...(restored.speechAttempts||[])], 'id');
  const readingMarks = mergeReadingMarks(current.readingMarks, restored.readingMarks);
  const readingChecks = uniqueBy([...(Array.isArray(current.readingChecks)?current.readingChecks:[]),...(Array.isArray(restored.readingChecks)?restored.readingChecks:[])], 'id');
  const weaknesses = mergeWeaknesses(current.weaknesses, restored.weaknesses);
  const transferAttempts = mergeTransferAttempts(current.transferAttempts, restored.transferAttempts);
  const listeningDiagnosticAttempts = uniqueBy([...(current.listeningDiagnosticAttempts||[]), ...(restored.listeningDiagnosticAttempts||[])], 'id');
  const packHistory = uniqueBy([...(Array.isArray(current.packHistory) ? current.packHistory : []), ...(Array.isArray(restored.packHistory) ? restored.packHistory : []), current.dailyPack, restored.dailyPack], 'packId');
  return {
    ...current,
    items:mergedItems.items,
    attempts:uniqueBy([...(current.attempts||[]), ...(restored.attempts||[])], 'id'),
    sessions:uniqueBy([...(current.sessions||[]), ...(restored.sessions||[])], 'id'),
    reports:uniqueBy([...(current.reports||[]), ...(restored.reports||[])], 'report_id'),
    readings,
    speeches,
    speechAttempts,
    speechProgress:{...(restored.speechProgress||{}),...(current.speechProgress||{})},speechTransferHints:{...(restored.speechTransferHints||{}),...(current.speechTransferHints||{})},speechTransferAttempts:uniqueBy([...(current.speechTransferAttempts||[]),...(restored.speechTransferAttempts||[])],'id'),readingRetellingAttempts:uniqueBy([...(current.readingRetellingAttempts||[]),...(restored.readingRetellingAttempts||[])],'id'),
    readingMarks,
    readingChecks,
    weaknesses,
    transferAttempts,
    listeningDiagnosticAttempts,
    vocabularyAttempts:uniqueBy([...(current.vocabularyAttempts||[]), ...(restored.vocabularyAttempts||[])], 'id'),
    manualReviewMarks:uniqueBy([...(current.manualReviewMarks||[]), ...(restored.manualReviewMarks||[])], 'word'),
    microLessonProgress:{...(restored.microLessonProgress||{}),...(current.microLessonProgress||{})},
        customRadioPacks:uniqueBy([...(current.customRadioPacks||[]),...(restored.customRadioPacks||[])],'id'),
        myAudioTracks:uniqueBy([...(current.myAudioTracks||[]),...(restored.myAudioTracks||[])],'id'),
        radioMoments:uniqueBy([...(current.radioMoments||[]),...(restored.radioMoments||[])],'id'),
        radioUnclearMarks:uniqueBy([...(current.radioUnclearMarks||[]),...(restored.radioUnclearMarks||[])],'id'),
        deferredSpeaking:uniqueBy([...(current.deferredSpeaking||[]),...(restored.deferredSpeaking||[])],'id'),
        radioQueue:uniqueBy([...(current.radioQueue||[]),...(restored.radioQueue||[])],'id'),
        radioBookmarksV2:{...(restored.radioBookmarksV2||{}),...(current.radioBookmarksV2||{})},
        v19:{disputes:uniqueBy([...(current.v19?.disputes||[]),...(restored.v19?.disputes||[])],'dispute_id'),confidenceLogs:uniqueBy([...(current.v19?.confidenceLogs||[]),...(restored.v19?.confidenceLogs||[])],'attemptId'),lifeTasks:uniqueBy([...(current.v19?.lifeTasks||[]),...(restored.v19?.lifeTasks||[])],'taskId'),exactResume:current.v19?.exactResume||restored.v19?.exactResume||null,stopCheckpoint:current.v19?.stopCheckpoint||restored.v19?.stopCheckpoint||null,prefs:{largeText:false,oneHandMode:false,aiOutboundPreview:true,...(restored.v19?.prefs||{}),...(current.v19?.prefs||{})},speechRecallMode:current.v19?.speechRecallMode||restored.v19?.speechRecallMode||'full_text'},
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
/** Read-only evidence for marks made during the selected reading/Journey.
 * A mark is not a failed answer: unsaved or untested entries remain UNTESTED.
 */
export function collectReadingMarkEvidence(marks = [], readings = [], items = []) {
  const titles = new Map((Array.isArray(readings)?readings:[]).map(row=>[String(row?.id||''),String(row?.title||'').trim()]));
  const cards = new Map((Array.isArray(items)?items:[]).filter(item=>item?.id).map(item=>[String(item.id),item]));
  const seen = new Set(); const rows=[];
  for(const mark of (Array.isArray(marks)?marks:[])){
    if(!mark||!mark.readingId)continue;
    const id=String(mark.id||`${mark.readingId}:${mark.normalizedWord||mark.wordText||''}:${mark.position??''}`);
    if(seen.has(id))continue;seen.add(id);
    const card=mark.savedItemId?cards.get(String(mark.savedItemId)):null;
    rows.push({
      markId:id,
      wordText:String(mark.wordText||mark.normalizedWord||'').trim(),
      normalizedWord:String(mark.normalizedWord||normalized(mark.wordText||'')).trim(),
      readingId:String(mark.readingId),
      sourceTitle:String(mark.sourceTitle||titles.get(String(mark.readingId))||mark.source||'').trim(),
      originalSentence:String(mark.originalSentence||mark.context||'').trim(),
      paragraphIndex:Number.isFinite(Number(mark.paragraphIndex))?Number(mark.paragraphIndex):null,
      position:Number.isFinite(Number(mark.position))?Number(mark.position):null,
      savedStatus:mark.savedStatus==='SAVED'?'SAVED':'UNSAVED',
      savedItemId:mark.savedItemId?String(mark.savedItemId):null,
      status:card&&['K','V','N'].includes(card.status)?card.status:'UNTESTED',
      harvestTier:['promote','passive','drop'].includes(mark.harvestTier)?mark.harvestTier:null,
      harvestRecalled:typeof mark.harvestRecalled==='boolean'?mark.harvestRecalled:null,
      harvestedAt:mark.harvestedAt?String(mark.harvestedAt).trim():null,
      packId:String(mark.packId||card?.packId||''),
      markedAt:String(mark.markedAt||'').trim()
    });
  }
  return rows;
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

export function normalizeMicroLessons(raw=[], packId='') {
  if(!Array.isArray(raw)) return [];
  const lessons=[];
  for(const [i,row] of raw.entries()){
    if(!row||typeof row!=='object') continue;
    const title=clean(row.title);
    const ruleSummary=clean(row.rule_summary||row.ruleSummary||row.summary||row.explanation);
    if(!title||!ruleSummary) continue;
    const id=clean(row.id||row.lesson_id||row.lessonId)||`micro:${stableHash(packId+'|'+title+'|'+(i+1))}`;
    const examples=(Array.isArray(row.examples)?row.examples:[]).slice(0,20).map(ex=>typeof ex==='string'?{word:clean(ex),contrast:'',note:''}:{word:clean(ex?.word||ex?.phrase||ex?.expression||ex?.en),contrast:clean(ex?.contrast||ex?.ipa||ex?.pronunciation),note:clean(ex?.note||ex?.meaning||ex?.tip)}).filter(ex=>ex.word);
    const miniQuiz=(Array.isArray(row.mini_quiz||row.miniQuiz)?(row.mini_quiz||row.miniQuiz):[]).slice(0,10).map((q,qIdx)=>({id:clean(q?.id)||`${id}:q${qIdx+1}`,prompt:clean(q?.prompt||q?.question),options:Array.isArray(q?.options)?q.options.map(clean).filter(Boolean).slice(0,6):[],answer:clean(q?.answer||q?.correct_answer||q?.correctAnswer),explanation:clean(q?.explanation)})).filter(q=>q.prompt);
    lessons.push({id,packId,title,category:clean(row.category||row.kind)||'pronunciation',sourceTitle:clean(row.source_title||row.sourceTitle)||null,sourceUrl:safeSourceUrl(row.source_url||row.sourceUrl)||null,ruleSummary,examples,miniQuiz});
  }
  return lessons;
}

/** One source manuscript, one stable speech identity; never infer spoken mastery. */
export function normalizeSpeechEntries(raw=[],packId='') {
  const errors=[],speeches=[],seenIds=new Set(),seenTexts=new Set();
  if(raw===undefined||raw===null)return {speeches,errors};
  if(!Array.isArray(raw))return {speeches,errors:['speeches 必须是数组。']};
  for(const [i,row] of raw.entries()){
    const sourceId=clean(row?.speech_id||row?.speechId||row?.id);
    const title=clean(row?.title);
    const scriptEn=clean(row?.script_en||row?.scriptEn||row?.text);
    const canonical=scriptEn.normalize('NFKC').replace(/\s+/g,' ').trim();
    if(!row||typeof row!=='object'||!sourceId||sourceId.length>150||!title||title.length>200||scriptEn.length<40||scriptEn.length>40000){
      errors.push(`演讲第 ${i+1} 篇缺少有效 ID、标题或长度为 40–40000 字符的英文正文。`);continue;
    }
    const textKey=canonical.toLocaleLowerCase();
    if(seenIds.has(sourceId)||seenTexts.has(textKey)){errors.push(`重复演讲：${sourceId}`);continue;}
    seenIds.add(sourceId);seenTexts.add(textKey);
    const voice=clean(row.audio_voice||row.audioVoice)||'af_heart';
    if(voice!=='af_heart'){errors.push(`演讲 ${sourceId} 当前仅支持已有 af_heart 整篇配音工序。`);continue;}
    const expectedHash=clean(row.script_sha256||row.scriptSha256).toLowerCase();
    if(expectedHash&&!/^[a-f0-9]{64}$/.test(expectedHash)){errors.push(`演讲 ${sourceId} 文稿 SHA-256 格式无效。`);continue;}
    const sourceReference=clean(row.source_reference||row.sourceReference);
    speeches.push({
      id:`speech:pack:${stableHash(packId+'|'+sourceId)}`,sourceId,packId,title,scriptEn,
      scriptSha256:expectedHash||null,audioVoice:voice,
      sourceType:clean(row.source_type||row.sourceType)||'user_supplied',
      sourceReference:safeSourceUrl(sourceReference)||null,
      authorOrSpeaker:clean(row.author_or_speaker||row.authorOrSpeaker)||null
    });
  }
  return {speeches,errors};
}
export function clampSpeechSeek(time,delta,duration){
  const total=Number(duration),current=Number(time),step=Number(delta);
  if(!Number.isFinite(total)||total<=0)return null;
  return Math.min(total,Math.max(0,(Number.isFinite(current)?current:0)+(Number.isFinite(step)?step:0)));
}

export function recordsFromLearningPack(value, {source='Central Immortal Aperture'} = {}) {
  if(!value||typeof value!=='object') throw Error('学习包 JSON 必须是对象。');
  const hasStoryPayload=Boolean(value.story_practice||value.storyPractice||(Array.isArray(value.stories)&&value.stories.length));
  const hasSpeechPayload=Array.isArray(value.speeches)&&value.speeches.length>0;
  const hasVocabPayload=Array.isArray(value.vocabulary_practice||value.vocabularyPractice)&&(value.vocabulary_practice||value.vocabularyPractice).length>0;
  const hasMicroPayload=Array.isArray(value.micro_lessons||value.microLessons)&&(value.micro_lessons||value.microLessons).length>0;
  if(!Array.isArray(value.items)&&!hasStoryPayload&&!hasSpeechPayload&&!hasVocabPayload&&!hasMicroPayload) throw Error('学习包 JSON 缺少 items 或有效练习模块。');
  const rawItems=Array.isArray(value.items)?value.items:[];
  if(rawItems.length>1000)throw Error('单份学习包最多包含 1000 项卡片。');
  if(value.readings!==undefined&&!Array.isArray(value.readings))throw Error('readings 必须是阅读文章数组。');
  if((value.readings||[]).length>20)throw Error('单份学习包最多包含 20 篇阅读文章。');
  const packId=clean(value.pack_id)||`pack:${stableHash(JSON.stringify(value.items||[])+'|'+JSON.stringify(value.readings||[])+'|'+JSON.stringify(value.speeches||[]))}`;
  const title=clean(value.title)||'今日综合英语学习包';
  const importedAt=new Date().toISOString();
  const errors=[],items=[],readings=[];
  const speechSource=normalizeSpeechEntries(value.speeches,packId);
  const speeches=speechSource.speeches;
  errors.push(...speechSource.errors);
  const storyPractice=normalizeStoryPractice(value.story_practice||value.storyPractice||value.stories,packId);
  const microLessons=normalizeMicroLessons(value.micro_lessons||value.microLessons||[],packId);
  const dialogueScenarios=normalizeDialogueScenarios(value.dialogue_scenarios||value.dialogueScenarios,packId);
  const listeningDiagnostics=normalizeListeningDiagnostics(value.listening_diagnostics||value.listeningDiagnostics,packId);
  const archiveWords=Array.isArray(value.original_word_items_read_only_archive||value.originalWordItemsReadOnlyArchive)?(value.original_word_items_read_only_archive||value.originalWordItemsReadOnlyArchive):[];
  const archiveSpellings=Array.isArray(value.original_spelling_tasks_read_only_archive||value.originalSpellingTasksReadOnlyArchive)?(value.original_spelling_tasks_read_only_archive||value.originalSpellingTasksReadOnlyArchive):[];
  const vocabSource=normalizeVocabularyPractice(value.vocabulary_practice||value.vocabularyPractice||[],archiveWords,packId);
  const vocabularyPractice=vocabSource.tasks;
  errors.push(...vocabSource.errors);
  const transferTasks=[];
  const spellingTasks=[];
  if(value.spelling_tasks!==undefined&&!Array.isArray(value.spelling_tasks)) errors.push('spelling_tasks 必须是数组；已跳过拼写强化。');
  for(const [index,raw] of (Array.isArray(value.spelling_tasks)?value.spelling_tasks:[]).entries()){
    const task=normalizeSpellingTask(raw,index,packId); if(!task){errors.push(`拼写任务第 ${index+1} 项缺少有效 target 或 prompt_mode。`);continue;} spellingTasks.push(task);
  }
  const inferTaskType=(raw,tags)=>{const explicit=normalized(raw.task_type||raw.taskType||'').replaceAll('-','_').replaceAll(' ','_');if(['speaking','writing','grammar','reading_to_speaking','general_transfer','exit_ticket'].includes(explicit))return explicit;const joined=tags.map(tag=>normalized(tag).replaceAll('-','_').replaceAll(' ','_'));if(joined.some(tag=>tag.includes('exit_ticket')||tag.includes('exit')))return 'exit_ticket';if(joined.some(tag=>tag.includes('reading_to_speaking')||tag.includes('retell')))return 'reading_to_speaking';if(joined.some(tag=>tag.includes('speaking')||tag.includes('oral')))return 'speaking';if(joined.some(tag=>tag.includes('writing')||tag.includes('essay')))return 'writing';if(joined.some(tag=>tag.includes('grammar')||tag.includes('syntax')))return 'grammar';return 'general_transfer';};
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
    transferTasks.push({id:taskId,prompt,referenceAnswer:reference,audioUrl:safeAudioUrl(raw.audioUrl||raw.audio_url),acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),hints:taskHints,responseStructure:clean(raw.responseStructure||raw.response_structure)||null,responseMode:clean(raw.response_mode||raw.responseMode)||null,targetPhrases:listValue(raw.targetPhrases||raw.target_phrases),ieltsPart:clean(raw.ieltsPart||raw.ielts_part||raw.part)||null,taskRole:clean(raw.taskRole||raw.task_role)||null,sourceItemIds:listValue(raw.source_item_ids||raw.sourceItemIds),tags:taskTags,taskType,unseenContext:raw.unseen_context===true||raw.unseenContext===true,reviewEvidenceStatus:raw.previous_report_id||raw.previousReportId?'VERIFIED_HISTORY':'NEW_INDEPENDENT_TEST',...normalizeReviewMeta(raw),...normalizeExamMeta(raw),...normalizeStoryMeta(raw),...taskSource,contexts});
  }
  for(const scenario of dialogueScenarios){
    scenario.nodes.forEach(node=>transferTasks.push({id:node.id,prompt:node.prompt,referenceAnswer:node.referenceAnswer,acceptedAnswers:[],hints:node.hints,taskType:'speaking',responseMode:'speaking',dialogueScenarioId:scenario.id,dialogueRound:node.round,dialogueNextNodeId:node.nextNodeId,dialogueBranches:node.branches,unseenContext:true,reviewEvidenceStatus:'NEW_INDEPENDENT_TEST',packId,sourceType:'dialogue_scenario',sourceId:scenario.id,sourceItemId:node.id,sourceName:scenario.title,contexts:[{id:node.id,prompt:node.prompt,referenceAnswer:node.referenceAnswer,hints:node.hints,source:{sourceType:'dialogue_scenario',sourceId:scenario.id,sourceItemId:node.id}}]}));
  }
  const planned=Number(value.recommended_minutes??value.target_minutes??0);
  const recommendedMinutes=Number.isFinite(planned)&&planned>0?Math.max(5,Math.min(180,Math.round(planned))):null;
  rawItems.forEach((raw,index)=>{
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
        items.push(baseRecord({id:`w:pack:${stableHash(packId+'|'+sourceId)}`,sourceItemId:sourceId,packId,packTitle:title,kind:'word',module:'words',contentType:'Words',target,example,cue:clean(raw.cue||raw.hint_zh),group:clean(raw.group)||'Daily pack',source:sourceName,...itemSource,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),evidence:clean(raw.evidence),tags,meaningZh:clean(raw.meaning_zh||raw.meaningZh||raw.hint_zh||raw.cue),definitionEn:clean(raw.definition_en||raw.definitionEn),partOfSpeech:clean(raw.part_of_speech||raw.partOfSpeech),collocations:listValue(raw.collocations),additionalContexts:listValue(raw.additional_contexts||raw.additionalContexts||raw.extra_contexts||raw.extraContexts),acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),learningStage:clean(raw.learning_stage||raw.learningStage)||'new',importedAt}));
      }else if(type==='sentence'||type==='listening'){
        const text=clean(raw.text||raw.sentence||raw.english);
        if(text.length<10||text.length>800)throw Error('句子或听力材料需要长度 10–800 的英文文本。');
        const module=type==='listening'?'listening':'sentences';
        const diagnostic=listeningDiagnostics.find(row=>row.itemId===sourceId);
        items.push(baseRecord({id:`s:pack:${stableHash(packId+'|'+sourceId+'|'+module+'|'+normalized(text))}`,sourceItemId:sourceId,packId,packTitle:title,kind:'sentence',module,contentType:module==='listening'?'Listening':'Sentences',text,audioUrl:safeAudioUrl(raw.audioUrl||raw.audio_url),source:sourceName,listeningDiagnostic:diagnostic||null,...itemSource,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),group:clean(raw.group)||'Daily pack',clozeTarget:clean(raw.cloze_target||raw.clozeTarget||raw.target),clozeAnswer:clean(raw.cloze_answer||raw.clozeAnswer),acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),tags,learningStage:clean(raw.learning_stage||raw.learningStage)||'new',importedAt}));
      }else throw Error('type 仅支持 word、sentence 或 listening。');
    }catch(error){errors.push(`第 ${index+1} 项：${error.message}`);}
  });
  (value.readings||[]).forEach((raw,index)=>{
    try{
      if(!raw||typeof raw!=='object')throw Error('阅读文章必须是对象。');
      const text=clean(raw.text||raw.content),articleTitle=clean(raw.title);
      if(!articleTitle||text.length<20||text.length>40000)throw Error('readings 需要 title 和长度 20–40000 的英文正文。');
      const sourceId=clean(raw.id)||`reading-${index+1}`;
      const questions=(Array.isArray(raw.questions)?raw.questions:[]).slice(0,40).map((question,qIndex)=>{const rawType=clean(question?.type||question?.question_type||question?.questionType||'open').toLowerCase().replaceAll('-','_').replaceAll(' ','_');const type=rawType==='choice'||rawType==='multiple_choice'?'choice':rawType==='true_false_not_given'?'true_false_not_given':rawType==='yes_no_not_given'?'yes_no_not_given':rawType==='matching_headings'?'matching_headings':rawType==='matching_information'?'matching_information':rawType==='matching_features'?'matching_features':rawType==='sentence_completion'?'sentence_completion':rawType==='summary_completion'||rawType==='note_completion'||rawType==='table_completion'?'summary_completion':rawType==='short_answer'?'short_answer':'open';const options=Array.isArray(question?.options)?question.options.map(option=>typeof option==='object'?clean(option.text||option.label||option.value):clean(option)).filter(Boolean).slice(0,10):[];return {id:clean(question?.id)||`${sourceId}:q${qIndex+1}`,type,questionType:type,prompt:clean(question?.prompt||question?.question),options,answer:clean(question?.answer||question?.correct_answer||question?.correctAnswer),acceptedAnswers:listValue(question?.accepted_answers||question?.acceptedAnswers),modelAnswer:clean(question?.model_answer||question?.modelAnswer),explanation:clean(question?.explanation),answerConstraints:clean(question?.answer_constraints||question?.answerConstraints),sourceReference:clean(question?.source_reference||question?.sourceReference),...normalizeReviewMeta({...raw,...question}),...normalizeExamMeta({...raw,...question,questionId:question?.id||`${sourceId}:q${qIndex+1}`})};}).filter(question=>question.prompt);
      const readingSource=normalizeSourceMeta(raw,{sourceType:'reading',sourceId:packId,sourceItemId:sourceId,sourceName:clean(raw.source||value.source)||source});
      readings.push({id:`reading:pack:${stableHash(packId+'|'+sourceId)}`,sourceId,title:articleTitle,text,source:clean(raw.source||value.source)||source,packId,questions,createdAt:importedAt,...normalizeReviewMeta(raw),...normalizeExamMeta(raw),...normalizeStoryMeta(raw),...readingSource});
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
  if(!unique.length&&!uniqueReadings.length&&!storyPractice&&!transferTasks.length&&!spellingTasks.length&&!speeches.length&&!vocabularyPractice.length&&!microLessons.length)throw Error(`学习包没有可导入项目。${errors[0]||''}`);
  return {items:unique,readings:uniqueReadings,speeches,transferTasks,spellingTasks,vocabularyPractice,originalWordArchive:archiveWords,originalSpellingArchive:archiveSpellings,storyPractice,microLessons,dialogueScenarios,listeningDiagnostics,errors,sourceType:'pack',sourceRows:rawItems.length+vocabularyPractice.length,pack:{packId,title,createdAt:clean(value.created_at)||null,source:clean(value.source)||source,language:clean(value.language)||'en',recommendedMinutes,readingIds:uniqueReadings.map(x=>x.id),speechIds:speeches.map(x=>x.id),listeningIds:unique.filter(x=>x.module==='listening').map(x=>x.id),transferTasks,spellingTasks,vocabularyPractice,originalWordArchive:archiveWords,originalSpellingArchive:archiveSpellings,storyPractice,microLessons,dialogueScenarios,listeningDiagnostics,schemaVersion:clean(value.schema_version)||'1'}};
}

export function normalizeAnswer(value) {
  return clean(value).toLocaleLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[.,!?;:]+$/g,'').replace(/\s+/g,' ');
}
function answerKey(value) { return normalizeAnswer(value).replace(/[^\p{L}\p{N}]+/gu,''); }
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const cur=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=cur;}}return row[b.length];}

const UK_US_SPELLING_EQUIV = Object.freeze([
  ['colour','color'],['colours','colors'],['favourite','favorite'],['favour','favor'],
  ['honour','honor'],['labour','labor'],['neighbour','neighbor'],['behaviour','behavior'],
  ['centre','center'],['theatre','theater'],['metre','meter'],['litre','liter'],
  ['defence','defense'],['offence','offense'],['licence','license'],
  ['realise','realize'],['realised','realized'],['organise','organize'],['organised','organized'],
  ['analyse','analyze'],['analysed','analyzed'],['apologise','apologize'],['recognise','recognize'],
  ['programme','program'],['dialogue','dialog'],['catalogue','catalog'],
  ['travelling','traveling'],['travelled','traveled'],['cancelling','canceling'],['cancelled','canceled'],
  ['practise','practice'],['grey','gray'],['cheque','check']
]);
function isUkUsSpellingVariant(uNorm, rNorm) {
  const uWords = uNorm.split(' '), rWords = rNorm.split(' ');
  if (uWords.length !== rWords.length) return false;
  let changed = false;
  for (let i = 0; i < uWords.length; i += 1) {
    if (uWords[i] === rWords[i]) continue;
    const match = UK_US_SPELLING_EQUIV.some(([a, b]) => (uWords[i] === a && rWords[i] === b) || (uWords[i] === b && rWords[i] === a));
    if (!match) return false;
    changed = true;
  }
  return changed;
}
export function compareAnswer(user, reference, {accepted=[]} = {}) {
  const rawUser=clean(user), rawReference=clean(reference); if(!rawUser) return {status:'blank',user:rawUser,reference:rawReference,message:'没有填写答案。'};
  const userNorm=normalizeAnswer(rawUser), refNorm=normalizeAnswer(rawReference);
  if(rawUser===rawReference) return {status:'correct',user:rawUser,reference:rawReference,message:'答案正确。'};
  if(userNorm===refNorm) return {status:'case_or_punctuation',user:rawUser,reference:rawReference,message:'内容一致，只有大小写或标点不同。'};
  const acceptedNorm=accepted.map(normalizeAnswer); if(acceptedNorm.includes(userNorm)) return {status:'correct',user:rawUser,reference:rawReference,message:'答案符合允许表达。'};
  if(isUkUsSpellingVariant(userNorm,refNorm)) return {status:'correct',variant_accepted:true,user:rawUser,reference:rawReference,message:'英美拼写变体等效，已保留你的原答。'};
  if(answerKey(rawUser)===answerKey(rawReference)) return {status:'case_or_punctuation',user:rawUser,reference:rawReference,message:'内容一致，只有大小写或标点不同。'};
  const distance=editDistance(answerKey(rawUser),answerKey(rawReference));
  if(distance===1&&answerKey(rawReference).length>=4) return {status:'minor_spelling',user:rawUser,reference:rawReference,message:describeReferenceDifference(rawUser,rawReference)||'可能有一个拼写差异，请比较参考表达。'};
  return {status:'incorrect',user:rawUser,reference:rawReference,message:describeReferenceDifference(rawUser,rawReference)||'答案与参考表达不同，请自行比较。'};
}
/**
 * Compare a vocabulary response without claiming that a free alternative is
 * wrong when the imported pack does not provide an exhaustive answer basis.
 * Exact target and explicit acceptedAnswers remain objectively checkable.
 */
export function compareWordAnswer(user, item={}, {definitionEn='', confidence=''} = {}) {
  const rawItem=item||{};
  const reference=clean(rawItem.target);
  const accepted=listValue(rawItem.acceptedAnswers||rawItem.accepted_answers);
  const check=compareAnswer(user,reference,{accepted});
  if (check.status==='incorrect' && clean(user) && !accepted.length) {
    return {...check,status:'unassessed',message:'The pack does not define an exhaustive answer set. Compare your expression with the context and rate it honestly; it is not automatically marked wrong.'};
  }
  return check;
}
/** Explain only a visible token difference; this is NOT a grammar or meaning judgement. */
export function describeReferenceDifference(user, reference) {
  const userWords=normalizeAnswer(user).split(/\s+/).filter(Boolean);
  const referenceWords=normalizeAnswer(reference).split(/\s+/).filter(Boolean);
  if(!userWords.length||!referenceWords.length||userWords.length>120||referenceWords.length>120)return '';
  let start=0;
  while(start<Math.min(userWords.length,referenceWords.length)&&userWords[start]===referenceWords[start])start++;
  if(start===userWords.length&&start===referenceWords.length)return '';
  let endUser=userWords.length,endReference=referenceWords.length;
  while(endUser>start&&endReference>start&&userWords[endUser-1]===referenceWords[endReference-1]){endUser--;endReference--;}
  const changedUser=userWords.slice(start,endUser),changedReference=referenceWords.slice(start,endReference);
  if(changedUser.length===1&&changedReference.length===1){
    return '参考表达第'+(start+1)+'个词：你写的是「'+changedUser[0]+'」，参考为「'+changedReference[0]+'」。请检查拼写、时态或用词；这只是文本差异，不代表已判定语法错误。';
  }
  if(changedUser.length===0&&changedReference.length<=3)return '参考表达第'+(start+1)+'处包含「'+changedReference.join(' ')+'」，你的答案没有这一段。请按语境核对。';
  if(changedReference.length===0&&changedUser.length<=3)return '你在第'+(start+1)+'处写了「'+changedUser.join(' ')+'」，参考表达没有这一段。请按语境核对。';
  return '存在多处用词或词序差异；请对照参考表达核查。开放表达未经过人工语法或语义评分。';
}

/** User-triggered, privacy-local copy/export: last real report and saved reading vocabulary. */
export function centralLearningHandoff({report=null,readingWords=[],generatedAt='' }={}) {
  const words=Array.isArray(readingWords)?readingWords:[];
  const marks=Array.isArray(report?.reading_analysis?.marks)?report.reading_analysis.marks:[];
  const currentCardIds=new Set(marks.filter(mark=>mark.savedStatus==='SAVED'&&mark.savedItemId).map(mark=>String(mark.savedItemId)));
  const historicalWords=words.filter(row=>!currentCardIds.has(String(row?.id||'')));
  const markLines=[
    '## 本次阅读标记（随本次战报）',
    '本次阅读标记生词：'+marks.length+'条',
    marks.length?'以下标记未自动视为 N；请按真实 K/V/N 或新题复测：':'本次没有标记阅读生词。',
    ...marks.flatMap((row,index)=>[
      `${index+1}. ${row.wordText||row.normalizedWord||'未记录'}`,
      '   标记ID：'+(row.markId||row.id||'未记录')+' · 状态：'+(row.savedStatus==='SAVED'?'已保存为卡片':'仅标记未保存')+' · K/V/N：'+(row.status||'UNTESTED'),
      '   阅读来源：'+(row.sourceTitle||'未记录')+' · 阅读ID：'+(row.readingId||'未记录'),
      '   原文例句：'+(row.originalSentence||'未记录'),
      ''
    ])
  ];
  const lines=[
    '# 中央仙窍｜英语学习交接',
    '生成时间（设备）：'+(generatedAt||'未提供'),
    '范围：当前战报中的本次阅读标记＋未重复的已保存阅读生词；不是全部历史，复制不等于外部同步。',
    '批改要求：保留真实原答和初稿，区分网站自动检查、用户K/V/N与AI严判；口语未附音频不得判断真实发音。',
    '后续选题：对核实错误进行新语境回炉；V/N仅是自评，未测不能算不会；依稳定report_id和card_id查重。',
    '',
    '## 最近一份Battle Report',
    report?battleReportMarkdown(report):'本机暂无已生成的战报。',
    '',
    ...markLines,
    '',
    '## 阅读生词（设备原始记录）',
    readingVocabularyHandoff(historicalWords,{exportedAt:generatedAt})
  ];
  return lines.join('\n').trim()+'\n';
}

export function buildCentralLearningFeedback({report=null,generatedAt='' }={}) {
  const generated=generatedAt||new Date().toISOString();
  const attempts=Array.isArray(report?.attempts)?report.attempts:[];
  const transfers=Array.isArray(report?.transfer_attempts)?report.transfer_attempts:[];
  const candidate=(attempt,priority,reason)=>({priority,reason,item_id:attempt.item_id||null,target:attempt.target||null,module:attempt.module||attempt.content_type||null,rating:attempt.rating||'UNRATED',suggested_review_date:attempt.suggested_review_date||null,attempt_id:attempt.attempt_id||null,session_id:attempt.session_id||report?.session_id||null,source:attempt.source||null,independent:!attempt.prompt_used&&!attempt.viewed_answer});
  const p0=attempts.filter(attempt=>attempt.rating==='N').map(attempt=>candidate(attempt,'P0','真实 N 自评或客观训练记录需要重新提取'));
  const p1=attempts.filter(attempt=>attempt.rating==='V'||attempt.prompt_used||attempt.retried_after_error).map(attempt=>candidate(attempt,'P1',attempt.rating==='V'?'V · 模糊，需要独立复测':'使用提示或经历重练，掌握程度仍待核验'));
  const p2=attempts.filter(attempt=>attempt.rating==='K').map(attempt=>candidate(attempt,'P2','已记录 K，可安排保持性复测而非历史错题'));
  const unmeasured=attempts.filter(attempt=>attempt.rating==='UNRATED'||!attempt.rating).map(attempt=>candidate(attempt,'UNKNOWN','没有 K/V/N 或自动判定证据，不能推断掌握状态'));
  const transferEvidence=transfers.map(attempt=>({attempt_id:attempt.id||null,task_id:attempt.taskId||attempt.contextId||null,task_type:attempt.taskType||'general_transfer',prompt:attempt.prompt||null,first_answer:attempt.firstAnswer||'',retry_answer:attempt.retryAnswer||'',first_submitted_at:attempt.firstSubmittedAt||null,retry_submitted_at:attempt.retrySubmittedAt||null,hint_used:Boolean(attempt.hintUsed),reference_viewed:Boolean(attempt.referenceViewed),reference_displayed_after_submit:Boolean(attempt.referenceDisplayedAutomatically),rating:attempt.rating||'UNRATED',recording_only:Boolean(attempt.recordingOnly),recording_ids:Array.isArray(attempt.recordingIds)?attempt.recordingIds:[],ai_critique:attempt.aiCritique||null,evidence_type:attempt.evidenceType||null,review_of:attempt.reviewOf||null,previous_report_id:attempt.previousReportId||null}));
  return {
    feedback_schema_version:'1.0',
    is_learning_pack:false,
    generated_at:generated,
    report_id:report?.report_id||null,
    session_id:report?.session_id||null,
    pack_id:report?.pack_id||null,
    source_report_ids:report?.report_id?[report.report_id]:[],
    completed_modules:Array.isArray(report?.module_coverage)?report.module_coverage:[],
    actual_active_seconds:Number(report?.active_seconds||0),
    evidence:{
      ratings:{K:Number(report?.ratings_summary?.K||0),V:Number(report?.ratings_summary?.V||0),N:Number(report?.ratings_summary?.N||0)},
      rated_attempts:Number(report?.total_rated_attempts||0),
      unrated_attempts:Number(report?.unrated_attempts||0),
      skipped_items:Number(report?.skipped_items||0),
      first_independent_answers:Number(report?.prompt_stats?.first_attempt_independent||0),
      prompted_answers:Number(report?.prompt_stats?.prompted||0),
      viewed_answer_flows:Number(report?.prompt_stats?.viewed_answer||0),
      retry_after_error:Number(report?.prompt_stats?.retried_after_error||0)
    },
    review_candidates:{p0,p1,p2},
    unmeasured,
    reading_vocabulary_evidence:{
      count:Array.isArray(report?.reading_analysis?.marks)?report.reading_analysis.marks.length:0,
      items:Array.isArray(report?.reading_analysis?.marks)?report.reading_analysis.marks.map(mark=>({mark_id:mark.markId||mark.id||null,word:mark.wordText||mark.normalizedWord||'',reading_id:mark.readingId||null,source_title:mark.sourceTitle||'',original_sentence:mark.originalSentence||'',saved_status:mark.savedStatus||'UNSAVED',status:mark.status||'UNTESTED',harvest_tier:mark.harvestTier||mark.harvest_tier||null,harvest_recalled:typeof mark.harvestRecalled==='boolean'?mark.harvestRecalled:(typeof mark.harvest_recalled==='boolean'?mark.harvest_recalled:null),harvested_at:mark.harvestedAt||mark.harvested_at||null,pack_id:mark.packId||null})):[]
    },
    reading_recall_evidence:{count:Array.isArray(report?.reading_analysis?.immediate_recall)?report.reading_analysis.immediate_recall.length:0,items:Array.isArray(report?.reading_analysis?.immediate_recall)?report.reading_analysis.immediate_recall:[]},
    reading_passage_metrics:Array.isArray(report?.reading_analysis?.passage_metrics)?report.reading_analysis.passage_metrics:[],
    vocabulary_recognition_evidence:{
      counts_as_mastery_K:false,
      summary:report?.vocabulary_practice_evidence?.summary||null,
      interference_radar:report?.vocabulary_practice_evidence?.interferenceRadar||{totalConfusedPairs:0,pairs:[]}
    },
    discourse_summary:report?.discourse_summary||null,
    radio_exposure:report?.radio_exposure||null,
    manual_review_marks:Array.isArray(report?.manual_review_marks)?report.manual_review_marks:[],
    fsrs_shadow_summary:report?.fsrs_shadow?{
      model:report.fsrs_shadow.model,
      qualified_independent_events:report.fsrs_shadow.qualifiedIndependentEvents||0,
      excluded_non_independent_or_unrated:report.fsrs_shadow.excludedNonIndependentOrUnrated||0,
      tracked_cards:report.fsrs_shadow.trackedCards||0,
      shadow_due_count:report.fsrs_shadow.shadowDueCount||0,
      avg_stability_days:report.fsrs_shadow.avgStabilityDays||0,
      high_risk_count:report.fsrs_shadow.highRiskCount||0
    }:null,
    transfer_evidence:transferEvidence,
    integrity:{source:'local Battle Report only',ai_score:false,official_exam_score:false,external_sync:false,choice_recognition_never_counted_as_K:true}
  };
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
  if(value.speeches!==undefined&&!Array.isArray(value.speeches)) throw Error('Backup has invalid speech data.');
  if(value.speechAttempts!==undefined&&!Array.isArray(value.speechAttempts)) throw Error('Backup has invalid speech attempts.');
  const speeches=(value.speeches||[]).map(row=>{
    if(!row||typeof row!=='object'||typeof row.id!=='string'||typeof row.scriptEn!=='string'||typeof row.title!=='string')throw Error('Backup has invalid speech data.');
    return {...row};
  });
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
  if(value.readingRetellingAttempts!==undefined&&!Array.isArray(value.readingRetellingAttempts)) throw Error('Backup has invalid reading-retelling data.');
  if(value.paperStoryPractice!==undefined&&value.paperStoryPractice!==null&&typeof value.paperStoryPractice!=='object') throw Error('Backup has invalid paper-story practice data.');
  const readingMarks=mergeReadingMarks(value.readingMarks||[]);
  const weaknesses=mergeWeaknesses(value.weaknesses||[],[]);
  const transferAttempts=mergeTransferAttempts(value.transferAttempts||[],[]);
  const journey=value.dailyJourney;
  const dailyJourney=journey&&typeof journey==='object'&&typeof journey.packId==='string'&&Array.isArray(journey.steps)&&journey.steps.every(x=>['vocabulary','words','spelling','sentences','reading','listening','speech','transfer'].includes(x))?{
    ...journey,vocabularyRunning:false,vocabularyLastTick:null,vocabularyMs:Math.max(0,Number(journey.vocabularyMs)||0),
    vocabularyIndex:Math.max(0,Number(journey.vocabularyIndex)||0),
    vocabularyAttempts:Array.isArray(journey.vocabularyAttempts)?journey.vocabularyAttempts:[],
    vocabularyRehearsalDone:Boolean(journey.vocabularyRehearsalDone),
    readingRunning:false,readingLastTick:null,readingMs:Math.max(0,Number(journey.readingMs)||0),
    speechRunning:false,speechLastTick:null,speechMs:Math.max(0,Number(journey.speechMs)||0),
    speechDoneIds:Array.isArray(journey.speechDoneIds)?journey.speechDoneIds.filter(x=>typeof x==='string'):[],
    speechAttempts:Array.isArray(journey.speechAttempts)?journey.speechAttempts.filter(x=>x&&typeof x==='object'):[],
    index:Math.max(0,Math.min(journey.steps.length,Number(journey.index)||0)),
    completed:Array.isArray(journey.completed)?journey.completed.filter(x=>x&&typeof x.stage==='string'):[],
    sessionIds:Array.isArray(journey.sessionIds)?journey.sessionIds.filter(x=>typeof x==='string'):[],
    readingDoneIds:Array.isArray(journey.readingDoneIds)?journey.readingDoneIds.filter(x=>typeof x==='string'):[],
    readingPartialIds:Array.isArray(journey.readingPartialIds)?journey.readingPartialIds.filter(x=>typeof x==='string'):[],
    readingRecallQueue:Array.isArray(journey.readingRecallQueue)?journey.readingRecallQueue:[],
    readingRecallIndex:Math.max(0,Number(journey.readingRecallIndex)||0),
    readingRecallAttempts:Array.isArray(journey.readingRecallAttempts)?journey.readingRecallAttempts:[],
    readingRecallStep:journey.readingRecallStep==='revealed'?'revealed':journey.readingRecallStep==='input'?'input':null,
    readingRecallDraft:clean(journey.readingRecallDraft),
    transferAttempts:mergeTransferAttempts(journey.transferAttempts||[],[]),
    spellingIndex:Math.max(0,Number(journey.spellingIndex)||0),
    spellingAttempts:Array.isArray(journey.spellingAttempts)?journey.spellingAttempts:[],
    transferRecordingIds:journey.transferRecordingIds&&typeof journey.transferRecordingIds==='object'?journey.transferRecordingIds:{}
  }:null;
  const items=value.items.map(item=>({...item,learningStage:item.learningStage||((item.attempts||0)>0?'review':'new'),promptCount:Number(item.promptCount||0),viewedAnswerCount:Number(item.viewedAnswerCount||0),acceptedAnswers:listValue(item.acceptedAnswers),collocations:listValue(item.collocations),archived:Boolean(item.archived),paused:Boolean(item.paused)}));
  const paperStoryPractice=value.paperStoryPractice&&typeof value.paperStoryPractice==='object'?{...value.paperStoryPractice,attempts:Array.isArray(value.paperStoryPractice.attempts)?value.paperStoryPractice.attempts:[],index:Math.max(0,Number(value.paperStoryPractice.index)||0),finishedAt:value.paperStoryPractice.finishedAt||null}:null;
  return {version:VERSION,items,attempts:value.attempts,sessions:value.sessions,readings,speeches,
    speechAttempts:Array.isArray(value.speechAttempts)?value.speechAttempts:[],
    speechProgress:value.speechProgress&&typeof value.speechProgress==='object'&&!Array.isArray(value.speechProgress)?value.speechProgress:{},speechTransferAttempts:Array.isArray(value.speechTransferAttempts)?value.speechTransferAttempts:[],speechTransferHints:value.speechTransferHints&&typeof value.speechTransferHints==='object'&&!Array.isArray(value.speechTransferHints)?value.speechTransferHints:{},readingMarks,readingChecks:Array.isArray(value.readingChecks)?value.readingChecks:[],readingRetellingAttempts:Array.isArray(value.readingRetellingAttempts)?value.readingRetellingAttempts:[],weaknesses,transferAttempts,listeningDiagnosticAttempts:Array.isArray(value.listeningDiagnosticAttempts)?value.listeningDiagnosticAttempts:[],vocabularyAttempts:Array.isArray(value.vocabularyAttempts)?value.vocabularyAttempts:[],
    manualReviewMarks:Array.isArray(value.manualReviewMarks)?value.manualReviewMarks:[],
    microLessonProgress:value.microLessonProgress&&typeof value.microLessonProgress==='object'&&!Array.isArray(value.microLessonProgress)?value.microLessonProgress:{},
        customRadioPacks:Array.isArray(value.customRadioPacks)?value.customRadioPacks:[],
        myAudioTracks:Array.isArray(value.myAudioTracks)?value.myAudioTracks:[],
        radioMoments:Array.isArray(value.radioMoments)?value.radioMoments:[],
        radioUnclearMarks:Array.isArray(value.radioUnclearMarks)?value.radioUnclearMarks:[],
        deferredSpeaking:Array.isArray(value.deferredSpeaking)?value.deferredSpeaking:[],
        radioQueue:Array.isArray(value.radioQueue)?value.radioQueue:[],
        radioBookmarksV2:value.radioBookmarksV2&&typeof value.radioBookmarksV2==='object'&&!Array.isArray(value.radioBookmarksV2)?value.radioBookmarksV2:{},
        fsrsState:value.fsrsState&&typeof value.fsrsState==='object'&&!Array.isArray(value.fsrsState)?value.fsrsState:{},
        masteredVocabWords:Array.isArray(value.masteredVocabWords)?value.masteredVocabWords.map(w=>String(w||'').toLowerCase().trim()).filter(Boolean):(value.masteredVocabWords&&typeof value.masteredVocabWords==='object'?Object.keys(value.masteredVocabWords).map(w=>String(w||'').toLowerCase().trim()).filter(Boolean):[]),
        stateRevision:Number.isFinite(Number(value.stateRevision))?Number(value.stateRevision):0,
        v19:value.v19&&typeof value.v19==='object'&&!Array.isArray(value.v19)?{disputes:Array.isArray(value.v19.disputes)?value.v19.disputes:[],confidenceLogs:Array.isArray(value.v19.confidenceLogs)?value.v19.confidenceLogs:[],lifeTasks:Array.isArray(value.v19.lifeTasks)?value.v19.lifeTasks:[],exactResume:value.v19.exactResume&&typeof value.v19.exactResume==='object'?value.v19.exactResume:null,stopCheckpoint:value.v19.stopCheckpoint&&typeof value.v19.stopCheckpoint==='object'?value.v19.stopCheckpoint:null,prefs:{largeText:false,oneHandMode:false,aiOutboundPreview:true,...(value.v19.prefs&&typeof value.v19.prefs==='object'?value.v19.prefs:{})},speechRecallMode:typeof value.v19.speechRecallMode==='string'?value.v19.speechRecallMode:'full_text'}:undefined,reports:Array.isArray(value.reports)?value.reports:[],dailyPack,packHistory,dailyJourney,paperStoryPractice,activeSession:null,settings:{duration:40,speechRate:.9,theme:'system',chineseHints:true,retryAfterError:true,newLimit:10,reviewLimit:20,...(value.settings||{})}};
}

export function buildBattleReport({session, attempts, items=[], allowedSessionIds=null, timezone='Asia/Shanghai', appVersion=APP_VERSION, now=new Date(), readingMarks=[], readings=[], readingChecks=[], weaknesses=[], transferAttempts=[], readingRecallAttempts=[], readingRetellingAttempts=[], readingCompletedIds=[], spellingAttempts=[], listeningDiagnostics=[], vocabularyTasks=[], vocabularyAttempts=[], originalWordArchive=[], radioLog=null, manualReviewMarks=[]}) {
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
      correction_attempt: Boolean(attempt.correction_attempt),
      correction_of: attempt.correction_of || null,
      session_id: attempt.sessionId || null,
      item_id: attempt.itemId,
      content_type: attempt.kind,
      module: listening?'listening':attempt.kind==='word'?'words':'sentences',
      target: item.target || item.text || '',
      source: item.source || 'Unknown source',
      prompt_type: attempt.promptType || (attempt.kind === 'word' ? 'cloze' : 'recall'),
      listening_variant: attempt.listeningVariant || null,
      comprehension_self_report: attempt.comprehensionSelfReport || null,
      user_answer: attempt.answer || '',
      reference_answer: attempt.referenceAnswer || item.target || item.text || '',
      rating: ['K','V','N'].includes(attempt.status)?attempt.status:'UNRATED',
      skipped: Boolean(attempt.skipped),
      initial_check: attempt.initial_check || null,
      answer_confidence: attempt.answer_confidence || null,
      clue_source: attempt.clue_source || null,
      retry_answer: attempt.retry_answer || '',
      retry_check: attempt.retry_check || null,
      retried_after_error: Boolean(attempt.retried_after_error),
      recording_ids: Array.isArray(attempt.recording_ids)?attempt.recording_ids:[],
      recording_status: attempt.recording_status || (Array.isArray(attempt.recording_ids)&&attempt.recording_ids.length?'saved_locally':'not_recorded'),
      prompt_used: Boolean(attempt.prompt_used),
      prompt_events: Array.isArray(attempt.prompt_events)?attempt.prompt_events:[],
      viewed_chinese: Boolean(attempt.viewed_chinese),
      viewed_answer: Boolean(attempt.viewed_answer),
      reference_viewed: Boolean(attempt.reference_viewed ?? attempt.viewed_answer),
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
  const readingMarkEvidence=collectReadingMarkEvidence(readingMarks,readings,items);
  const immediateRecall=Array.isArray(readingRecallAttempts)?readingRecallAttempts.map(row=>({...row,mark_id:row.mark_id||row.markId||null,reading_id:row.reading_id||row.readingId||null,word:row.word||row.wordText||row.normalizedWord||'',original_sentence:row.original_sentence||row.originalSentence||'',source_title:row.source_title||row.sourceTitle||'',pack_id:row.pack_id||row.packId||null,user_answer:row.user_answer??row.userAnswer??'',status:row.status||row.rating||'UNTESTED',independent:row.independent!==false,at:row.at||row.timestamp||null})):[];
  const packTargets = [...new Set([
    ...(Array.isArray(vocabularyTasks) ? vocabularyTasks.map(t => clean(t?.target)) : []),
    ...(Array.isArray(items) ? items.filter(i => i?.kind === 'word').map(i => clean(i?.target)) : []),
    ...(Array.isArray(originalWordArchive) ? originalWordArchive.map(w => clean(w?.target)) : [])
  ].filter(Boolean))];
  const mergedTransfers = mergeTransferAttempts([], transferAttempts);
  const discourseItems = [];
  for (const ta of mergedTransfers) {
    if (!clean(ta.firstAnswer)) continue;
    const diag = analyzeDiscourseAndChunks(ta.firstAnswer, {
      referenceText: ta.referenceAnswer || '',
      targetPhrases: Array.isArray(ta.targetPhrases) ? ta.targetPhrases : [],
      packTargets
    });
    discourseItems.push({ source: 'transfer', taskId: ta.taskId || ta.id, taskType: ta.taskType || 'general_transfer', ...diag });
  }
  for (const rt of (Array.isArray(readingRetellingAttempts) ? readingRetellingAttempts : [])) {
    if (!clean(rt?.firstAnswer)) continue;
    const matchedReading = (Array.isArray(readings) ? readings : []).find(r => r.id === rt.readingId);
    const diag = analyzeDiscourseAndChunks(rt.firstAnswer, {
      referenceText: matchedReading?.text || '',
      targetPhrases: [],
      packTargets
    });
    discourseItems.push({ source: 'reading_retelling', taskId: rt.readingId || rt.id, taskType: 'reading_retelling', ...diag });
  }
  const discourseSummary = {
    analyzedResponses: discourseItems.length,
    totalOutputWords: discourseItems.reduce((s, d) => s + d.wordCount, 0),
    avgSentenceWords: discourseItems.length ? Number((discourseItems.reduce((s, d) => s + d.avgSentenceWords, 0) / discourseItems.length).toFixed(1)) : 0,
    avgLexicalDiversity: discourseItems.length ? Number((discourseItems.reduce((s, d) => s + d.lexicalDiversity, 0) / discourseItems.length).toFixed(2)) : 0,
    targetHits: [...new Set(discourseItems.flatMap(d => d.targetHits))],
    targetMissed: [...new Set(discourseItems.flatMap(d => d.targetMissed))],
    packWordsReused: [...new Set(discourseItems.flatMap(d => d.packHits))],
    cohesionMarkersUsed: [...new Set(discourseItems.flatMap(d => d.cohesionUsed))],
    items: discourseItems,
    isAutomatedScore: false,
    integrityNotice: '本汇总仅包含词块命中、衔接词与句长客观统计，不代表 AI 语法评分或官方雅思分数。'
  };
  const readingPassageMetrics = (Array.isArray(readings) ? readings : []).map(r => ({
    readingId: r.id,
    title: r.title || 'Untitled',
    ...analyzeReadingPassageMetrics(r.text || '', 0, packTargets)
  }));
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
      articles: (Array.isArray(readings)?readings:[]).map(reading=>({reading_id:reading.id,title:reading.title||'Untitled',source:reading.source||'Local material',completed:Array.isArray(readingCompletedIds)&&readingCompletedIds.includes(reading.id),...normalizeStoryMeta(reading),...normalizeExamMeta(reading),questions:(reading.questions||[]).map(question=>({id:question.id,prompt:question.prompt,type:question.type,answer:question.answer,examSource:question.examSource,examType:question.examType,testNumber:question.testNumber,skill:question.skill,questionId:question.questionId||question.id,questionNumbers:question.questionNumbers,questionType:question.questionType,answerConstraints:question.answerConstraints,sourcePage:question.sourcePage,isAuthenticIelts:question.isAuthenticIelts}))})),
      mark_count:readingMarkEvidence.length,
      marks: readingMarkEvidence,
      immediate_recall: immediateRecall,
      retelling_attempts: Array.isArray(readingRetellingAttempts)?readingRetellingAttempts:[],
      comprehension_checks: Array.isArray(readingChecks)?readingChecks:[],
      passage_metrics: readingPassageMetrics
    },
    transfer_attempts: mergedTransfers,
    discourse_summary: discourseSummary,
    transfer_evidence: buildTransferAnalytics({weaknesses,transferAttempts,now}),
    spelling_evidence: {attempts:Array.isArray(spellingAttempts)?spellingAttempts:[],summary:buildSpellingSummary(spellingAttempts)},
    vocabulary_practice_evidence: {attempts:Array.isArray(vocabularyAttempts)?vocabularyAttempts:[],summary:summarizeVocabularyPractice(vocabularyTasks,vocabularyAttempts),interferenceRadar:buildInterferenceRadar(vocabularyTasks,vocabularyAttempts,originalWordArchive)},
    fsrs_shadow: replayFsrsShadowHistory(detail, now),
    radio_exposure: summarizeRadioExposure(radioLog),
    manual_review_marks: Array.isArray(manualReviewMarks)?manualReviewMarks:[],
    listening_diagnostics: Array.isArray(listeningDiagnostics)?listeningDiagnostics:[],
    data_quality: {actual_active_time:true, duplicate_attempts_checked:true, semantic_score:false, unrated_preserved:true, choice_recognition_never_counted_as_K:true},
    sync_status: 'NOT_SUBMITTED'
  };
}
export function battleReportMarkdown(report) {
  const r = report.ratings_summary || {K:0,V:0,N:0};
  const inline = value => String(value ?? '').replaceAll('|','\\|').replaceAll('\n','<br>');
  const block = value => { const text=String(value ?? '').trim(); return text ? text.split('\n').map(line=>`  ${line}`).join('\n') : '  （未提交）'; };
  const transferType = value => ({writing:'Writing',speaking:'Speaking',grammar:'Grammar',reading_to_speaking:'Reading to Speaking',exit_ticket:'Exit Ticket',general_transfer:'Transfer'})[value] || 'Transfer';
  const readingChecks = (report.reading_analysis?.comprehension_checks||[]).flatMap(check=>(check.answers||[]).map(answer=>`- ${inline(answer.questionId||'未命名题目')} · 原答：${inline(answer.answer)} · 判定：${inline(answer.autoCheck?.status||'未判定')} · 提交：${inline(answer.at||'未记录')}`));
  const readingExamLines = (report.reading_analysis?.articles||[]).flatMap(article=>article.examSource?[`- ${inline(article.examSource)} · ${inline(article.examType||'')} · ${inline(article.testNumber||'')} · ${inline(article.skill||'')} · ${article.isAuthenticIelts?'原版真题':'练习材料'} · ${inline(article.sourcePage||'页码未记录')}`,...(article.questions||[]).map(question=>`  - ${inline(question.questionId||question.id)} · ${inline(question.questionType||question.type||'')} · ${inline(question.prompt||'')}`)]:[]);
  const transferLines = (report.transfer_attempts||[]).flatMap((attempt,index)=>[
    `### 题目 ${index+1}｜${transferType(attempt.taskType)} · ${inline(attempt.taskId||attempt.contextId||'未命名任务')}`,
    `- 学习包：${inline(attempt.packId||report.pack_id||'未记录')} · Journey：${inline(attempt.journeyId||report.session_id||'未记录')}`,
    `- 题目原文：${inline(attempt.prompt||'未记录')}`,
    ...(attempt.examSource?[`- IELTS来源：${inline(attempt.examSource)} · ${inline(attempt.examType||'')} · ${inline(attempt.testNumber||'')} · ${inline(attempt.skill||'')} · 题目ID：${inline(attempt.questionId||attempt.taskId||'未记录')} · ${attempt.isAuthenticIelts?'原版真题':'练习材料'}`]:[]),
    ...(attempt.practiceRole==='review'?[`- 回炉来源：${inline(attempt.reviewOf||'历史证据待核验')} · 历史报告：${inline(attempt.previousReportId||'未记录')} · 历史作答：${inline(attempt.previousAttemptId||'未记录')} · 日期：${inline(attempt.previousDate||'未记录')} · 状态：${inline(attempt.previousStatus||'待核验')} · 证据：${inline(attempt.evidenceType||'未记录')} · 第 ${inline(attempt.reviewRound||'未记录')} 轮`]:[]),
    `- 原始英文初稿（${attempt.firstSubmittedAt||'未记录'}）：`, block(attempt.firstAnswer || (attempt.recordingOnly?'录音未转写':'')),
    `- 使用提示：${attempt.hintUsed?'是':'否'} · 参考表达：${attempt.referenceDisplayedAutomatically?'初答提交后自动显示':attempt.referenceViewed?'已手动查看':'未查看'}${attempt.referenceViewedAt?`（${attempt.referenceViewedAt}）`:''}`,
    `- 参考答案：${inline(attempt.referenceAnswer||'未记录')}`,
    `- 修改稿：${attempt.retryAnswer?`已提交（${attempt.retrySubmittedAt||'时间未记录'}）`:'未提交'}`, ...(attempt.retryAnswer?[block(attempt.retryAnswer)]:[]),
    `- K/V/N 自评：${attempt.rating||'未自评'} · AI 评分：未评分，待中央仙窍批改`,
    ...(attempt.aiCritique?[`- 站内 AI 导师辅导记录（非官方评分）：`, block(attempt.aiCritique)]:[]),
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
    ``, `## 本次阅读标记生词`, ``, `本次阅读标记生词：${report.reading_analysis?.mark_count||0}条`,
    ...(report.reading_analysis?.marks||[]).map(mark=>`- ${inline(mark.wordText||mark.normalizedWord||'未记录')} · ${mark.savedStatus==='SAVED'?'已保存为卡片':'仅标记未保存'} · K/V/N：${inline(mark.status||'UNTESTED')}${mark.harvestTier?` · 收割分流：${mark.harvestTier==='promote'?'🔥明日必考':mark.harvestTier==='passive'?'👁️仅混眼熟':'🗑️略过'}${typeof mark.harvestRecalled==='boolean'?`（挖空回忆：${mark.harvestRecalled?'想起来':'未想起'}）`:''}`:''} · ${inline(mark.sourceTitle||'未记录')} · ${inline(mark.originalSentence||'')}`),
    ``, `## 阅读标记即时回忆`, ``, `实际参加即时回忆：${(report.reading_analysis?.immediate_recall||[]).length}条`,
    ...(report.reading_analysis?.immediate_recall||[]).map(row=>`- ${inline(row.word||row.mark_id||'未记录')} · ${inline(row.status||'UNTESTED')} · 原答：${inline(row.user_answer||'')} · 来源：${inline(row.source_title||'未记录')}`),
    ...(readingExamLines.length?[``, `## IELTS reading source`, ``, ...readingExamLines]:[]),
    ...(readingChecks.length?[``, `## IELTS / reading comprehension checks`, ``, ...readingChecks]:[]),
    ...(report.transfer_attempts?.length?[``, `## Transfer challenge`, ``, ...transferLines]:[]),
    ...(report.spelling_evidence?[``, `## Spelling Forge`, ``, `- Total: ${report.spelling_evidence.summary?.total||0}`, `- First correct: ${report.spelling_evidence.summary?.firstCorrect||0}`, `- First incorrect: ${report.spelling_evidence.summary?.firstIncorrect||0}`, `- Retry correct: ${report.spelling_evidence.summary?.retryCorrect||0}`]:[]),
    ...(report.vocabulary_practice_evidence?.summary?.total?[``, `## Smart Vocabulary & Interference Radar`, ``, `- Total recognition items: ${report.vocabulary_practice_evidence.summary.total}`, `- First recognition correct: ${report.vocabulary_practice_evidence.summary.correctFirst}`, `- First recognition incorrect: ${report.vocabulary_practice_evidence.summary.incorrectFirst}`, `- Intra-session micro-rehearsal recovered: ${report.vocabulary_practice_evidence.summary.rehearsedCorrect||0}`, ...(report.vocabulary_practice_evidence.interferenceRadar?.pairs?.length?[`- Confused lexical pairs (${report.vocabulary_practice_evidence.interferenceRadar.totalConfusedPairs}):`, ...report.vocabulary_practice_evidence.interferenceRadar.pairs.slice(0,10).map(p=>`  - ${inline(p.target)} vs ${inline(p.distractor)} (${inline(p.contrastAnchor||p.questionType)})`)]:[])]:[]),
    ...(report.discourse_summary?.analyzedResponses?[
      ``, `## Objective Expression X-Ray（零幻觉客观表达体检）`, ``,
      `- Analyzed written/retelling responses: ${report.discourse_summary.analyzedResponses}`,
      `- Total English output words: ${report.discourse_summary.totalOutputWords}`,
      `- Avg sentence length: ${report.discourse_summary.avgSentenceWords} words · Avg lexical diversity: ${Math.round((report.discourse_summary.avgLexicalDiversity||0)*100)}%`,
      `- Target chunks hit: ${report.discourse_summary.targetHits?.length ? report.discourse_summary.targetHits.join(', ') : 'none'}`,
      `- Target chunks missed: ${report.discourse_summary.targetMissed?.length ? report.discourse_summary.targetMissed.join(', ') : 'none'}`,
      `- Pack vocabulary actively reused: ${report.discourse_summary.packWordsReused?.length ? report.discourse_summary.packWordsReused.join(', ') : 'none'}`,
      `- Cohesion markers detected: ${report.discourse_summary.cohesionMarkersUsed?.length ? report.discourse_summary.cohesionMarkersUsed.join(', ') : 'none'}`,
      `- Note: Deterministic lexical/structural metrics only; NOT an AI grammar or IELTS band score.`
    ]:[]),
    ...(report.reading_analysis?.passage_metrics?.length?[
      ``, `## Reading Passage Metrics（阅读词数与今日核心词覆盖）`, ``,
      ...report.reading_analysis.passage_metrics.map(pm => `- ${inline(pm.title)}: ${pm.wordCount} words · Pack target words covered: ${pm.matchedPackCount}${pm.matchedPackWords?.length ? ` (${pm.matchedPackWords.slice(0,6).join(', ')})` : ''}`)
    ]:[]),
    ...(report.manual_review_marks?.length?[``, `## Manual Review Marks（离线查词手动标为待复习）`, ``, ...report.manual_review_marks.map(m=>`- ${inline(m.word)}（标记时间：${inline(m.markedAt||'未记录')} · 来源：${inline(m.source||'离线查词')}）`)]:[]),
    ...(report.radio_exposure?.clipsPlayed?[``, `## Pocket Radio Passive Exposure（随身电台磨耳朵曝光，不计入 K）`, ``, `- Clips listened: ${report.radio_exposure.clipsPlayed} · Passive listening seconds: ${report.radio_exposure.activeSeconds}s · Channel: ${report.radio_exposure.channelUsed||'default'} (exposure only, countsAsMasteryK: false)`]:[]),
    ...(report.fsrs_shadow?[
      ``, `## FSRS 6.3.2 Shadow Stability（独立回忆稳定度影子调度）`, ``,
      `- Qualified independent recall events: ${report.fsrs_shadow.qualifiedIndependentEvents||0} (excluded choice/prompted/unrated: ${report.fsrs_shadow.excludedNonIndependentOrUnrated||0})`,
      `- Tracked cards: ${report.fsrs_shadow.trackedCards||0} · Avg stability: ${report.fsrs_shadow.avgStabilityDays||0} days · High-risk/due: ${report.fsrs_shadow.highRiskCount||0}`
    ]:[]),
    ``, `## Review recommendations`, ``, `- Due tomorrow: ${(report.review_items?.due_tomorrow || []).length}`,
    `- Needs practice: ${(report.review_items?.needing_practice || []).length}`, `- Review soon: ${(report.review_items?.review_soon || []).length}`, `- Stronger recall: ${(report.review_items?.stronger_recall || []).length}`, ``,
    `## Central Immortal Aperture handoff`, ``,
    `请中央仙窍（Gemini）处理这份言道修炼殿 ${report.app_version||APP_VERSION} 学习战报：1）先按 report_id 和 session_id 去重，避免重复录入；2）将真实训练时间、K/V/N 与独立产出证据增量同步至 Google Sheets 唯一成长数据库，并将正式战报归档至 Google Drive 及更新重要信息墙；3）结合本战报中的「顽固易混词对雷达」「零幻觉客观表达体检（未命中词块）」与「FSRS 6.3.2 高风险到期词」，按 YANDAO-PACK-GEN-11.0 规范生成下一份单 ZIP 学习包。所有写入必须回读验证，触控选择题与微回炉不得冒充 K，严禁凭空填补学习记录。`
  ];
  return lines.join('\n');
}

export function makeCSV(rows,columns){
  const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
  return '\uFEFF'+[columns.map(q).join(','),...rows.map(row=>columns.map(c=>q(row[c])).join(','))].join('\r\n');
}


export const FSRS_DEFAULT_PARAMS = Object.freeze([
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542
]);

/**
 * Official py-fsrs 6.3.2 compatible shadow scheduler.
 * Only accepts verified independent retrieval events (never multiple-choice recognition).
 */
export function fsrsShadowStep(cardState = null, ratingKey = 'K', reviewedAt = new Date(), { parameters = FSRS_DEFAULT_PARAMS, desiredRetention = 0.9 } = {}) {
  const ratingMap = { N: 1, V: 2, K: 3, E: 4 };
  const r = ratingMap[ratingKey] || 3;
  const w = parameters;
  const decay = -w[20];
  const factor = Math.pow(0.9, 1 / decay) - 1;
  const clampD = d => Math.min(10, Math.max(1, d));
  const clampS = st => Math.max(0.001, st);
  const initS = rating => clampS(w[rating - 1]);
  const initD = (rating, clamp = true) => {
    const val = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
    return clamp ? clampD(val) : val;
  };
  const nextInterval = st => Math.max(1, Math.min(36500, Math.round((st / factor) * (Math.pow(desiredRetention, 1 / decay) - 1))));
  const nowDate = reviewedAt instanceof Date ? reviewedAt : new Date(reviewedAt);

  if (!cardState || !cardState.stability || !cardState.difficulty || !cardState.lastReviewAt) {
    const stability = initS(r);
    const difficulty = initD(r, true);
    const intervalDays = r === 1 ? 1 : r === 2 ? Math.max(1, Math.round(nextInterval(stability) * 0.6)) : nextInterval(stability);
    const dueAt = new Date(nowDate.getTime() + intervalDays * 86400000).toISOString();
    return {
      stability: Number(stability.toFixed(4)),
      difficulty: Number(difficulty.toFixed(4)),
      retrievability: 1,
      intervalDays,
      lastReviewAt: nowDate.toISOString(),
      dueAt,
      reps: 1,
      model: 'fsrs-6.3.2-shadow'
    };
  }

  const lastDate = new Date(cardState.lastReviewAt);
  const elapsedDays = Math.max(0, Math.floor((nowDate.getTime() - lastDate.getTime()) / 86400000));
  const retrievability = Math.pow(1 + (factor * elapsedDays) / cardState.stability, decay);

  let nextS;
  if (elapsedDays < 1) {
    let inc = Math.exp(w[17] * (r - 3 + w[18])) * Math.pow(cardState.stability, -w[19]);
    if (r >= 2) inc = Math.max(1, inc);
    nextS = clampS(cardState.stability * inc);
  } else if (r === 1) {
    const longTerm = w[11] * Math.pow(cardState.difficulty, -w[12]) * (Math.pow(cardState.stability + 1, w[13]) - 1) * Math.exp((1 - retrievability) * w[14]);
    const shortTerm = cardState.stability / Math.exp(w[17] * w[18]);
    nextS = clampS(Math.min(longTerm, shortTerm));
  } else {
    const hardPenalty = r === 2 ? w[15] : 1;
    const easyBonus = r === 4 ? w[16] : 1;
    nextS = clampS(cardState.stability * (1 + Math.exp(w[8]) * (11 - cardState.difficulty) * Math.pow(cardState.stability, -w[9]) * (Math.exp((1 - retrievability) * w[10]) - 1) * hardPenalty * easyBonus));
  }

  const d0Easy = initD(4, false);
  const deltaD = -(w[6] * (r - 3));
  const damped = cardState.difficulty + ((10 - cardState.difficulty) * deltaD) / 9;
  const nextD = clampD(w[7] * d0Easy + (1 - w[7]) * damped);
  const intervalDays = r === 1 ? 1 : nextInterval(nextS);
  const dueAt = new Date(nowDate.getTime() + intervalDays * 86400000).toISOString();

  return {
    stability: Number(nextS.toFixed(4)),
    difficulty: Number(nextD.toFixed(4)),
    retrievability: Number(retrievability.toFixed(4)),
    intervalDays,
    lastReviewAt: nowDate.toISOString(),
    dueAt,
    reps: Number(cardState.reps || 1) + 1,
    model: 'fsrs-6.3.2-shadow'
  };
}

export function replayFsrsShadowHistory(attempts = [], asOf = new Date()) {
  const asOfTime = (asOf instanceof Date ? asOf : new Date(asOf)).getTime();
  const cards = new Map();
  const seenAttemptIds = new Set();
  let qualifiedEvents = 0;
  let excludedEvents = 0;

  for (const row of (Array.isArray(attempts) ? attempts : [])) {
    if (!row || row.skipped) { excludedEvents++; continue; }
    const rating = row.rating || row.status;
    if (!['K', 'V', 'N'].includes(rating)) { excludedEvents++; continue; }
    const promptUsed = Boolean(row.prompt_used || row.promptUsed || row.viewed_chinese || row.viewedChinese);
    const viewedAnswer = Boolean(row.viewed_answer || row.viewedAnswer || row.reference_viewed || row.referenceViewed);
    const evType = String(row.evidence_type || '');
    if (
      promptUsed || viewedAnswer ||
      evType === 'recognition_only' ||
      evType === 'passive_exposure' ||
      evType === 'voice_recording' ||
      evType === 'radio_moment' ||
      evType === 'user_self_reported_comprehension' ||
      row.recordingOnly === true
    ) {
      excludedEvents++;
      continue;
    }
    const rawAns = String(row.answer ?? row.firstAnswer ?? row.first_answer ?? row.user_answer ?? '').trim();
    const hasExplicitBlankAnswer = (row.answer !== undefined && !rawAns) || (row.firstAnswer !== undefined && !String(row.firstAnswer).trim());
    const hasExplicitIndependentFlags = (row.prompt_used === false || row.promptUsed === false) && (row.viewed_answer === false || row.viewedAnswer === false);
    const hasIndependentCheck = Boolean(row.initial_check && row.initial_check.status && row.initial_check.status !== 'blank');
    if (evType === 'self_rated_only' || (hasExplicitBlankAnswer && !hasIndependentCheck) || (!rawAns && !hasIndependentCheck && !hasExplicitIndependentFlags && evType !== 'independent_retrieval')) {
      excludedEvents++;
      continue;
    }
    const stamp = row.attempt_timestamp || row.at;
    if (!stamp) { excludedEvents++; continue; }
    const timeMs = new Date(stamp).getTime();
    if (!Number.isFinite(timeMs) || timeMs > asOfTime + 60000) { excludedEvents++; continue; }
    const itemId = String(row.item_id || row.itemId || '').trim();
    if (!itemId) { excludedEvents++; continue; }
    const attemptKey = String(row.attempt_id || row.attemptId || row.id || `${itemId}::${timeMs}`);
    if (seenAttemptIds.has(attemptKey)) {
      excludedEvents++;
      continue;
    }
    seenAttemptIds.add(attemptKey);
    qualifiedEvents++;
    const prior = cards.get(itemId) || null;
    cards.set(itemId, fsrsShadowStep(prior, rating, new Date(timeMs)));
  }

  const states = {};
  let dueCount = 0;
  for (const [id, st] of cards.entries()) {
    states[id] = st;
    if (new Date(st.dueAt).getTime() <= asOfTime) dueCount++;
  }
  const stabilities = Object.values(states).map(s => Number(s.stability || 0)).filter(n => n > 0);
  const avgStabilityDays = stabilities.length ? Number((stabilities.reduce((a, b) => a + b, 0) / stabilities.length).toFixed(2)) : 0;
  const highRiskCount = Object.values(states).filter(s => Number(s.retrievability || 1) < 0.85 || new Date(s.dueAt).getTime() <= asOfTime).length;
  return {
    model: 'py-fsrs-6.3.2-shadow',
    qualifiedIndependentEvents: qualifiedEvents,
    excludedNonIndependentOrUnrated: excludedEvents,
    trackedCards: cards.size,
    shadowDueCount: dueCount,
    avgStabilityDays,
    highRiskCount,
    cards: states
  };
}
