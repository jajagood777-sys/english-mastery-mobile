// Generate only public, built-in demo text. Never upload learner packs or private answers.
import {KokoroTTS} from 'kokoro-js';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const OUT='speech-assets';
const SAMPLES=[
  'address','We need to address the underlying problem.',
  'account for','Several factors account for the difference.',
  'evidence','The evidence does not support that conclusion.',
  'Consistent practice matters more than occasional bursts of motivation.',
  'A good reader questions the evidence before accepting a claim.',
  "I wasn't expecting the plan to change so suddenly."
];
await mkdir(OUT,{recursive:true});
const tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'cpu'});
const normalize=t=>String(t).normalize('NFKC').replace(/\s+/g,' ').trim();
const clips=[];
for(const text of SAMPLES){
 for(const voice of ['af_heart','af_bella']){
  const hash=createHash('sha256').update(normalize(text)).digest('hex');
  const stem=voice+'-'+hash.slice(0,24);
  const wav=OUT+'/'+stem+'.wav',mp3=OUT+'/'+stem+'.mp3';
  const audio=await tts.generate(text,{voice});await audio.save(wav);
  const bytes=await readFile(wav);
  if(bytes.length<2000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Invalid generated WAV '+wav);
  const ff=spawnSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i',wav,'-codec:a','libmp3lame','-b:a','96k','-ar','24000',mp3],{encoding:'utf8'});
  if(ff.status!==0)throw Error('MP3 conversion failed: '+(ff.stderr||ff.error));
  const size=(await stat(mp3)).size;
  if(size<1000)throw Error('MP3 too small: '+mp3);
  clips.push({voice,text,file:stem+'.mp3',sha256:hash,bytes:size});
  console.log('GENERATED',voice,hash.slice(0,10),size,'bytes');
 }
}
await writeFile(OUT+'/manifest.json',JSON.stringify({version:1,source:'public built-in demo sentences only',clips},null,2)+'\n');
console.log('GENERATED ALL '+clips.length+' audio files');
