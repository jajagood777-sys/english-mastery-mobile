import { readFileSync } from 'node:fs';
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
  askAiContrastWords,
  GEMINI_TTS_VOICES,
  GEMINI_TTS_DEFAULT_MODEL,
  isGeminiTtsReady,
  pcm16ToWavBytes,
  buildGeminiTtsRequestSpec,
  synthesizeGeminiSpeech
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
    { provider: 'google_ai', apiKey: 'AQ.Ab8DemoKey', model: 'gemini-flash-latest' },
    { systemPrompt: 'sys', userPrompt: 'usr' }
  );
  assert.match(gSpec.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-flash-latest:generateContent$/);
  assert.equal(gSpec.init.headers['x-goog-api-key'], 'AQ.Ab8DemoKey');

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

test('15.1.4 battle report and central feedback include manualReviewMarks from offline lexicon lookup', () => {
  const manualMarks = [
    { word: 'vortex', itemId: 'w:1', markedAt: '2026-11-18T12:00:00Z', packId: 'P-1', source: 'offline_lexicon_lookup' }
  ];
  const report = buildBattleReport({
    session: { id: 'sess-1500', startedAt: '2026-11-18T10:00:00Z', endedAt: '2026-11-18T10:20:00Z', activeMs: 1200000, mode: 'journey' },
    attempts: [],
    items: [],
    manualReviewMarks: manualMarks
  });
  assert.equal(report.app_version, '20.3.3');
  assert.equal(report.manual_review_marks.length, 1);
  assert.equal(report.manual_review_marks[0].word, 'vortex');

  const md = battleReportMarkdown(report);
  assert.match(md, /Manual Review Marks/);
  assert.match(md, /vortex/);

  const fb = buildCentralLearningFeedback({ report });
  assert.equal(fb.manual_review_marks.length, 1);
  assert.equal(fb.manual_review_marks[0].word, 'vortex');
});

test('15.1.4 index.html CSP connect-src permits Google AI Studio and OpenRouter endpoints', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /connect-src[^;]*https:\/\/generativelanguage\.googleapis\.com/);
  assert.match(html, /connect-src[^;]*https:\/\/openrouter\.ai/);
});

test('15.1.4 render() mounts AI dictionary drawer and Pocket Radio drawer and supports selection-to-lookup', () => {
  const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(appJs, /if\(lexiconDrawerOpen\)\{const d=renderOfflineLexiconDrawer\(\)/);
  assert.match(appJs, /if\(radioOpen\)\{const r=renderPocketRadioDrawer\(\)/);
  assert.match(appJs, /function openAiLexiconDrawer/);
  assert.match(appJs, /selectionchange/);
});

test('15.1.4 Gemini TTS request spec, WAV header wrapping, and fallback model work cleanly', async () => {
  assert.ok(GEMINI_TTS_VOICES.length >= 6);
  assert.equal(GEMINI_TTS_DEFAULT_MODEL, 'gemini-3.8-flash-lite-tts');
  assert.equal(isGeminiTtsReady({ provider: 'google_ai', apiKey: 'AQ.Ab8DemoKey123' }), true);
  assert.equal(isGeminiTtsReady({ provider: 'openrouter', apiKey: 'sk-or-v1-abc123' }), false);

  const spec = buildGeminiTtsRequestSpec('Hello world.', {
    provider: 'google_ai',
    apiKey: 'AQ.Ab8DemoKey123',
    ttsVoice: 'Aoede',
    ttsModel: 'gemini-3.8-flash-lite-tts'
  });
  assert.match(spec.url, /gemini-3\.8-flash-lite-tts:generateContent$/);
  assert.equal(spec.init.headers['x-goog-api-key'], 'AQ.Ab8DemoKey123');
  const parsedBody = JSON.parse(spec.init.body);
  assert.deepEqual(parsedBody.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(parsedBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Aoede');

  const rawPcm = new Uint8Array([1, 2, 3, 4]);
  const wav = pcm16ToWavBytes(rawPcm, 24000, 1);
  assert.equal(wav.byteLength, 48);
  assert.equal(String.fromCharCode(wav[0], wav[1], wav[2], wav[3]), 'RIFF');
  assert.equal(String.fromCharCode(wav[8], wav[9], wav[10], wav[11]), 'WAVE');

  let calls = 0;
  const mockFetch = async (url) => {
    calls++;
    if (calls === 1) {
      assert.match(url, /gemini-3\.8-flash-lite-tts/);
      return { ok: false, status: 404, text: async () => 'not found' };
    }
    assert.match(url, /gemini-3\.8-flash-tts/);
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'audio/L16;codec=pcm;rate=24000',
                data: Buffer.from(rawPcm).toString('base64')
              }
            }]
          }
        }]
      })
    };
  };
  const audio = await synthesizeGeminiSpeech('Hello world.', {
    provider: 'google_ai',
    apiKey: 'AQ.Ab8DemoKey123',
    ttsVoice: 'Kore'
  }, mockFetch);
  assert.equal(calls, 2);
  assert.equal(audio.mimeType, 'audio/wav');
  assert.equal(audio.modelUsed, 'gemini-3.8-flash-tts');
  assert.equal(String.fromCharCode(audio.bytes[0], audio.bytes[1], audio.bytes[2], audio.bytes[3]), 'RIFF');
});
