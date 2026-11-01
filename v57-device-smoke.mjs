import {createNeuralSpeech} from './neural-tts.mjs';
import {createClipPlayer,speechTextHash} from './speech-clips.mjs';
const $=id=>document.getElementById(id), sentence='The lighthouse keeper recorded a quiet signal before dawn.', story=['The lighthouse keeper walked along the wet pier before dawn.','A quiet signal arrived from beyond the northern reef.','She recorded every detail and waited for the tide to turn.'];let generationCount=0;
const status=message=>{$('status').textContent=message;};
const neural=createNeuralSpeech({onStatus:status,onProgress:s=>{const d=s.details||{};const bar=$('progress'),bytes=$('bytes');bar.hidden=d.percent===null;bar.value=d.percent??0;bytes.textContent=d.total?`${d.loaded} / ${d.total} bytes`:'等待真实资源大小……';}});
const player=createClipPlayer({onStatus:status,generate:async(text,voice)=>{generationCount++;status(`缺少缓存，开始第 ${generationCount} 次真实 Kokoro 生成……`);return neural.generate(text,voice);}});
async function run(label,work){$('result').textContent=`${label}：进行中`;try{const result=await work();$('result').textContent=`${label}：${result==='playing'?'播放完成/正在播放':result}`;$('result').className='ok';}catch(error){$('result').textContent=`${label}：失败：${error.message||error}`;$('result').className='error';}}
$('new').onclick=()=>run('新句子',()=>player.speak(sentence,'af_heart'));
$('again').onclick=()=>run('缓存复用',async()=>{const before=generationCount,result=await player.speak(sentence,'af_heart');if(generationCount!==before)throw Error('第二次播放仍触发了模型生成，缓存未复用');return result;});
$('story').onclick=()=>run('故事分段',()=>player.speakSegments(story,'af_heart'));
$('refresh').onclick=async()=>{const hash=await speechTextHash(sentence);status(`刷新后仍可计算同一文本哈希：${hash}\n点击“再次播放”验证 IndexedDB 缓存。`);};
$('stop').onclick=()=>{player.stop();neural.stop();status('已停止；没有使用系统语音。');};
status('待命：点击第 1 步开始真实模型初始化/生成。');

