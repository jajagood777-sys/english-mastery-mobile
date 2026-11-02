import test from 'node:test';
import assert from 'node:assert/strict';
import {splitStudioSegments,studioRecordingIds,studioEvidence} from '../studio.mjs';

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
