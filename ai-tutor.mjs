/**
 * BYOK AI English Tutor & Gemini TTS Engine (15.1.4)
 * Supports Google AI Studio (Gemini chat + Gemini TTS), OpenRouter free router,
 * and any OpenAI-compatible endpoint.
 *
 * SECURITY & PRIVACY RULES:
 * 1. API keys are stored ONLY in isolated localStorage (`yandao-ai-tutor-config.v1`),
 *    NEVER embedded in repository code, NEVER included in exported backups or Battle Reports.
 * 2. AI feedback is strictly supplementary coaching and NEVER alters K/V/N or FSRS evidence.
 */

export const AI_CONFIG_KEY = 'yandao-ai-tutor-config.v1';

export const GEMINI_TTS_DEFAULT_MODEL = 'gemini-3.8-flash-lite-tts';
export const GEMINI_TTS_FALLBACK_MODEL = 'gemini-2.5-flash-preview-tts';
export const GEMINI_TTS_DEFAULT_VOICE = 'Kore';

export const GEMINI_TTS_VOICES = Object.freeze([
  { id: 'Kore', label: 'Kore · 清晰沉稳（推荐）' },
  { id: 'Aoede', label: 'Aoede · 自然轻快' },
  { id: 'Sadaltager', label: 'Sadaltager · 学术朗读' },
  { id: 'Charon', label: 'Charon · 播音男声' },
  { id: 'Puck', label: 'Puck · 活力口语' },
  { id: 'Zephyr', label: 'Zephyr · 明亮清晰' },
  { id: 'Sulafat', label: 'Sulafat · 温暖柔和' },
  { id: 'Fenrir', label: 'Fenrir · 富有表现力' }
]);

export const AI_PROVIDERS = Object.freeze({
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter 免费路由（推荐，免绑卡）',
    defaultModel: 'openrouter/free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyHint: 'sk-or-v1-...'
  },
  google_ai: {
    id: 'google_ai',
    label: 'Google AI Studio（免费层）',
    defaultModel: 'gemini-flash-latest',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyHint: 'AQ.Ab8... 或 AIzaSy...'
  },
  openai_compatible: {
    id: 'openai_compatible',
    label: '自定义 OpenAI 兼容接口（国内直连可用）',
    defaultModel: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyHint: 'sk-...'
  }
});

const cleanAi = value => String(value ?? '').replace(/\r/g, '').trim();

const validVoiceId = voice => {
  const v = cleanAi(voice);
  return GEMINI_TTS_VOICES.some(item => item.id === v) ? v : GEMINI_TTS_DEFAULT_VOICE;
};

export function defaultAiConfig() {
  return {
    provider: 'google_ai',
    apiKey: '',
    model: AI_PROVIDERS.google_ai.defaultModel,
    customEndpoint: '',
    ttsVoice: GEMINI_TTS_DEFAULT_VOICE,
    ttsModel: GEMINI_TTS_DEFAULT_MODEL
  };
}

