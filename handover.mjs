export function isSupportedSourcePackSchema(v){const s=String(v||'').trim();return s==='2.0'||/^r11/i.test(s);}
/** Local-only Central Handover package writer. Store-only ZIP avoids a new dependency. */

const encoder=new TextEncoder();
const clean=value=>String(value??'').trim();
const u16=value=>new Uint8Array([value&255,(value>>>8)&255]);
const u32=value=>new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255]);
const concat=parts=>{const total=parts.reduce((sum,p)=>sum+p.length,0);const out=new Uint8Array(total);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;};

function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}

export function zipStore(entries=[]){
  const local=[];const central=[];let offset=0;const safeEntries=[];
  for(const entry of entries){const name=clean(entry.name).replaceAll('\\','/').replace(/^\/+|\.\.(?=\/)/g,'');if(!name)continue;const bytes=entry.bytes instanceof Uint8Array?entry.bytes:new Uint8Array(entry.bytes||[]);const nameBytes=encoder.encode(name);const crc=crc32(bytes);const header=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(bytes.length),u32(bytes.length),u16(nameBytes.length),u16(0),nameBytes,bytes]);local.push(header);central.push({nameBytes,crc,size:bytes.length,offset});safeEntries.push({name,size:bytes.length});offset+=header.length;}
  const centralOffset=offset;for(const row of central){const header=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(row.crc),u32(row.size),u32(row.size),u16(row.nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(row.offset),row.nameBytes]);local.push(header);offset+=header.length;}
  const centralSize=offset-centralOffset;const end=concat([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(centralSize),u32(centralOffset),u16(0)]);const bytes=concat([...local,end]);return {bytes,entries:safeEntries};
}

export function readZipStore(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input||[]);const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const entries=[];let offset=0;
  while(offset+30<=bytes.length){if(view.getUint32(offset,true)!==0x04034b50)break;const method=view.getUint16(offset+8,true),expectedCrc=view.getUint32(offset+14,true),size=view.getUint32(offset+18,true),nameLen=view.getUint16(offset+26,true),extraLen=view.getUint16(offset+28,true);if(method!==0||offset+30+nameLen+extraLen+size>bytes.length)throw new Error('ZIP contains unsupported or truncated entry.');const name=new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLen));const start=offset+30+nameLen+extraLen;const payload=bytes.slice(start,start+size);if(crc32(payload)!==expectedCrc)throw new Error(`ZIP entry integrity check failed (CRC32): ${name}`);entries.push({name,bytes:payload,size});offset=start+size;}
  if(!entries.length||entries.some(e=>!e.name))throw new Error('ZIP has no readable entries.');return entries;
}
export async function sha256Hex(input){const bytes=input instanceof Uint8Array?input:new Uint8Array(input||[]);if(globalThis.crypto?.subtle){const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}return null;}

export function handoverEntries({report=null,feedback=null,pack=null,sourcePack=null,recordings=[],generatedAt=new Date().toISOString()}={}){
  const expected=[...new Set([...(Array.isArray(report?.attempts)?report.attempts.flatMap(row=>Array.isArray(row.recording_ids)?row.recording_ids:[]):[]),...(Array.isArray(report?.transfer_attempts)?report.transfer_attempts.flatMap(row=>Array.isArray(row.recordingIds)?row.recordingIds:(Array.isArray(row.recording_ids)?row.recording_ids:[])):[]),...(Array.isArray(report?.reading_analysis?.retelling_attempts)?report.reading_analysis.retelling_attempts.flatMap(row=>Array.isArray(row.recordingIds)?row.recordingIds:(Array.isArray(row.recording_ids)?row.recording_ids:[])):[])].filter(Boolean))];
  const abnormal=recordings.filter(row=>!row.bytes||row.bytes.length===0||row.error).map(row=>({recording_id:row.id||null,reason:row.error||'empty_bytes'}));
  const fallbackSource=sourcePack||pack?.sourcePack||null;
  const sourceBytes=fallbackSource?.bytes instanceof Uint8Array?fallbackSource.bytes:(typeof fallbackSource?.raw==='string'?encoder.encode(fallbackSource.raw):null);
  let sourceParsed=null,sourceError=clean(fallbackSource?.unavailableReason||pack?.sourcePackUnavailableReason);
  if(sourceBytes){
    try{
      sourceParsed=JSON.parse(new TextDecoder().decode(sourceBytes));
      if(!isSupportedSourcePackSchema(sourceParsed?.schema_version))throw Error('source pack schema_version is not 2.0');
      const sourceId=clean(sourceParsed.pack_id||fallbackSource.packId);
      if(!sourceId)throw Error('source pack has no pack_id');
      if(clean(sourceParsed.pack_id)!==sourceId)throw Error('source pack metadata mismatch');
      if(report?.pack_id&&report.pack_id!==sourceId)throw Error('report.pack_id does not match source pack');
      if(pack?.packId&&pack.packId!==sourceId)throw Error('daily pack ID does not match source pack');
      fallbackSource.packId=sourceId;fallbackSource.schemaVersion=String(sourceParsed.schema_version||'2.0');
    }catch(error){sourceParsed=null;sourceError=`source pack rejected: ${error.message}`;}
  }
  const sourceIncluded=Boolean(sourceParsed&&sourceBytes);
  if(!sourceIncluded&&!sourceError)sourceError='original imported source pack is unavailable for this older Journey';
  const manifest={handover_schema_version:'1.0',generated_at:generatedAt,report_id:report?.report_id||null,session_id:report?.session_id||null,pack_id:report?.pack_id||pack?.packId||null,includes_recordings:recordings.length>0,recording_count:recordings.length,privacy:'local export only; no automatic upload',unknowns:['AI scoring and external sync are not performed by the website'],source_pack_included:sourceIncluded,source_pack_id:sourceIncluded?sourceParsed.pack_id:null,source_pack_schema_version:sourceIncluded?sourceParsed.schema_version:null,source_pack_sha256:sourceIncluded?(fallbackSource.sha256||null):null,source_pack_provenance:sourceIncluded?(fallbackSource.provenance||{type:'imported_daily_pack'}):null,source_pack_unavailable_reason:sourceIncluded?null:sourceError};
  if(recordings.length||expected.length)Object.assign(manifest,{expected_recording_count:expected.length||recordings.length,actual_packaged_count:recordings.filter(row=>row.bytes?.length>0&&!row.error).length,missing_recording_ids:expected.filter(id=>!recordings.some(row=>row.id===id)),abnormal_recordings:abnormal,total_recording_bytes:recordings.reduce((sum,row)=>sum+Number(row.bytes?.length||0),0),recording_task_ids:recordings.map(row=>({recording_id:row.id||null,task_id:row.taskId||null,attempt_id:row.attemptId||null,sha256:row.sha256||null,bytes:Number(row.bytes?.length||0)}))});
  const entries=[
    {name:'manifest.json',bytes:encoder.encode(JSON.stringify(manifest,null,2)+'\n')},
    {name:'battle-report.json',bytes:encoder.encode(JSON.stringify(report||{},null,2)+'\n')},
    {name:'central-feedback.json',bytes:encoder.encode(JSON.stringify(feedback||{},null,2)+'\n')},
    {name:'README.txt',bytes:encoder.encode('English Cultivation Central Handover\n\nUpload this package manually to the Central Immortal Aperture (Gemini). The website does not automatically sync to Google Drive or Google Sheets. Includes 11.0.1 Battle Report (Smart Vocabulary, Interference Radar, Objective Expression X-Ray, and FSRS 6.3.2 Shadow Stability).\n\nRecordings are included only when you explicitly chose the recording export.\n')}
  ];
  if(sourceIncluded)entries.push({name:'learning-pack.json',bytes:sourceBytes});
  for(const recording of recordings){const id=clean(recording.id).replace(/[^A-Za-z0-9._-]/g,'_')||'recording';const ext=String(recording.mimeType||'').includes('mp4')?'m4a':String(recording.mimeType||'').includes('ogg')?'ogg':'webm';entries.push({name:`recordings/${id}.${ext}`,bytes:recording.bytes instanceof Uint8Array?recording.bytes:new Uint8Array(recording.bytes||[])});}
  return {entries,manifest};
}


