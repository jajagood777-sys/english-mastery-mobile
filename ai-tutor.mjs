/**
 * BYOK AI English Tutor & Gemini TTS Engine (16.2.0)
 * Supports Google AI Studio (Gemini chat + Dual-Model 429-Relay Gemini TTS),
 * persistent IndexedDB audio caching, daily quota tracking, OpenRouter free router,
 * and any OpenAI-compatible endpoint.
 *
 * SECURITY & PRIVACY RULES:
 * 1. API keys are stored ONLY in isolated localStorage (`yandao-ai-tutor-config.v1`),
 *    NEVER embedded in repository code, NEVER included in exported backups or Battle Reports.
 * 2. Persistent TTS audio cache uses its own isolated IndexedDB (`yandao-tts-audio-cache-v1`),
 *    NEVER touching learner progress, FSRS, K/V/N, or user voice recordings.
 * 3. AI feedback is strictly supplementary coaching and NEVER alters K/V/N or FSRS evidence.
 */

export const AI_CONFIG_KEY = 'yandao-ai-tutor-config.v1';
export const TTS_QUOTA_KEY = 'yandao-tts-quota.v1';
export const TTS_CACHE_DB_NAME = 'yandao-tts-audio-cache-v1';
export const TTS_CACHE_STORE_NAME = 'clips';
export const MAX_PERSISTENT_TTS_CLIPS = 36;

export const GEMINI_TTS_DEFAULT_MODEL = 'gemini-3.8-flash-lite-tts';
export const GEMINI_TTS_FALLBACK_MODEL = 'gemini-3.8-flash-tts';
export const GEMINI_TTS_DEFAULT_VOICE = 'Kore';
export const GEMINI_TTS_MAX_CHARS = 4200;
export const AUDIO_BOOKMARKS_KEY = 'yandao-audio-bookmarks.v1';
export const SILICONFLOW_TTS_ENDPOINT = 'https://api.siliconflow.cn/v1/audio/speech';
export const SILICONFLOW_TTS_DEFAULT_MODEL = 'FunAudioLLM/CosyVoice2-0.5B';
export const SILICONFLOW_TTS_DEFAULT_VOICE = 'FunAudioLLM/CosyVoice2-0.5B:alex';

