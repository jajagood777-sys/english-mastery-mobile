// YanDao v20.0.2 — Cross-Module Evidence-Based SLA Enhancers (Reading, Listening, Prosody, Speaking, Writing, AI)

export const WEAK_FORM_MAP = {
  to: '/tə/', for: '/fə/', of: '/əv/', and: '/ən/', the: '/ðə/',
  a: '/ə/', an: '/ən/', at: '/ət/', can: '/kən/', are: '/ə/',
  was: '/wəz/', were: '/wə/', from: '/frəm/', that: '/ðət/',
  than: '/ðən/', but: '/bət/', as: '/əz/', have: '/əv/', has: '/əz/',
  you: '/jə/', your: '/jə/', our: '/ɑː/', them: '/ðəm/', some: '/səm/'
};

export const OVERSPEED_LADDER = [1.25, 1.0, 1.0];
export const MINI_432_SECONDS = [24, 18, 14];
export const STEADY_REFINE_SECONDS = [20, 20, 20];

export const DISCOVERY_DIAGNOSIS_TAGS = [
  { id: 'known_word_unheard', label: '熟词听不出', action: '次日词卡强制音频优先' },
  { id: 'connected_speech_blur', label: '连读切不断', action: '加入连读弱读微练池' },
  { id: 'working_memory_drop', label: '听后忘前', action: '下次缩短意群 / 0.9x 过渡' }
];

export const FOCUSED_SELF_CHECK_DIMENSIONS = [
  { id: 'stress', prompt: '句核重音与词重音位置准吗？' },
  { id: 'weak_forms', prompt: '功能词（to/for/of/can）有轻读压缩吗？' },
  { id: 'thought_groups', prompt: '意群停顿与句尾升降自然吗？' },
  { id: 'vowels_endings', prompt: '目标易混元音与词尾辅音清晰吗？' }
];

export const CIRCUMLOCUTION_CUES = [
  'Paraphrase it! Try: "What I mean is..."',
  'Keep flowing! Try: "To put it another way..."',
  'Work around the word: "It is a kind of..."'
];

export function isHypercorrectionError({ rtMs = 3000, correct = false, confidentTap = false } = {}) {
  if (correct) return false;
  return Boolean(confidentTap || (Number(rtMs) > 0 && Number(rtMs) <= 1800));
}