export function loadAiConfig(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const base = defaultAiConfig();
  if (!storage) return base;
  try {
    const raw = storage.getItem(AI_CONFIG_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const provider = AI_PROVIDERS[parsed?.provider] ? parsed.provider : 'google_ai';
    return {
      provider,
      apiKey: cleanAi(parsed?.apiKey),
      model: (provider === 'google_ai' && cleanAi(parsed?.model) === 'gemini-2.5-flash' ? AI_PROVIDERS.google_ai.defaultModel : cleanAi(parsed?.model)) || AI_PROVIDERS[provider].defaultModel,
      customEndpoint: cleanAi(parsed?.customEndpoint),
      ttsVoice: validVoiceId(parsed?.ttsVoice),
      ttsModel: cleanAi(parsed?.ttsModel) || GEMINI_TTS_DEFAULT_MODEL
    };
  } catch {
    return base;
  }
}

export function saveAiConfig(config = {}, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  const prev = loadAiConfig(storage);
  const merged = { ...prev, ...config };
  const provider = AI_PROVIDERS[merged.provider] ? merged.provider : 'google_ai';
  const safe = {
    provider,
    apiKey: cleanAi(merged.apiKey),
    model: cleanAi(merged.model) || AI_PROVIDERS[provider].defaultModel,
    customEndpoint: cleanAi(merged.customEndpoint),
    ttsVoice: validVoiceId(merged.ttsVoice),
    ttsModel: cleanAi(merged.ttsModel) || GEMINI_TTS_DEFAULT_MODEL
  };
  try {
    storage.setItem(AI_CONFIG_KEY, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}

export function clearAiConfig(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  try {
    storage.removeItem(AI_CONFIG_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isAiTutorReady(config = null) {
  const cfg = config || loadAiConfig();
  return Boolean(cfg && cleanAi(cfg.apiKey).length >= 8);
}

export function isGeminiTtsReady(config = null) {
  const cfg = config || loadAiConfig();
  const key = cleanAi(cfg?.apiKey);
  if (key.length < 8) return false;
  return cfg?.provider === 'google_ai' || key.startsWith('AQ.') || key.startsWith('AIza');
}

/**
 * Decodes a base64 string into a Uint8Array in both browser and Node runtimes.
 */
export function base64ToBytes(b64) {
  const cleaned = String(b64 || '').replace(/\s+/g, '');
  if (!cleaned) return new Uint8Array(0);
  if (typeof atob === 'function') {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(cleaned, 'base64'));
}

/**
 * Wraps raw signed 16-bit little-endian PCM bytes in a standard 44-byte RIFF/WAVE header.
 */
export function pcm16ToWavBytes(pcmBytes, sampleRate = 24000, channels = 1) {
  const pcm = pcmBytes instanceof Uint8Array ? pcmBytes : new Uint8Array(pcmBytes || 0);
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const wav = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(wav.buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  wav.set(pcm, 44);
  return wav;
}

/**
 * Builds the REST request spec for Google AI Studio Gemini TTS (`generateContent` with AUDIO modality).
 */
export function buildGeminiTtsRequestSpec(text, config = null, modelOverride = '') {
  const cfg = config || loadAiConfig();
  const apiKey = cleanAi(cfg?.apiKey);
  if (!apiKey) throw Error('尚未配置 Google AI Studio API Key，无法调用 Gemini 语音。');
  const voiceName = validVoiceId(cfg?.ttsVoice);
  const model = cleanAi(modelOverride) || cleanAi(cfg?.ttsModel) || GEMINI_TTS_DEFAULT_MODEL;
  const cleanText = cleanAi(text).slice(0, 1800);
  if (!cleanText) throw Error('没有可朗读的文本。');
  const url = `${AI_PROVIDERS.google_ai.endpoint}/${encodeURIComponent(model)}:generateContent`;
  return {
    url,
    model,
    voiceName,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: cleanText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      })
    }
  };
}

function hasRiffWavHeader(bytes) {
  return bytes.byteLength >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
}

/**
 * Synthesizes natural English speech via Gemini TTS and returns playable WAV/audio bytes.
 * Automatically wraps raw L16/PCM responses in a standard WAV header and falls back to
 * `gemini-2.5-flash-preview-tts` if the primary TTS model returns 404/400/503.
 */
export async function synthesizeGeminiSpeech(text, config = null, fetchImpl = typeof fetch !== 'undefined' ? fetch : null) {
  const cfg = config || loadAiConfig();
  if (!fetchImpl) throw Error('当前环境不支持网络请求。');
  const primaryModel = cleanAi(cfg?.ttsModel) || GEMINI_TTS_DEFAULT_MODEL;
  const modelsToTry = primaryModel === GEMINI_TTS_FALLBACK_MODEL
    ? [primaryModel]
    : [primaryModel, GEMINI_TTS_FALLBACK_MODEL];

  let lastError = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const spec = buildGeminiTtsRequestSpec(text, cfg, model);
    const resp = await fetchImpl(spec.url, spec.init);
    if (!resp.ok) {
      let errText = '';
      try { errText = (await resp.text()).slice(0, 180); } catch {}
      lastError = Error(`Gemini 语音接口返回 ${resp.status}${errText ? `：${errText}` : ''}`);
      if (i + 1 < modelsToTry.length && (resp.status === 404 || resp.status === 400 || resp.status === 503)) {
        continue;
      }
      throw lastError;
    }
    const json = await resp.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p?.inlineData?.data);
    if (!audioPart?.inlineData?.data) {
      throw Error('Gemini 语音接口未返回音频数据。');
    }
    const rawBytes = base64ToBytes(audioPart.inlineData.data);
    const rawMime = String(audioPart.inlineData.mimeType || 'audio/wav');
    const lowerMime = rawMime.toLowerCase();
    let finalBytes = rawBytes;
    let finalMime = rawMime;
    if (lowerMime.includes('audio/l16') || lowerMime.includes('audio/pcm') || (!hasRiffWavHeader(rawBytes) && !lowerMime.includes('mpeg') && !lowerMime.includes('mp3') && !lowerMime.includes('ogg') && !lowerMime.includes('mp4'))) {
      const rateMatch = lowerMime.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? Number(rateMatch[1]) || 24000 : 24000;
      finalBytes = pcm16ToWavBytes(rawBytes, sampleRate, 1);
      finalMime = 'audio/wav';
    } else if (hasRiffWavHeader(rawBytes)) {
      finalMime = 'audio/wav';
    }
    return {
      bytes: finalBytes,
      mimeType: finalMime,
      modelUsed: spec.model,
      voiceUsed: spec.voiceName
    };
  }
  throw lastError || Error('Gemini 语音合成失败。');
}

/**
 * Builds the HTTP request spec for either Google AI Studio or OpenAI-compatible APIs.
 */
export function buildAiRequestSpec(config, { systemPrompt, userPrompt }) {
  const provider = AI_PROVIDERS[config?.provider] ? config.provider : 'google_ai';
  const apiKey = cleanAi(config?.apiKey);
  const model = cleanAi(config?.model) || AI_PROVIDERS[provider].defaultModel;
  if (!apiKey) throw Error('尚未配置 API Key。请先前往「设置 → 随身 AI 导师」粘贴你的免费 Key。');

  if (provider === 'google_ai') {
    const url = `${AI_PROVIDERS.google_ai.endpoint}/${encodeURIComponent(model)}:generateContent`;
    return {
      url,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 650 }
        })
      },
      parser: json => cleanAi(json?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n'))
    };
  }

  const endpoint = provider === 'openai_compatible' && cleanAi(config?.customEndpoint)
    ? cleanAi(config.customEndpoint)
    : AI_PROVIDERS[provider].endpoint;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = typeof location !== 'undefined' ? location.origin : 'https://jajagood777-sys.github.io';
    headers['X-Title'] = 'YanDao English Cultivation';
  }
  return {
    url: endpoint,
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 650,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    },
    parser: json => cleanAi(json?.choices?.[0]?.message?.content)
  };
}

