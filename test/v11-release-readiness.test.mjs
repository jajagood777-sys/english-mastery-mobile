import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBackup,mergeBackupState,recordsFromLearningPack,APP_VERSION} from '../core.mjs';
import {validateVocabularyTask,evaluateVocabularyChoice} from '../vocab.mjs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('11.0.0 vocabulary task enters the actual one-Journey stage with no parallel screen',()=>{
 const raw={schema_version:'2.0',pack_id:'test-v11',items:[],vocabulary_practice:[{id:'q1',type:'contextual_cloze',prompt:'The policy will ___ everyone.',options:[{id:'A',text:'affect'},{id:'B',text:'effect'},{id:'C',text:'infect'},{id:'D',text:'reflect'}],correct_option_ids:['A'],explanation_en:'Affect is the verb.'}]};
 const parsed=recordsFromLearningPack(raw);
 assert.equal(parsed.vocabularyPractice.length,1);
 assert.equal(parsed.vocabularyPractice[0].options[0].text,'affect');
 assert.match(app,/function renderVocabularyStage\(\)/);
 assert.match(app,/function journeyStages\(\)/);
 assert.match(app,/hasVocab\?\['vocabulary'\]/);
 assert.match(app,/if\(stage==='vocabulary'\)/);
 assert.match(app,/function ensureVocabularyInActiveJourney\(\)/);
 assert.match(app,/function startDailyJourney\(\)/);
 assert.doesNotMatch(app,/app\.append\(hero\);if\(data\.dailyPack\)\{const vocab=renderVocabularyPractice\(\)/);
});

test('choice evidence persists in old backups and 10.5 recognition never becomes K',()=>{
 const row={id:'vocabulary:test-v11:q1',packId:'test-v11',taskId:'q1',completed:true,firstAnswer:'B',recognitionResult:'RECOGNITION_INCORRECT',evidenceType:'RECOGNITION_INCORRECT',rating:null};
 const first=validateBackup({items:[],attempts:[],sessions:[],vocabularyAttempts:[row]});
 assert.deepEqual(first.vocabularyAttempts,[row]);
 const merged=mergeBackupState(first,{...first,vocabularyAttempts:[row]});
 assert.equal(merged.vocabularyAttempts.length,1);
 assert.equal(merged.vocabularyAttempts[0].firstAnswer,'B');
 assert.equal(merged.vocabularyAttempts[0].rating,null);
 const item=validateVocabularyTask({id:'v1',type:'contextual_cloze',prompt:'Choose the right word here',options:[{id:'A',text:'affect'},{id:'B',text:'effect'}],correct_option_ids:['A'],explanation_en:'Affect is the verb.'},0).task;
 const evaluated=evaluateVocabularyChoice(item,'A');
 assert.equal(evaluated.recognitionOnly,true);
 assert.equal(evaluated.countsAsMasteryK,false);
 assert.match(app,/countsAsMasteryK:false/);
});

test('PWA version and offline cache include 14.1.0 plus retained 10.5 and 10.4.2 modules',()=>{
 assert.equal(APP_VERSION,'14.1.0');
 assert.equal(pkg.version,'14.1.0');
 assert.match(sw,/english-cultivation-static-v14\.1\.0/);
 for(const asset of ['vocab.mjs','cdtl.mjs','studio.mjs','handover.mjs'])assert.ok(sw.includes("'./"+asset+"'"),'Missing offline asset '+asset);
});

test('one ZIP import auto-enters the only Journey while preserving active prior pack progress',()=>{
 assert.match(app,/await chooseImport\(packRaw,packFile\.name\)/);
 assert.match(app,/const confirmBtn=document\.querySelector\('#import-preview button\.btn\.primary'\)/);
 assert.match(app,/confirmBtn\.click\(\)/);
 assert.match(app,/if\(isPack\)startDailyJourney\(\)/);
 assert.match(app,/old\?\.packId===pack\.packId&&!old\.finishedAt/);
 assert.match(app,/ensureVocabularyInActiveJourney\(\)/);
 assert.match(app,/j\.steps\.splice/);
 assert.match(app,/vocabularyIndex/);
 assert.match(app,/j\.vocabularyAttempts/);
 assert.match(app,/advanceNext/);
 assert.match(app,/完成触控词汇，自动进入下一模块/);
 assert.match(css,/vocab-options-grid/);
});

test('vocabulary first-answer evidence cannot be overwritten by a second click',()=>{
 assert.match(app,/if\(prior\)return/);
 assert.match(app,/j\.vocabularyAttempts\.push\(attempt\)/);
 assert.match(app,/data\.vocabularyAttempts=/);
 assert.match(app,/recognition_only/);
 assert.match(app,/countsAsMasteryK:false/);
 assert.doesNotMatch(app,/localStorage\.clear\(\)|indexedDB\.deleteDatabase\(/);
});
