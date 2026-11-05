import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractAudioTasks} from '../audio-tasks.mjs';

const pack={
  schema_version:'2.0',pack_id:'SYNTH-V10-3-AUDIO',title:'Synthetic natural speech pack',
  items:[
    {id:'w1',type:'word',target:'nuance',definition_en:'a small but important difference in meaning or feeling',example:'The nuance of her answer was easy to miss.'},
    {id:'w2',type:'word',target:'nuance',definition_en:'a small but important difference in meaning or feeling',example:'The nuance of her answer was easy to miss.'},
    {id:'s1',type:'sentence',text:'Clear practice makes difficult ideas easier to remember.'},
    {id:'l1',type:'listening',text:'Listen for the main idea before you notice every detail.'}
  ],
  readings:[{id:'r1',title:'Short synthetic reading',text:'First sentence stays intact. A second sentence follows.\n\nA new paragraph starts here.'}],
  transfer_tasks:[{id:'t1',type:'speaking',prompt:'Explain one useful study habit.',model_answer:'I review a little every day.'}]
};

test('V10.3 extractor includes English definitions and deduplicates exact speech text',()=>{
  const out=extractAudioTasks(pack);
  assert.equal(out.packId,'SYNTH-V10-3-AUDIO');
  assert.equal(out.byCategory.words.total,1);
  assert.equal(out.byCategory.definitions.total,1);
  assert.equal(out.byCategory.examples.total,1);
  assert.equal(out.byCategory.sentences.total,1);
  assert.equal(out.byCategory.listening.total,1);
  assert.equal(out.byCategory.reading.total,2);
  assert.equal(out.byCategory.transfer.total,2);
  assert.equal(new Set(out.tasks.map(row=>row.textHash)).size,out.tasks.length);
  assert.ok(out.tasks.find(row=>row.category==='definitions').text.includes('small but important difference'));
});

test('V10.3 generator and importer expose the single-ZIP contract without changing learner records',()=>{
  const generator=readFileSync(new URL('../scripts/generate-audio-pack.mjs',import.meta.url),'utf8');
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(generator,/package-info\.json/);
  assert.match(generator,/learning-pack\.json/);
  assert.match(generator,/audio_directory:'audio\//);
  assert.match(generator,/zip.*-r/s);
  assert.match(generator,/process\.exit\(0\)/);
  assert.match(app,/importSpeechClips/);
  assert.match(app,/createClipPlayer/);
  assert.match(app,/package-info\.json/);
  assert.match(app,/item\.name==='learning-pack\.json'/);
  assert.match(app,/自然语音已缓存/);
  assert.match(app,/central-english-mastery\.v2/);
});