async function runAiPrompt(systemPrompt, userPrompt, config = null, fetchImpl = typeof fetch !== 'undefined' ? fetch : null) {
  const cfg = config || loadAiConfig();
  if (!fetchImpl) throw Error('当前环境不支持网络请求。');
  const spec = buildAiRequestSpec(cfg, { systemPrompt, userPrompt });
  const resp = await fetchImpl(spec.url, spec.init);
  if (!resp.ok) {
    let errText = '';
    try { errText = (await resp.text()).slice(0, 180); } catch {}
    throw Error(`AI 接口返回状态 ${resp.status}${errText ? `：${errText}` : ''}`);
  }
  const json = await resp.json();
  const reply = spec.parser(json);
  if (!reply) throw Error('AI 接口返回了空内容，请检查模型名称或稍后重试。');
  return reply;
}

export async function askAiCritiqueOutput({ prompt = '', userAnswer = '', referenceAnswer = '' } = {}, config = null, fetchImpl = undefined) {
  const sys = 'You are an encouraging IELTS Band 8+ English coach. Teach English IN ENGLISH (concise, crystal-clear English, no Chinese unless asked). Never fabricate an official IELTS band score. Structure: 1) Key Strength 2) Exact Grammar & Word-Choice Fixes (max 3) 3) Two Natural Band-8 Upgrades.';
  const usr = `题目：${cleanAi(prompt)}\n学生英文初答：${cleanAi(userAnswer)}\n参考表达：${cleanAi(referenceAnswer) || '无'}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}

export async function askAiExplainSentence({ sentence = '', context = '' } = {}, config = null, fetchImpl = undefined) {
  const sys = 'You are a concise English reading coach. Explain IN CLEAR ENGLISH ONLY (English-to-English immersion): 1) Core Clause Skeleton 2) Key Vocabulary & Collocations in Context 3) Plain-English Paraphrase + 1 Fresh Model Sentence.';
  const usr = `选中英文句子：${cleanAi(sentence)}\n所在段落语境：${cleanAi(context).slice(0, 500)}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}

export async function askAiContrastWords({ target = '', distractor = '', context = '' } = {}, config = null, fetchImpl = undefined) {
  const sys = 'You are a lexical nuance coach. Explain IN CLEAR ENGLISH ONLY: 1) Core Meaning Boundary 2) Typical Collocations 3) Two Contrasting Example Sentences.';
  const usr = `目标词：${cleanAi(target)}\n误选干扰词：${cleanAi(distractor)}\n原题语境：${cleanAi(context)}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}

export async function testAiTutorConnection(config = null, fetchImpl = undefined) {
  return runAiPrompt(
    'Reply in 1 short sentence confirming the AI tutor connection is active.',
    'Say hello to YanDao English Cultivation.',
    config,
    fetchImpl
  );
}

export async function askAiDictionary({ query = '', context = '' } = {}, config = null, fetchImpl = undefined) {
  const sys = 'You are an English-to-English learner dictionary (like Oxford/Longman). Respond IN CLEAR, NATURAL ENGLISH ONLY (no Chinese). Format concisely: 1) Part of speech & plain-English definition 2) 3 natural collocations 3) 2 vivid example sentences 4) 1 easily confused synonym and how it differs.';
  const usr = `Look up: "${cleanAi(query)}"${context ? `\nContext: ${cleanAi(context).slice(0, 300)}` : ''}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}

export async function askAiFreeTutor({ question = '', pageContext = '' } = {}, config = null, fetchImpl = undefined) {
  const sys = 'You are YanDao AI English Coach. Teach English through clear, encouraging English (English-to-English immersion). Be concise, practical, and accurate. Never invent official exam scores.';
  const usr = `${pageContext ? `Current study context: ${cleanAi(pageContext).slice(0, 400)}\n` : ''}Learner question: ${cleanAi(question)}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}
