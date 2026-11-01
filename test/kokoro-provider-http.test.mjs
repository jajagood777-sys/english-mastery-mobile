import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';

function startProvider(){
 const child=spawn(process.execPath,[resolve('server/kokoro-provider.mjs')],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',TTS_SHARED_SECRET:'test-only-secret',TTS_ALLOWED_ORIGIN:'https://test.example'},stdio:['ignore','pipe','pipe']});
 return new Promise((resolvePromise,reject)=>{let output='';const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('provider did not start'));},5000);child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/listening on 127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolvePromise({child,port:Number(match[1])});}});child.stderr.on('data',chunk=>{output+=chunk;});child.once('error',reject);});
}

test('private provider exposes health, rejects missing auth, and validates hashes before inference',async()=>{
 const {child,port}=await startProvider();
 try{
  const health=await fetch(`http://127.0.0.1:${port}/health`);assert.equal(health.status,200);assert.equal((await health.json()).ok,true);
  const noAuth=await fetch(`http://127.0.0.1:${port}/v1/tts`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(noAuth.status,401);
  const wrongHash=await fetch(`http://127.0.0.1:${port}/v1/tts`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer test-only-secret'},body:JSON.stringify({text:'A new sentence.',voice:'af_heart',textHash:'0'.repeat(64)})});assert.equal(wrongHash.status,400);assert.match((await wrongHash.json()).error,/hash mismatch/);
  const cors=await fetch(`http://127.0.0.1:${port}/v1/tts`,{method:'OPTIONS',headers:{origin:'https://test.example'}});assert.equal(cors.status,204);assert.equal(cors.headers.get('access-control-allow-origin'),'https://test.example');
 } finally {child.kill('SIGTERM');}
});
