import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker,hashText,MODEL} from '../worker/src/index.mjs';

const env={GEMINI_API_KEY:'server-only-key',TTS_CLIENT_TOKEN:'client-session-token',TTS_ALLOWED_ORIGIN:'https://study.example',TTS_REQUESTS_PER_MINUTE:'20'};
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
