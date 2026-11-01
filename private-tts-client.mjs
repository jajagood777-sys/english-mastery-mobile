import {normalizeSpeechText,speechTextHash} from './speech-clips.mjs';

export const GEMINI_TTS_ENGINE='gemini-3.8-flash-tts@kore-v1';

// The callback must return a short-lived gateway token, never a Gemini API key.
export function createPrivateTTSClient({endpoint,getToken,fetchImpl=globalThis.fetch,timeoutMs=45000,engine=GEMINI_TTS_ENGINE}={}){
 if(!endpoint||typeof getToken!=='function'||typeof fetchImpl!=='function')return null;
 return async(text,voice='Kore')=>{
  const normalized=normalizeSpeechText(text),hash=await speechTextHash(normalized),token=await getToken();
  if(!token)throw Error('private TTS authorization unavailable');
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
  try{
   const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({text:normalized,voice,textHash:hash,engine}),signal:controller?.signal});
   if(!response.ok)throw Error(`private TTS request failed (${response.status})`);
   if(!/^audio\/(?:mpeg|mp3|wav|x-wav)$/i.test(response.headers.get('content-type')||''))throw Error('private TTS returned a non-audio response');
   const returned=response.headers.get('x-text-sha256');if(returned&&returned!==hash)throw Error('private TTS hash mismatch');
   const blob=await response.blob();if(!blob.size||blob.size>25*1024*1024)throw Error('private TTS audio size invalid');
   return blob;
  }finally{if(timer)clearTimeout(timer);}
 };
}
