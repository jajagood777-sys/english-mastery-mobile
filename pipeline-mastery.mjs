// YanDao v20.3.0 — Full-Pipeline Mastery Engine (全链路闭环引擎)
// Closes the 4 highest-leverage structural gaps across the 7-stage daily workflow:
//   1. Mission Words (Passive -> Active pushed-output threading across Vocab/Reading -> Transfer/Retelling)
//   2. 3-Step Connected-Speech Listening Decoding Loop (Blind -> Weak-Form/Linking -> Transcript + 2-4x Shadow)
//   3. 60s Opening Warm-Up & 60s Closing Interleaved Exit Ticket (Sleep-dependent consolidation)
//   4. Adaptive Energy Pacing (10-min Essential Sprint vs 25-min Deep Session + Quiet Commute Mode)

export const SESSION_PACING_MODES = [
  {
    id: 'sprint_10',
    label: '⚡ 10分钟保底版',
    desc: '忙碌/疲惫日专用：触控词汇自动切 15 题小段 + 聚焦核心输入与 1 题输出，不断档不内耗。',
    vocabBatchCap: 15,
    targetMinutes: 10
  },
  {
    id: 'deep_25',
    label: '🔥 25分钟标准精修',
    desc: '完整 7 步全链路：词汇 → 阅读收割 → 炼字 → 炼句 → 听力解码 → 演讲仿说 → 综合输出。',
    vocabBatchCap: 0,
    targetMinutes: 25
  }
];

export const LISTENING_DECODE_STEPS = [
  { id: 'blind', label: '1. 盲听抓大意', hint: '先不看原文，只凭耳朵抓主旨并留意哪里糊成一团。' },
  { id: 'weakform', label: '2. 弱读连读拆解', hint: '先看功能词弱读（如 to→tə）与连读 ‿，定位是生词还是语音变形。' },
  { id: 'shadow', label: '3. 原文跟读 2–4 遍', hint: '亮出完整原文对照，对卡顿句跟读 2–4 遍即止（超过 5 遍收益趋平）。' }
];

const COMPLEX_EXIT_FRAMES = [
  { label: 'Wh-Cleft 强调句', pattern: 'What really matters is ...' },
  { label: '让步转折句', pattern: 'Even though ..., ...' },
  { label: 'Which 评论尾句', pattern: '..., which makes it ...' },
  { label: '对比平衡句', pattern: 'While ..., ...' }
];

function cleanToken(raw) {
  const s = String(raw || '').trim().replace(/^[^A-Za-z]+|[^A-Za-z\-'\s]+$/g, '').trim();
  if (!s || s.length < 3 || s.length > 32) return '';
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(s)) return '';
  return s;
}

function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Select 3-4 highest-priority "Mission Words" from today's missed vocab,
 * promoted Reading Harvest words, and active pack words to thread into Output stages.
 */
export function selectTodayMissionWords(data = {}, maxCount = 4) {
  const seen = new Set();
  const list = [];
  const push = (rawWord, { source = '今日词包', cue = '', sentence = '', priority = 2 } = {}) => {
    const word = cleanToken(rawWord);
    if (!word) return;
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      id: key,
      word,
      source,
      cue: String(cue || '').trim().slice(0, 60),
      sentence: String(sentence || '').replace(/\s+/g, ' ').trim(),
      priority
    });
  };

  // 1. Today's missed Smart Vocab attempts (highest activation priority)
  const vAttempts = [
    ...(Array.isArray(data?.dailyJourney?.vocabularyAttempts) ? data.dailyJourney.vocabularyAttempts : []),
    ...(Array.isArray(data?.vocabularyAttempts) ? data.vocabularyAttempts : [])
  ];
  const packId = data?.dailyPack?.packId || null;
  for (const att of vAttempts) {
    if (packId && att?.packId && att.packId !== packId) continue;
    if (att && !att.correct && !att.skipped && att.target) {
      push(att.target, { source: '今日错词', priority: 0 });
    }
  }

  // 2. Promoted Reading Harvest words
  for (const mark of (Array.isArray(data?.readingMarks) ? data.readingMarks : [])) {
    if (mark?.harvestTier === 'promote') {
      push(mark.wordText || mark.word, { source: '阅读必考', sentence: mark.originalSentence || '', priority: 0 });
    }
  }

  // 3. Today's pack vocabulary_practice
  const vp = data?.dailyPack?.vocabularyPractice || data?.dailyPack?.vocabulary_practice || [];
  if (Array.isArray(vp)) {
    for (const row of vp) {
      push(row?.target || row?.word, {
        source: row?.isReviewMistake ? '回炉词' : '今日新词',
        cue: row?.targetSense || row?.cue || '',
        sentence: row?.archivedExample || '',
        priority: row?.isReviewMistake ? 1 : 2
      });
    }
  }

  // 4. Fallback to recent items
  for (const it of (Array.isArray(data?.items) ? data.items : [])) {
    if (it?.kind === 'word' && it.target) {
      push(it.target, { source: '词库', cue: it.cue || '', sentence: it.example || '', priority: 3 });
    }
  }

  list.sort((a, b) => a.priority - b.priority);
  return list.slice(0, Math.max(1, Number(maxCount) || 4));
}

