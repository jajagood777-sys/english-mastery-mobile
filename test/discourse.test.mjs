import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDiscourseAndChunks,
  analyzeReadingPassageMetrics,
  matchesExpressionInText,
  normalizeStem
} from '../discourse.mjs';
import {
  buildIntraSessionRehearsalQueue,
  summarizeVocabularyPractice
} from '../vocab.mjs';
import {
  buildCdtlCard,
  buildInterferenceRadar
} from '../cdtl.mjs';

test('discourse engine detects morphological inflections of target phrases and cohesion markers without faking AI scores', () => {
  const userDraft = 'Although rapid urbanization creates severe constraints on municipal water grids, engineers have mitigated these risks. Consequently, the new underground vortex chamber prevents flooding. For instance, peak drainage efficiency rose significantly.';
  const reference = 'While rapid urbanization imposes severe constraints on infrastructure, engineers can mitigate flood risks by constructing a vortex chamber to accelerate drainage.';

  const result = analyzeDiscourseAndChunks(userDraft, {
    referenceText: reference,
    targetPhrases: ['constraint', 'mitigate', 'vortex', 'impose on'],
    packTargets: ['urbanization', 'drainage', 'expertise']
  });

  assert.equal(result.isAutomatedScore, false);
  assert.ok(result.wordCount >= 25);
  assert.equal(result.sentenceCount, 3);
  assert.ok(result.targetHits.includes('constraint'), 'matches plural constraints to constraint');
  assert.ok(result.targetHits.includes('mitigate'), 'matches inflected mitigated to mitigate');
  assert.ok(result.targetHits.includes('vortex'));
  assert.ok(result.targetMissed.includes('impose on'));
  assert.ok(result.packHits.includes('urbanization'));
  assert.ok(result.packHits.includes('drainage'));
  assert.ok(result.cohesionUsed.includes('although'));
  assert.ok(result.cohesionUsed.includes('consequently'));
  assert.ok(result.cohesionUsed.includes('for instance'));
  assert.equal(result.cohesionCategoryCount, 3);
  assert.ok(result.upgradeSuggestions.some(s => s.expression === 'impose on'));
});

test('reading passage metrics calculate word count, pack coverage, and guard WPM under 10 seconds', () => {
  const passage = 'A powerful vortex formed beneath the bridge as the floodwater rushed downstream. Geological expertise helped engineers overcome every constraint.';
  const early = analyzeReadingPassageMetrics(passage, 4000, ['vortex', 'expertise', 'constraint', 'unseen']);
  assert.equal(early.wordCount, 19);
  assert.equal(early.observedWpm, null, 'does not report distorted WPM under 10s');
  assert.equal(early.matchedPackCount, 3);

  const valid = analyzeReadingPassageMetrics(passage, 12000, ['vortex', 'expertise']);
  assert.equal(valid.observedWpm, 95);
});

test('intra-session rehearsal queue selects up to 5 first-attempt errors with diminishing first-letter cues', () => {
  const tasks = [
    {
      id: 'V-1',
      sourceItemId: 'W-1',
      target: 'vortex',
      targetSense: 'A rapidly rotating mass of water.',
      archivedExample: 'A vortex formed beneath the bridge.',
      prompt: 'Choose the right word.',
      options: [{ id: 'A', text: 'expertise' }, { id: 'C', text: 'vortex' }],
      correctOptionIds: ['C'],
      explanationEn: 'Source meaning: A rapidly rotating mass of water.'
    },
    {
      id: 'V-2',
      sourceItemId: 'W-2',
      target: 'constraint',
      targetSense: 'A limitation or restriction.',
      archivedExample: 'Budget constraints delayed the build.',
      prompt: 'Choose the right word.',
      options: [{ id: 'A', text: 'constraint' }, { id: 'B', text: 'valve' }],
      correctOptionIds: ['A'],
      explanationEn: 'Source meaning: A limitation or restriction.'
    }
  ];
  const attempts = [
    { taskId: 'V-1', selectedOptionId: 'A', selectedText: 'expertise', correct: false, firstCheck: { correct: false } },
    { taskId: 'V-2', selectedOptionId: 'A', selectedText: 'constraint', correct: true, firstCheck: { correct: true } }
  ];

  const queue = buildIntraSessionRehearsalQueue(tasks, attempts, { maxItems: 5 });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].taskId, 'V-1');
  assert.equal(queue[0].firstLetterCue, 'v_____ (6 letters)');
  assert.equal(queue[0].maskedExample, 'A _____ formed beneath the bridge.');

  // After marking rehearsalCompleted, queue is empty
  attempts[0].rehearsalCompleted = true;
  attempts[0].rehearsalPassed = true;
  const afterQueue = buildIntraSessionRehearsalQueue(tasks, attempts, { maxItems: 5 });
  assert.equal(afterQueue.length, 0);

  const summary = summarizeVocabularyPractice(tasks, attempts);
  assert.equal(summary.rehearsedCorrect, 1);
});

