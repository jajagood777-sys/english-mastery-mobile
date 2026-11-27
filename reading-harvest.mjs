// YanDao v20.2.0 — Post-Reading Word Harvest Bridge (读后生词收割台)
// Bridges "tapped word while reading" -> "next-day SRS" via:
//   1. Single-shot immediate original-sentence cloze retrieval + feedback (fast consolidation)
//   2. Phonological binding (spoken word + source sentence audio)
//   3. 3-way triage (🔥 明日必考 / 👁️ 仅混眼熟 / 🗑️ 略过) to prevent SRS bloat & semantic interference

export const HARVEST_TRIAGE_TIERS = [
  {
    id: 'promote',
    label: '🔥 明日必考',
    shortLabel: '明日必考',
    desc: '加入明天学习包，重点出题巩固'
  },
  {
    id: 'passive',
    label: '👁️ 仅混眼熟',
    shortLabel: '仅混眼熟',
    desc: '留在生词本里，不塞进明天考题'
  },
  {
    id: 'drop',
    label: '🗑️ 略过不管',
    shortLabel: '略过',
    desc: '已懂或生僻人名，以后不再出现'
  }
];

function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Blank out the target word inside its exact reading sentence for zero-typing contextual cloze recall.
 */
export function buildContextualCloze(sentence, word) {
  const cleanSent = String(sentence || '').replace(/\s+/g, ' ').trim();
  const cleanWord = String(word || '').trim();
  if (!cleanSent) return cleanWord ? `______ (${cleanWord.length} letters)` : '';
  if (!cleanWord) return cleanSent;
  const re = new RegExp(`\\b${escapeRegExp(cleanWord)}\\b`, 'gi');
  if (re.test(cleanSent)) {
    return cleanSent.replace(re, '______');
  }
  // Fallback: substring match for hyphenated/inflected forms
  const looseRe = new RegExp(escapeRegExp(cleanWord), 'i');
  if (looseRe.test(cleanSent)) {
    return cleanSent.replace(looseRe, '______');
  }
  return `${cleanSent} [______]`;
}

/**
 * Resolve an offline English gloss/definition if present in the current pack archive or vocab list.
 */
export function resolveHarvestOfflineGloss(word, { archive = [], vocabPractice = [], items = [] } = {}) {
  const target = String(word || '').trim().toLowerCase();
  if (!target) return '';

  if (Array.isArray(archive)) {
    for (const row of archive) {
      const expr = String(row?.expression || row?.word || row?.target || '').trim().toLowerCase();
      if (expr === target) {
        const sense = String(row?.senseEn || row?.sense_en || row?.definitionEn || row?.definition || row?.gloss || '').trim();
        if (sense) return sense;
      }
    }
  }
  if (Array.isArray(vocabPractice)) {
    for (const row of vocabPractice) {
      const expr = String(row?.target || row?.word || '').trim().toLowerCase();
      if (expr === target) {
        const sense = String(row?.targetSense || row?.target_sense || row?.cue || row?.meaning || '').trim();
        if (sense) return sense;
      }
    }
  }
  if (Array.isArray(items)) {
    for (const row of items) {
      const expr = String(row?.target || row?.word || '').trim().toLowerCase();
      if (expr === target) {
        const sense = String(row?.definitionEn || row?.cue || '').trim();
        if (sense) return sense;
      }
    }
  }
  return '';
}

/**
 * Build a single Word Harvest Bridge card for a reading mark.
 */
export function buildHarvestCard(mark, { archive = [], vocabPractice = [], items = [] } = {}) {
  if (!mark) return null;
  const word = String(mark.wordText || mark.word || '').trim();
  const originalSentence = String(mark.originalSentence || '').replace(/\s+/g, ' ').trim();
  const clozedSentence = buildContextualCloze(originalSentence, word);
  const senseEn = resolveHarvestOfflineGloss(word, { archive, vocabPractice, items });
  const triage = ['promote', 'passive', 'drop'].includes(mark.harvestTier) ? mark.harvestTier : 'pending';
  return {
    markId: mark.id,
    word,
    originalSentence,
    clozedSentence,
    senseEn,
    savedGloss: mark.savedGloss || null,
    triage,
    recalled: typeof mark.harvestRecalled === 'boolean' ? mark.harvestRecalled : null,
    harvestedAt: mark.harvestedAt || null
  };
}

/**
 * Summarize harvest progress for a reading article's marked words.
 */
