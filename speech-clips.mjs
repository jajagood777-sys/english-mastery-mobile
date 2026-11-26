// V5.5 public/local pre-generated speech clips. Audio is isolated from learner records.
const DB_NAME='english-cultivation-audio-v1', STORE='clips';
const PUBLIC_MANIFEST='./speech-assets/speech-manifest.json';
let remoteManifestPromise=null;
export function normalizeSpeechText(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export function stripSpeechMarkdown(value){return normalizeSpeechText(String(value??'').replace(/\*\*([^*\n]{1,80})\*\*/g,'$1'));}
export function splitSpeechSegments(text,max=260){const clean=String(text??'').normalize('NFKC').replace(/\r/g,'').trim();if(!clean)return [];const out=[];for(const paragraph of clean.split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean)){const sentences=paragraph.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[paragraph];let segment='';for(const sentence of sentences){const part=sentence.trim();if(!part)continue;if(segment&&segment.length+part.length+1>max){out.push(segment);segment='';}if(part.length<=max)segment=segment?`${segment} ${part}`:part;else for(const word of part.split(/\s+/)){if(segment&&segment.length+word.length+1>max){out.push(segment);segment='';}segment=segment?`${segment} ${word}`:word;}}if(segment)out.push(segment);}return out;}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export async function speechTextHash(text){const bytes=new TextEncoder().encode(normalizeSpeechText(text));const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function putClip(row){let nextRow=row;if(row?.blob&&!row?.bytes&&typeof row.blob.arrayBuffer==='function'){try{const buf=await row.blob.arrayBuffer();if(buf&&buf.byteLength>=64){nextRow={...row,bytes:buf,mimeType:row.mimeType||row.blob.type||'audio/mpeg',blob:null};}}catch{}}const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put(nextRow);tx.oncomplete=()=>{database.close();resolve();};tx.onerror=()=>{database.close();reject(tx.error);};tx.onabort=()=>{database.close();reject(tx.error);};});}
export async function hasLocalSpeechClip(text,voice='af_heart'){if(!text||typeof indexedDB==='undefined')return false;try{const key=voice+':'+await speechTextHash(text);const database=await db();const count=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).count(key);req.onsuccess=()=>resolve(req.result||0);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});return count>0;}catch{return false;}}
export async function deleteSpeechClip(text,voice='af_heart'){if(!text||typeof indexedDB==='undefined')return false;try{const key=voice+':'+await speechTextHash(text);const database=await db();return await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>{database.close();resolve(true);};tx.onerror=()=>{database.close();resolve(false);};});}catch{return false;}}
export async function speechCoverage(tasks,{voice='af_heart'}={}){const list=Array.isArray(tasks)?tasks.filter(x=>x?.text):[];let remote=new Set(),local=new Set();try{const manifest=await findRemoteManifest();remote=new Set((manifest?.clips||[]).filter(x=>x.voice===voice).map(x=>x.sha256));}catch{}try{const database=await db();local=new Set(await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAllKeys();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();}));}catch{}const byCategory={};let available=0;for(const row of list){const hash=await speechTextHash(row.text),ok=remote.has(hash)||local.has(`${voice}:${hash}`);if(ok)available++;const category=row.category||'other';byCategory[category]??={total:0,available:0};byCategory[category].total++;if(ok)byCategory[category].available++;}return {total:list.length,available,missing:list.length-available,byCategory};}
async function findRemoteManifest(){if(!remoteManifestPromise)remoteManifestPromise=fetch(PUBLIC_MANIFEST,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(`公开音频清单请求失败（HTTP ${r.status}）`);return r.json();}).catch(()=>null);return remoteManifestPromise;}
function rowToAudioBlob(row){if(row?.bytes&&row.bytes.byteLength>=64)return new Blob([row.bytes],{type:row.mimeType||'audio/mpeg'});if(row?.blob?.size>=64)return row.blob;return null;}
async function getLocalClipByKey(key){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});}
async function findLocalClipByStrippedMarkdown(text,voice){const clean=stripSpeechMarkdown(text);if(!clean)return null;const database=await db();const rows=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(Array.isArray(req.result)?req.result:[]);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});for(const row of rows){if(voice&&row?.voice&&row.voice!==voice)continue;if(stripSpeechMarkdown(row?.text||'')===clean)return row;}return null;}
export async function getSpeechClip(text,voice){const key=voice+':'+await speechTextHash(text);const local=await getLocalClipByKey(key);const exactBlob=rowToAudioBlob(local);if(exactBlob)return exactBlob;
  const stripped=stripSpeechMarkdown(text);
  if(stripped&&stripped!==normalizeSpeechText(text)){const cleanKey=voice+':'+await speechTextHash(stripped);const cleanLocal=await getLocalClipByKey(cleanKey);const cleanBlob=rowToAudioBlob(cleanLocal);if(cleanBlob)return cleanBlob;}
  const fuzzyLocal=await findLocalClipByStrippedMarkdown(text,voice);const fuzzyBlob=rowToAudioBlob(fuzzyLocal);if(fuzzyBlob)return fuzzyBlob;
  const remote=await findRemoteClip(text,voice);if(!remote)return null;const response=await fetch(new URL(remote.file,new URL(PUBLIC_MANIFEST,location.href)),{cache:'no-cache'});if(!response.ok)throw Error(`公开音频请求失败（HTTP ${response.status}）`);const blob=await response.blob();if(!blob.size||blob.size>25*1024*1024)throw Error('公开音频大小无效');if(remote.bytes&&blob.size!==Number(remote.bytes))throw Error('公开音频大小校验失败');if(remote.fileSha256){const digest=await speechBlobHash(blob);if(digest!==remote.fileSha256)throw Error('公开音频校验失败');}await putClip({key,blob,text:normalizeSpeechText(text),voice,created:Date.now(),source:'public-pages',manifest:PUBLIC_MANIFEST});return blob;}
