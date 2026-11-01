import {createNeuralSpeech} from './neural-tts.mjs';
import {createClipPlayer,speechTextHash} from './speech-clips.mjs';

const $=id=>document.getElementById(id);
const sentence='Hello.';
const story=[
  'The lighthouse keeper walked along the wet pier before dawn.',
  'A quiet signal arrived from beyond the northern reef.',
  'She recorded every detail and waited for the tide to turn.'
];
let generationCount=0,activeRun=0,clock=null;
const status=message=>{$('status').textContent=message;};
const neural=createNeuralSpeech({
  onStatus:status,
  onProgress:s=>{
    const d=s.details||{},bar=$('progress'),bytes=$('bytes');
    bar.hidden=d.percent===null;
    bar.value=d.percent??0;
    bytes.textContent=d.total?`${d.loaded} / ${d.total} bytes`:'';
  }
});
const player=createClipPlayer({
  onStatus:status,
  generate:async(text,voice)=>{
    generationCount++;
    status(`调用真正 Kokoro 模型；第 ${generationCount} 次生成：${text}`);
    return neural.generate(text,voice);
  }
});
function stopClock(){if(clock!==null){clearInterval(clock);clock=null;}}
async function run(label,work){
  stopClock();
  const runId=++activeRun,start=performance.now();
  const update=()=>{
    if(runId!==activeRun)return;
    const seconds=Math.round((performance.now()-start)/1000);
    const slow=seconds>=45?'；超过45秒仍未完成，请截图反馈，不要重复点击。':'';
    $('result').textContent=`${label}：进行中 ${seconds}秒 · 阶段=${neural.details().phase} · 生成次数=${generationCount}${slow}`;
    $('result').className=seconds>=45?'error':'';
  };
  update();clock=setInterval(update,2000);
  try{
    const result=await work();
    if(runId!==activeRun)return;
    stopClock();
    $('result').textContent=`${label}：${result==='playing'?'已开始播放':result} · 耗时 ${Math.round((performance.now()-start)/1000)}秒 · 模型生成次数 ${generationCount}`;
    $('result').className='ok';
  }catch(error){
    if(runId!==activeRun)return;
    stopClock();
    $('result').textContent=`${label}：失败：${error?.message||error}`;
    $('result').className='error';
  }
}
$('new').onclick=()=>run('新短句 Hello.',()=>player.speak(sentence,'af_heart'));
$('again').onclick=()=>run('缓存复用',async()=>{
  const before=generationCount,result=await player.speak(sentence,'af_heart');
  if(generationCount!==before)throw Error('重复播放再次触发了 Kokoro 生成，缓存未复用');
  return result;
});
$('story').onclick=()=>run('故事分段',()=>player.speakSegments(story,'af_heart'));
$('refresh').onclick=async()=>{
  const hash=await speechTextHash(sentence);
  status(`同一短句SHA-256：${hash}\n要真正验证持久缓存：手动刷新Safari页面后点“再次播放”。`);
};
$('stop').onclick=()=>{
  ++activeRun;stopClock();player.stop();neural.stop();
  $('result').textContent='已请求停止。若底层 WASM 计算仍占用 Safari，请直接关闭这个测试标签页以终止。';
  $('result').className='error';
};
window.addEventListener('error',event=>{
  $('result').textContent='页面脚本错误：'+String(event.message||event.error||'未知');
  $('result').className='error';
});
window.addEventListener('unhandledrejection',event=>{
  $('result').textContent='未处理 Promise 错误：'+String(event.reason?.message||event.reason||'未知');
  $('result').className='error';
});
status('待命：先用 Hello. 测试最短 Heart 语音；成功后再测缓存及故事。');
