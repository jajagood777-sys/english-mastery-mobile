/** Release-critical browser guards; pure for deterministic regression tests. */
export function shanghaiDateStamp(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part=type=>parts.find(p=>p.type===type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validRecordingBlob(blob,interrupted=false){
  return !interrupted&&Number(blob?.size)>0;
}
export function isCurrentAiLookup(requestId,currentRequestId,originalQuery,visibleQuery,drawerOpen){
  return requestId===currentRequestId&&originalQuery===visibleQuery&&Boolean(drawerOpen);
}
export function runtimeEntryMode({standalone=false}={}){
  return standalone?'主屏幕独立 PWA':'Safari 标签页';
}