async function speechBlobHash(blob){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
async function findRemoteClip(text,voice){const manifest=await findRemoteManifest();if(!manifest||manifest.version!==1||!Array.isArray(manifest.clips))return null;const hash=await speechTextHash(text);return manifest.clips.find(item=>item.voice===voice&&item.sha256===hash&&typeof item.file==='string'&&/^[A-Za-z0-9._-]+\.mp3$/i.test(item.file))||null;}
export async function unpackSpeechZip(file){
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let eocd=-1,totalUncompressed=0;const names=new Set();
 for(let i=bytes.length-22;i>=0&&i>bytes.length-22-65535;i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw Error('ZIP缺少有效目录。');const count=view.getUint16(eocd+10,true),central=view.getUint32(eocd+16,true),out=[];if(count>5000)throw Error('ZIP文件数量超过安全限制。');let at=central;
 for(let i=0;i<count;i++){if(view.getUint32(at,true)!==0x02014b50)throw Error('ZIP目录损坏。');const method=view.getUint16(at+10,true),expectedCrc=view.getUint32(at+16,true),compressed=view.getUint32(at+20,true),uncompressed=view.getUint32(at+24,true),nameLen=view.getUint16(at+28,true),extraLen=view.getUint16(at+30,true),commentLen=view.getUint16(at+32,true),local=view.getUint32(at+42,true);const name=new TextDecoder().decode(bytes.slice(at+46,at+46+nameLen));at+=46+nameLen+extraLen+commentLen;if(!name||name.endsWith('/'))continue;if(name.includes('..')||name.includes('\\')||name.startsWith('/')||/^[A-Za-z]:/.test(name))throw Error('ZIP包含不安全路径。');const base=name.split('/').pop();if(names.has(base))throw Error('ZIP包含重复文件名。');names.add(base);if(view.getUint32(local,true)!==0x04034b50)throw Error('ZIP文件项损坏。');const localName=view.getUint16(local+26,true),localExtra=view.getUint16(local+28,true),start=local+30+localName+localExtra;if(start+compressed>bytes.length)throw Error('ZIP文件项被截断。');if(uncompressed>25*1024*1024||totalUncompressed+uncompressed>100*1024*1024)throw Error('ZIP解压大小超过安全限制。');const packed=bytes.slice(start,start+compressed);let data;if(method===0)data=packed;else if(method===8){if(typeof DecompressionStream==='undefined')throw Error('此浏览器不支持ZIP解压，请选择JSON及音频文件。');const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));data=new Uint8Array(await new Response(stream).arrayBuffer());}else continue;if(uncompressed&&data.byteLength!==uncompressed)throw Error('ZIP文件大小校验失败。');if(crc32(data)!==expectedCrc)throw Error(`ZIP文件完整性校验失败：${base}`);totalUncompressed+=data.byteLength;const type=/\.json$/i.test(name)?'application/json':'audio/mpeg';out.push(new File([data],base,{type}));}
 return out;
}
async function expandFiles(input){const list=Array.from(input||[]);if(list.length===1&&/\.zip$/i.test(list[0].name))return unpackSpeechZip(list[0]);return list;}
export function normalizeSpeechManifestPayload(parsed){
  if(Array.isArray(parsed))return {version:1,clips:parsed};
  if(parsed&&typeof parsed==='object'&&Array.isArray(parsed.clips)&&(parsed.version===1||parsed.version==='1'||parsed.version===undefined))return {...parsed,version:1,clips:parsed.clips};
  return null;
}
export async function importSpeechClips(files,{onProgress=()=>{}}={}){
  const list=await expandFiles(files),manifest=list.find(f=>f.name==='speech-manifest.json'||f.name==='manifest.json');
  if(!manifest)throw Error('请选择包含 speech-manifest.json 的音频文件集合。');
  const normalizedManifest=normalizeSpeechManifestPayload(JSON.parse(await manifest.text()));
  if(!normalizedManifest)throw Error('音频清单格式不受支持。');
  const byName=new Map(list.map(f=>[f.name,f])),total=normalizedManifest.clips.length,manifestNames=new Set(),byCategory={};
  let imported=0,skipped=0,missing=0,totalDurationSec=0,totalBytes=0;
  const staged=[];
  for(const item of normalizedManifest.clips){
    const category=String(item.category||'other');
    const coverage=byCategory[category]??={total:0,imported:0,missing:0};
    coverage.total++;
    const voice=item.voice||'af_heart';
    if(!['af_heart','af_bella'].includes(voice)||typeof item.text!=='string'||!item.text.trim())throw Error('音频清单包含无效文字或音色。');
    const rawFile=String(item.file||'').trim();
    if(rawFile.includes('..')||rawFile.includes('\\'))throw Error(`音频清单包含不安全文件名：${rawFile}`);
    const filename=rawFile.split('/').pop()||'';
    if(!/^[A-Za-z0-9._-]+\.(mp3|wav|m4a|aac)$/i.test(filename))throw Error(`音频清单包含不安全文件名：${filename}`);
    if(manifestNames.has(filename))throw Error(`音频清单包含重复文件名：${filename}`);
    manifestNames.add(filename);
    const file=byName.get(filename);
    if(!file){missing++;coverage.missing++;continue;}
    if(file.size>25*1024*1024)throw Error(`音频文件过大：${filename}`);
    if(file.size<64)throw Error(`音频文件过小或损坏：${filename}`);
    const hash=await speechTextHash(item.text);
    if(item.sha256!==hash)throw Error(`音频文字校验失败：${filename}`);
    if(item.bytes&&Number(item.bytes)!==file.size)throw Error(`音频大小校验失败：${filename}`);
    const actualFileSha=await speechBlobHash(file);
    if(item.fileSha256&&actualFileSha!==item.fileSha256)throw Error(`音频内容校验失败：${filename}`);
    const key=voice+':'+hash;
    let alreadySame=false;
    try{const prev=await getSpeechClipRecord(item.text,voice);if(prev&&prev.fileSha256&&prev.fileSha256===actualFileSha)alreadySame=true;}catch{}
    if(alreadySame){
      skipped++;coverage.skipped=(coverage.skipped||0)+1;totalDurationSec+=Number(item.durationSeconds||0);totalBytes+=file.size;
      continue;
    }
    staged.push({
      category,coverage,item,file,actualFileSha,
      record:{
        key,blob:file,text:normalizeSpeechText(item.text),voice,created:Date.now(),
        source:item.source||'daily_pack',packId:item.packId||normalizedManifest.pack_id||'',manifest:manifest.name,
        durationSeconds:Number(item.durationSeconds||0),
        segments:Array.isArray(item.segments)?item.segments:[],
        episodeId:item.episodeId||null,segmentIds:Array.isArray(item.segmentIds)?item.segmentIds:[],
        engine:item.engine||normalizedManifest.engine||'',title:item.title||'',fileSha256:actualFileSha
      }
    });
  }
  for(const entry of staged){
    await putClip(entry.record);
    imported++;entry.coverage.imported++;totalDurationSec+=Number(entry.item.durationSeconds||0);totalBytes+=entry.file.size;
    onProgress({imported,skipped,total});
  }
  return {imported,skipped,missing,total,totalDurationSec,totalBytes,byCategory};
}
export function createClipPlayer({onStatus=()=>{},onStateChange=()=>{}}={}){
 let audio=null,url=null,token=0,paused=false,active=false,waitingResolve=null;
 function emitState(){try{onStateChange({playing:isPlaying(),paused:isPaused()});}catch{}}
 function isPlaying(){return Boolean(active&&audio&&!audio.paused&&!audio.ended&&!paused);}
 function isPaused(){return Boolean(active&&audio&&audio.paused&&!audio.ended&&paused);}
 function clearAudio(){active=false;if(audio){audio.pause();audio.removeAttribute('src');audio.load();}if(url){URL.revokeObjectURL(url);url=null;}const tray=document.getElementById('imported-speech-tray');if(tray)tray.hidden=true;emitState();}
 function stop(){token++;paused=false;waitingResolve?.('cancelled');waitingResolve=null;clearAudio();}
 function mount(blob){clearAudio();if(!audio){audio=document.createElement('audio');audio.controls=true;audio.className='neural-audio-player';audio.setAttribute('aria-label','自然美式女声音频');audio.addEventListener('play',()=>{paused=false;emitState();});audio.addEventListener('pause',()=>{emitState();});audio.addEventListener('ended',()=>{active=false;emitState();});let tray=document.getElementById('imported-speech-tray');if(!tray){tray=document.createElement('section');tray.id='imported-speech-tray';tray.className='neural-audio-tray';document.body.append(tray);}tray.replaceChildren(audio);}url=URL.createObjectURL(blob);audio.src=url;audio.load();active=true;const tray=document.getElementById('imported-speech-tray');if(tray)tray.hidden=false;return audio;}
 async function playBlob(blob,wait=false){const player=mount(blob);if(paused){emitState();return 'paused';}if(!wait){try{await player.play();emitState();}catch{active=false;emitState();onStatus('音频已就绪，请点击播放器▶播放');return 'ready';}return 'playing';}const ended=new Promise(resolve=>{let done=false;const finish=status=>{if(done)return;done=true;waitingResolve=null;player.removeEventListener('error',onError);if(status!=='paused')active=false;emitState();resolve(status);};const onError=()=>finish('error');waitingResolve=finish;player.addEventListener('ended',()=>finish('playing'),{once:true});player.addEventListener('error',onError,{once:true});});try{await player.play();emitState();}catch{waitingResolve=null;active=false;emitState();onStatus('音频已就绪，请点击播放器▶播放');return 'ready';}return ended;}
 return {stop,isPlaying,isPaused,pause(){paused=true;audio?.pause();emitState();},resume(){paused=false;if(audio)void audio.play().then(()=>emitState()).catch(()=>onStatus('请手动点击音频播放器继续'));},async speak(text,voice){const id=++token;const blob=await getSpeechClip(text,voice);if(id!==token)return 'cancelled';if(!blob)return 'missing';return playBlob(blob);},async speakSegments(segments,voice){const list=Array.from(segments||[]).filter(Boolean),id=++token;if(!list.length)return false;for(let index=0;index<list.length;index++){if(id!==token)return 'cancelled';const blob=await getSpeechClip(list[index],voice);if(id!==token)return 'cancelled';if(!blob)return 'missing';onStatus(`正在播放自然女声第 ${index+1} / ${list.length} 段`);const result=await playBlob(blob,true);if(result==='cancelled'||id!==token)return 'cancelled';if(result==='paused')return 'paused';if(result!=='playing')return result;}return 'playing';}};
}