export function summarizeHarvestProgress(marks = []) {
  const list = Array.isArray(marks) ? marks : [];
  let pending = 0;
  let promoted = 0;
  let passive = 0;
  let dropped = 0;
  let recalledCount = 0;

  for (const m of list) {
    const tier = m?.harvestTier;
    if (tier === 'promote') promoted++;
    else if (tier === 'passive') passive++;
    else if (tier === 'drop') dropped++;
    else pending++;
    if (m?.harvestRecalled === true) recalledCount++;
  }
  const total = list.length;
  const harvested = total - pending;
  return {
    total,
    harvested,
    pending,
    promoted,
    passive,
    dropped,
    recalledCount,
    completed: total > 0 && pending === 0
  };
}

/**
 * Filter reading marks for tomorrow's learning pack generation:
 * excludes explicitly dropped or passive-only words while preserving legacy untriaged marks.
 */
export function filterMarksForTomorrowPack(marks = []) {
  return (Array.isArray(marks) ? marks : []).filter(m => {
    const tier = m?.harvestTier;
    if (tier === 'drop' || tier === 'passive') return false;
    return true;
  });
}

/**
 * Split a sentence into segments highlighting the target word (typographic enhancement).
 */
export function splitSentenceWithHighlight(sentence, word) {
  const cleanSent = String(sentence || '').replace(/\s+/g, ' ').trim();
  const cleanWord = String(word || '').trim();
  if (!cleanSent) return [];
  if (!cleanWord) return [{ text: cleanSent, highlight: false }];
  let re = new RegExp(`(\\b${escapeRegExp(cleanWord)}\\b)`, 'gi');
  if (!re.test(cleanSent)) {
    re = new RegExp(`(${escapeRegExp(cleanWord)})`, 'gi');
  }
  const parts = cleanSent.split(re).filter(Boolean);
  return parts.map(part => ({
    text: part,
    highlight: part.toLowerCase() === cleanWord.toLowerCase()
  }));
}

/**
 * Build deterministic 3-option contextual quiz choices (target + 2 distractors) for zero-typing evaluation.
 */
export function buildHarvestQuizOptions(targetWord, { marks = [], archive = [], vocabPractice = [] } = {}) {
  const target = String(targetWord || '').trim();
  if (!target) return [];
  const lowerTarget = target.toLowerCase();
  const pool = [];
  const pushCandidate = (w) => {
    const clean = String(w || '').trim();
    if (!clean || clean.toLowerCase() === lowerTarget) return;
    if (!pool.some(x => x.toLowerCase() === clean.toLowerCase())) pool.push(clean);
  };
  for (const m of (Array.isArray(marks) ? marks : [])) pushCandidate(m?.wordText || m?.word);
  for (const v of (Array.isArray(vocabPractice) ? vocabPractice : [])) pushCandidate(v?.target || v?.word);
  for (const a of (Array.isArray(archive) ? archive : [])) pushCandidate(a?.expression || a?.word || a?.target);

  if (pool.length < 2) return [target];
  // Deterministic hash pick based on target word so re-renders keep option order stable
  let seed = 0;
  for (let i = 0; i < lowerTarget.length; i++) seed = (seed * 31 + lowerTarget.charCodeAt(i)) >>> 0;
  const d1 = pool[seed % pool.length];
  const rest = pool.filter(w => w.toLowerCase() !== d1.toLowerCase());
  const d2 = rest[(seed + 7) % rest.length];
  const trio = [target, d1, d2];
  // Deterministic rotation so target is not always option 0
  const shift = seed % 3;
  return [trio[shift], trio[(shift + 1) % 3], trio[(shift + 2) % 3]];
}

/**
 * Build a compact bilingual prompt for AI in-context word glossing (L1 + concise L2 + collocation chunk).
 */
export function buildHarvestAiGlossPrompt(word, sentence) {
  return [
    `Explain the English word "${String(word || '').trim()}" strictly in the context of this sentence:`,
    `"${String(sentence || '').trim()}"`,
    'Reply in EXACTLY 3 short lines (no markdown bullets, no extra prose):',
    'ZH: <简明中文核心意思，不超过16个字>',
    'EN: <concise plain-English meaning in this sentence, max 12 words>',
    'CHUNK: <2-4 word natural collocation or phrase from/for this context>'
  ].join('\n');
}

/**
 * Parse AI bilingual gloss response into { zh, en, chunk }.
 */
export function parseHarvestAiGlossResponse(raw) {
  const txt = String(raw || '').trim();
  if (!txt) return null;
  const pick = (prefix) => {
    const m = txt.match(new RegExp(`^\s*${prefix}\s*[:：]\s*(.+)$`, 'im'));
    return m ? m[1].replace(/^["'`*]+|["'`*]+$/g, '').trim() : '';
  };
  const zh = pick('ZH');
  const en = pick('EN');
  const chunk = pick('CHUNK');
  if (zh || en) return { zh, en, chunk };
  const firstLine = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || '';
  return firstLine ? { zh: firstLine.slice(0, 80), en: '', chunk: '' } : null;
}