test('interference radar aggregates confused target-distractor pairs with contrast anchors', () => {
  const archive = [
    { id: 'W-1', target: 'vortex', definition_en: 'Rotating mass of water.', example: 'A vortex formed.' },
    { id: 'W-2', target: 'expertise', definition_en: 'Specialist skill or knowledge.', example: 'Geological expertise.' }
  ];
  const tasks = [
    {
      id: 'V-1',
      sourceItemId: 'W-1',
      type: 'contextual_cloze',
      target: 'vortex',
      targetSense: 'Rotating mass of water.',
      prompt: 'A _____ formed.',
      options: [{ id: 'A', text: 'expertise' }, { id: 'C', text: 'vortex' }],
      correctOptionIds: ['C'],
      explanationEn: 'Source meaning: Rotating mass of water.'
    }
  ];
  const attempts = [
    { taskId: 'V-1', selectedOptionId: 'A', correct: false, firstCheck: { correct: false } }
  ];

  const card = buildCdtlCard(tasks[0], 'A', archive);
  assert.ok(card.contrastAnchor.includes('vortex'));
  assert.ok(card.contrastAnchor.includes('expertise'));

  const radar = buildInterferenceRadar(tasks, attempts, archive);
  assert.equal(radar.totalConfusedPairs, 1);
  assert.equal(radar.pairs[0].target, 'vortex');
  assert.equal(radar.pairs[0].distractor, 'expertise');
});

import { buildBattleReport, battleReportMarkdown, buildCentralLearningFeedback } from '../core.mjs';

test('15.1.4 battle report, markdown, and central feedback include discourse X-Ray, interference radar, reading metrics, and FSRS shadow', () => {
  const archive = [
    { id: 'W-1', target: 'vortex', definition_en: 'Rotating mass of water.', example: 'A vortex formed.' },
    { id: 'W-2', target: 'expertise', definition_en: 'Specialist skill.', example: 'Geological expertise.' }
  ];
  const vocabTasks = [
    {
      id: 'V-1',
      sourceItemId: 'W-1',
      type: 'contextual_cloze',
      target: 'vortex',
      targetSense: 'Rotating mass of water.',
      prompt: 'A _____ formed.',
      options: [{ id: 'A', text: 'expertise' }, { id: 'C', text: 'vortex' }],
      correctOptionIds: ['C'],
      explanationEn: 'Source meaning: Rotating mass of water.'
    }
  ];
  const vocabAttempts = [
    { taskId: 'V-1', selectedOptionId: 'A', correct: false, firstCheck: { correct: false }, rehearsalCompleted: true, rehearsalPassed: true }
  ];
  const transferAttempts = [
    {
      id: 'ta-1',
      taskId: 't-1',
      taskType: 'writing',
      prompt: 'Explain flood control.',
      firstAnswer: 'Although floodwaters create a dangerous vortex, engineers rely on expertise. Therefore, the bridge remains safe.',
      referenceAnswer: 'Although floodwaters form a vortex, engineering expertise keeps the structure resilient.',
      targetPhrases: ['vortex', 'expertise', 'resilient'],
      rating: 'K'
    }
  ];
  const readings = [
    { id: 'r-1', title: 'Bridge Hydraulics', text: 'A vortex formed beneath the bridge. Engineers used geological expertise to study the flow.' }
  ];
  const report = buildBattleReport({
    session: { id: 'sess-1101', startedAt: '2026-11-18T10:00:00Z', endedAt: '2026-11-18T10:20:00Z', activeMs: 1200000, mode: 'journey' },
    attempts: [],
    items: [],
    readings,
    transferAttempts,
    vocabularyTasks: vocabTasks,
    vocabularyAttempts: vocabAttempts,
    originalWordArchive: archive
  });

  assert.equal(report.app_version, '20.1.1');
  assert.equal(report.discourse_summary.analyzedResponses, 1);
  assert.ok(report.discourse_summary.targetHits.includes('vortex'));
  assert.ok(report.discourse_summary.targetMissed.includes('resilient'));
  assert.ok(report.discourse_summary.cohesionMarkersUsed.includes('although'));
  assert.equal(report.reading_analysis.passage_metrics.length, 1);
  assert.equal(report.reading_analysis.passage_metrics[0].matchedPackCount, 2);
  assert.equal(report.vocabulary_practice_evidence.interferenceRadar.totalConfusedPairs, 1);

  const md = battleReportMarkdown(report);
  assert.match(md, /Objective Expression X-Ray/);
  assert.match(md, /Smart Vocabulary & Interference Radar/);
  assert.match(md, /FSRS 6\.3\.2 Shadow Stability/);
  assert.match(md, /YANDAO-PACK-GEN-11\.0/);
  assert.doesNotMatch(md, /保存到原有 Notion/);

  const feedback = buildCentralLearningFeedback({ report });
  assert.equal(feedback.feedback_schema_version, '1.0');
  assert.equal(feedback.vocabulary_recognition_evidence.counts_as_mastery_K, false);
  assert.equal(feedback.vocabulary_recognition_evidence.interference_radar.totalConfusedPairs, 1);
  assert.equal(feedback.discourse_summary.analyzedResponses, 1);
  assert.ok(feedback.fsrs_shadow_summary);
});
