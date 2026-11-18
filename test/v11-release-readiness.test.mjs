import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBackup,mergeBackupState,recordsFromLearningPack} from '../core.mjs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('normalized vocabulary question reaches the actual Smart Vocabulary UI',()=>{
  const pack=recordsFromLearningPack({schema_version:'2.0',pack_id:'test-v11',items:[],
    vocabulary_practice:[{id:'q1',type:'contextual_cloze',prompt:'The policy will ___ everyone.',
      options:[{id:'A',text:'affect'},{id:'B',text:'effect'},{id:'C',text:'infect'},{id:'D',text:'reflect'}],
      correct_option_ids:['A'],explanation:'Affect is the verb.'}]});
  assert.equal(pack.vocabularyPractice.length,1);
  assert.equal(pack.vocabularyPractice[0].options[0].text,'affect');
  assert.match(app,/function renderVocabularyPractice\(\)/);
  assert.match(app,/task\.options/);
  assert.match(app,/compareVocabularyChoice\(chosen\[0\],task\)/);
  assert.doesNotMatch(app,/const context=task\.contexts\?\.\[0\]/);
});

test('choice evidence survives load validation and duplicate-safe backup merge',()=>{
  const row={id:'vocabulary:test-v11:q1',packId:'test-v11',taskId:'q1',completed:true,firstAnswer:'B',
    recognitionResult:'RECOGNITION_INCORRECT',evidenceType:'RECOGNITION_INCORRECT',rating:null};
  const first=validateBackup({items:[],attempts:[],sessions:[],vocabularyAttempts:[row]});
  assert.deepEqual(first.vocabularyAttempts,[row]);
  const merged=mergeBackupState(first,{...first,vocabularyAttempts:[row]});
  assert.equal(merged.vocabularyAttempts.length,1);
  assert.equal(merged.vocabularyAttempts[0].firstAnswer,'B');
  assert.equal(merged.vocabularyAttempts[0].rating,null);
});
test('production PWA assets and software versions agree',()=>{
  assert.equal(pkg.version,'10.4.1');
  const core=readFileSync(new URL('../core.mjs',import.meta.url),'utf8');
  assert.match(core,/APP_VERSION = '10\.4\.1'/);
  assert.match(sw,/english-cultivation-static-v10\.4\.1/);
  for(const asset of ['vocab.mjs','cdtl.mjs','studio.mjs','handover.mjs']){
    assert.ok(sw.includes("'./"+asset+"'"),'Missing offline resource '+asset);
  }
});


test('V22 touch vocabulary is surfaced immediately after import and from the homepage',()=>{
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(app,/function openSmartVocabulary\(\)/);
  assert.match(app,/document\.getElementById\('smart-vocabulary-practice'\)/);
  assert.match(app,/box\.id='smart-vocabulary-practice'/);
  assert.match(app,/确认导入并显示触控词汇/);
  assert.match(app,/if\(isPack&&packMeta\.vocabularyPractice\?\.length\)openSmartVocabulary\(\)/);
  assert.match(app,/app\.append\(hero\);if\(data\.dailyPack\)\{const vocab=renderVocabularyPractice\(\)/);
  assert.match(app,/触控词汇选择题/);
  assert.match(css,/\.vocab-choice-grid\{display:grid/);
  assert.match(css,/\.vocab-choice\.selected/);
});
test('The V22 touch path never erases a running Journey or auto-rates recognition',()=>{
  const start=app.indexOf('function openSmartVocabulary(){');
  const end=app.indexOf('function renderVocabularyPractice(){');
  assert.ok(start>=0&&end>start);
  const helper=app.slice(start,end);
  assert.doesNotMatch(helper,/dailyJourney\s*=|localStorage\.clear|data\.items\s*=|IndexedDB|deleteDatabase/);
  assert.match(app,/recognition_not_independent_recall:true/);
  assert.match(app,/vocabularyAttempts/);
});