export function computeLexicalCoverage(text = '', knownWords = []) {
  const known = new Set(Array.from(knownWords || []).map((w) => String(w || '').toLowerCase().trim()).filter(Boolean));
  const tokens = String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .toLowerCase()
    .match(/[a-z]+(?:'[a-z]+)?/g) || [];
  if (!tokens.length) return { totalTokens: 0, knownCount: 0, unknownWords: [], coveragePct: 100, status: 'optimal' };
  const commonBase = new Set([
    'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at',
    'this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there',
    'their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no',
    'just','him','know','take','into','year','your','good','some','could','them','see','other','than','then','now',
    'look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well',
    'way','even','new','want','because','any','these','give','day','most','us','is','are','was','were','been','had',
    'has','did','does','more','very','still','before','near','once','kept','across','inside','outside','small','long',
    'every','own','whole','early','old','dry','wet','calm','quiet','morning','evening','night','train','boat','water'
  ]);
  let knownCount = 0;
  const unknownSet = new Set();
  for (const tok of tokens) {
    const stem = tok.replace(/(?:ing|ed|es|s)$/, '');
    if (known.has(tok) || known.has(stem) || commonBase.has(tok) || commonBase.has(stem) || tok.length <= 2) {
      knownCount++;
    } else {
      unknownSet.add(tok);
    }
  }
  const coveragePct = Math.round((knownCount / tokens.length) * 1000) / 10;
  const status = coveragePct >= 95 ? 'optimal' : coveragePct >= 90 ? 'borderline' : 'dense';
  return {
    totalTokens: tokens.length,
    knownCount,
    unknownWords: [...unknownSet],
    coveragePct,
    status
  };
}

export function checkOneTargetSentence(sentence = '', knownWords = []) {
  const cov = computeLexicalCoverage(sentence, knownWords);
  const count = cov.unknownWords.length;
  return {
    unknownCount: count,
    unknownWords: cov.unknownWords,
    isOneTarget: count === 1,
    verdict: count === 1 ? '1T_OPTIMAL' : count === 0 ? 'ALL_KNOWN' : 'MULTI_UNKNOWN_I_PLUS_2'
  };
}

export function annotateConnectedSpeechAndWeakForms(sentence = '') {
  const raw = String(sentence || '').trim();
  if (!raw) return [];
  const words = raw.split(/\s+/);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const tok = words[i];
    const clean = tok.toLowerCase().replace(/[^a-z']/g, '');
    const nextClean = (words[i + 1] || '').toLowerCase().replace(/[^a-z']/g, '');
    const isWeak = Boolean(WEAK_FORM_MAP[clean]) && i > 0 && i < words.length - 1;
    const endsConsonant = /[bcdfghjklmnpqrstvwxyz]$/.test(clean);
    const nextStartsVowel = /^[aeiou]/.test(nextClean);
    const hasLink = endsConsonant && nextStartsVowel && !/[.,;:!?]$/.test(tok);
    const thoughtBreak = /[,;:—]$/.test(tok) || (i > 2 && i < words.length - 2 && /^(because|while|when|before|after|although|yet|so|and|but)$/.test(nextClean));
    out.push({
      token: tok,
      weak: isWeak,
      weakIpa: isWeak ? WEAK_FORM_MAP[clean] : '',
      linkNext: hasLink,
      thoughtBreak
    });
  }
  return out;
}

export function buildKeywordPartialCaption(sentence = '', targetWords = []) {
  const targets = new Set((Array.isArray(targetWords) ? targetWords : []).map((w) => String(w || '').toLowerCase()));
  return String(sentence || '')
    .split(/\s+/)
    .map((tok) => {
      const clean = tok.toLowerCase().replace(/[^a-z']/g, '');
      if (targets.has(clean) || clean.length >= 6) return tok;
      if (WEAK_FORM_MAP[clean] || clean.length <= 3) return '___';
      return tok;
    })
    .join(' ');
}

export function analyzePauseAndPhonation(rmsFrames = [], { frameMs = 50, silenceThreshold = 0.015, minPauseMs = 250 } = {}) {
  const frames = Array.isArray(rmsFrames) ? rmsFrames : [];
  if (!frames.length) return { totalMs: 0, speechMs: 0, ptr: 0, pauseCount: 0, longestPauseMs: 0, pauseSpans: [] };
  let speechFrames = 0;
  let curSilent = 0;
  let curStart = -1;
  const pauseSpans = [];
  for (let i = 0; i < frames.length; i++) {
    const v = Number(frames[i]) || 0;
    if (v >= silenceThreshold) {
      speechFrames++;
      if (curSilent * frameMs >= minPauseMs && curStart > 0) {
        pauseSpans.push({ startMs: curStart * frameMs, durationMs: curSilent * frameMs });
      }
      curSilent = 0;
      curStart = -1;
    } else {
      if (curSilent === 0) curStart = i;
      curSilent++;
    }
  }
  const totalMs = frames.length * frameMs;
  const speechMs = speechFrames * frameMs;
  const longestPauseMs = pauseSpans.reduce((m, s) => Math.max(m, s.durationMs), 0);
  return {
    totalMs,
    speechMs,
    ptr: totalMs > 0 ? Math.round((speechMs / totalMs) * 1000) / 1000 : 0,
    pauseCount: pauseSpans.length,
    longestPauseMs,
    pauseSpans
  };
}

export function trimSilenceBounds(samples, { threshold = 0.012, padSamples = 800 } = {}) {
  if (!samples || !samples.length) return { start: 0, end: 0 };
  let start = 0;
  let end = samples.length - 1;
  while (start < end && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;
  return {
    start: Math.max(0, start - padSamples),
    end: Math.min(samples.length, end + 1 + padSamples)
  };
}

export function detectTargetChipHits(draft = '', targetChips = []) {
  const norm = String(draft || '').toLowerCase();
  const hits = [];
  const missed = [];
  for (const chip of (Array.isArray(targetChips) ? targetChips.slice(0, 3) : [])) {
    const raw = String(chip || '').trim();
    if (!raw) continue;
    const stem = raw.toLowerCase().replace(/(?:ing|ed|es|s)$/, '');
    const re = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z]*\\b`, 'i');
    if (re.test(norm) || norm.includes(raw.toLowerCase())) hits.push(raw);
    else missed.push(raw);
  }
  return { hits, missed, allHit: missed.length === 0 && hits.length > 0 };
}

export function buildSocraticMediationPrompt(level = 1, { learnerText = '', focusCategories = ['preposition_collocation', 'tense'], knownWhitelistSample = [] } = {}) {
  const lvl = Math.max(1, Math.min(3, Number(level) || 1));
  const focus = focusCategories.slice(0, 2).join(', ');
  if (lvl === 1) {
    return `Act as a Socratic IELTS Band 7.5 coach (Level 1 Locate Only). Focus strictly on [${focus}] (max 2 errors). Point out the exact phrase span and error category in: "${learnerText}". Do NOT give the corrected answer yet.`;
  }
  if (lvl === 2) {
    return `Act as a Socratic IELTS Band 7.5 coach (Level 2 Whitelist Clue). Give 1 concise English clue using simple known words (${knownWhitelistSample.slice(0, 12).join(', ')}) so the learner can self-repair: "${learnerText}". Still withhold the full rewritten sentence.`;
  }
  return `Act as an IELTS Band 7.5 coach (Level 3 Dual-Option Reveal). Provide 2 concise upgrades for "${learnerText}": (1) Natural Flow preserving the learner's voice; (2) Band 7.5 Upgrade embedding 1-2 natural collocations. No sycophantic praise.`;
}

export function buildAntiSycophancyDebatePrompt(userTurn = '', round = 1) {
  return `You are a concise, respectful but sharp IELTS Part 3 examiner (Debate Round ${round}/3). Never use empty praise ("Great point!"). Challenge one assumption or ask a pointed counter-example to: "${userTurn}" in 1-2 sentences so the learner must use concession/contrast markers (however, even though, on the flip side).`;
}

export function buildConfusePairDuel(wordA, wordB, sentencesA = [], sentencesB = []) {
  const items = [];
  const aList = (sentencesA || []).slice(0, 2);
  const bList = (sentencesB || []).slice(0, 2);
  for (let i = 0; i < Math.max(aList.length, bList.length); i++) {
    if (aList[i]) items.push({ answer: wordA, options: [wordA, wordB], sentence: aList[i] });
    if (bList[i]) items.push({ answer: wordB, options: [wordA, wordB], sentence: bList[i] });
  }
  return { pair: [wordA, wordB], rounds: items };
}