/**
 * Detect which Mission Words have been activated in user's typed output (including inflections)
 * or manually checked off after speaking aloud.
 */
export function detectActivatedMissionWords(userText = '', missionWords = [], manualCheckedIds = []) {
  const text = String(userText || '').toLowerCase();
  const manualSet = new Set((Array.isArray(manualCheckedIds) ? manualCheckedIds : []).map(x => String(x).toLowerCase()));
  const activated = [];
  const remaining = [];

  for (const mw of (Array.isArray(missionWords) ? missionWords : [])) {
    const word = String(mw?.word || mw || '').trim();
    if (!word) continue;
    const key = word.toLowerCase();
    const stem = key.length > 4 && key.endsWith('e') ? key.slice(0, -1) : key;
    const exactRe = new RegExp(`\\b${escapeRegExp(key)}(?:s|es|ed|d|ing)?\\b`, 'i');
    const stemRe = stem !== key ? new RegExp(`\\b${escapeRegExp(stem)}(?:ed|ing|es|er|ers)\\b`, 'i') : null;
    const hitByText = Boolean(text && (exactRe.test(text) || (stemRe && stemRe.test(text))));
    const hitByManual = manualSet.has(key);
    const entry = { ...(typeof mw === 'object' ? mw : { id: key, word }), activated: hitByText || hitByManual, byText: hitByText, byManual: hitByManual };
    if (entry.activated) activated.push(entry);
    else remaining.push(entry);
  }
  return {
    total: activated.length + remaining.length,
    activatedCount: activated.length,
    activated,
    remaining
  };
}

/**
 * Build a 60-second Opening Warm-Up queue (up to 4 fragile/promoted/due words)
 * for covert active recall before starting today's session.
 */
export function buildOpeningWarmupQueue(data = {}, maxCount = 4) {
  const seen = new Set();
  const queue = [];
  const push = (rawWord, { cue = '', sentence = '', reason = '昨日脆弱词', priority = 2 } = {}) => {
    const word = cleanToken(rawWord);
    if (!word) return;
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ id: `warmup:${key}`, word, cue: String(cue || '').trim(), sentence: String(sentence || '').trim(), reason, priority });
  };

  // 1. Reading Harvest promoted words
  for (const mark of (Array.isArray(data?.readingMarks) ? data.readingMarks : [])) {
    if (mark?.harvestTier === 'promote') {
      push(mark.wordText || mark.word, { sentence: mark.originalSentence || '', reason: '阅读必考收割', priority: 0 });
    }
  }

  // 2. Lowest-stability FSRS cards
  if (data?.fsrsState && typeof data.fsrsState === 'object') {
    const fsrsEntries = Object.entries(data.fsrsState)
      .filter(([k, v]) => !k.includes(':') && !k.includes('_') && v && !v.suspended && Number.isFinite(Number(v.s)))
      .sort((a, b) => Number(a[1].s) - Number(b[1].s));
    for (const [k, v] of fsrsEntries.slice(0, 6)) {
      push(k, { reason: `稳定度 ${Number(v.s).toFixed(1)} 天`, priority: 1 });
    }
  }

  // 3. Recent missed vocab attempts
  for (const att of (Array.isArray(data?.vocabularyAttempts) ? [...data.vocabularyAttempts].reverse() : [])) {
    if (att && !att.correct && !att.skipped && att.target) {
      push(att.target, { reason: '近期错词回炉', priority: 1 });
    }
  }

  // 4. Weak/V/N items
  for (const it of (Array.isArray(data?.items) ? data.items : [])) {
    if (it?.kind === 'word' && (it.status === 'N' || it.status === 'V')) {
      push(it.target, { cue: it.cue || '', sentence: it.example || '', reason: it.status === 'N' ? '不会词回炉' : '模糊词巩固', priority: 2 });
    }
  }

  queue.sort((a, b) => a.priority - b.priority);
  return queue.slice(0, Math.max(1, Number(maxCount) || 4));
}