export const SILICONFLOW_TTS_VOICES = Object.freeze([
  { id: 'FunAudioLLM/CosyVoice2-0.5B:alex', label: 'Alex · 沉稳男声（推荐）' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', label: 'Anna · 沉稳女声' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', label: 'Bella · 激情女声' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', label: 'Claire · 温柔女声' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:charles', label: 'Charles · 磁性男声' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:david', label: 'David · 欢快男声' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:diana', label: 'Diana · 欢快女声' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', label: 'Benjamin · 低沉男声' }
]);

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
    label: 'Google AI Studio（免费层 / 付费层）',
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
    ttsModel: GEMINI_TTS_DEFAULT_MODEL,
    ttsEngine: 'gemini',
    siliconflowApiKey: '',
    siliconflowVoice: SILICONFLOW_TTS_DEFAULT_VOICE
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
    const rawTtsModel = cleanAi(parsed?.ttsModel);
    const normalizedTtsModel = (!rawTtsModel || rawTtsModel === 'gemini-2.5-flash-preview-tts')
      ? GEMINI_TTS_DEFAULT_MODEL
      : rawTtsModel;
    return {
      provider,
      apiKey: cleanAi(parsed?.apiKey),
      model: (provider === 'google_ai' && cleanAi(parsed?.model) === 'gemini-2.5-flash' ? AI_PROVIDERS.google_ai.defaultModel : cleanAi(parsed?.model)) || AI_PROVIDERS[provider].defaultModel,
      customEndpoint: cleanAi(parsed?.customEndpoint),
      ttsVoice: validVoiceId(parsed?.ttsVoice),
      ttsModel: normalizedTtsModel,
      ttsEngine: parsed?.ttsEngine === 'siliconflow' ? 'siliconflow' : 'gemini',
      siliconflowApiKey: cleanAi(parsed?.siliconflowApiKey),
      siliconflowVoice: cleanAi(parsed?.siliconflowVoice) || SILICONFLOW_TTS_DEFAULT_VOICE
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
  const rawTtsModel = cleanAi(merged.ttsModel);
  const safeTtsModel = (!rawTtsModel || rawTtsModel === 'gemini-2.5-flash-preview-tts')
    ? GEMINI_TTS_DEFAULT_MODEL
    : rawTtsModel;
  const safe = {
    provider,
    apiKey: cleanAi(merged.apiKey),
    model: cleanAi(merged.model) || AI_PROVIDERS[provider].defaultModel,
    customEndpoint: cleanAi(merged.customEndpoint),
    ttsVoice: validVoiceId(merged.ttsVoice),
    ttsModel: safeTtsModel,
    ttsEngine: merged.ttsEngine === 'siliconflow' ? 'siliconflow' : 'gemini',
    siliconflowApiKey: cleanAi(merged.siliconflowApiKey),
    siliconflowVoice: cleanAi(merged.siliconflowVoice) || SILICONFLOW_TTS_DEFAULT_VOICE
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
 * Computes Pacific-time calendar day key (`YYYY-MM-DD`) aligned with Google AI Studio's
 * daily RPD reset schedule (midnight Pacific time = 16:00 Beijing winter / 15:00 summer).
 */
export function pacificQuotaDayKey(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {}
  return new Date(now.getTime() - 8 * 3600000).toISOString().slice(0, 10);
}

export function getDailyTtsUsage(storage = typeof localStorage !== 'undefined' ? localStorage : null, now = new Date()) {
  const day = pacificQuotaDayKey(now);
  const empty = { day, count: 0, byModel: {} };
  if (!storage) return empty;
  try {
    const raw = storage.getItem(TTS_QUOTA_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (parsed?.day !== day) return empty;
    return {
      day,
      count: Math.max(0, Number(parsed.count) || 0),
      byModel: parsed.byModel && typeof parsed.byModel === 'object' ? parsed.byModel : {}
    };
  } catch {
    return empty;
  }
}

export function recordTtsApiCall(model = GEMINI_TTS_DEFAULT_MODEL, storage = typeof localStorage !== 'undefined' ? localStorage : null, now = new Date()) {
  const usage = getDailyTtsUsage(storage, now);
  const m = cleanAi(model) || GEMINI_TTS_DEFAULT_MODEL;
  const next = {
    day: usage.day,
    count: usage.count + 1,
    byModel: { ...usage.byModel, [m]: (Number(usage.byModel[m]) || 0) + 1 }
  };
  if (storage) {
    try { storage.setItem(TTS_QUOTA_KEY, JSON.stringify(next)); } catch {}
  }
  return next;
}

/**
 * Deterministic, collision-resistant cache key for persistent TTS audio clips.
 * Intentionally omits model name so clips synthesized by either Flash-Lite or Flash
 * share the same local cache entry for a given voice + text.
 */
export function makeTtsCacheKey(text = '', voice = GEMINI_TTS_DEFAULT_VOICE) {
  const normText = cleanAi(text).replace(/\s+/g, ' ');
  const normVoice = validVoiceId(voice);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normText.length; i++) {
    const c = normText.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (c + i);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `tts:${normVoice}:${normText.length}:${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`;
}

function openTtsCacheDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(TTS_CACHE_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(TTS_CACHE_STORE_NAME)) {
          db.createObjectStore(TTS_CACHE_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deletePersistentTtsAudio(key) {
  if (!key) return false;
  const db = await openTtsCacheDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TTS_CACHE_STORE_NAME, 'readwrite');
      tx.objectStore(TTS_CACHE_STORE_NAME).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function readPersistentTtsAudio(key) {
  if (!key) return null;
  const db = await openTtsCacheDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TTS_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(TTS_CACHE_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const rec = req.result;
        const mimeType = rec?.mimeType || 'audio/wav';
        let outBlob = null;
        if (rec?.bytes) {
          const byteLen = rec.bytes.byteLength || 0;
          if (byteLen >= 64) {
            outBlob = new Blob([rec.bytes], { type: mimeType });
          }
        } else if (rec?.blob && Number(rec.blob.size || 0) >= 64) {
          outBlob = rec.blob;
        }
        if (outBlob) {
          try { store.put({ ...rec, lastUsedAt: Date.now() }); } catch {}
          resolve({ blob: outBlob, mimeType, modelUsed: rec.modelUsed || '' });
        } else {
          if (rec) {
            try { store.delete(key); } catch {}
          }
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writePersistentTtsAudio(key, { blob, bytes = null, mimeType = 'audio/wav', modelUsed = '' } = {}) {
  if (!key || (!blob && !bytes)) return false;
  let rawBytes = null;
  try {
    if (bytes instanceof ArrayBuffer) {
      rawBytes = bytes;
    } else if (ArrayBuffer.isView(bytes)) {
      rawBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } else if (blob && typeof blob.arrayBuffer === 'function') {
      rawBytes = await blob.arrayBuffer();
    }
  } catch {
    rawBytes = null;
  }
  if (rawBytes && rawBytes.byteLength < 64) return false;
  if (!rawBytes && blob && Number(blob.size || 0) < 64) return false;
  const db = await openTtsCacheDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TTS_CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(TTS_CACHE_STORE_NAME);
      const now = Date.now();
      store.put({
        key,
        bytes: rawBytes || null,
        blob: rawBytes ? null : blob,
        mimeType,
        modelUsed,
        savedAt: now,
        lastUsedAt: now
      });
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const rows = Array.isArray(allReq.result) ? allReq.result : [];
        if (rows.length > MAX_PERSISTENT_TTS_CLIPS) {
          rows.sort((a, b) => (a.lastUsedAt || 0) - (b.lastUsedAt || 0));
          const toDelete = rows.slice(0, rows.length - MAX_PERSISTENT_TTS_CLIPS);
          for (const row of toDelete) {
            try { store.delete(row.key); } catch {}
          }
        }
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function hasPersistentTtsAudio(key) {
  if (!key) return false;
  const db = await openTtsCacheDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TTS_CACHE_STORE_NAME, 'readonly');
      const req = tx.objectStore(TTS_CACHE_STORE_NAME).count(key);
      req.onsuccess = () => resolve((req.result || 0) > 0);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function clearPersistentTtsAudio() {
  const db = await openTtsCacheDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TTS_CACHE_STORE_NAME, 'readwrite');
      tx.objectStore(TTS_CACHE_STORE_NAME).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
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
 * Supports long-form single-request synthesis (up to 4,200 chars) to maximize Free Tier RPD efficiency.
 */
export function buildGeminiTtsRequestSpec(text, config = null, modelOverride = '') {
  const cfg = config || loadAiConfig();
  const apiKey = cleanAi(cfg?.apiKey);
  if (!apiKey) throw Error('尚未配置 Google AI Studio API Key，无法调用 Gemini 语音。');
  const voiceName = validVoiceId(cfg?.ttsVoice);
  const model = cleanAi(modelOverride) || cleanAi(cfg?.ttsModel) || GEMINI_TTS_DEFAULT_MODEL;
  const cleanText = cleanAi(text).slice(0, GEMINI_TTS_MAX_CHARS);
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

/**
 * Resilient fetch wrapper with AbortController timeout and automatic retry
 * on transient server/network responses (subway/mobile safe).
 */
export async function fetchWithTimeoutAndRetry(
  fetchImpl,
  url,
  init = {},
  { timeoutMs = 22000, retries = 1, retryDelayMs = 450, retryStatuses = [429, 502, 503, 504] } = {}
) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => { try { controller.abort(); } catch {} }, timeoutMs) : null;
    try {
      const reqInit = controller ? { ...init, signal: init.signal || controller.signal } : init;
      const resp = await fetchImpl(url, reqInit);
      if (timer) clearTimeout(timer);
      if (!resp.ok && attempt < retries && retryStatuses.includes(resp.status)) {
        await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)));
        continue;
      }
      return resp;
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastErr = err?.name === 'AbortError' ? Error('网络请求超时，请检查网络或稍后重试。') : err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || Error('网络请求失败。');
}

function hasRiffWavHeader(bytes) {
  return bytes.byteLength >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
}

/**
 * Synthesizes natural English speech via Gemini TTS and returns playable WAV/audio bytes.
 * Automatically wraps raw L16/PCM responses in a standard WAV header and relays from
 * `gemini-3.8-flash-lite-tts` to `gemini-3.8-flash-tts` on 429/404/400/503 (independent Free Tier pools).
 */
export async function synthesizeGeminiSpeech(text, config = null, fetchImpl = typeof fetch !== 'undefined' ? fetch : null) {
  const cfg = config || loadAiConfig();
  if (!fetchImpl) throw Error('当前环境不支持网络请求。');
  const rawPrimary = cleanAi(cfg?.ttsModel) || GEMINI_TTS_DEFAULT_MODEL;
  const primaryModel = rawPrimary === 'gemini-2.5-flash-preview-tts' ? GEMINI_TTS_DEFAULT_MODEL : rawPrimary;
  const modelsToTry = primaryModel === GEMINI_TTS_FALLBACK_MODEL
    ? [primaryModel, GEMINI_TTS_DEFAULT_MODEL]
    : [primaryModel, GEMINI_TTS_FALLBACK_MODEL];

  let lastError = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const spec = buildGeminiTtsRequestSpec(text, cfg, model);
    const resp = await fetchWithTimeoutAndRetry(fetchImpl, spec.url, spec.init, {
      timeoutMs: 55000,
      retries: 1,
      retryStatuses: [502, 503, 504]
    });
    if (!resp.ok) {
      let errText = '';
      try { errText = (await resp.text()).slice(0, 180); } catch {}
      lastError = Error(`Gemini 语音接口返回 ${resp.status}${errText ? `：${errText}` : ''}`);
      if (i + 1 < modelsToTry.length && (resp.status === 429 || resp.status === 404 || resp.status === 400 || resp.status === 503)) {
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
  const resp = await fetchWithTimeoutAndRetry(fetchImpl, spec.url, spec.init, { timeoutMs: 22000, retries: 1 });
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

export async function askAiCheckGrammar({ prompt = '', userAnswer = '', referenceAnswer = '', grammarFocus = '' } = {}, config = null, fetchImpl = undefined) {
  const sys = 'You are a concise, encouraging English grammar coach. Respond IN CLEAR ENGLISH ONLY (no Chinese unless asked). Structure: 1) Accuracy Verdict (Correct / Minor Fix Needed / Needs Rework) 2) Rule Breakdown (1–2 crisp sentences) 3) Corrected Sentence & 1 Parallel Practice Variation.';
  const usr = `Grammar Prompt: ${cleanAi(prompt)}${grammarFocus ? `\nGrammar Focus: ${cleanAi(grammarFocus)}` : ''}\nLearner Answer: ${cleanAi(userAnswer)}\nReference Answer: ${cleanAi(referenceAnswer) || 'N/A'}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}

export async function askAiSpeakingDemoCoach({ prompt = '', userTranscript = '', mode = 'ielts_or_demo' } = {}, config = null, fetchImpl = undefined) {
  const sys = mode === 'kids_demo'
    ? 'You are a bilingual children-English teaching demo coach. Respond IN CLEAR, NATURAL ENGLISH ONLY. Structure: 1) Classroom Warmth & Pacing 2) Pronunciation / Connected-Speech Tip (including dropped-D or linking where helpful) 3) 2 Kid-Friendly Instruction Upgrades.'
    : 'You are an encouraging IELTS Speaking & teaching-demo coach. Respond IN CLEAR, NATURAL ENGLISH ONLY (never fabricate an official band score). Structure: 1) Fluency & Clarity Strength 2) Grammar / Naturalness Polish (max 3) 3) 2 Native-Sounding Upgrades + 1 Connected-Speech Tip.';
  const usr = `Speaking / Demo Prompt: ${cleanAi(prompt)}\nLearner Transcript / Draft: ${cleanAi(userTranscript)}`;
  return runAiPrompt(sys, usr, config, fetchImpl);
}


export function isSiliconFlowTtsReady(config = null) {
  const cfg = config || loadAiConfig();
  return cleanAi(cfg?.siliconflowApiKey).length >= 8;
}

export function isCloudTtsReady(config = null) {
  const cfg = config || loadAiConfig();
  if (cfg?.ttsEngine === 'siliconflow') return isSiliconFlowTtsReady(cfg) || isGeminiTtsReady(cfg);
  return isGeminiTtsReady(cfg) || isSiliconFlowTtsReady(cfg);
}

export async function countPersistentTtsAudio() {
  const db = await openTtsCacheDb();
  if (!db) return 0;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TTS_CACHE_STORE_NAME, 'readonly');
      const req = tx.objectStore(TTS_CACHE_STORE_NAME).count();
      req.onsuccess = () => resolve(Number(req.result) || 0);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

export function saveAudioBookmark(id, seconds, duration = 0, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const key = cleanAi(id);
  const pos = Math.max(0, Math.floor(Number(seconds) || 0));
  const dur = Math.max(0, Math.floor(Number(duration) || 0));
  if (!key || !storage) return false;
  try {
    const raw = storage.getItem(AUDIO_BOOKMARKS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (pos < 3 || (dur > 10 && dur - pos <= 4)) {
      delete map[key];
    } else {
      map[key] = { seconds: pos, duration: dur, updatedAt: Date.now() };
      const keys = Object.keys(map);
      if (keys.length > 50) {
        keys.sort((a, b) => (map[a]?.updatedAt || 0) - (map[b]?.updatedAt || 0));
        for (const old of keys.slice(0, keys.length - 50)) delete map[old];
      }
    }
    storage.setItem(AUDIO_BOOKMARKS_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function loadAudioBookmark(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const key = cleanAi(id);
  if (!key || !storage) return 0;
  try {
    const raw = storage.getItem(AUDIO_BOOKMARKS_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    const rec = map?.[key];
    return Math.max(0, Math.floor(Number(rec?.seconds) || 0));
  } catch {
    return 0;
  }
}

export function clearAudioBookmark(id, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  return saveAudioBookmark(id, 0, 0, storage);
}

export function buildSiliconFlowTtsRequestSpec(text, config = null) {
  const cfg = config || loadAiConfig();
  const apiKey = cleanAi(cfg?.siliconflowApiKey);
  if (!apiKey) throw Error('尚未配置硅基流动 API Key，无法调用 CosyVoice2 语音。');
  const voice = cleanAi(cfg?.siliconflowVoice) || SILICONFLOW_TTS_DEFAULT_VOICE;
  const cleanText = cleanAi(text).slice(0, GEMINI_TTS_MAX_CHARS);
  if (!cleanText) throw Error('没有可朗读的文本。');
  return {
    url: SILICONFLOW_TTS_ENDPOINT,
    model: SILICONFLOW_TTS_DEFAULT_MODEL,
    voiceName: voice,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: SILICONFLOW_TTS_DEFAULT_MODEL,
        input: cleanText,
        voice,
        response_format: 'mp3',
        speed: 1.0
      })
    }
  };
}

export async function synthesizeSiliconFlowSpeech(text, config = null, fetchImpl = typeof fetch !== 'undefined' ? fetch : null) {
  const cfg = config || loadAiConfig();
  if (!fetchImpl) throw Error('当前环境不支持网络请求。');
  const spec = buildSiliconFlowTtsRequestSpec(text, cfg);
  const resp = await fetchWithTimeoutAndRetry(fetchImpl, spec.url, spec.init, {
    timeoutMs: 55000,
    retries: 1,
    retryStatuses: [502, 503, 504]
  });
  if (!resp.ok) {
    let errText = '';
    try { errText = (await resp.text()).slice(0, 180); } catch {}
    throw Error(`硅基流动语音接口返回 ${resp.status}${errText ? `：${errText}` : ''}`);
  }
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (!bytes.byteLength) throw Error('硅基流动语音接口未返回音频数据。');
  return {
    bytes,
    mimeType: 'audio/mpeg',
    modelUsed: spec.model,
    voiceUsed: spec.voiceName
  };
}

export async function synthesizeCloudSpeech(text, config = null, fetchImpl = typeof fetch !== 'undefined' ? fetch : null) {
  const cfg = config || loadAiConfig();
  if (cfg?.ttsEngine === 'siliconflow' && isSiliconFlowTtsReady(cfg)) {
    return synthesizeSiliconFlowSpeech(text, cfg, fetchImpl);
  }
  return synthesizeGeminiSpeech(text, cfg, fetchImpl);
}
