import {mkdir,readFile} from 'node:fs/promises';
import {KokoroTTS} from 'kokoro-js';
await mkdir('kokoro-preview',{recursive:true});
const tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'cpu'});
for(const voice of ['af_heart','af_bella']){
 const audio=await tts.generate("I wasn't expecting the plan to change so suddenly.",{voice});
 const name='kokoro-preview/'+voice+'-sample.wav';
 await audio.save(name);
 const bytes=await readFile(name);
 if(bytes.length<8000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Not valid WAV: '+name);
 console.log('VERIFIED '+name+' '+bytes.length+' bytes');
}
