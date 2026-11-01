import {normalizeSpeechText,speechTextHash} from './speech-clips.mjs';

export const GEMINI_TTS_ENGINE='gemini-3.8-flash-tts@kore-v1';

function sessionURL(endpoint){try{const url=new URL(endpoint);if(url.pathname.endsWith('/v1/tts'))url.pathname=url.pathname.replace(/\/tts$/,'/session');return url.toString();}catch{return `${endpoint.replace(/\/$/,'')}/v1/session`;}}

// Access mode uses the browser's short-lived Cloudflare Access cookie and never sends a token.
// Token mode is a controlled fallback for private staging only; it must not be placed in public JS.
export function createPrivateTTSClient({endpoint,getToken=null,authMode='access',fetchImpl=globalThis.fetch,timeoutMs=45000,engine=GEMINI_TTS_ENGINE}={}){
 if(!endpoint||typeof fetchImpl!=='function'||(['token','pairing'].includes(authMode)&&typeof getToken!=='function'))return null;
 const request=async(path,options={})=>{const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;try{return await fetchImpl(path,{...options,credentials:authMode==='access'?'include':'omit',signal:controller?.signal});}finally{if(timer)clearTimeout(timer);}};
 const client=async(text,voice='Kore')=>{const normalized=normalizeSpeechText(text),hash=await speechTextHash(normalized),headers={'content-type':'application/json'};if(authMode==='token'||authMode==='pairing'){const token=await getToken();if(!token)throw Error('private TTS authorization unavailable');headers.authorization=`Bearer ${token}`;}const response=await request(endpoint,{method:'POST',headers,body:JSON.stringify({text:normalized,voice,textHash:hash,engine})});if(!response.ok)throw Error(`private TTS request failed (${response.status})`);if(!/^audio\/(?:mpeg|mp3|wav|x-wav)$/i.test(response.headers.get('content-type')||''))throw Error('private TTS returned a non-audio response');const returned=response.headers.get('x-text-sha256');if(returned&&returned!==hash)throw Error('private TTS hash mismatch');const blob=await response.blob();if(!blob.size||blob.size>25*1024*1024)throw Error('private TTS audio size invalid');return blob;};
 client.startSession=async(pairingCode)=>{if(authMode!=='pairing')throw Error('pairing session is not enabled');const response=await request(sessionURL(endpoint).replace('/v1/session','/v1/session/exchange'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pairingCode})});if(!response.ok)throw Error(`private TTS pairing failed (${response.status})`);const payload=await response.json();if(!payload?.token)throw Error('private TTS pairing returned no session');return payload;};
  client.checkSession=async()=>{const response=await request(sessionURL(endpoint),{method:'GET'});if(!response.ok)throw Error(`private TTS session check failed (${response.status})`);const payload=await response.json();if(!payload?.ok)throw Error('private TTS session unavailable');return payload;};
 return client;
}
