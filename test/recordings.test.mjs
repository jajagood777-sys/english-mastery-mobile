import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseRecordingMimeType,recordingCapability,recordingMetadata} from '../recordings.mjs';

test('V5 recording capability chooses the first runtime-supported MIME type',()=>{
 const media={isTypeSupported:value=>value==='audio/webm;codecs=opus'};
 assert.equal(chooseRecordingMimeType(media),'audio/webm;codecs=opus');
});

test('V5 recording capability reports a text fallback when APIs are unavailable',()=>{
 const result=recordingCapability({MediaRecorder:null,navigator:{}});
 assert.equal(result.supported,false);assert.equal(result.fallback,'text');
});

test('V5 recording metadata keeps original and retry roles without embedding blob data',()=>{
 const row=recordingMetadata({weaknessId:'w1',taskId:'t1',role:'retry',mimeType:'audio/mp4',createdAt:'2026-10-31T00:00:00Z'});
 assert.equal(row.role,'retry');assert.equal(row.weaknessId,'w1');assert.equal(row.mimeType,'audio/mp4');assert.equal('blob' in row,false);
});
