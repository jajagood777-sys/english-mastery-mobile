import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {revealedReadingRecall,composeReadingRetellingSubmission} from '../core.mjs';

test('reading recall reveals the marked word in its full original sentence after submission',()=>{
 const row={word:'retrieve',prompt:'She could not _____ its sound or subtitles.',originalSentence:'She could not retrieve its sound or subtitles.'};
 assert.deepEqual(revealedReadingRecall(row),{word:'retrieve',sentence:'She could not retrieve its sound or subtitles.'});
 assert.equal(revealedReadingRecall({word:'remember',prompt:'She could not _____ the name.'}).sentence,'She could not remember the name.');
 assert.equal(revealedReadingRecall({word:'go',prompt:'She _____ home.',originalSentence:'She went home.'}).sentence,'She went home.');
});

test('saved audio alone qualifies as an independent retelling even if the initial render had no recordings',()=>{
 const recordingSavedAfterRender={id:'retelling:reading-1:draft',readingId:'reading-1',recordingIds:['recording-1'],referenceViewed:false,promptUsed:false};
 const attempt=composeReadingRetellingSubmission({reading:{id:'reading-1'},packId:'pack-1',current:recordingSavedAfterRender,answer:'',at:'2026-11-14T00:00:00.000Z'});
 assert.equal(attempt.id,recordingSavedAfterRender.id);
 assert.deepEqual(attempt.recordingIds,['recording-1']);
 assert.equal(attempt.firstAnswer,'');
 assert.equal(attempt.firstSubmittedAt,'2026-11-14T00:00:00.000Z');
 assert.equal(attempt.status,'VOICE_UNASSESSED');
 assert.equal(attempt.referenceViewed,false);
 assert.equal(attempt.promptUsed,false);
});

test('recording is not silently dropped when retelling has text or existing prompting evidence',()=>{
 const previous={id:'retelling:reading-2:draft',readingId:'reading-2',recordingIds:['r2','r2'],promptUsed:true,referenceViewed:true,retryAnswer:'later retry',firstSubmittedAt:'2026-11-13T05:00:00.000Z'};
 const attempt=composeReadingRetellingSubmission({reading:{id:'reading-2',packId:'from-reading'},current:previous,answer:'  I learned a useful lesson. ',at:'2026-11-14T00:00:00.000Z'});
 assert.deepEqual(attempt.recordingIds,['r2']);
 assert.equal(attempt.status,'UNASSESSED');
 assert.equal(attempt.firstAnswer,'I learned a useful lesson.');
 assert.equal(attempt.firstSubmittedAt,previous.firstSubmittedAt);
 assert.equal(attempt.referenceViewed,true);
 assert.equal(attempt.promptUsed,true);
 assert.equal(attempt.retryAnswer,'later retry');
 assert.equal(attempt.packId,'from-reading');
});

test('blank retelling without any saved audio is rejected without manufacturing a response',()=>{
 assert.equal(composeReadingRetellingSubmission({reading:{id:'reading-1'},answer:'  ',current:null}),null);
 assert.equal(composeReadingRetellingSubmission({reading:{id:'reading-1'},answer:'',current:{recordingIds:[]}}),null);
 assert.equal(composeReadingRetellingSubmission({reading:{id:'reading-1'},answer:'',current:{recordingIds:['  ']}}),null);
});

test('reading UI consumes live saved voice evidence and visibly restores the original sentence',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/const revealed=revealedReadingRecall\(row\)/);
 assert.match(app,/原句补全：\$\{revealed\.sentence\}/);
 assert.match(app,/参考答案：\$\{revealed\.word\}/);
 assert.match(app,/current:latestRetelling\(\),answer:draft\.value/);
 assert.match(app,/const row=latestRetelling\(\)\|\|/);
});
