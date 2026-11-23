import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VOCAB_QUESTION_TYPES,
  validateVocabularyTask,
  normalizeVocabularyPractice,
  evaluateVocabularyChoice,
  summarizeVocabularyPractice
} from '../vocab.mjs';
import {
  buildCdtlCard,
  buildCdtlBatchFromAttempts
} from '../cdtl.mjs';
import {
  APP_VERSION,
  recordsFromLearningPack,
  validateBackup,
  homeSummary,
  buildBattleReport,
  fsrsShadowStep,
  replayFsrsShadowHistory
} from '../core.mjs';

test('15.1.4 vocab engine validates 14 types and grades recognition honestly without counting as K', () => {
  assert.equal(APP_VERSION, '19.7.1');
  assert.equal(VOCAB_QUESTION_TYPES.length, 14);

  const sampleTask = {
    id: 'V22-SMART-20261115-W001',
    source_item_id: '20261115-W001',
    type: 'contextual_cloze',
    target_sense: 'A rapidly rotating mass of air or water.',
    prompt: 'Choose the word that best completes this source sentence: A _____ formed beneath the bridge.',
    options: [
      { id: 'A', text: 'expertise' },
      { id: 'B', text: 'valve' },
      { id: 'C', text: 'vortex' },
      { id: 'D', text: 'constraint' }
    ],
    correct_option_ids: ['C'],
    explanation_en: 'Source meaning: A rapidly rotating mass of air or water. Original example: A vortex formed beneath the bridge.'
  };

  const checked = validateVocabularyTask(sampleTask, 0);
  assert.equal(checked.valid, true);
  assert.equal(checked.task.target, '');

  const rightEval = evaluateVocabularyChoice(checked.task, 'C');
  assert.equal(rightEval.status, 'correct');
  assert.equal(rightEval.correct, true);
  assert.equal(rightEval.recognitionOnly, true);
  assert.equal(rightEval.countsAsMasteryK, false);

  const wrongEval = evaluateVocabularyChoice(checked.task, 'A');
  assert.equal(wrongEval.status, 'incorrect');
  assert.equal(wrongEval.correct, false);
  assert.equal(wrongEval.countsAsMasteryK, false);
});

test('15.1.4 CDTL builds side-by-side target and distractor cards from archive', () => {
  const archive = [
    { id: '20261115-W001', target: 'vortex', definition_en: 'A whirling mass of fluid or air.', example: 'A vortex formed beneath the bridge.' },
    { id: '20261115-W002', target: 'valve', definition_en: 'A device for controlling passage of fluid.', example: 'Turn off the main intake valve.' }
  ];
  const { tasks, errors } = normalizeVocabularyPractice([
    {
      id: 'V22-SMART-W001',
      source_item_id: '20261115-W001',
      type: 'contextual_cloze',
      prompt: 'A _____ formed beneath the bridge.',
      options: [
        { id: 'A', text: 'valve' },
        { id: 'B', text: 'vortex' }
      ],
      correct_option_ids: ['B'],
      explanation_en: 'Source meaning: A whirling mass of fluid.'
    }
  ], archive, 'PACK-V22');

  assert.equal(errors.length, 0);
  assert.equal(tasks[0].target, 'vortex');

  const card = buildCdtlCard(tasks[0], 'A', archive);
  assert.equal(card.isErrorComparison, true);
  assert.equal(card.correct.expression, 'vortex');
  assert.equal(card.chosenDistractor.expression, 'valve');
  assert.match(card.chosenDistractor.senseEn, /controlling passage of fluid/);

  const batch = buildCdtlBatchFromAttempts(tasks, [{ taskId: 'V22-SMART-W001', selectedOptionId: 'A', correct: false }], archive);
  assert.equal(batch.length, 1);
});

