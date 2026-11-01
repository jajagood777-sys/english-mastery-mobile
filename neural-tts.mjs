// Optional Kokoro speech player. No model/network work until the user taps Load or Read.
// This module never reads/writes learner records or recordings.
export const KOKORO_VOICES = Object.freeze({heart:'af_heart',bella:'af_bella'});
export function splitNeuralSpeech(value,limit=200){
  const text=String(value??'').replace(/\s+/g,' ').trim();
  if(!text)return [];
  const sentences=text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[text];
  const pieces=[];
  for(const sentence of sentences){
    const clean=sentence.trim();
    if(!clean)continue;
    if(clean.length<=limit){pieces.push(clean);continue;}
    let segment='';
    for(const word of clean.split(/\s+/)){
      if(segment && (segment.length+word.length+1>limit)){pieces.push(segment);segment=word;}
      else segment=segment?segment+' '+word:word;
      while(segment.length>limit){pieces.push(segment.slice(0,limit));segment=segment.slice(limit);}
    }
    if(segment)pieces.push(segment);
  }
  return pieces;
}
export function createNeuralSpeech({onStatus=()=>{},importEngine=()=>import('./kokoro-preview/runtime/kokoro-engine.mjs')}={}){
  let engine=null,loader=null,player=null,tray=null,label=null,current=0,paused=false,work=null,generation=Promise.resolve();
  let state='尚未加载自然语音模型';
  const setStatus=message=>{state=message;if(label)label.textContent=message;onStatus(message);};
  const ensurePlayer=()=>{
    if(player)return player;
    tray=document.createElement('section');tray.className='neural-audio-tray';tray.hidden=true;tray.setAttribute('aria-label','Kokoro自然语音播放器');
    label=document.createElement('p');label.className='neural-audio-status';label.setAttribute('role','status');label.textContent=state;
    player=document.createElement('audio');player.controls=true;player.preload='none';player.setAttribute('aria-label','自然语音播放');
    const controls=document.createElement('div');controls.className='neural-audio-actions';
    for(const [caption,callback] of [['暂停',()=>api.pause()],['继续',()=>api.resume()],['停止',()=>api.stop()]]){
      const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent=caption;b.addEventListener('click',callback);controls.append(b);
    }
    tray.append(label,player,controls);document.body.append(tray);
    player.addEventListener('ended',()=>{if(work&&!paused&&work.token===current)void advance(work);});
    return player;
  };
  const cleanupJob=job=>{
    if(!job)return;
    for(const url of job.urls.values())URL.revokeObjectURL(url);
    job.urls.clear();
  };
  const reset=()=>{
    current++;paused=false;
    if(player){player.pause();player.removeAttribute('src');player.load();}
    cleanupJob(work);work=null;
    if(tray)tray.hidden=true;
  };
  const load=async()=>{
    if(engine)return engine;
    if(loader)return loader;
    setStatus('正在下载／加载Kokoro模型，首次可能需要约92MB，使用Wi-Fi更合适……');
    loader=(async()=>{
      const {KokoroTTS}=await importEngine();
      const tts=await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{dtype:'q8',device:'wasm'});
      engine=tts;setStatus('Kokoro模型已加载，可以试听Heart/Bella');
      return engine;
    })().catch(error=>{
      const reason=error instanceof Error?error.message:String(error);
      setStatus('神经语音加载失败：'+reason.slice(0,230));
      throw error;
    }).finally(()=>{loader=null;});
    return loader;
  };
  const prepare=(job,index)=>{
    if(index>=job.chunks.length)return Promise.resolve(null);
    if(job.urls.has(index))return Promise.resolve(job.urls.get(index));
    if(job.pending.has(index))return job.pending.get(index);
    const task=generation.then(async()=>{
      if(job.token!==current)return null;
      const raw=await engine.generate(job.chunks[index],{voice:job.voice});
      const blob=raw.toBlob();
      if(!blob||!blob.size)throw Error('音频生成结果为空');
      if(job.token!==current)return null;
      const url=URL.createObjectURL(blob);job.urls.set(index,url);return url;
    });
    generation=task.catch(()=>{});
    job.pending.set(index,task);
    return task.finally(()=>job.pending.delete(index));
  };
  const advance=async job=>{
    if(job.token!==current||paused)return;
    if(job.index>=job.chunks.length){setStatus('Kokoro朗读完成');return;}
    setStatus('Kokoro '+job.voice+'：生成／缓冲第 '+(job.index+1)+' / '+job.chunks.length+' 段……');
    try{
      const url=await prepare(job,job.index);
      if(job.token!==current||paused||!url)return;
      ensurePlayer();tray.hidden=false;player.src=url;
      // iOS can reject autoplay after asynchronous inference. The native audio controls
      // remain visible so a manual Play tap always remains possible.
      try{await player.play();setStatus('正在用Kokoro朗读第 '+(job.index+1)+' / '+job.chunks.length+' 段');}
      catch{setStatus('Kokoro音频已生成。请点击下方播放器的播放键（iPhone可能限制自动播放）。');}
      if(job.index+1<job.chunks.length)void prepare(job,job.index+1).catch(error=>{
        if(job.token===current)setStatus('下一段音频缓冲失败：'+String(error?.message||error).slice(0,150));
      });
      job.index++;
    }catch(error){if(job.token===current)setStatus('Kokoro生成失败：'+String(error?.message||error).slice(0,220));}
  };
  const api={
    status:()=>state,ready:()=>Boolean(engine),load,
    async speak(text,voice='af_heart'){
      const chunks=splitNeuralSpeech(text);
      if(!chunks.length)return false;
      reset();ensurePlayer();tray.hidden=false;
      const token=current;
      const job={token,voice,chunks,index:0,urls:new Map(),pending:new Map()};
      work=job;
      try{await load();if(token===current)await advance(job);return token===current;}
      catch{if(token===current)setStatus('神经语音不可用；可在设置中改用设备兼容朗读。');return false;}
    },
    pause(){paused=true;if(player)player.pause();setStatus('Kokoro朗读已暂停');},
    resume(){paused=false;if(!work)return;if(player&&player.src&&!player.ended){void player.play().catch(()=>setStatus('点击播放器▶手动继续'));}else void advance(work);},
    stop(){reset();setStatus('Kokoro朗读已停止');},
    player:ensurePlayer
  };
  return api;
}
