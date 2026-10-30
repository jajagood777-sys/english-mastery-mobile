/** English Mastery: pure, testable data transforms. No network or private data. */
export const VERSION = 2;
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
  return { status:'UNTESTED', attempts:0, lastAt:null, dueAt:null, createdAt:new Date().toISOString(), ...item };
}
export function recordsFromCSV(raw, { includeExamples = true, source = 'Imported CSV' } = {}) {
  const parsed = parseCSV(raw); const type = detectCSVType(parsed.headers);
  const items = []; const errors = [];
  parsed.records.forEach((r, i) => {
    try {
      if (type === 'word') {
        const id = clean(r.Item_ID); const target = clean(r.English_Target); const example = clean(r.Original_Example_EN);
        if (!id || !target || !example) throw Error('Item ID, target and English example are required.');
        items.push(baseRecord({ id:`w:${id}:${stableHash(normalized(target+'|'+example))}`, sourceItemId:id, kind:'word', group:clean(r.Group) || 'Vocabulary', target, cue:clean(r.Diagnostic_Cue_ZH), example, source, evidence:clean(r.Evidence_Group) }));
        if (includeExamples && example.length >= 12 && example.length <= 400) items.push(baseRecord({ id:`s:${stableHash(normalized(example))}`, kind:'sentence', text:example, group:clean(r.Group) || 'Examples', source:`${source} · ${id}` }));
      } else {
        const sentence = clean(r.sentence);
        if (sentence.length < 10 || sentence.length > 800) throw Error('Sentence must be 10–800 characters.');
        items.push(baseRecord({ id:`s:${stableHash(normalized(sentence))}`, kind:'sentence', text:sentence, source:clean(r.source) || source, group:clean(r.topic) || 'Sentences' }));
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
    seen.add(key);results.push(baseRecord({id:`s:${stableHash(key)}`,kind:'sentence',text:s,source,group:'Reading'}));
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
export function nextDue(status, now = new Date()) {
  if (!REVIEW_DAYS[status]) throw Error('Invalid K/V/N status.');
  const start = new Date(now);return new Date(start.getTime()+REVIEW_DAYS[status]*86400000).toISOString();
}
export function isDue(item, now=Date.now()) {return !!item.dueAt && new Date(item.dueAt).getTime() <= now;}
export function buildQueue(items,mode='mixed',now=Date.now()) {
  const f=items.filter(i=>mode==='mixed'||i.kind===(mode==='words'?'word':'sentence'));
  return [...f].sort((a,b)=>{
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
    items.push(baseRecord({id, sourceItemId:oldId, kind:'word', target, example, cue:clean(old.cue), group:clean(old.group)||'Legacy vocabulary', source:'English Mastery v1', evidence:clean(old.evidence), status:safeStatus(last?.rating || old.status), attempts:attempts.length, lastAt:safeDate(last?.at), dueAt:safeDate(old.nextReview)}));
  }
  for (const old of legacy.sentences) {
    const oldId = String(old.id || '').trim();
    const text = clean(old.text || old.sentence);
    if (!oldId || !text) continue;
    const id = `s:legacy:${stableHash(normalized(text))}`;
    sentenceIds.set(oldId, id);
    const attempts = attemptsFor(oldId, 'sentence');
    const last = attempts.at(-1);
    items.push(baseRecord({id, kind:'sentence', text, source:clean(old.source)||'English Mastery v1', group:clean(old.topic)||'Legacy sentences', status:safeStatus(last?.rating || old.status), attempts:attempts.length, lastAt:safeDate(last?.at), dueAt:safeDate(old.nextReview)}));
  }
  const attempts = legacy.history.map((h, index) => {
    const itemId = h.type === 'word' ? wordIds.get(String(h.itemId)) : sentenceIds.get(String(h.itemId));
    if (!itemId || !['K','V','N'].includes(h.rating)) return null;
    return {id:`a:legacy:${index}:${stableHash(String(h.at||''))}`, sessionId:h.sessionId || null, itemId, kind:h.type, status:h.rating, answer:clean(h.answer), at:safeDate(h.at)||new Date(0).toISOString()};
  }).filter(Boolean);
  const sessions = (Array.isArray(legacy.sessions) ? legacy.sessions : []).map((s, index) => ({id:s.id || `session:legacy:${index}`, startedAt:s.startedAt || null, endedAt:s.endedAt || s.startedAt || null, activeMs:Math.max(0, Number(s.seconds||0)*1000), mode:'legacy', count:Number(s.items||0), words:0, sentences:0, K:0, V:0, N:0}));
  return validateBackup({version:VERSION, items, attempts, sessions, activeSession:null, settings:{duration:Number(legacy.settings?.goalMinutes)||20, speechRate:.9}});
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
  return {version:VERSION,items:value.items,attempts:value.attempts,sessions:value.sessions,activeSession:null,settings:{duration:20,...(value.settings||{})}};
}
export function makeCSV(rows,columns){
  const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
  return '\uFEFF'+[columns.map(q).join(','),...rows.map(row=>columns.map(c=>q(row[c])).join(','))].join('\r\n');
}