/**
 * Build a 60-second Closing Interleaved Exit Ticket (3-4 mixed items)
 * combining today's missed vocab + harvested reading word + 1 spoken complex-frame swap.
 */
export function buildClosingExitTicket(data = {}, maxCount = 4) {
  const items = [];
  const seen = new Set();

  // A. Up to 2 missed vocab words from today's journey
  const vAttempts = data?.dailyJourney?.vocabularyAttempts || data?.vocabularyAttempts || [];
  const vpList = data?.dailyPack?.vocabularyPractice || [];
  for (const att of [...vAttempts].reverse()) {
    if (items.length >= 2) break;
    if (!att || att.correct || att.skipped || !att.target) continue;
    const key = String(att.target).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const task = vpList.find(t => String(t.target || '').toLowerCase().trim() === key);
    const ex = String(task?.archivedExample || '').trim();
    const cloze = ex ? ex.replace(new RegExp(`\\b${escapeRegExp(att.target)}\\b`, 'gi'), '______') : `Recall meaning & usage of: ${att.target}`;
    items.push({
      id: `exit-vocab:${key}`,
      kind: 'vocab_cloze',
      badge: '错词快闪',
      prompt: cloze,
      answer: att.target,
      detail: task?.targetSense || ex || '',
      audioText: ex || att.target
    });
  }

  // B. 1 promoted/marked reading word
  for (const mark of [...(data?.readingMarks || [])].reverse()) {
    if (items.length >= 3) break;
    const w = cleanToken(mark?.wordText || mark?.word);
    if (!w || mark?.harvestTier === 'drop') continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const sent = String(mark.originalSentence || '').trim();
    const cloze = sent ? sent.replace(new RegExp(`\\b${escapeRegExp(w)}\\b`, 'gi'), '______') : `Recall reading word: ${w}`;
    items.push({
      id: `exit-reading:${key}`,
      kind: 'reading_cloze',
      badge: '阅读收割',
      prompt: cloze,
      answer: w,
      detail: sent,
      audioText: sent || w
    });
  }

  // C. 1 spoken complex sentence frame swap using a mission word
  const mission = selectTodayMissionWords(data, 2);
  const frame = COMPLEX_EXIT_FRAMES[(items.length + mission.length) % COMPLEX_EXIT_FRAMES.length];
  const targetW = mission[0]?.word || 'routine';
  items.push({
    id: `exit-frame:${targetW.toLowerCase()}`,
    kind: 'complex_frame',
    badge: '口语造句',
    prompt: `用「${frame.label}」（${frame.pattern}）把今天的核心词「${targetW}」口头造 1 句话（心中默念或出声说一遍即可）。`,
    answer: `${frame.pattern} (+ ${targetW})`,
    detail: mission[0]?.sentence || `Try weaving "${targetW}" naturally into "${frame.pattern}".`,
    audioText: mission[0]?.sentence || targetW
  });

  return items.slice(0, Math.max(1, Number(maxCount) || 4));
}

export function clampShadowRepCount(count) {
  const n = Math.max(0, Math.min(6, Number(count) || 0));
  return {
    count: n,
    inSweetSpot: n >= 2 && n <= 4,
    label: n === 0 ? '跟读计数 0/3' : n < 2 ? `已跟读 ${n}/3 遍（建议再来 1 遍）` : n <= 4 ? `✓ 已跟读 ${n} 遍（黄金区间）` : `已跟读 ${n} 遍（足够了，可进下一句）`
  };
}
