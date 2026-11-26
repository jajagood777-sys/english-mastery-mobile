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
    desc: '高价值核心词：立即入库，明日重点考练'
  },
  {
    id: 'passive',
    label: '👁️ 仅混眼熟',
    shortLabel: '仅混眼熟',
    desc: '保留阅读记录，但不塞进明日高频考题'
  },
  {
    id: 'drop',
    label: '🗑️ 略过',
    shortLabel: '略过',
    desc: '人名/生僻词/已懂，不进入明日学习包'
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