test('15.1.4 recordsFromLearningPack parses real V22 110 touch-choice JSON and preserves vocabulary stage in backup', () => {
  const v22Path = new URL('../../downloads/v22_touch_mc_110.json', import.meta.url);
  if (!fs.existsSync(v22Path)) return;
  const raw = JSON.parse(fs.readFileSync(v22Path, 'utf8'));
  const parsed = recordsFromLearningPack(raw);

  assert.equal(parsed.pack.packId, 'EN-DAILY-20261115-V22-MOMO-RECALL-TRANSFER-001');
  assert.equal(parsed.vocabularyPractice.length, 110);
  assert.equal(parsed.originalWordArchive.length, 110);
  assert.equal(parsed.items.length, 27);
  assert.equal(parsed.readings.length, 4);

  const summary = summarizeVocabularyPractice(parsed.vocabularyPractice, [
    { taskId: parsed.vocabularyPractice[0].id, selectedOptionId: parsed.vocabularyPractice[0].correctOptionIds[0], correct: true }
  ]);
  assert.equal(summary.total, 110);
  assert.equal(summary.answered, 1);
  assert.equal(summary.correctFirst, 1);
  assert.equal(summary.remaining, 109);

  // Validate backup with vocabulary stage in dailyJourney.steps
  const state = validateBackup({
    items: parsed.items,
    attempts: [],
    sessions: [],
    readings: parsed.readings,
    speeches: parsed.speeches,
    dailyPack: { ...parsed.pack, itemIds: parsed.items.map(x => x.id) },
    dailyJourney: {
      id: 'journey:v22:test',
      packId: parsed.pack.packId,
      startedAt: '2026-11-18T10:00:00Z',
      steps: ['vocabulary', 'sentences', 'reading', 'listening', 'speech', 'transfer'],
      index: 0,
      vocabularyIndex: 5,
      vocabularyMs: 30000,
      vocabularyAttempts: [{ id: 'va1', taskId: parsed.vocabularyPractice[0].id, selectedOptionId: 'C', correct: true }],
      completed: [],
      sessionIds: []
    }
  });
  assert.ok(state.dailyJourney);
  assert.equal(state.dailyJourney.steps[0], 'vocabulary');
  assert.equal(state.dailyJourney.vocabularyIndex, 5);
  assert.equal(homeSummary(state).packItems, 137);
});

test('15.1.4 FSRS 6.3.2 shadow scheduler tracks only independent recall and excludes recognition choices', () => {
  const step1 = fsrsShadowStep(null, 'K', new Date('2026-11-10T08:00:00Z'));
  assert.equal(step1.model, 'fsrs-6.3.2-shadow');
  assert.ok(step1.stability > 2.0);
  assert.ok(step1.intervalDays >= 2);

  const shadow = replayFsrsShadowHistory([
    { itemId: 'w:1', rating: 'K', prompt_used: false, viewed_answer: false, attempt_timestamp: '2026-11-10T08:00:00Z' },
    { itemId: 'w:2', rating: 'K', prompt_used: true, viewed_answer: false, attempt_timestamp: '2026-11-10T08:05:00Z' },
    { itemId: 'w:3', rating: 'UNRATED', evidence_type: 'recognition_only', attempt_timestamp: '2026-11-10T08:10:00Z' }
  ], new Date('2026-11-18T08:00:00Z'));

  assert.equal(shadow.qualifiedIndependentEvents, 1);
  assert.equal(shadow.excludedNonIndependentOrUnrated, 2);
  assert.equal(shadow.trackedCards, 1);
  assert.equal(shadow.shadowDueCount, 1);

  const report = buildBattleReport({
    session: { id: 's-v22', startedAt: '2026-11-18T08:00:00Z', activeMs: 60000, mode: 'journey', packId: 'p1' },
    attempts: [{ id: 'a1', sessionId: 's-v22', itemId: 'w:1', kind: 'word', status: 'K', prompt_used: false, viewed_answer: false, at: '2026-11-18T08:00:30Z' }],
    items: [{ id: 'w:1', kind: 'word', target: 'vortex' }],
    vocabularyTasks: [{ id: 'vt1', correctOptionIds: ['A'], options: [{ id: 'A', text: 'vortex' }] }],
    vocabularyAttempts: [{ id: 'va1', taskId: 'vt1', selectedOptionId: 'A', correct: true }]
  });
  assert.equal(report.vocabulary_practice_evidence.summary.answered, 1);
  assert.equal(report.fsrs_shadow.qualifiedIndependentEvents, 1);
  assert.equal(report.data_quality.choice_recognition_never_counted_as_K, true);
});