export async function getSpeechClipRecord(text,voice='af_heart'){
  if(!text||typeof indexedDB==='undefined')return null;
  try{
    const key=voice+':'+await speechTextHash(text);
    const database=await db();
    const local=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});
    if(!local)return null;
    const blob=(local.bytes&&local.bytes.byteLength>=64)?new Blob([local.bytes],{type:local.mimeType||'audio/mpeg'}):(local.blob?.size>=64?local.blob:null);
    if(!blob)return null;
    return {
      blob,
      bytesLen:local.bytes?.byteLength||local.blob?.size||0,
      durationSeconds:Number(local.durationSeconds||0),
      segments:Array.isArray(local.segments)?local.segments:[],
      episodeId:local.episodeId||null,
      segmentIds:Array.isArray(local.segmentIds)?local.segmentIds:[],
      engine:local.engine||'onnxruntime-q8-cmudict-ipa',
      voice:local.voice||voice,
      source:local.source||'import',
      title:local.title||'',
      fileSha256:local.fileSha256||''
    };
  }catch{return null;}
}
export async function putRawAudioBlob(audioSha256,bytesOrBlob,mimeType='audio/mpeg',meta={}){
  if(!audioSha256||typeof indexedDB==='undefined')return false;
  let buf=null;
  if(bytesOrBlob instanceof ArrayBuffer)buf=bytesOrBlob;
  else if(ArrayBuffer.isView(bytesOrBlob))buf=bytesOrBlob.buffer.slice(bytesOrBlob.byteOffset,bytesOrBlob.byteOffset+bytesOrBlob.byteLength);
  else if(bytesOrBlob&&typeof bytesOrBlob.arrayBuffer==='function')buf=await bytesOrBlob.arrayBuffer();
  if(!buf||buf.byteLength<64)throw Error('音频文件过小或已损坏。');
  const segments=Array.isArray(meta?.segments)?meta.segments:[];
  await putClip({key:'raw:'+audioSha256,bytes:buf,mimeType:mimeType||'audio/mpeg',blob:null,voice:'original',source:meta?.channel||'my_audio',segments,subtitleName:meta?.subtitleName||'',created:Date.now()});
  return true;
}
export async function getRawAudioRecord(audioSha256){
  if(!audioSha256||typeof indexedDB==='undefined')return null;
  try{
    const database=await db();
    const local=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get('raw:'+audioSha256);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});
    const blob=local?.bytes&&local.bytes.byteLength>=64?new Blob([local.bytes],{type:local.mimeType||'audio/mpeg'}):(local?.blob?.size>=64?local.blob:null);
    if(!blob)return null;
    return {blob,segments:Array.isArray(local.segments)?local.segments:[],mimeType:local.mimeType||'audio/mpeg',subtitleName:local.subtitleName||''};
  }catch{return null;}
}
export async function updateRawAudioSegments(audioSha256,segments=[],subtitleName=''){
  if(!audioSha256||typeof indexedDB==='undefined')return false;
  try{
    const database=await db();
    const local=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get('raw:'+audioSha256);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});
    if(!local)return false;
    await putClip({...local,segments:Array.isArray(segments)?segments:[],subtitleName:String(subtitleName||local.subtitleName||''),updatedAt:Date.now()});
    return true;
  }catch{return false;}
}
export async function getRawAudioBlob(audioSha256){
  if(!audioSha256||typeof indexedDB==='undefined')return null;
  try{
    const database=await db();
    const local=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get('raw:'+audioSha256);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});
    if(local?.bytes&&local.bytes.byteLength>=64)return new Blob([local.bytes],{type:local.mimeType||'audio/mpeg'});
    if(local?.blob?.size>=64)return local.blob;
    return null;
  }catch{return null;}
}
export async function deleteRawAudioBlob(audioSha256){
  if(!audioSha256||typeof indexedDB==='undefined')return false;
  try{
    const database=await db();
    return await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).delete('raw:'+audioSha256);tx.oncomplete=()=>{database.close();resolve(true);};tx.onerror=()=>{database.close();resolve(false);};});
  }catch{return false;}
}
export async function hasRawAudioBlob(audioSha256){
  if(!audioSha256||typeof indexedDB==='undefined')return false;
  try{
    const database=await db();
    const count=await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).count('raw:'+audioSha256);req.onsuccess=()=>resolve(req.result||0);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});
    return count>0;
  }catch{return false;}
}

export function isPrunablePackClipRow(row, activePackId = '') {
  if (!row || typeof row !== 'object') return false;
  const key = String(row.key || row.id || '');
  if (!key || key.startsWith('raw:')) return false;
  const src = String(row.source || '');
  if (src === 'my_audio' || src === 'speaking_qa' || src === 'custom_offline') return false;
  const rowPack = String(row.packId || '').trim();
  if (!rowPack) return false;
  if (activePackId && rowPack === activePackId) return false;
  return true;
}

export async function pruneOldPackSpeechClips(activePackId = '') {
  if (typeof indexedDB === 'undefined') return { deleted: 0, preserved: 0 };
  const database = await db();
  try {
    const rows = await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
    const toDelete = rows.filter(r => isPrunablePackClipRow(r, activePackId)).map(r => r.key || r.sha256 || r.id).filter(Boolean);
    if (toDelete.length) {
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        for (const k of toDelete) store.delete(k);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    }
    return { deleted: toDelete.length, preserved: rows.length - toDelete.length };
  } finally {
    database.close();
  }
}
