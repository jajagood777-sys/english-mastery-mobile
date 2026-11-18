/**
 * Lexical Chunk, Cohesion & Discourse Diagnostic Engine (11.0.0)
 * Inspired by Michael Lewis's Lexical Approach, open-source corpus collocation
 * trackers (TrieLingual / Lexora), and deterministic readability diagnostics.
 *
 * CRITICAL INTEGRITY RULE:
 * This module performs 100% deterministic, local, objective text & lexical-chunk
 * inspection. It NEVER fabricates an AI grammar score, CEFR level, or IELTS band.
 */

const cleanDiscourse = value => String(value ?? '').replace(/\r/g, '').trim();
const normDiscourse = value => cleanDiscourse(value).toLocaleLowerCase('en').replace(/\s+/g, ' ');

export const COHESION_CATEGORIES = Object.freeze({
  contrast: {
    label: '转折与让步 · Contrast & Concession',
    markers: [
      'however', 'nevertheless', 'nonetheless', 'although', 'even though',
      'whereas', 'while', 'on the other hand', 'in contrast', 'conversely',
      'despite', 'in spite of', 'yet', 'admittedly', 'granted that'
    ]
  },
  causeEffect: {
    label: '因果与推导 · Cause & Effect',
    markers: [
      'therefore', 'consequently', 'as a result', 'thus', 'hence',
      'because of', 'due to', 'owing to', 'stem from', 'lead to',
      'result in', 'contribute to', 'on account of', 'accordingly'
    ]
  },
  addition: {
    label: '递进与补充 · Addition & Reinforcement',
    markers: [
      'furthermore', 'moreover', 'in addition', 'additionally', 'besides',
      'not only', 'as well as', 'what is more', 'equally important', 'alongside'
    ]
  },
  exemplification: {
    label: '实证与举例 · Exemplification & Specificity',
    markers: [
      'for instance', 'for example', 'specifically', 'in particular',
      'namely', 'such as', 'to illustrate', 'a case in point', 'notably'
    ]
  },
  structuring: {
    label: '观点与总结 · Framing & Conclusion',
    markers: [
      'ultimately', 'fundamentally', 'essentially', 'in essence',
      'overall', 'in conclusion', 'to sum up', 'from my perspective',
      'arguably', 'undeniably'
    ]
  }
});

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'had',
  'not', 'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could',
  'should', 'can', 'may', 'might', 'must', 'shall', 'into', 'onto', 'upon',
  'about', 'above', 'below', 'under', 'over', 'between', 'among', 'through',
  'during', 'before', 'after', 'since', 'until', 'while', 'where', 'when',
  'which', 'what', 'who', 'whom', 'whose', 'why', 'how', 'than', 'then',
  'them', 'they', 'their', 'theirs', 'there', 'here', 'hese', 'those',
  'your', 'yours', 'our', 'ours', 'his', 'her', 'hers', 'its', 'some',
  'any', 'each', 'every', 'other', 'another', 'such', 'more', 'most',
  'very', 'just', 'only', 'also', 'even', 'still', 'already', 'always',
  'never', 'often', 'sometimes', 'usually', 'quite', 'rather', 'almost',
  'both', 'either', 'neither', 'whether', 'because', 'although', 'though'
]);

/**
 * Lightweight English stemmer for matching inflected forms of target vocabulary
 * (e.g. "constrained" matches "constraint"/"constrain", "vortices" -> "vortex").
 */
