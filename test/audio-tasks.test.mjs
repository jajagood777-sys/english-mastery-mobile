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

import {mkdtemp,copyFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const hasFfprobe=spawnSync('ffprobe',['-version']).status===0;
import {validateCachedClip} from '../audio-tasks.mjs';

test('validated cache rejects missing and mismatched MP3 files', async () => {
 const dir=await mkdtemp(join(tmpdir(),'audio-cache-test-'));
 const row={voice:'af_heart',engine:'kokoro-js@1.2.1-q8',text:'hello',sha256:'text-hash',file:'clip.mp3',fileSha256:'00'.repeat(32)};
 const missing=await validateCachedClip(row,dir);
 assert.equal(missing.valid,false); assert.match(missing.reason,/missing/i);
 await writeFile(join(dir,'clip.mp3'),Buffer.from('not mp3'));
 const invalid=await validateCachedClip(row,dir);
 assert.equal(invalid.valid,false); assert.match(invalid.reason,/hash|decode|mp3/i);
});

test('validated cache accepts a real MP3 only for the exact voice and engine', {skip:!hasFfprobe}, async () => {
 const dir=await mkdtemp(join(tmpdir(),'audio-cache-test-'));
 const source='speech-assets/af_heart-27f576cafbb263ed44be8bd0.mp3';
 await copyFile(source,join(dir,'clip.mp3'));
 const {createHash}=await import('node:crypto'); const bytes=await (await import('node:fs/promises')).readFile(join(dir,'clip.mp3'));
 const row={voice:'af_heart',engine:'kokoro-js@1.2.1-q8',text:'hello',sha256:'text-hash',file:'clip.mp3',fileSha256:createHash('sha256').update(bytes).digest('hex')};
 const good=await validateCachedClip(row,dir); assert.equal(good.valid,true); assert.equal(good.bytes,bytes.length); assert.ok(good.duration>0);
 const wrongVoice=await validateCachedClip({...row,voice:'af_bella'},dir,{voice:'af_heart',engine:row.engine}); assert.equal(wrongVoice.valid,false); assert.match(wrongVoice.reason,/voice/i);
});
