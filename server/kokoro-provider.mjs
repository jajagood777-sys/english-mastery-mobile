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
const CACHE_DIR=process.env.KOKORO_CACHE_DIR||join(process.cwd(),'private-audio-cache');
const SECRET=process.env.TTS_SHARED_SECRET||'';
const MAX_TEXT=Number(process.env.TTS_MAX_TEXT||2000);
const pending=new Map();let enginePromise=null;
export function normalizeText(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export function textHash(value){return createHash('sha256').update(normalizeText(value)).digest('hex');}
export function cacheFile(voice,hash){if(!/^af_(?:heart|bella)$/.test(voice)||!/^[a-f0-9]{64}$/.test(hash))throw Error('invalid cache key');return join(CACHE_DIR,`${voice}-${hash}.mp3`);}
function send(res,status,body,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});res.end(JSON.stringify(body));}
function authorized(req){return Boolean(SECRET&&req.headers.authorization===`Bearer ${SECRET}`);}
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>64*1024)throw Error('request too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});child.on('error',reject);child.on('close',code=>{if(code===0)resolve();else reject(Error(stderr.slice(0,500)||`${command} failed (${code})`));});});}
async function ensureEngine(){if(!enginePromise)enginePromise=import('kokoro-js').then(({KokoroTTS})=>KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'cpu'}));return enginePromise;}
async function generate(text,voice,hash){await mkdir(CACHE_DIR,{recursive:true});const file=cacheFile(voice,hash);try{return await readFile(file);}catch(error){if(error.code!=='ENOENT')throw error;}if(pending.has(file))return pending.get(file);const work=(async()=>{const dir=await mkdtemp(join(tmpdir(),'kokoro-private-')),wav=join(dir,`${randomUUID()}.wav`),mp3=join(dir,`${randomUUID()}.mp3`);try{const model=await ensureEngine(),audio=await model.generate(text,{voice});await audio.save(wav);await run('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i',wav,'-codec:a','libmp3lame','-b:a','96k','-ar','24000',mp3]);const bytes=await readFile(mp3);if(bytes.length<1000)throw Error('generated audio is empty');await writeFile(file,bytes,{flag:'wx'}).catch(async error=>{if(error.code!=='EEXIST')throw error;});return bytes;}finally{await rm(dir,{recursive:true,force:true});}})().finally(()=>pending.delete(file));pending.set(file,work);return work;}
async function handle(req,res){if(req.method==='GET'&&req.url==='/health')return send(res,200,{ok:true,engine:ENGINE_VERSION});if(req.method!=='POST'||req.url!=='/v1/tts')return send(res,404,{error:'not_found'});if(!authorized(req))return send(res,401,{error:'unauthorized'});try{const input=await body(req),text=normalizeText(input.text),voice=String(input.voice||'af_heart'),hash=String(input.textHash||'');if(!text||text.length>MAX_TEXT)throw Error('text length invalid');if(!['af_heart','af_bella'].includes(voice))throw Error('voice not allowed');if(hash!==textHash(text))throw Error('text hash mismatch');const bytes=await generate(text,voice,hash);res.writeHead(200,{'content-type':'audio/mpeg','cache-control':'private, max-age=31536000','x-text-sha256':hash,'x-engine-version':ENGINE_VERSION,'content-length':bytes.length});res.end(bytes);}catch(error){send(res,400,{error:String(error.message||error).slice(0,240)});}}
export function start(){if(!SECRET)throw Error('TTS_SHARED_SECRET is required');return createServer((req,res)=>{void handle(req,res);}).listen(DEFAULT_PORT,'127.0.0.1',()=>console.log(`private Kokoro provider listening on 127.0.0.1:${DEFAULT_PORT}`));}
if(process.argv[1]===fileURLToPath(import.meta.url))start();
