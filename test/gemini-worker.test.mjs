import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker,hashText,MODEL} from '../worker/src/index.mjs';

const env={GEMINI_API_KEY:'server-only-key',TTS_CLIENT_TOKEN:'client-session-token',TTS_ALLOWED_ORIGIN:'https://study.example',TTS_REQUESTS_PER_MINUTE:'20',TTS_AUTH_MODE:'token'};
const requestFor=(body,extra={})=>new Request('https://tts.example/v1/tts',{method:'POST',headers:{origin:'https://study.example',authorization:'Bearer client-session-token','content-type':'application/json',...extra},body:JSON.stringify(body)});

test('Worker rejects unauthenticated requests and mismatched hashes before Gemini',async()=>{
 let called=0;const worker=createWorker({fetchImpl:async()=>{called++;throw Error('must not call');}});const text='A private sentence.';const hash=await hashText(text);
 const noAuth=await worker.fetch(requestFor({text,textHash:hash},{authorization:''}),env);assert.equal(noAuth.status,401);
 const wrong=await worker.fetch(requestFor({text,textHash:'0'.repeat(64)}),env);assert.equal(wrong.status,400);assert.match((await wrong.json()).error,/hash mismatch/);assert.equal(called,0);
});

test('Worker maps Gemini unary audio output to private Safari-compatible WAV',async()=>{
 let upstream;
 const pcm=new Uint8Array([82,73,70,70,1,2,3,4]);
 const base64=btoa(String.fromCharCode(...pcm));
 const worker=createWorker({fetchImpl:async(url,options)=>{upstream={url,options};return new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'audio',data:base64}]}]}),{status:200,headers:{'content-type':'application/json'}});}});
 const text='A new Gemini sentence for Safari.';const response=await worker.fetch(requestFor({text,voice:'Kore',style:'warm and clear',textHash:await hashText(text)}),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'audio/wav');assert.equal(response.headers.get('x-engine-version'),`${MODEL}@kore-v1`);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),pcm);
 const sent=JSON.parse(upstream.options.body);assert.equal(upstream.url,'https://generativelanguage.googleapis.com/v1beta/interactions');assert.equal(sent.model,MODEL);assert.equal(sent.generation_config.speech_config[0].voice,'Kore');assert.equal(sent.input[0].content[0].text,text);assert.equal(upstream.options.headers['x-goog-api-key'],'server-only-key');
});

test('Worker permits only configured origin and reports provider quota errors without details',async()=>{
 const worker=createWorker({fetchImpl:async()=>new Response('{}',{status:429})});const text='Quota test.';
 const response=await worker.fetch(requestFor({text,textHash:await hashText(text)}),env);assert.equal(response.status,429);assert.deepEqual(await response.json(),{error:'Gemini quota exceeded or rate limited'});
 const options=await worker.fetch(new Request('https://tts.example/v1/tts',{method:'OPTIONS',headers:{origin:'https://other.example'}}),env);assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),null);
});

test('Worker defaults to Cloudflare Access sessions and exposes a credential-free session check',async()=>{const worker=createWorker({fetchImpl:async()=>{throw Error('must not call');}});const accessEnv={GEMINI_API_KEY:'key',TTS_ALLOWED_ORIGIN:'https://study.example',CF_ACCESS_TEAM_DOMAIN:'https://team.cloudflareaccess.com',CF_ACCESS_AUD:'aud'};const session=await worker.fetch(new Request('https://tts.example/v1/session',{headers:{origin:'https://study.example'}}),accessEnv);assert.equal(session.status,401);const preflight=await worker.fetch(new Request('https://tts.example/v1/session',{method:'OPTIONS',headers:{origin:'https://study.example','access-control-request-method':'GET'}}),accessEnv);assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-credentials'),'true');});

test('Worker uses optional KV quota scope without exposing subject or text',async()=>{let stored;const kv={async get(){return stored||'0';},async put(key,value){stored=value;assert.match(key,/^tts-quota:[a-f0-9]{64}$/);assert.match(value,/^1$/);}};const worker=createWorker({fetchImpl:async()=>new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'audio',data:btoa('RIFF')}]}]}),{status:200})});const text='KV quota.';const response=await worker.fetch(requestFor({text,textHash:await hashText(text)}),{...env,TTS_QUOTA:kv});assert.equal(response.status,200);assert.equal(response.headers.get('x-quota-scope'),'kv');});

test('Worker pairing mode exchanges a code for a short-lived session and enforces it',async()=>{
 let called=0;const worker=createWorker({fetchImpl:async()=>{called++;return new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'audio',data:btoa('RIFF')}]}]}),{status:200});}});
 const pairingEnv={GEMINI_API_KEY:'server-key',TTS_AUTH_MODE:'pairing',TTS_PAIRING_CODE:'iphone-pairing-code',TTS_ALLOWED_ORIGIN:'https://study.example',TTS_SESSION_TTL_SECONDS:'3600'};
 const exchange=await worker.fetch(new Request('https://tts.example/v1/session/exchange',{method:'POST',headers:{origin:'https://study.example','content-type':'application/json'},body:JSON.stringify({pairingCode:'iphone-pairing-code'})}),pairingEnv);
 assert.equal(exchange.status,200);const session=await exchange.json();assert.match(session.token,/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
 const wrong=await worker.fetch(new Request('https://tts.example/v1/session/exchange',{method:'POST',headers:{origin:'https://study.example','content-type':'application/json'},body:JSON.stringify({pairingCode:'wrong'})}),pairingEnv);assert.equal(wrong.status,401);
 const check=await worker.fetch(new Request('https://tts.example/v1/session',{headers:{origin:'https://study.example',authorization:`Bearer ${session.token}`}}),pairingEnv);assert.equal(check.status,200);assert.equal((await check.json()).auth,'pairing');assert.equal(called,0);
});
