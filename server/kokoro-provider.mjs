// Private on-demand Kokoro provider reference implementation.
// Run behind a private reverse proxy or access gateway. Never expose this directly on Pages.
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ENGINE_VERSION='kokoro-js@1.2.1-q8';
export const DEFAULT_PORT=Number(process.env.PORT||8787);
export const HOST=process.env.HOST||'0.0.0.0';
export const ALLOWED_ORIGIN=process.env.TTS_ALLOWED_ORIGIN||'';
const MAX_ACTIVE=Math.max(1,Number(process.env.TTS_MAX_ACTIVE||1));
const RATE_LIMIT=Math.max(1,Number(process.env.TTS_RATE_LIMIT||20));
const GENERATION_TIMEOUT=Math.max(1000,Number(process.env.TTS_GENERATION_TIMEOUT_MS||90000));
const CACHE_DIR=process.env.KOKORO_CACHE_DIR||join(process.cwd(),'private-audio-cache');
const SECRET=process.env.TTS_SHARED_SECRET||'';
const MAX_TEXT=Math.max(1,Number(process.env.TTS_MAX_TEXT||2000));
const pending=new Map();
const rate=new Map();
let active=0;
let enginePromise=null;

export function normalizeText(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export function textHash(value){return createHash('sha256').update(normalizeText(value)).digest('hex');}
export function cacheFile(voice,hash){if(!/^af_(?:heart|bella)$/.test(voice)||!/^[a-f0-9]{64}$/.test(hash))throw Error('invalid cache key');return join(CACHE_DIR,`${voice}-${hash}.mp3`);}
function headers(req){const origin=req.headers.origin;return ALLOWED_ORIGIN&&origin===ALLOWED_ORIGIN?{'access-control-allow-origin':ALLOWED_ORIGIN,'access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'POST, OPTIONS','vary':'Origin'}:{};}
function send(res,status,body,extra={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra});res.end(JSON.stringify(body));}
function authorized(req){return Boolean(SECRET&&req.headers.authorization===`Bearer ${SECRET}`);}
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>64*1024)throw Object.assign(Error('request too large'),{statusCode:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('invalid JSON'),{statusCode:400});}}
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});child.on('error',reject);child.on('close',code=>{if(code===0)resolve();else reject(Error(stderr.slice(0,500)||`${command} failed (${code})`));});});}
function withTimeout(promise,ms){let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`generation timeout after ${ms}ms`)),ms);});return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));}
async function ensureEngine(){if(!enginePromise)enginePromise=import('kokoro-js').then(({KokoroTTS})=>KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'cpu'}));return enginePromise;}
async function generate(text,voice,hash){
 await mkdir(CACHE_DIR,{recursive:true});
 const file=cacheFile(voice,hash);
 try{return await readFile(file);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(pending.has(file))return pending.get(file);
 if(active>=MAX_ACTIVE)throw Object.assign(Error('provider busy; retry later'),{statusCode:429});
 active++;
 const work=(async()=>{
  const dir=await mkdtemp(join(tmpdir(),'kokoro-private-')),wav=join(dir,`${randomUUID()}.wav`),mp3=join(dir,`${randomUUID()}.mp3`);
  try{
   const model=await ensureEngine(),audio=await withTimeout(model.generate(text,{voice}),GENERATION_TIMEOUT);
   await audio.save(wav);
   await run('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i',wav,'-codec:a','libmp3lame','-b:a','96k','-ar','24000',mp3]);
   const bytes=await readFile(mp3);if(bytes.length<1000)throw Error('generated audio is empty');
   await writeFile(file,bytes,{flag:'wx'}).catch(async error=>{if(error.code!=='EEXIST')throw error;});
   return bytes;
  }finally{await rm(dir,{recursive:true,force:true});active--;}
 })().finally(()=>pending.delete(file));
 pending.set(file,work);
 return work;
}
async function handle(req,res){
 const cors=headers(req);
 if(req.method==='OPTIONS'&&req.url==='/v1/tts'){res.writeHead(204,cors);return res.end();}
 if(req.method==='GET'&&req.url==='/health')return send(res,200,{ok:true,engine:ENGINE_VERSION},cors);
 if(req.method!=='POST'||req.url!=='/v1/tts')return send(res,404,{error:'not_found'},cors);
 if(!authorized(req))return send(res,401,{error:'unauthorized'},cors);
 const ip=req.socket.remoteAddress||'unknown',now=Date.now(),windowStart=now-60000;
 const recent=(rate.get(ip)||[]).filter(t=>t>windowStart);if(recent.length>=RATE_LIMIT)return send(res,429,{error:'rate limit exceeded'},cors);recent.push(now);rate.set(ip,recent);
 try{
  const input=await body(req),text=normalizeText(input.text),voice=String(input.voice||'af_heart'),hash=String(input.textHash||'');
  if(!text||text.length>MAX_TEXT)throw Error('text length invalid');
  if(!['af_heart','af_bella'].includes(voice))throw Error('voice not allowed');
  if(hash!==textHash(text))throw Error('text hash mismatch');
  const bytes=await generate(text,voice,hash);
  res.writeHead(200,{'content-type':'audio/mpeg','cache-control':'private, max-age=31536000','x-text-sha256':hash,'x-engine-version':ENGINE_VERSION,'content-length':bytes.length,...cors});res.end(bytes);
 }catch(error){send(res,error.statusCode||400,{error:String(error.message||error).slice(0,240)},cors);}
}
export function start(){if(!SECRET)throw Error('TTS_SHARED_SECRET is required');const server=createServer((req,res)=>{void handle(req,res);});return server.listen(DEFAULT_PORT,HOST,()=>console.log(`private Kokoro provider listening on ${HOST}:${server.address().port}`));}
if(process.argv[1]===fileURLToPath(import.meta.url))start();
