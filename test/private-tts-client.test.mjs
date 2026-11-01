import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPrivateTTSClient} from '../private-tts-client.mjs';

test('private TTS client sends normalized text and matching hash without storing credentials',async()=>{
 let request;
 const client=createPrivateTTSClient({endpoint:'https://private.example/v1/tts',getToken:async()=> 'ephemeral-token',fetchImpl:async(url,options)=>{request={url,options};const payload=JSON.parse(options.body);return new Response(new Blob([new Uint8Array(1200)],{type:'audio/mpeg'}),{status:200,headers:{'content-type':'audio/mpeg','x-text-sha256':payload.textHash}});}});
 const blob=await client('  A   new sentence.  ','af_heart');
 assert.equal(blob.type,'audio/mpeg');
 assert.equal(request.url,'https://private.example/v1/tts');
 assert.equal(request.options.headers.authorization,'Bearer ephemeral-token');
 const body=JSON.parse(request.options.body);assert.equal(body.text,'A new sentence.');assert.equal(body.voice,'af_heart');assert.match(body.textHash,/^[a-f0-9]{64}$/);
 const source=readFileSync(new URL('../private-tts-client.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/localStorage|sessionStorage|indexedDB/i);
});

test('private TTS client reports missing authorization and provider errors',async()=>{
 const missing=createPrivateTTSClient({endpoint:'https://x',getToken:async()=>null,fetchImpl:async()=>{throw Error('must not fetch');}});
 await assert.rejects(()=>missing('Retry me.'),/authorization unavailable/);
 const client=createPrivateTTSClient({endpoint:'https://x',getToken:async()=> 'token',fetchImpl:async()=>new Response('{"error":"busy"}',{status:429,headers:{'content-type':'application/json'}})});
 await assert.rejects(()=>client('Retry me.'),/private TTS request failed \(429\)/);
});
