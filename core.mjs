/** English Cultivation: pure, testable data transforms. No network or private data. */
export const VERSION = 4;
export const APP_VERSION = '3.2.0';
export const REPORT_SCHEMA_VERSION = 1;
export const REVIEW_DAYS = { K: 7, V: 3, N: 1 };
export const REQUIRED_WORD_COLUMNS = ['Item_ID','English_Target','Original_Example_EN'];
const clean = value => String(value ?? '').trim();

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
function baseRecord(item) {
  const importedAt = item.importedAt || item.createdAt || new Date().toISOString(); return { status:'UNTESTED', attempts:0, lastAt:null, dueAt:null, createdAt:importedAt, importedAt, ...item };
}
export function recordsFromCSV(raw, { includeExamples = true, source = 'Imported CSV' } = {}) {
  const parsed = parseCSV(raw); const type = detectCSVType(parsed.headers);
  const items = []; const errors = [];
  parsed.records.forEach((r, i) => {
    try {
      if (type === 'word') {
        const id = clean(r.Item_ID); const target = clean(r.English_Target); const example = clean(r.Original_Example_EN);
        if (!id || !target || !example) throw Error('Item ID, target and English example are required.');
        items.push(baseRecord({ id:`w:${id}:${stableHash(normalized(target+'|'+example))}`, sourceItemId:id, kind:'word', contentType:'Words', group:clean(r.Group) || 'Vocabulary', target, cue:clean(r.Diagnostic_Cue_ZH), example, source, evidence:clean(r.Evidence_Group), tags:clean(r.Tags||r.Tag||r.Topic).split(/[;|]/).map(clean).filter(Boolean) }));
        if (includeExamples && example.length >= 12 && example.length <= 400) items.push(baseRecord({ id:`s:${stableHash(normalized(example))}`, kind:'sentence', contentType:'Sentences', text:example, group:clean(r.Group) || 'Examples', source:`${source} · ${id}` }));
      } else {
        const sentence = clean(r.sentence);
        if (sentence.length < 10 || sentence.length > 800) throw Error('Sentence must be 10–800 characters.');
        items.push(baseRecord({ id:`s:${stableHash(normalized(sentence))}`, kind:'sentence', contentType:'Sentences', text:sentence, source:clean(r.source) || source, group:clean(r.topic) || 'Sentences', tags:clean(r.tags||r.Tags||r.topic).split(/[;|]/).map(clean).filter(Boolean) }));
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
    seen.add(key);results.push(baseRecord({id:`s:${stableHash(key)}`,kind:'sentence',contentType:'Reading Materials',text:s,source,group:'Reading', tags:['Reading Materials']}));
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

export function sentenceClozeParts(sentence) {
  const text = String(sentence || '').trim();
  const matches = [...text.matchAll(/\b[A-Za-z][A-Za-z'-]*\b/g)];
  if (matches.length < 6) return null;
  const index = Math.min(matches.length - 2, Math.max(2, Math.floor(matches.length * 0.6)));
  const match = matches[index];
  return {question:`${text.slice(0, match.index)}_____ ${text.slice(match.index + match[0].length)}`.replace(/\s+/g,' ').trim(), answer:match[0]};
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
        items.push(baseRecord({id:`w:pack:${stableHash(packId+'|'+sourceId)}`,sourceItemId:sourceId,packId,packTitle,kind:'word',contentType:'Words',target,example,cue:clean(raw.cue||raw.hint_zh),group:clean(raw.group)||'Daily pack',source:sourceName,evidence:clean(raw.evidence),tags:(Array.isArray(raw.tags)?raw.tags:clean(raw.tags).split(/[;|]/)).map(clean).filter(Boolean),importedAt}));
      } else {
        const text=clean(raw.text||raw.sentence||raw.english); if(text.length<10||text.length>800) throw Error('sentence 长度需为 10–800 个字符。');
        const sourceId=clean(raw.id||raw.item_id)||`${packId}:${index+1}`;
        items.push(baseRecord({id:`s:pack:${stableHash(packId+'|'+sourceId+'|'+normalized(text))}`,sourceItemId:sourceId,packId,packTitle,kind:'sentence',contentType:'Sentences',text,source:sourceName,group:clean(raw.group)||'Daily pack',tags:(Array.isArray(raw.tags)?raw.tags:clean(raw.tags).split(/[;|]/)).map(clean).filter(Boolean),importedAt}));
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
  if (status === 'N') intervalDays = 1;
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
  return validateBackup({version:VERSION, items, attempts, sessions, reports:[], activeSession:null, settings:{duration:Number(legacy.settings?.goalMinutes)||20, speechRate:.9, theme:'system', chineseHints:true, retryAfterError:true}});
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
  return {version:VERSION,items:value.items,attempts:value.attempts,sessions:value.sessions,reports:Array.isArray(value.reports)?value.reports:[],dailyPack:value.dailyPack||null,activeSession:null,settings:{duration:20,speechRate:.9,theme:'system',chineseHints:true,retryAfterError:true,...(value.settings||{})}};
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
    `- Rated attempts: ${report.total_rated_attempts}`, `- Skipped items: ${report.skipped_items}`, `- K / V / N: ${r.K} / ${r.V} / ${r.N}`, ``,
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
