/** English Cultivation: pure, testable data transforms. No network or private data. */
export const VERSION = 4.1;
export const APP_VERSION = '4.2.0';
export const REPORT_SCHEMA_VERSION = 1;
export const REVIEW_DAYS = { K: 7, V: 3, N: 1 };
export const REQUIRED_WORD_COLUMNS = ['Item_ID','English_Target','Original_Example_EN'];
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

/** Keep the exact reading context when turning an article selection into a study card. */
export function readingContextForSelection(articleText, selectedText) {
  const wanted=normalized(selectedText);
  if(!wanted)return '';
  const paragraphs=String(articleText||'').split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean);
  for(const paragraph of paragraphs) {
    if(!normalized(paragraph).includes(wanted))continue;
    const sentences=paragraph.split(/(?<=[.!?])\s+(?=[“"'A-Z0-9])/);
    return (sentences.find(sentence=>normalized(sentence).includes(wanted))||paragraph).trim();
  }
  return '';
}
/** Stable per-reading card IDs prevent duplicate extraction of identical text. */
export function readingCardId(readingId, selectedText, kind='word') {
  return `${kind==='sentence'?'s':'w'}:reading:${stableHash(normalized(readingId)+'|'+normalized(selectedText))}`;
}
/** Merge backed-up articles without discarding pre-existing local readings. */
export function mergeReadings(existing=[], incoming=[]) {
  const out=Array.isArray(existing)?[...existing]:[];
  const ids=new Set(out.map(item=>item.id).filter(Boolean));
  const texts=new Set(out.map(item=>normalized(item.text)).filter(Boolean));
  for(const reading of (Array.isArray(incoming)?incoming:[])) {
    if(!reading||typeof reading.text!=='string'||!reading.text.trim())continue;
    const key=normalized(reading.text);
    if((reading.id&&ids.has(reading.id))||texts.has(key))continue;
    out.push(reading);
    if(reading.id)ids.add(reading.id);
    texts.add(key);
  }
  return out;
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
  const items = Array.isArray(state?.items) ? state.items : [];
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
export function recordsFromLearningPack(value, {source='Central Immortal Aperture'} = {}) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.items)) throw Error('学习包 JSON 缺少 items 列表。');
  const packId = clean(value.pack_id) || `pack:${stableHash(JSON.stringify(value.items))}`;
  const packTitle = clean(value.title) || '今日学习包';
  const importedAt = new Date().toISOString();
  const items = []; const errors=[];
  value.items.forEach((raw,index)=>{
    try {
      const kind=clean(raw.type||raw.kind).toLowerCase(); const sourceName=clean(raw.source||value.source)||source;
      if (!['word','sentence'].includes(kind)) throw Error('类型必须是 word 或 sentence。');
      if(kind==='word'){
        const target=clean(raw.target||raw.english_target||raw.text), example=clean(raw.example||raw.example_en||raw.sentence);
        if(!target||!example) throw Error('word 项目需要 target 和 example。');
        const sourceId=clean(raw.id||raw.item_id)||`${packId}:${index+1}`;
        items.push(baseRecord({id:`w:pack:${stableHash(packId+'|'+sourceId)}`,sourceItemId:sourceId,packId,packTitle,kind:'word',contentType:'Words',target,example,cue:clean(raw.cue||raw.hint_zh),group:clean(raw.group)||'Daily pack',source:sourceName,evidence:clean(raw.evidence),tags:(Array.isArray(raw.tags)?raw.tags:clean(raw.tags).split(/[;|]/)).map(clean).filter(Boolean),meaningZh:clean(raw.meaning_zh||raw.meaningZh||raw.hint_zh||raw.cue),definitionEn:clean(raw.definition_en||raw.definitionEn),partOfSpeech:clean(raw.part_of_speech||raw.partOfSpeech),collocations:listValue(raw.collocations),acceptedAnswers:listValue(raw.accepted_answers||raw.acceptedAnswers),difficulty:clean(raw.difficulty),learningStage:clean(raw.learning_stage||raw.learningStage)||'new',importedAt}));
      } else {
        const text=clean(raw.text||raw.sentence||raw.english); if(text.length<10||text.length>800) throw Error('sentence 长度需为 10–800 个字符。');
        const sourceId=clean(raw.id||raw.item_id)||`${packId}:${index+1}`;
        items.push(baseRecord({id:`s:pack:${stableHash(packId+'|'+sourceId+'|'+normalized(text))}`,sourceItemId:sourceId,packId,packTitle,kind:'sentence',contentType:'Sentences',text,source:sourceName,group:clean(raw.group)||'Daily pack',clozeTarget:clean(raw.cloze_target||raw.clozeTarget||raw.target),clozeAnswer:clean(raw.cloze_answer||raw.clozeAnswer),tags:(Array.isArray(raw.tags)?raw.tags:clean(raw.tags).split(/[;|]/)).map(clean).filter(Boolean),learningStage:clean(raw.learning_stage||raw.learningStage)||'new',importedAt}));
      }
    } catch (error) { errors.push(`第 ${index+1} 项：${error.message}`); }
  });
  const unique=[]; const seen=new Set();
  for(const item of items){const key=item.kind==='word'?`word|${normalized(item.target)}`:`sentence|${normalized(item.text)}`;if(seen.has(key)){errors.push(`重复项目：${item.sourceItemId||item.id}`);continue;}seen.add(key);unique.push(item);}
  if(!unique.length) throw Error(`学习包没有可导入项目。${errors[0]||''}`);
  return {items:unique,errors,sourceType:'pack',sourceRows:value.items.length,pack:{packId,title:packTitle,createdAt:clean(value.created_at)||null,source:clean(value.source)||source,language:clean(value.language)||'en'}};
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
  const readings=Array.isArray(value.readings)?value.readings:[];
  const items=value.items.map(item=>({...item,learningStage:item.learningStage||((item.attempts||0)>0?'review':'new'),promptCount:Number(item.promptCount||0),viewedAnswerCount:Number(item.viewedAnswerCount||0),acceptedAnswers:listValue(item.acceptedAnswers),collocations:listValue(item.collocations)}));
  return {version:VERSION,items,attempts:value.attempts,sessions:value.sessions,readings,reports:Array.isArray(value.reports)?value.reports:[],dailyPack:value.dailyPack||null,activeSession:null,settings:{duration:20,speechRate:.9,theme:'system',chineseHints:true,retryAfterError:true,newLimit:10,reviewLimit:20,...(value.settings||{})}};
}

