/** Listening & Speaking Studio helpers. Pure utilities keep the Journey adapter small. */

const clean = value => String(value ?? '').trim();

/** Split English into sentence-safe segments without changing the source text. */
export function splitStudioSegments(text, maxChars=180) {
  const source=clean(text).replace(/\s+/g,' ');
  if(!source)return [];
  const sentences=source.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[source];
  const segments=[];let current='';
  for(const sentence of sentences){
    const part=sentence.trim();
    if(!part)continue;
    if(part.length>maxChars){
      if(current){segments.push(current);current='';}
      let chunk='';
      for(const word of part.split(/\s+/)){
        const next=chunk?`${chunk} ${word}`:word;
        if(chunk&&next.length>maxChars){segments.push(chunk);chunk=word;}else chunk=next;
      }
      if(chunk)segments.push(chunk);
    }else if(current&&current.length+1+part.length>maxChars){segments.push(current);current=part;}
    else current=current?`${current} ${part}`:part;
  }
  if(current)segments.push(current);
  return segments;
}

/** Return stable recording IDs attached to a task attempt without duplicating them. */
export function studioRecordingIds(row={}) {
  return [...new Set([...(Array.isArray(row.recordingIds)?row.recordingIds:[]),...(Array.isArray(row.recording_ids)?row.recording_ids:[])].map(id=>clean(id)).filter(Boolean))];
}

/** Evidence is intentionally descriptive; it never produces an automatic pronunciation score. */
export function studioEvidence(row={}, {recordingIds=[]}={}) {
  const ids=studioRecordingIds({...row,recordingIds});
  return {
    originalRecordingIds: ids.filter(id=>row.role==='original'||!row.role),
    retryRecordingIds: ids.filter(id=>row.role==='retry'),
    recordingStatus: ids.length?'saved_locally':'not_recorded',
    pronunciationAssessment:'not_available',
    independent:!row.hintUsed&&!row.promptUsed&&!row.referenceViewed
  };
}
