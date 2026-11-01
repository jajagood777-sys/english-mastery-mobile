import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractAudioTasks,splitSpeechSegments,speechTextHash} from '../audio-tasks.mjs';
const sample=JSON.parse(readFileSync(new URL('../examples/v56-audio-sample-pack.json',import.meta.url)));
test('V5.6 extractor covers words, examples, sentences, listening, reading segments and transfer',()=>{
 const out=extractAudioTasks(sample);assert.equal(out.summary.total,29);assert.equal(out.byCategory.words.total,8);assert.equal(out.byCategory.examples.total,8);assert.equal(out.byCategory.sentences.total,6);assert.equal(out.byCategory.listening.total,3);assert.equal(out.byCategory.reading.total,2);assert.equal(out.byCategory.transfer.total,2);assert.ok(out.tasks.every(row=>row.textHash===speechTextHash(row.text)));assert.ok(out.tasks.filter(row=>row.category==='reading').every(row=>row.segmentCount===2));
});
test('V5.6 extractor reuses exact text and rejects no content without inventing audio',()=>{
 const first=extractAudioTasks(sample);const existing=first.tasks.slice(0,3).map(row=>({voice:row.voice,engine:row.engineVersion,sha256:row.textHash}));const second=extractAudioTasks(sample,{existingManifest:existing});assert.equal(second.summary.existing,3);assert.equal(second.summary.missing,26);const bad=extractAudioTasks({pack_id:'bad',items:[]});assert.equal(bad.tasks.length,0);assert.ok(bad.errors.length);
});
test('V5.6 reading segmentation preserves order and text',()=>{const text='First sentence stays intact. A second sentence follows.\n\nA new paragraph starts here.';const parts=splitSpeechSegments(text,80);assert.deepEqual(parts,['First sentence stays intact. A second sentence follows.','A new paragraph starts here.']);assert.equal(parts.join(' '),text.replace(/\n\s*\n/g,' '));});