export function buildBattleReport({session, attempts, items, timezone='Asia/Shanghai', appVersion=APP_VERSION, now=new Date()}) {
  const itemMap = new Map(items.map(item => [item.id, item]));
  const sessionAttempts = attempts.filter(attempt => attempt.sessionId === session.id);
  const detail = sessionAttempts.map(attempt => {
    const item = itemMap.get(attempt.itemId) || {};
    return {
      attempt_id: attempt.id,
      item_id: attempt.itemId,
      content_type: attempt.kind,
      source: item.source || 'Unknown source',
      prompt_type: attempt.promptType || (attempt.kind === 'word' ? 'cloze' : 'recall'),
      user_answer: attempt.answer || '',
      reference_answer: attempt.referenceAnswer || item.target || item.text || '',
      rating: attempt.status,
      skipped: Boolean(attempt.skipped),
      initial_check: attempt.initial_check || null,
      retry_answer: attempt.retry_answer || '',
      retry_check: attempt.retry_check || null,
      retried_after_error: Boolean(attempt.retried_after_error),
      prompt_used: Boolean(attempt.prompt_used),
      viewed_answer: Boolean(attempt.viewed_answer),
      learning_stage_before: attempt.learning_stage_before || null,
      learning_stage_after: attempt.learning_stage_after || null,
      tags: item.tags || [],
      attempt_timestamp: attempt.at,
      suggested_review_date: item.dueAt || null
    };
  });
  const count = rating => sessionAttempts.filter(attempt => attempt.status === rating).length;
  const words = sessionAttempts.filter(attempt => attempt.kind === 'word').length;
  const sentences = sessionAttempts.filter(attempt => attempt.kind === 'sentence').length;
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
    mode_breakdown: {words, sentences},
    learning_breakdown: {new_items:sessionAttempts.filter(a=>a.learning_stage_before==='new').length, learning_stage_items:sessionAttempts.filter(a=>a.learning_stage_before==='learning').length, review_items:sessionAttempts.filter(a=>['review','long_term'].includes(a.learning_stage_before)).length},
    prompt_stats: {prompted:sessionAttempts.filter(a=>a.prompt_used).length, viewed_answer:sessionAttempts.filter(a=>a.viewed_answer).length, retried_after_error:sessionAttempts.filter(a=>a.retried_after_error).length, first_attempt_independent:sessionAttempts.filter(a=>!a.prompt_used&&!a.viewed_answer).length},
    total_rated_attempts: sessionAttempts.length,
    skipped_items: skipped,
    ratings_summary: {K:count('K'), V:count('V'), N:count('N')},
    attempts: detail,
    review_items: reviewItems,
    next_practice: {priority:['due_tomorrow','needing_practice','review_soon','untested'], source:'local review records'},
    data_quality: {actual_active_time:true, duplicate_attempts_checked:true, semantic_score:false},
    sync_status: 'NOT_SUBMITTED'
  };
}
export function battleReportMarkdown(report) {
  const r = report.ratings_summary || {K:0,V:0,N:0};
  const lines = [
    `# English Cultivation Battle Report`, ``,
    `- Report ID: ${report.report_id}`, `- Session ID: ${report.session_id}`, `- Date: ${report.created_at}`, `- Time zone: ${report.timezone}`,
    `- Active study time: ${report.active_seconds} seconds`, `- Mode: ${report.mode}`, `- Words: ${report.mode_breakdown.words}`, `- Sentences: ${report.mode_breakdown.sentences}`,
    `- Rated attempts: ${report.total_rated_attempts}`, `- Skipped items: ${report.skipped_items}`, `- K / V / N: ${r.K} / ${r.V} / ${r.N}`, `- First independent answers: ${report.prompt_stats?.first_attempt_independent||0}`, `- Prompted answers: ${report.prompt_stats?.prompted||0}`, `- Viewed-answer flows: ${report.prompt_stats?.viewed_answer||0}`, `- Retry-after-error flows: ${report.prompt_stats?.retried_after_error||0}`, ``,
    `## Practice details`, ``, `| 项目 | 类型 | 评价 | 初答 | 检查 | 重练 | 复习 |`, `|---|---|---|---|---|---|---|`,
    ...(report.attempts || []).map(a => `| ${a.item_id} | ${a.content_type} | ${a.rating} | ${(a.user_answer||'').replaceAll('|','\\|').replaceAll('\n',' ')} | ${a.initial_check?.status||''} | ${a.retried_after_error?'是':'否'} | ${a.suggested_review_date||''} |`),
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
