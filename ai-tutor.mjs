/**
 * BYOK AI English Tutor Engine (15.0.0)
 * Supports zero-cost OpenRouter free router (`openrouter/free`),
 * Google AI Studio free tier, and any OpenAI-compatible endpoint.
 *
 * SECURITY & PRIVACY RULES:
 * 1. API keys are stored ONLY in isolated localStorage (`yandao-ai-tutor-config.v1`),
 *    NEVER embedded in repository code, NEVER included in exported backups or Battle Reports.
 * 2. AI feedback is strictly supplementary coaching and NEVER alters K/V/N or FSRS evidence.
 */

export const AI_CONFIG_KEY = 'yandao-ai-tutor-config.v1';

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

export function defaultAiConfig() {
  return {
    provider: 'google_ai',
    apiKey: '',
    model: AI_PROVIDERS.google_ai.defaultModel,
    customEndpoint: ''
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
      customEndpoint: cleanAi(parsed?.customEndpoint)
    };
  } catch {
    return base;
  }
}

export function saveAiConfig(config = {}, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false;
  const provider = AI_PROVIDERS[config.provider] ? config.provider : 'google_ai';
  const safe = {
    provider,
    apiKey: cleanAi(config.apiKey),
    model: cleanAi(config.model) || AI_PROVIDERS[provider].defaultModel,
    customEndpoint: cleanAi(config.customEndpoint)
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
