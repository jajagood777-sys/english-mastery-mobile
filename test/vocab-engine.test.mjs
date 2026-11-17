import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOCABULARY_TASK_TYPES,
  normalizeVocabularyTask,
  normalizeVocabularyTasks,
  qualityGateVocabularyTask,
  compareVocabularyChoice,
  buildVocabularyAttempt,
  summarizeVocabularyAttempts
} from '../vocab.mjs';

test('normalizes all supported vocabulary task types with stable IDs and source metadata', () => {
  assert.equal(VOCABULARY_TASK_TYPES.length, 14);
  const result = normalizeVocabularyTask({
    id: 'VOC-C01', source_item_id: 'word-affect', type: 'contextual-cloze',
    target_sense: 'influence as a verb', prompt: 'The policy will _____ every employee.',
    options: [
      {id:'A', text:'affect'}, {id:'B', text:'effect'},
      {id:'C', text:'infect'}, {id:'D', text:'reflect'}
    ], correct_option_ids: ['A'], explanation_en: 'Affect means to influence something.',
    production_prompt: 'Write a new sentence using affect.', source: {id:'pack-1', locator:'line 3'}
  }, 0, 'pack-1');
  assert.equal(result.ok, true);
  assert.equal(result.task.type, 'contextual_cloze');
  assert.deepEqual(result.task.correctOptionIds, ['A']);
  assert.equal(result.task.productionPrompt, 'Write a new sentence using affect.');
  assert.equal(result.task.sourceItemId, 'word-affect');
  assert.equal(result.task.source.id, 'pack-1');
});

test('each of the fourteen candidate types has a normalized, explicit path', () => {
  for (const type of VOCABULARY_TASK_TYPES) {
    const raw = {id:`${type}-1`, type, prompt:'Choose the best expression.', options:['alpha','beta','gamma','delta'], answer:'alpha', explanation:'The first option is supported by the context.'};
    if (type === 'listening_word_recognition') raw.audio_url = 'https://example.com/word.mp3';
    const result = normalizeVocabularyTask(raw, 0, 'pack-types');
    assert.equal(result.ok, true, `${type} should normalize`);
    assert.equal(result.task.type, type);
  }
});

test('quality gate rejects ambiguous answers, duplicate options, and unapproved three-option tasks', () => {
  const ambiguous = qualityGateVocabularyTask({id:'x', type:'definition_recognition', prompt:'Pick', options:['a','b','c','d'], correct_option_ids:['A','B'], explanation:'Not uniquely determined.'});
  assert.equal(ambiguous.ok, false);
  assert.match(ambiguous.reason, /one|唯一|multiple/i);
  const duplicate = qualityGateVocabularyTask({id:'y', type:'definition_recognition', prompt:'Pick', options:['a','a','c','d'], correct_option_ids:['A'], explanation:'Duplicate options.'});
  assert.equal(duplicate.ok, false);
  const three = qualityGateVocabularyTask({id:'z', type:'definition_recognition', prompt:'Pick', options:['a','b','c'], correct_option_ids:['A'], explanation:'Too few options.'});
  assert.equal(three.ok, false);
  const two = qualityGateVocabularyTask({id:'z2', type:'confusable_words', prompt:'Pick', options:['a','b'], correct_option_ids:['A'], allow_two_options:true, explanation:'A is the best choice.'});
  assert.equal(two.ok, true);
});

test('listening recognition requires a real HTTPS audio source', () => {
  const missing = qualityGateVocabularyTask({id:'audio-1', type:'listening_word_recognition', prompt:'Listen', options:['a','b','c','d'], answer:'a', explanation:'A is heard.'});
  assert.equal(missing.ok, false);
  const unsafe = qualityGateVocabularyTask({id:'audio-2', type:'listening_word_recognition', prompt:'Listen', options:['a','b','c','d'], answer:'a', explanation:'A is heard.', audio_url:'http://example.com/a.mp3'});
  assert.equal(unsafe.ok, false);
  const valid = qualityGateVocabularyTask({id:'audio-3', type:'listening_word_recognition', prompt:'Listen', options:['a','b','c','d'], answer:'a', explanation:'A is heard.', audio_url:'https://example.com/a.mp3'});
  assert.equal(valid.ok, true);
});

test('normalization safely falls back by excluding invalid tasks without inventing distractors', () => {
  const result = normalizeVocabularyTasks([
    {id:'good', type:'definition_recognition', prompt:'Pick', options:['a','b','c','d'], answer:'b', explanation:'Because.'},
    {id:'bad', type:'definition_recognition', prompt:'Pick', options:['a','b','c'], answer:'a'}
  ], 'pack');
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].correctOptionIds[0], 'B');
  assert.equal(result.errors.length, 1);
  assert.equal(result.fallbacks, 1);
});

test('choice comparison records recognition only and preserves raw first choice', () => {
  const task = normalizeVocabularyTask({id:'x', type:'contextual_cloze', prompt:'She will _____ the plan.', options:['affect','effect','infect','reflect'], answer:'affect', explanation:'Affect is the verb.'},0,'p').task;
  assert.equal(compareVocabularyChoice('A', task).status, 'correct');
  assert.equal(compareVocabularyChoice('affect', task).status, 'correct');
  assert.equal(compareVocabularyChoice('effect', task).status, 'incorrect');
  assert.equal(compareVocabularyChoice('', task).status, 'blank');
  const attempt = buildVocabularyAttempt({task, choice:'A', firstSubmittedAt:'2026-11-17T00:00:00Z', hintUsed:false});
  assert.equal(attempt.firstAnswer, 'A');
  assert.equal(attempt.recognitionResult, 'RECOGNITION_CORRECT');
  assert.equal(attempt.evidenceType, 'RECOGNITION_CORRECT');
  assert.equal(attempt.isIndependent, false);
});

test('retry, production, hint, and skip evidence stay separate from first answer', () => {
  const task = normalizeVocabularyTask({id:'x', type:'definition_recognition', prompt:'Pick', options:['a','b','c','d'], answer:'a', explanation:'A is correct.'},0,'p').task;
  const row = buildVocabularyAttempt({task, choice:'B', retryChoice:'A', productionAnswer:'A new sentence.', hintUsed:true, referenceViewed:true});
  assert.equal(row.firstAnswer, 'B');
  assert.equal(row.retryAnswer, 'A');
  assert.equal(row.productionAnswer, 'A new sentence.');
  assert.equal(row.recognitionResult, 'RECOGNITION_INCORRECT');
  assert.equal(row.evidenceType, 'PRODUCTION_ATTEMPT');
  const skipped = buildVocabularyAttempt({task, skipped:true});
  assert.equal(skipped.evidenceType, 'SKIPPED');
  assert.equal(skipped.recognitionResult, 'UNASSESSED');
});

test('summary does not convert recognition correctness into independent recall or K', () => {
  const summary = summarizeVocabularyAttempts([
    {recognitionResult:'RECOGNITION_CORRECT', evidenceType:'RECOGNITION_CORRECT', isIndependent:false},
    {recognitionResult:'RECOGNITION_INCORRECT', evidenceType:'RECOGNITION_INCORRECT', isIndependent:false},
    {evidenceType:'PRODUCTION_ATTEMPT', productionAnswer:'x'},
    {evidenceType:'SKIPPED', recognitionResult:'UNASSESSED'}
  ]);
  assert.deepEqual(summary, {total:4, recognitionCorrect:1, recognitionIncorrect:1, independentRecall:0, productionAttempts:1, skipped:1, unassessed:0, K:0, V:0, N:0});
});