export function normalizeStem(word = '') {
  const w = normDiscourse(word).replace(/[^a-z'-]/g, '');
  if (w.length <= 3) return w;
  if (w.endsWith('ices') && w.length > 5) return w.slice(0, -4) + 'ex';
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    return base.length >= 3 && base.at(-1) === base.at(-2) ? base.slice(0, -1) : base;
  }
  if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    return base.length >= 3 && base.at(-1) === base.at(-2) ? base.slice(0, -1) : base;
  }
  if (w.endsWith('ly') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

export function tokenizeWords(text = '') {
  return (cleanDiscourse(text).match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).map(w => w.toLowerCase());
}

export function splitSentences(text = '') {
  const raw = cleanDiscourse(text);
  if (!raw) return [];
  return raw
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
}

/**
 * Checks whether a single word or multi-word phrase appears in userText
 * (supporting both exact substring match and morphological stem match).
 */
export function matchesExpressionInText(userText = '', expression = '') {
  const textNorm = normDiscourse(userText);
  const exprNorm = normDiscourse(expression).replace(/^[.,!?;:'"()]+|[.,!?;:'"()]+$/g, '');
  if (!textNorm || !exprNorm) return false;

  const escaped = exprNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directRegex = new RegExp(`(^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, 'i');
  if (directRegex.test(textNorm)) return true;

  const exprTokens = tokenizeWords(exprNorm);
  if (!exprTokens.length) return false;
  const userTokens = tokenizeWords(textNorm);
  const userStems = new Set(userTokens.map(normalizeStem));
  const userStemList = userTokens.map(normalizeStem);

  if (exprTokens.length === 1) {
    const targetStem = normalizeStem(exprTokens[0]);
    if (targetStem.length >= 3 && userStems.has(targetStem)) return true;
    // Also check prefix match for root family >= 6 chars (e.g. constraint / constrain)
    if (targetStem.length >= 6 && [...userStems].some(st => st.length >= 5 && (st.startsWith(targetStem.slice(0, 6)) || targetStem.startsWith(st.slice(0, 6))))) {
      return true;
    }
    return false;
  }

  // Multi-word phrase: check if all content stems appear within a sliding window of exprTokens.length + 3
  const exprStems = exprTokens.map(normalizeStem).filter(Boolean);
  const windowSize = exprStems.length + 3;
  for (let i = 0; i < userStemList.length; i++) {
    const slice = userStemList.slice(i, i + windowSize);
    if (exprStems.every(st => slice.includes(st))) return true;
  }
  return false;
}

/**
 * Extracts salient multi-word chunks or content vocabulary from a reference answer
 * that the learner did not yet use, to offer concrete self-upgrade anchors.
 */
export function extractReferenceAnchors(referenceText = '', userText = '', explicitTargets = [], maxAnchors = 4) {
  const candidates = [];
  const seen = new Set();

  const addCandidate = (phrase, sourceLabel) => {
    const cleaned = cleanDiscourse(phrase).replace(/^[.,!?;:'"()]+|[.,!?;:'"()]+$/g, '');
    const key = normDiscourse(cleaned);
    if (!cleaned || key.length < 4 || STOPWORDS.has(key) || seen.has(key)) return;
    seen.add(key);
    if (!matchesExpressionInText(userText, cleaned)) {
      candidates.push({ expression: cleaned, sourceLabel });
    }
  };

  for (const target of (Array.isArray(explicitTargets) ? explicitTargets : [])) {
    addCandidate(target, '题目目标词块');
  }

  const refWords = (cleanDiscourse(referenceText).match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []);
  for (const w of refWords) {
    const low = w.toLowerCase();
    if (low.length >= 7 && !STOPWORDS.has(low)) {
      addCandidate(low, '参考高阶词汇');
    }
  }

  return candidates.slice(0, maxAnchors);
}

/**
 * Main deterministic discourse & lexical-chunk analyzer for Transfer and Reading Retelling.
 */
export function analyzeDiscourseAndChunks(userText = '', {
  referenceText = '',
  targetPhrases = [],
  packTargets = []
} = {}) {
  const raw = cleanDiscourse(userText);
  const words = tokenizeWords(raw);
  const sentences = splitSentences(raw);
  const uniqueWords = new Set(words);

  const explicitTargets = [...new Set((Array.isArray(targetPhrases) ? targetPhrases : []).map(cleanDiscourse).filter(Boolean))];
  const packWordList = [...new Set((Array.isArray(packTargets) ? packTargets : []).map(cleanDiscourse).filter(Boolean))];

  const targetHits = [];
  const targetMissed = [];
  for (const phrase of explicitTargets) {
    if (matchesExpressionInText(raw, phrase)) targetHits.push(phrase);
    else targetMissed.push(phrase);
  }

  const packHits = [];
  for (const word of packWordList) {
    if (explicitTargets.includes(word)) continue;
    if (matchesExpressionInText(raw, word)) packHits.push(word);
  }

  const cohesionUsed = [];
  const cohesionByCategory = {};
  for (const [catKey, catMeta] of Object.entries(COHESION_CATEGORIES)) {
    const found = catMeta.markers.filter(marker => matchesExpressionInText(raw, marker));
    cohesionByCategory[catKey] = {
      label: catMeta.label,
      found
    };
    cohesionUsed.push(...found);
  }

  const upgradeSuggestions = extractReferenceAnchors(referenceText, raw, explicitTargets, 4);

  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgSentenceWords = sentenceCount > 0 ? Number((wordCount / sentenceCount).toFixed(1)) : 0;
  const lexicalDiversity = wordCount > 0 ? Number((uniqueWords.size / wordCount).toFixed(2)) : 0;

  return {
    wordCount,
    sentenceCount,
    avgSentenceWords,
    uniqueWordCount: uniqueWords.size,
    lexicalDiversity,
    targetHits,
    targetMissed,
    packHits: packHits.slice(0, 8),
    cohesionUsed: [...new Set(cohesionUsed)],
    cohesionCategoryCount: Object.values(cohesionByCategory).filter(c => c.found.length > 0).length,
    cohesionByCategory,
    upgradeSuggestions,
    isAutomatedScore: false,
    integrityNotice: '本诊断仅提供词块命中、衔接词与句长客观统计，不代表 AI 语法评分或官方雅思分数。'
  };
}

/**
 * Estimates reading pace (WPM) and pack lexical coverage inside a reading article.
 * Only reports observed WPM when active reading time >= 10 seconds to prevent distortion.
 */
export function analyzeReadingPassageMetrics(articleText = '', activeReadingMs = 0, packTargets = []) {
  const words = tokenizeWords(articleText);
  const wordCount = words.length;
  const activeSeconds = Math.max(0, Math.round(Number(activeReadingMs || 0) / 1000));
  const observedWpm = activeSeconds >= 10 && wordCount > 0
    ? Math.min(650, Math.max(20, Math.round((wordCount / activeSeconds) * 60)))
    : null;

  const matchedPackWords = [];
  const seen = new Set();
  for (const target of (Array.isArray(packTargets) ? packTargets : [])) {
    const cleaned = cleanDiscourse(target);
    const key = normDiscourse(cleaned);
    if (!cleaned || seen.has(key)) continue;
    if (matchesExpressionInText(articleText, cleaned)) {
      seen.add(key);
      matchedPackWords.push(cleaned);
    }
  }

  return {
    wordCount,
    estimatedMinutesAt160Wpm: Math.max(1, Math.round(wordCount / 160)),
    activeSeconds,
    observedWpm,
    matchedPackWords: matchedPackWords.slice(0, 12),
    matchedPackCount: matchedPackWords.length
  };
}