export function describeHandoverRecordings({report=null,manifest=null,includeRecordings=true}={}){
  const labelMap=new Map();
  const inferRole=(id,idx,row)=>{
    const s=String(id||'').toLowerCase();
    if(s.includes('retry')||row?.role==='retry'||(idx>0&&(row?.retryAnswer||row?.retrySubmittedAt||row?.retried_after_error)))return '重答';
    return '初答';
  };
  const register=(rows,prefix)=>{
    for(const row of (Array.isArray(rows)?rows:[])){
      const ids=Array.isArray(row?.recordingIds)?row.recordingIds:(Array.isArray(row?.recording_ids)?row.recording_ids:[]);
      ids.forEach((id,idx)=>{
        const key=clean(id);
        if(!key||labelMap.has(key))return;
        labelMap.set(key,`${prefix}${inferRole(key,idx,row)}`);
      });
    }
  };
  register(report?.reading_analysis?.retelling_attempts,'阅读复述');
  register(report?.transfer_attempts,'综合输出');
  register(report?.attempts,'听说练习');

  const expectedCount=Number(manifest?.expected_recording_count??labelMap.size);
  const packagedCount=Number(manifest?.actual_packaged_count??0);
  const missingIds=Array.isArray(manifest?.missing_recording_ids)?manifest.missing_recording_ids.filter(Boolean):[];
  const abnormalIds=Array.isArray(manifest?.abnormal_recordings)?manifest.abnormal_recordings.map(r=>r?.recording_id).filter(Boolean):[];
  const missingLabels=missingIds.map(id=>labelMap.get(id)||id);

  if(!includeRecordings){
    return {includeRecordings:false,complete:true,expectedCount,packagedCount:0,missingIds:[],missingLabels:[],abnormalIds:[],summaryText:'不含录音（已按选择跳过录音打包）'};
  }
  if(expectedCount===0&&packagedCount===0){
    return {includeRecordings:true,complete:true,expectedCount:0,packagedCount:0,missingIds:[],missingLabels:[],abnormalIds:[],summaryText:'本次战报无录音'};
  }
  const complete=packagedCount===expectedCount&&missingIds.length===0&&abnormalIds.length===0;
  let summaryText='';
  if(complete){
    summaryText=`录音已带齐：应有 ${expectedCount} 条，已打包 ${packagedCount} 条`;
  }else{
    const missingPart=missingLabels.length?`，缺少${missingLabels.join('、')}`:'';
    const abnormalPart=abnormalIds.length?`（另有 ${abnormalIds.length} 条空文件或异常录音）`:'';
    summaryText=`应有 ${expectedCount} 条，已打包 ${packagedCount} 条${missingPart}${abnormalPart}`;
  }
  return {includeRecordings:true,complete,expectedCount,packagedCount,missingIds,missingLabels,abnormalIds,summaryText};
}

export {crc32};
