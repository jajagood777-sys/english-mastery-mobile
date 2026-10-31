import {stableHash} from './core.mjs';

export const RECORDING_DB_NAME='english-cultivation-recordings-v1';
export const RECORDING_STORE_NAME='recordings';
const MIME_CANDIDATES=['audio/mp4;codecs=mp4a.40.2','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];

export function chooseRecordingMimeType(mediaRecorder=globalThis.MediaRecorder){
  if(!mediaRecorder||typeof mediaRecorder.isTypeSupported!=='function')return null;
  return MIME_CANDIDATES.find(type=>{try{return mediaRecorder.isTypeSupported(type);}catch{return false;}})||null;
}
export function recordingCapability(env=globalThis){
  const media=env?.MediaRecorder,navigatorValue=env?.navigator;
  const getUserMedia=navigatorValue?.mediaDevices?.getUserMedia;
  if(typeof media!=='function'||typeof getUserMedia!=='function')return {supported:false,mimeType:null,fallback:'text',reason:'当前浏览器不支持本地录音。'};
  const mimeType=chooseRecordingMimeType(media);
  if(!mimeType)return {supported:false,mimeType:null,fallback:'text',reason:'当前浏览器没有可用的录音格式。'};
  return {supported:true,mimeType,fallback:'text',reason:null};
}
export function recordingMetadata(raw={}){
  const createdAt=String(raw.createdAt||raw.created_at||new Date().toISOString());
  const role=raw.role==='retry'?'retry':'original';
  const id=String(raw.id||`recording:${stableHash([raw.weaknessId||'',raw.taskId||'',role,createdAt].join('|'))}`);
  return {id,weaknessId:String(raw.weaknessId||''),taskId:String(raw.taskId||''),attemptId:String(raw.attemptId||''),role,mimeType:String(raw.mimeType||''),createdAt,durationMs:Math.max(0,Number(raw.durationMs)||0)};
}
function openDatabase(indexedDBValue=globalThis.indexedDB){
  if(!indexedDBValue)return Promise.reject(new Error('IndexedDB unavailable.'));
  return new Promise((resolve,reject)=>{const request=indexedDBValue.open(RECORDING_DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(RECORDING_STORE_NAME))request.result.createObjectStore(RECORDING_STORE_NAME,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Unable to open recording storage.'));});
}
export async function putRecording(raw,blob,{indexedDB:db=globalThis.indexedDB}={}){
  const metadata=recordingMetadata(raw);if(!blob)throw new Error('没有可保存的录音。');const database=await openDatabase(db);return new Promise((resolve,reject)=>{const tx=database.transaction(RECORDING_STORE_NAME,'readwrite');tx.objectStore(RECORDING_STORE_NAME).put({...metadata,blob});tx.oncomplete=()=>{database.close();resolve(metadata);};tx.onerror=()=>{database.close();reject(tx.error||new Error('录音保存失败。'));};});
}
export async function listRecordings({weaknessId='',taskId='',indexedDB:db=globalThis.indexedDB}={}){
  const database=await openDatabase(db);return new Promise((resolve,reject)=>{const tx=database.transaction(RECORDING_STORE_NAME,'readonly');const request=tx.objectStore(RECORDING_STORE_NAME).getAll();request.onsuccess=()=>{const rows=request.result.filter(row=>(!weaknessId||row.weaknessId===weaknessId)&&(!taskId||row.taskId===taskId)).map(({blob,...metadata})=>metadata);resolve(rows);};request.onerror=()=>reject(request.error||new Error('录音读取失败。'));tx.oncomplete=()=>database.close();});
}
export async function getRecording(id,{indexedDB:db=globalThis.indexedDB}={}){
  const database=await openDatabase(db);return new Promise((resolve,reject)=>{const tx=database.transaction(RECORDING_STORE_NAME,'readonly');const request=tx.objectStore(RECORDING_STORE_NAME).get(id);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error||new Error('录音读取失败。'));tx.oncomplete=()=>database.close();});
}
export async function deleteRecording(id,{indexedDB:db=globalThis.indexedDB}={}){
  const database=await openDatabase(db);return new Promise((resolve,reject)=>{const tx=database.transaction(RECORDING_STORE_NAME,'readwrite');tx.objectStore(RECORDING_STORE_NAME).delete(id);tx.oncomplete=()=>{database.close();resolve(true);};tx.onerror=()=>{database.close();reject(tx.error||new Error('录音删除失败。'));};});
}
