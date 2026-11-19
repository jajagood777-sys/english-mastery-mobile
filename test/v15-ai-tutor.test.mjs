import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_CONFIG_KEY,
  AI_PROVIDERS,
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  isAiTutorReady,
  buildAiRequestSpec,
  askAiCritiqueOutput,
  askAiExplainSentence,
  askAiContrastWords
} from '../ai-tutor.mjs';
import { buildBattleReport, battleReportMarkdown, buildCentralLearningFeedback } from '../core.mjs';

test('AI tutor config saves, loads, and clears in isolated localStorage without touching learner data', () => {
  const mem = new Map();
  const fakeStorage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k)
  };
  assert.equal(isAiTutorReady(loadAiConfig(fakeStorage)), false);
  assert.equal(saveAiConfig({ provider: 'openrouter', apiKey: 'sk-or-v1-test123456', model: 'openrouter/free' }, fakeStorage), true);
  assert.ok(mem.has(AI_CONFIG_KEY));
  const loaded = loadAiConfig(fakeStorage);
  assert.equal(loaded.provider, 'openrouter');
  assert.equal(isAiTutorReady(loaded), true);
  clearAiConfig(fakeStorage);
  assert.equal(isAiTutorReady(loadAiConfig(fakeStorage)), false);
});

test('AI request spec formats OpenRouter and Google AI Studio requests cleanly and parses replies', async () => {
  const orSpec = buildAiRequestSpec(
    { provider: 'openrouter', apiKey: 'sk-or-v1-demo', model: 'openrouter/free' },
    { systemPrompt: 'sys', userPrompt: 'usr' }
  );
  assert.equal(orSpec.url, AI_PROVIDERS.openrouter.endpoint);
  assert.match(orSpec.init.headers.Authorization, /Bearer sk-or-v1-demo/);

  const gSpec = buildAiRequestSpec(
    { provider: 'google_ai', apiKey: 'AIzaSyDemoKey', model: 'gemini-2.5-flash' },
    { systemPrompt: 'sys', userPrompt: 'usr' }
  );
  assert.match(gSpec.url, /generativelanguage\.googleapis\.com/);

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '1) 亮点清晰 2) 建议改为 mitigate' } }] })
  });
  const reply = await askAiCritiqueOutput(
    { prompt: 'Explain climate risk.', userAnswer: 'Cities must reduce flood risk.' },
    { provider: 'openrouter', apiKey: 'sk-or-v1-demo', model: 'openrouter/free' },
    mockFetch
  );
  assert.match(reply, /mitigate/);
});

test('15.1.0 battle report and central feedback include manualReviewMarks from offline lexicon lookup', () => {
  const manualMarks = [
    { word: 'vortex', itemId: 'w:1', markedAt: '2026-11-18T12:00:00Z', packId: 'P-1', source: 'offline_lexicon_lookup' }
  ];
  const report = buildBattleReport({
    session: { id: 'sess-1500', startedAt: '2026-11-18T10:00:00Z', endedAt: '2026-11-18T10:20:00Z', activeMs: 1200000, mode: 'journey' },
    attempts: [],
    items: [],
    manualReviewMarks: manualMarks
  });
  assert.equal(report.app_version, '15.1.0');
  assert.equal(report.manual_review_marks.length, 1);
  assert.equal(report.manual_review_marks[0].word, 'vortex');

  const md = battleReportMarkdown(report);
  assert.match(md, /Manual Review Marks/);
  assert.match(md, /vortex/);

  const fb = buildCentralLearningFeedback({ report });
  assert.equal(fb.manual_review_marks.length, 1);
  assert.equal(fb.manual_review_marks[0].word, 'vortex');
});
