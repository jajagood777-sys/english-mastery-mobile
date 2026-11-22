import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_VERSION,
  normalizeMicroLessons,
  normalizeTransferAttempt,
  mergeTransferAttempts,
  recordsFromLearningPack,
} from '../core.mjs';
import {
  askAiCheckGrammar,
  askAiSpeakingDemoCoach,
  AI_PROVIDERS,
} from '../ai-tutor.mjs';

test('19.6.9 APP_VERSION and microLessons normalization handle YouTube/etymology packs cleanly', () => {
  assert.equal(APP_VERSION, '19.6.9');
  const pack = recordsFromLearningPack({
    pack_id: 'PACK-1520-TEST',
    title: 'All-in-One Micro + Story Pack',
    micro_lessons: [
      {
        title: 'Dropped D in American English (N+D+Consonant)',
        category: 'pronunciation',
        source_url: 'https://www.youtube.com/watch?v=cztw76aM-18',
        rule_summary: 'Drop the /d/ sound when D sits between N and another consonant.',
        examples: [{ word: 'friendship', contrast: 'friennnship', note: 'drop D before sh' }],
        mini_quiz: [{ prompt: 'Which drops D?', options: ['friend is', 'friendship'], answer: 'friendship', explanation: 'N+D+consonant drops D.' }],
      },
    ],
  });
  assert.equal(pack.microLessons.length, 1);
  assert.equal(pack.microLessons[0].examples[0].word, 'friendship');
  assert.equal(pack.microLessons[0].miniQuiz[0].answer, 'friendship');
  assert.equal(normalizeMicroLessons(null).length, 0);
});

test('19.6.9 normalizeTransferAttempt and mergeTransferAttempts preserve aiCritique', () => {
  const a1 = normalizeTransferAttempt({
    id: 'ta-1',
    taskId: 't-grammar-1',
    taskType: 'grammar',
    firstAnswer: 'He go to school yesterday.',
    aiCritique: 'Use past tense: went.',
  });
  assert.equal(a1.aiCritique, 'Use past tense: went.');
  const merged = mergeTransferAttempts([{ id: 'ta-1', taskId: 't-grammar-1', firstAnswer: 'He go' }], [a1]);
  assert.equal(merged[0].aiCritique, 'Use past tense: went.');
});

test('19.6.9 askAiCheckGrammar and askAiSpeakingDemoCoach format Gemini requests cleanly', async () => {
  const cfg = { provider: AI_PROVIDERS.GOOGLE_AI_STUDIO, apiKey: 'test-key', model: 'gemini-2.5-flash' };
  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '1) Correct! 2) Great job.' }] } }] }) };
  };
  const gReply = await askAiCheckGrammar({ prompt: 'Fill in: If I ___ you...', userAnswer: 'were', grammarFocus: '2nd conditional' }, cfg, mockFetch);
  assert.match(gReply, /Correct/);
  const sReply = await askAiSpeakingDemoCoach({ prompt: 'Kids Demo: Colors', userTranscript: 'Look at the red apple!' }, cfg, mockFetch);
  assert.match(sReply, /Correct/);
  assert.equal(calls.length, 2);
});

test('19.6.9 app.js includes story bold-word chips, AI drawer modes, and micro-lessons card', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /story-target-word/);
  assert.match(appSrc, /renderMicroLessonsCard/);
  assert.match(appSrc, /askAiCheckGrammar/);
  assert.match(appSrc, /askAiSpeakingDemoCoach/);
  assert.match(appSrc, /19\.6\.9/);
});
test('19.6.9 storyText, battleReportMarkdown aiCritique, central feedback, and microLessonProgress survive round-trip', async () => {
  const {
    normalizeStoryPractice,
    buildBattleReport,
    battleReportMarkdown,
    buildCentralLearningFeedback,
    validateBackup,
    mergeBackupState,
  } = await import('../core.mjs');

  const sp = normalizeStoryPractice({
    story_id: 's1',
    title: 'Midnight Train',
    sections: [{
      section_id: 'sec-1',
      title: 'Part 1',
      story_text: 'He was **reluctant** to leave the platform.',
      grammar_questions: [{ prompt: 'Rewrite using reluctant: He did not want to leave.', answer: 'He was reluctant to leave.' }],
    }],
  }, 'pack-story-1');
  assert.equal(sp.stories[0].sections[0].storyText, 'He was **reluctant** to leave the platform.');

  const report = buildBattleReport({
    session: { id: 'sess-1', startedAt: '2026-11-19T08:00:00Z', endedAt: '2026-11-19T08:20:00Z', activeMs: 600000, mode: 'daily_journey', packId: 'pack-story-1' },
    attempts: [],
    transferAttempts: [{
      id: 'ta-gram-1',
      taskId: 'gram-1',
      taskType: 'grammar',
      prompt: 'If I ___ you, I would wait.',
      firstAnswer: 'was',
      referenceAnswer: 'were',
      aiCritique: '1) Minor Fix Needed 2) Use subjunctive "were" in 2nd conditional.',
    }],
  });
  const md = battleReportMarkdown(report);
  assert.match(md, /站内 AI 导师辅导记录/);
  assert.match(md, /subjunctive "were"/);
  const fb = buildCentralLearningFeedback({ report });
  assert.match(fb.transfer_evidence[0].ai_critique, /subjunctive "were"/);

  const restored = validateBackup({
    items: [],
    attempts: [],
    sessions: [],
    microLessonProgress: { 'micro:1': { quizAnswers: { q1: { chosen: 'friendship', correct: true } }, completedAt: '2026-11-19T08:10:00Z' } },
  });
  const merged = mergeBackupState({ items: [], attempts: [], sessions: [] }, restored);
  assert.equal(merged.microLessonProgress['micro:1'].quizAnswers.q1.correct, true);

  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appSrc, /story-inline-reader/);
  assert.match(appSrc, /cleanTts/);
  assert.match(appSrc, /initialReply = ""/);
});
