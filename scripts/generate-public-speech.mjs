// Convert verified public Kokoro WAV fixtures into Safari-friendly MP3 assets.
// The WAV fixtures were generated from public demo text with kokoro-js@1.2.1 q8;
// this workflow never reads learner packs or uploads private content.
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const OUT='speech-assets';
const SAMPLE_TEXT="I wasn't expecting the plan to change so suddenly.";
const SAMPLES=[['af_heart','kokoro-preview/af_heart-sample.wav'],['af_bella','kokoro-preview/af_bella-sample.wav']];
const normalize=t=>String(t).normalize('NFKC').replace(/\s+/g,' ').trim();
const textHash=createHash('sha256').update(normalize(SAMPLE_TEXT)).digest('hex');
await mkdir(OUT,{recursive:true});const clips=[];
for(const [voice,wav] of SAMPLES){const wavBytes=await readFile(wav);if(wavBytes.length<8000||wavBytes.toString('ascii',0,4)!=='RIFF'||wavBytes.toString('ascii',8,12)!=='WAVE')throw Error('Invalid verified WAV '+wav);const stem=voice+'-'+textHash.slice(0,24),mp3=OUT+'/'+stem+'.mp3';const ff=spawnSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i',wav,'-codec:a','libmp3lame','-b:a','96k','-ar','24000',mp3],{encoding:'utf8'});if(ff.status!==0)throw Error('MP3 conversion failed: '+(ff.stderr||ff.error));const bytes=(await stat(mp3)).size;if(bytes<1000)throw Error('MP3 too small: '+mp3);const fileSha256=createHash('sha256').update(await readFile(mp3)).digest('hex');clips.push({voice,text:normalize(SAMPLE_TEXT),file:stem+'.mp3',sha256:textHash,fileSha256,format:'audio/mpeg',engine:'kokoro-js@1.2.1 q8 (verified WAV fixture)',bytes});console.log('GENERATED',voice,bytes,'bytes');}
const manifest={version:1,source:'public built-in demo sentence only',generatedAt:new Date().toISOString(),clips};await writeFile(OUT+'/speech-manifest.json',JSON.stringify(manifest,null,2)+'\n');await writeFile(OUT+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('GENERATED ALL '+clips.length+' audio files');
