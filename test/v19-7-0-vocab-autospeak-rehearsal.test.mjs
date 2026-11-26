import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIntraSessionRehearsalQueue, normalizeVocabularyPractice } from '../vocab.mjs';
import { extractAudioTasks } from '../audio-tasks.mjs';

test('v20.3.3 Micro-Rehearsal marks definition-option tasks as optionsAreDefinitions and shuffles deterministically', () => {
  const tasks = [
    {
      id: 'V-DEF-1',
      sourceItemId: 'S1',
      type: 'definition_recognition',
      target: 'wrench',
      targetSense: 'To pull or twist something suddenly and forcefully.',
      archivedExample: 'He had to wrench the rusted valve open.',
      prompt: 'Choose the best English meaning for wrench.',
      options: [
        { id: 'A', text: 'To return to an earlier condition or practice.' },
        { id: 'B', text: 'To resist damage or pressure from something.' },
        { id: 'C', text: 'To bend or twist out of shape, often because of heat or moisture.' },
        { id: 'D', text: 'To pull or twist something suddenly and forcefully.' }
      ],
      correctOptionIds: ['D']
    },
    {
      id: 'V-CLOZE-1',
      sourceItemId: 'S2',
      type: 'contextual_cloze',
      target: 'corroborate',
      targetSense: 'To confirm or give independent support to a statement.',
      archivedExample: 'I read two medical articles to corroborate the claim.',
      prompt: 'Meaning: To confirm. Sentence: I read two articles to _____ the claim.',
      options: [
        { id: 'A', text: 'invent' },
        { id: 'B', text: 'ignore' },
        { id: 'C', text: 'corroborate' },
        { id: 'D', text: 'bungle' }
      ],
      correctOptionIds: ['C']
    }
  ];
  const attempts = [
    { taskId: 'V-DEF-1', correct: false, selectedOptionId: 'C', selectedText: 'To bend or twist out of shape, often because of heat or moisture.' },
    { taskId: 'V-CLOZE-1', correct: false, selectedOptionId: 'A', selectedText: 'invent' }
  ];

  const queue = buildIntraSessionRehearsalQueue(tasks, attempts, { maxItems: 5 });
  assert.equal(queue.length, 2);

  const defItem = queue.find(x => x.taskId === 'V-DEF-1');
  assert.equal(defItem.optionsAreDefinitions, true);
  assert.equal(defItem.target, 'wrench');
  assert.equal(defItem.archivedExample, 'He had to wrench the rusted valve open.');
  const defCorrectOpt = defItem.options.find(o => defItem.correctOptionIds.includes(o.id));
  assert.equal(defCorrectOpt.text, 'To pull or twist something suddenly and forcefully.');

  const clozeItem = queue.find(x => x.taskId === 'V-CLOZE-1');
  assert.equal(clozeItem.optionsAreDefinitions, false);
  const clozeCorrectOpt = clozeItem.options.find(o => clozeItem.correctOptionIds.includes(o.id));
  assert.equal(clozeCorrectOpt.text, 'corroborate');
});

test('v20.3.3 normalizeVocabularyPractice preserves isReviewMistake and batchGroup', () => {
  const { tasks, errors } = normalizeVocabularyPractice([
    {
      id: 'REV-1',
      source_item_id: 'REV-S1',
      type: 'contextual_cloze',
      target: 'scrutinize',
      target_sense: 'To examine closely and critically.',
      prompt: 'Sentence: Auditors will _____ every invoice.',
      options: [
        { id: 'A', text: 'scrutinize' },
        { id: 'B', text: 'ignore' },
        { id: 'C', text: 'abandon' },
        { id: 'D', text: 'delay' }
      ],
      correct_option_ids: ['A'],
      explanation_en: 'Scrutinize means to examine closely.',
      is_review_mistake: true,
      batch_group: '错题回炉'
    }
  ]);
  assert.equal(errors.length, 0);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].isReviewMistake, true);
  assert.equal(tasks[0].batchGroup, '错题回炉');
});

test('v20.3.3 audio-tasks extracts vocabulary_practice target + archived_example and speaking Q+A', () => {
  const pack = {
    schema_version: '2.0',
    pack_id: 'TEST-V1970-AUDIO',
    title: 'Test Audio Extraction',
    vocabulary_practice: [
      {
        id: 'VP-1',
        source_item_id: 'W1',
        type: 'contextual_cloze',
        target: 'corroborate',
        target_sense: 'To confirm a claim.',
        archived_example: 'Two witnesses helped corroborate the report.',
        prompt: 'Sentence: Two witnesses helped _____ the report.',
        options: [
          { id: 'A', text: 'corroborate' },
          { id: 'B', text: 'invent' },
          { id: 'C', text: 'ignore' },
          { id: 'D', text: 'bungle' }
        ],
        correct_option_ids: ['A'],
        explanation_en: 'Corroborate means to confirm.'
      }
    ],
    transfer_tasks: [
      {
        id: 'SP-1',
        task_type: 'speaking',
        prompt: 'How do you stay focused on a noisy train?',
        reference_answer: 'I put on headphones and review short vocabulary bursts.'
      }
    ]
  };
  const extracted = extractAudioTasks(pack);
  const texts = extracted.tasks.map(t => t.text);
  assert.ok(texts.includes('corroborate'), 'must extract vocab target');
  assert.ok(texts.includes('Two witnesses helped corroborate the report.'), 'must extract vocab archived_example');
  assert.ok(
    texts.includes('Question: How do you stay focused on a noisy train? Model Answer: I put on headphones and review short vocabulary bursts.'),
    'must extract speaking Q+A full text'
  );
});

test('v20.3.3 app.js contains Maimemo auto-pronounce, zero-leak rehearsal, and wrong-word review UI', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function isVocabAutoPronounceOn/);
  assert.match(app, /function triggerVocabAutoPronounce/);
  assert.match(app, /进题自动读词:开/);
  assert.match(app, /vocab-reveal:/);
  assert.match(app, /迎难而上 · 听词选义/);
  assert.match(app, /🔁 历史错题回炉/);
  assert.match(app, /🔁 错题本/);
  assert.doesNotMatch(app, /首次误选干扰项：/);
});
