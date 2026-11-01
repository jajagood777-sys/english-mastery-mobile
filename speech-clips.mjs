// V5.5: locally imported, pre-generated speech assets. No model download required.
const DB_NAME='english-cultivation-audio-v1',STORE='clips';
export function normalizeSpeechText(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export async function speechTextHash(text){
 const bytes=new TextEncoder().encode(normalizeSpeechText(text));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'key'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function transact(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(STORE,mode),store=tx.objectStore(STORE);let value;try{value=fn(store);}catch(error){database.close();reject(error);return;}tx.oncomplete=()=>{database.close();resolve(value?.result);};tx.onerror=()=>{database.close();reject(tx.error);};});}
export async function getSpeechClip(text,voice){const key=voice+':'+await speechTextHash(text);const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result?.blob||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>database.close();tx.onerror=()=>database.close();});}
export async function importSpeechClips(files,{onProgress=()=>{}}={}){
 const list=Array.from(files||[]),manifest=list.find(f=>f.name==='speech-manifest.json');
 if(!manifest)throw Error('请选择包含 speech-manifest.json 的音频文件集合。');
 const parsed=JSON.parse(await manifest.text());if(parsed.version!==1||!Array.isArray(parsed.clips))throw Error('音频清单格式不受支持。');
 const byName=new Map(list.map(f=>[f.name,f]));let imported=0,missing=0;
 for(const item of parsed.clips){
  const voice=item.voice;if(!['af_heart','af_bella'].includes(voice)||typeof item.text!=='string'||!item.text.trim())continue;
  const filename=String(item.file||'');if(!filename||filename.includes('/')||filename.includes('\\')||filename.startsWith('.'))continue;
  const file=byName.get(filename);if(!file){missing++;continue;}
  const allowed=/\.(mp3|wav|m4a|aac)$/i.test(filename);if(!allowed||file.size>25*1024*1024)continue;
  const key=voice+':'+await speechTextHash(item.text);
  const database=await db();await new Promise((resolve,reject)=>{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).put({key,blob:file,text:item.text,voice,created:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);}).finally(()=>database.close());
  imported++;onProgress({imported,total:parsed.clips.length});
 }
 return {imported,missing,total:parsed.clips.length};
}
export function createClipPlayer({onStatus=()=>{}}={}){
 let audio=null,url=null,token=0;
 function stop(){token++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();}if(url){URL.revokeObjectURL(url);url=null;}}
 return {stop,pause(){audio?.pause();},resume(){if(audio)void audio.play().catch(()=>onStatus('请手动点击音频播放器继续'));},async speak(text,voice){const id=++token;const blob=await getSpeechClip(text,voice);if(id!==token)return 'cancelled';if(!blob)return 'missing';stop();const own=token;audio=document.createElement('audio');audio.controls=true;audio.className='neural-audio-player';audio.setAttribute('aria-label','自然美式女声音频');url=URL.createObjectURL(blob);audio.src=url;let tray=document.getElementById('imported-speech-tray');if(!tray){tray=document.createElement('section');tray.id='imported-speech-tray';tray.className='neural-audio-tray';document.body.append(tray);}tray.replaceChildren(audio);tray.hidden=false;try{await audio.play();if(own!==token)return 'cancelled';onStatus('正在播放已配音的自然美式女声');return 'playing';}catch{onStatus('音频已就绪，请点击播放器▶播放');return 'ready';}}};
}
