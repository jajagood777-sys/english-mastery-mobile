import test from 'node:test';
import assert from 'node:assert/strict';
import {splitStudioSegments,isExtendedListening,studioRecordingIds,studioEvidence} from '../studio.mjs';
import {buildBattleReport} from '../core.mjs';

test('Studio splits long English into sentence-safe segments',()=>{
 const rows=splitStudioSegments('Pause here. Then continue with a longer sentence for practice!',18);
 assert.deepEqual(rows,['Pause here.','Then continue with','a longer sentence','for practice!']);
});

test('Studio preserves original and retry recording evidence without pronunciation scores',()=>{
 const row={recording_ids:['r1','r1','r2'],hintUsed:false,referenceViewed:false};
 assert.deepEqual(studioRecordingIds(row),['r1','r2']);
 const evidence=studioEvidence(row,{recordingIds:['r3']});
 assert.equal(evidence.recordingStatus,'saved_locally');
 assert.equal(evidence.pronunciationAssessment,'not_available');
 assert.equal(evidence.independent,true);
});

test('long three-part material uses brief comprehension while short sentence keeps ordinary dictation',()=>{
 const short='We went to the station after lunch.';
 const long=('The first paragraph introduces the situation and explains why it matters. '
  +'The second paragraph describes the problem and gives an example of how someone reacted. '
  +'The final paragraph explains the result and why the speaker changed their mind. ').repeat(3);
 assert.equal(isExtendedListening(short),false);
 assert.equal(isExtendedListening(long),true);
 assert.equal(isExtendedListening(''),false);
});
test('brief comprehension is saved in Battle Report as UNRATED, never as new K/V/N or due',()=>{
 const at='2026-11-10T20:00:00.000Z';
 const report=buildBattleReport({
  session:{id:'s-brief',startedAt:at,endedAt:at,activeMs:10000,mode:'listening'},
  attempts:[{id:'a-brief',sessionId:'s-brief',itemId:'i-brief',kind:'sentence',status:null,
    promptType:'listening',listeningVariant:'brief_comprehension',
    comprehensionSelfReport:'partial',answer:'I understood the main problem.',
    initial_check:{status:'unassessed'},at,evidence_type:'user_self_reported_comprehension'}],
  items:[{id:'i-brief',kind:'sentence',module:'listening',text:'Long listening text',status:'UNTESTED'}]
 });
 const evidence=report.attempts.find(row=>row.attempt_id==='a-brief');
 assert.equal(evidence.rating,'UNRATED');
 assert.equal(evidence.listening_variant,'brief_comprehension');
 assert.equal(evidence.comprehension_self_report,'partial');
 assert.deepEqual(report.review_items?.due_tomorrow||[],[]);
});
