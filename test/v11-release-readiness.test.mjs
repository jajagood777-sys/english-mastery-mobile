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
  assert.equal(pkg.version,'10.4.2');
  const core=readFileSync(new URL('../core.mjs',import.meta.url),'utf8');
  assert.match(core,/APP_VERSION = '10\.4\.2'/);
  assert.match(sw,/english-cultivation-static-v10\.4\.2/);
  for(const asset of ['vocab.mjs','cdtl.mjs','studio.mjs','handover.mjs']){
    assert.ok(sw.includes("'./"+asset+"'"),'Missing offline resource '+asset);
  }
});


test('one ZIP enters one Journey with touch vocabulary as a real first stage',()=>{
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(app,/function renderVocabularyJourneyStage\(\)/);
  assert.match(app,/if\(page==='vocabulary'\)return renderVocabularyJourneyStage\(\)/);
  assert.match(app,/if\(stage==='vocabulary'\)/);
  assert.match(app,/const stages=\[\.\.\.\(data\.dailyPack\?\.vocabularyPractice/);
  assert.match(app,/function ensureVocabularyStageForExistingJourney\(\)/);
  assert.match(app,/j\.steps\.splice/);
  assert.match(app,/function applyImportedDraft\(\)/);
  assert.match(app,/await chooseImport\(packRaw,packFile\.name\);if\(draft\?\.pack&&!draft\.error\)/);
  assert.match(app,/if\(isPack\)startDailyJourney\(\)/);
  assert.match(app,/function advanceVocabularyJourneyStage\(\)/);
  assert.match(app,/确认导入并进入完整Journey/);
  assert.doesNotMatch(app,/app\.append\(hero\);if\(data\.dailyPack\)\{const vocab=renderVocabularyPractice\(\)/);
  assert.match(css,/\.vocab-choice-grid\{display:grid/);
});
test('single Journey retains original data and does not inflate K from multiple choice',()=>{
  const helper=app.slice(app.indexOf('function openSmartVocabulary(){'),app.indexOf('function renderVocabularyPractice(){'));
  assert.doesNotMatch(helper,/localStorage\.clear|data\.items\s*=|IndexedDB|deleteDatabase/);
  assert.match(app,/recognition_not_independent_recall:true/);
  assert.match(app,/vocabularyAttempts/);
});

test('ZIP importer has all counters in its own scope before committing',()=>{
  const body=app.slice(app.indexOf('function applyImportedDraft(){'),app.indexOf('function renderLibrary(){'));
  for(const field of ['words','sentences','listening','readings','touchWords'])assert.match(body,new RegExp('const '+field+'='));
  assert.match(body,/if\(!save\(\)\)return false/);
  assert.match(body,/draft=null;importRaw='';if\(isPack\)startDailyJourney\(\)/);
});
