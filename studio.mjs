/** Listening & Speaking Studio helpers. Pure utilities keep the Journey adapter small. */
import {splitSpeechSegments} from './speech-clips.mjs';

const clean = value => String(value ?? '').trim();

/** Split English into sentence-safe segments without changing the source text. */
export function splitStudioSegments(text, maxChars=260) { return splitSpeechSegments(text,maxChars); }


/**
 * A long, multi-segment passage is a listening-comprehension task, not a
 * verbatim sentence-dictation prompt. Short sentence tasks keep old behavior.
 * Threshold only changes UI demands; it does not truncate learning material.
 */
export function isExtendedListening(text, minChars=260) {
  const manuscript=clean(text);
  return manuscript.length>=minChars&&splitStudioSegments(manuscript).length>1;
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
