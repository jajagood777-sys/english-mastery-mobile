import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCDTLTasks,
  compareCDTLChoice,
  buildCDTLAttempt,
  summarizeCDTLAttempts
} from '../cdtl.mjs';

test('normalizes contextual discrimination tasks without inventing missing choices', () => {
  const result = normalizeCDTLTasks([
    {
      id: 'affect-effect',
      title: 'Affect vs effect',
      targets: ['affect', 'effect'],
      contexts: [
        {
          id: 'c1',
          prompt: 'The new policy will _____ every employee.',
          options: ['affect', 'effect'],
          answer: 'affect',
          explanation: 'Affect is the verb here.',
          production_prompt: 'Write one new sentence using the correct verb.'
        }
      ]
    }
  ], 'pack-cdtl');
  assert.equal(result.errors.length, 0);
  assert.equal(result.tasks.length, 1);
  assert.deepEqual(result.tasks[0].targets, ['affect', 'effect']);
  assert.equal(result.tasks[0].contexts[0].answer, 'affect');
  assert.equal(result.tasks[0].contexts[0].productionPrompt, 'Write one new sentence using the correct verb.');
});

test('rejects a context whose answer is not one of its visible options', () => {
  const result = normalizeCDTLTasks([{
    id: 'bad',
    title: 'Bad task',
    targets: ['rise', 'raise'],
    contexts: [{prompt: 'Prices _____ quickly.', options: ['rise', 'raise'], answer: 'fall'}]
  }], 'pack-cdtl');
  assert.equal(result.tasks.length, 0);
  assert.match(result.errors[0], /answer.*options/i);
});

test('choice comparison is deterministic and keeps production open for honest self-rating', () => {
  assert.equal(compareCDTLChoice('Affect', {answer: 'affect'}).status, 'case_or_punctuation');
  assert.equal(compareCDTLChoice('effect', {answer: 'affect'}).status, 'incorrect');
  assert.equal(compareCDTLChoice('', {answer: 'affect'}).status, 'blank');
  const attempt = buildCDTLAttempt({
    taskId: 'affect-effect',
    contextId: 'c1',
    targets: ['affect', 'effect'],
    choice: 'affect',
    choiceCheck: {status: 'correct'},
    productionPrompt: 'Use affect in a new context.',
    firstProductionAnswer: 'The noise affected my sleep.',
    referenceAnswer: 'The noise affected my sleep.',
    hintUsed: false
  });
  assert.equal(attempt.firstChoice, 'affect');
  assert.equal(attempt.firstProductionAnswer, 'The noise affected my sleep.');
  assert.equal(attempt.rating, null);
  assert.equal(attempt.evidenceType, 'independent');
});

test('summarizes CDTL evidence without treating skipped or unrated work as mastery', () => {
  const summary = summarizeCDTLAttempts([
    {choiceCheck: {status: 'correct'}, evidenceType: 'independent', rating: 'K'},
    {choiceCheck: {status: 'incorrect'}, evidenceType: 'prompted', rating: 'V'},
    {status: 'skipped', evidenceType: 'skipped', rating: null},
    {choiceCheck: {status: 'correct'}, evidenceType: 'independent', rating: null}
  ]);
  assert.deepEqual(summary, {
    total: 4,
    choiceCorrect: 2,
    choiceIncorrect: 1,
    independent: 2,
    prompted: 1,
    skipped: 1,
    rated: 2,
    K: 1,
    V: 1,
    N: 0,
    unassessed: 1
  });
});

test('keeps duplicate IDs and malformed choice sets out of the normalized task list', () => {
  const result = normalizeCDTLTasks([
    { id: 'same', contexts: [{ id: 'c', prompt: 'Pick one.', options: ['one', 'two'], answer: 'one' }] },
    { id: 'same', contexts: [{ id: 'c', prompt: 'Pick one.', options: ['one', 'two'], answer: 'one' }] },
    { id: 'too-few', contexts: [{ prompt: 'No distractor.', options: ['one'], answer: 'one' }] }
  ], 'pack');
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].packId, 'pack');
  assert.equal(result.errors.filter(error => /duplicate task id/i.test(error)).length, 1);
  assert.ok(result.errors.some(error => /2 to 4/i.test(error)));
});

test('preserves the first answer while recording retry and prompt evidence', () => {
  const attempt = buildCDTLAttempt({
    taskId: 't1', contextId: 'c1', choice: 'effect',
    choiceCheck: { status: 'incorrect' }, hintUsed: true,
    firstProductionAnswer: 'The effect was immediate.',
    retryProductionAnswer: 'The policy affected workers.',
    referenceViewed: true, rating: 'V'
  });
  assert.equal(attempt.firstChoice, 'effect');
  assert.equal(attempt.firstProductionAnswer, 'The effect was immediate.');
  assert.equal(attempt.retryProductionAnswer, 'The policy affected workers.');
  assert.equal(attempt.evidenceType, 'prompted');
  assert.equal(attempt.rating, 'V');
});

test('supports an explicitly declared set of valid choice answers', () => {
  const normalized = normalizeCDTLTasks([{
    id: 'acceptable',
    contexts: [{ prompt: 'Choose an acceptable response.', options: ['Sure', 'Certainly', 'Never'], answers: ['Sure', 'Certainly'] }]
  }], 'pack');
  assert.equal(normalized.errors.length, 0);
  assert.deepEqual(normalized.tasks[0].contexts[0].correctOptionIds, ['A', 'B']);
  assert.equal(compareCDTLChoice('B', normalized.tasks[0].contexts[0]).status, 'correct');
});

test('rejects duplicate and overfull option sets instead of silently truncating them', () => {
  const result = normalizeCDTLTasks([{
    id: 'bad-options',
    contexts: [{ prompt: 'Pick the word.', options: ['one', 'one', 'two', 'three', 'four', 'five'], answer: 'one' }]
  }]);
  assert.equal(result.tasks.length, 0);
  assert.ok(result.errors.some(error => /unique/i.test(error)));
  assert.ok(result.errors.some(error => /2 to 4/i.test(error)));
});
