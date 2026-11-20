/**
 * YanDao Cultivation Palace v19.0.0 — Learning Evidence, Transfer, Diagnostics & Versioning Core
 * Covers roadmap items: #1, #2, #3, #4, #6, #31, #32, #33, #38, #39.
 * Pure, deterministic, local-first ES module (zero network calls).
 */

export const TRANSFER_TRIPLE_STAGES = Object.freeze([
  'original_fix',
  'unfamiliar_cloze',
  'free_expression'
]);

export const ERROR_CAUSE_TAXONOMY = Object.freeze({
  spelling_slip: {
    id: 'spelling_slip',
    label: '拼写失误',
    remedyMode: 'targeted_spelling_phonics',
    remedyLabel: '音形拼写纠错'
  },
  meaning_confusion: {
    id: 'meaning_confusion',
    label: '词义混淆',
    remedyMode: 'synonym_boundary_contrast',
    remedyLabel: '近义词边界辨析'
  },
  collocation_error: {
    id: 'collocation_error',
    label: '搭配错误',
    remedyMode: 'collocation_frame_drill',
    remedyLabel: '高频搭配骨架练'
  },
  prompt_misread: {
    id: 'prompt_misread',
    label: '题意误读',
    remedyMode: 'question_stem_evidence_check',
    remedyLabel: '题干定位复核'
  },
  pending_confirmation: {
    id: 'pending_confirmation',
    label: '待确认（证据不足）',
    remedyMode: 'diagnostic_recheck',
    remedyLabel: '补充复核'
  }
});

export const HINT_TIERS_BY_TYPE = Object.freeze({
  word: ['semantic_clue', 'collocation', 'first_letter', 'reference_answer'],
  sentence: ['semantic_clue', 'collocation', 'structure_frame', 'reference_answer'],
  speaking: ['idea_anchor', 'collocation', 'opening_frame', 'reference_answer'],
  writing: ['focus_point', 'collocation', 'sentence_starter', 'reference_answer'],
  reading: ['paragraph_hint', 'evidence_clue', 'elimination_hint', 'reference_answer']
});

export const CONFIDENCE_LEVELS = Object.freeze(['certain', 'uncertain', 'guess', 'unknown']);

export function normalizeLexeme(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Deterministic 64-bit-ish hex content hash (browser & Node sync-safe, no crypto dependency).
 * Used for #39 question content version tracking.
 */
export function computeQuestionContentHash(question = {}) {
  const canonical = JSON.stringify({
    id: String(question.id || question.itemId || question.questionId || ''),
    prompt: String(question.prompt || question.question || question.sentence || question.clue_en || ''),
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    answer: String(question.answer || question.target || question.expected || ''),
    hint: String(question.hint || question.clue_en || ''),
    context: String(question.context || question.example || '')
  });
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonical.length; i += 1) {
    const ch = canonical.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (ch + i) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `qh-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * #39 Snapshot question version at attempt time so later edits never rewrite historical evidence.
 */
export function snapshotQuestionVersion({ packId = '', question = {}, revision = 1, capturedAt = new Date().toISOString() } = {}) {
  const questionId = String(question.id || question.itemId || question.questionId || 'unknown');
  const contentHash = computeQuestionContentHash(question);
  return {
    version_schema: '1.0',
    pack_id: String(packId || ''),
    question_id: questionId,
    content_hash: contentHash,
    revision: Number(revision) || 1,
    captured_at: capturedAt,
    snapshot: {
      prompt: String(question.prompt || question.sentence || question.clue_en || ''),
      options: Array.isArray(question.options) ? question.options.slice() : [],
      answer: String(question.answer || question.target || ''),
      context: String(question.context || question.example || '')
    }
  };
}

export function verifyQuestionVersionMatch(savedSnapshot, currentQuestion) {
  if (!savedSnapshot || !savedSnapshot.content_hash) {
    return { matched: false, reason: 'missing_snapshot', currentHash: computeQuestionContentHash(currentQuestion) };
  }
  const currentHash = computeQuestionContentHash(currentQuestion);
  const matched = savedSnapshot.content_hash === currentHash;
  return {
    matched,
    savedHash: savedSnapshot.content_hash,
    currentHash,
    reason: matched ? 'exact_version_match' : 'question_modified_since_attempt',
    historicalPreserved: true
  };
}

/**
 * #1 Anti-leak helper: redacts target word & prior error references before independent submission.
 */
export function redactTransferLeaks(promptText, targetWord, submitted = false) {
  const raw = String(promptText || '');
  const target = String(targetWord || '').trim();
  if (submitted || !target) {
    return { text: raw, leakedBeforeSubmit: false, revealed: Boolean(submitted) };
  }
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'gi');
  const hadLeak = re.test(raw);
  const masked = raw.replace(re, '_____');
  return { text: masked, leakedBeforeSubmit: hadLeak, revealed: false };
}

/**
 * #1 Three-stage transfer plan sharing one weaknessId with per-stage hint tracking and anti-leak.
 */
export function buildTransferTriplePlan({ weaknessId, target, originalSentence = '', freshClozeSentence = '', freePrompt = '' } = {}) {
  const wid = String(weaknessId || `weak:${normalizeLexeme(target)}`);
  const safeCloze = redactTransferLeaks(freshClozeSentence, target, false);
  return {
    weaknessId: wid,
    target: String(target || '').trim(),
    currentStageIndex: 0,
    hideTargetUntilSubmit: true,
    stages: [
      {
        stage: 'original_fix',
        label: '原句纠错',
        prompt: String(originalSentence || ''),
        submitted: false,
        correct: null,
        hintTierUsed: null,
        userAnswer: ''
      },
      {
        stage: 'unfamiliar_cloze',
        label: '陌生语境填空',
        prompt: safeCloze.text,
        rawPrompt: String(freshClozeSentence || ''),
        submitted: false,
        correct: null,
        hintTierUsed: null,
        userAnswer: ''
      },
      {
        stage: 'free_expression',
        label: '自由表达',
        prompt: String(freePrompt || 'Use the idea naturally in a short real-life sentence.'),
        submitted: false,
        correct: null,
        hintTierUsed: null,
        userAnswer: ''
      }
    ]
  };
}

export function advanceTransferTripleStage(plan, { userAnswer = '', correct = false, hintTierUsed = null, submittedAt = new Date().toISOString() } = {}) {
  if (!plan || !Array.isArray(plan.stages)) return null;
  const idx = Math.min(Math.max(0, Number(plan.currentStageIndex) || 0), plan.stages.length - 1);
  const nextStages = plan.stages.map((st, i) => {
    if (i !== idx) return { ...st };
    return {
      ...st,
      submitted: true,
      correct: Boolean(correct),
      hintTierUsed: hintTierUsed || null,
      userAnswer: String(userAnswer || ''),
      submittedAt,
      revealedTarget: plan.target
    };
  });
  const nextIdx = idx + 1 < nextStages.length ? idx + 1 : idx;
  const completed = nextStages.every(st => st.submitted);
  const independentTransferSuccess = nextStages[1]?.submitted && nextStages[1]?.correct && !nextStages[1]?.hintTierUsed
    && nextStages[2]?.submitted && nextStages[2]?.correct && !nextStages[2]?.hintTierUsed;
  return {
    ...plan,
    stages: nextStages,
    currentStageIndex: nextIdx,
    completed,
    independentTransferSuccess: Boolean(independentTransferSuccess)
  };
}

/**
 * #2 Error cause classification (separates spelling slip, meaning confusion, collocation, prompt misread, or pending_confirmation).
 */
function editDistance(a, b) {
  const s = normalizeLexeme(a);
  const t = normalizeLexeme(b);
  const m = s.length;
  const n = t.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function classifyErrorCause({
  expected = '',
  actual = '',
  confusedWith = [],
  collocationExpected = false,
  evidenceParagraphMatched = null,
  explicitCause = ''
} = {}) {
  if (explicitCause && ERROR_CAUSE_TAXONOMY[explicitCause]) {
    return { ...ERROR_CAUSE_TAXONOMY[explicitCause], confidence: 'explicit' };
  }
  const exp = normalizeLexeme(expected);
  const act = normalizeLexeme(actual);
  if (!exp || !act) {
    return { ...ERROR_CAUSE_TAXONOMY.pending_confirmation, confidence: 'insufficient_evidence' };
  }
  if (evidenceParagraphMatched === false) {
    return { ...ERROR_CAUSE_TAXONOMY.prompt_misread, confidence: 'observed' };
  }
  if (Array.isArray(confusedWith) && confusedWith.some(w => normalizeLexeme(w) === act)) {
    return { ...ERROR_CAUSE_TAXONOMY.meaning_confusion, confidence: 'observed' };
  }
  if (collocationExpected && exp.includes(' ') && act.includes(' ')) {
    const expParts = exp.split(' ');
    const actParts = act.split(' ');
    const shared = expParts.filter(p => actParts.includes(p)).length;
    if (shared > 0 && shared < expParts.length) {
      return { ...ERROR_CAUSE_TAXONOMY.collocation_error, confidence: 'observed' };
    }
  }
  const dist = editDistance(exp, act);
  const maxLen = Math.max(exp.length, act.length);
  if (dist > 0 && dist <= 2 && maxLen >= 4) {
    return { ...ERROR_CAUSE_TAXONOMY.spelling_slip, confidence: 'observed', editDistance: dist };
  }
  return { ...ERROR_CAUSE_TAXONOMY.pending_confirmation, confidence: 'insufficient_evidence' };
}

/**
 * #3 Answer dispute & traceable appeal record (never overwrites original verdict).
 */
export function createDisputeRecord({
  packId = '',
  questionId = '',
  questionText = '',
  context = '',
  firstAnswer = '',
  originalVerdict = 'incorrect',
  userRationale = '',
  questionVersionHash = ''
} = {}) {
  const createdAt = new Date().toISOString();
  const disputeId = `disp-${computeQuestionContentHash({ id: questionId, prompt: questionText, answer: firstAnswer }).slice(3, 11)}-${Date.now().toString(36)}`;
  return {
    dispute_id: disputeId,
    status: 'PENDING_REVIEW',
    created_at: createdAt,
    pack_id: String(packId || ''),
    question_id: String(questionId || ''),
    question_version_hash: String(questionVersionHash || computeQuestionContentHash({ id: questionId, prompt: questionText, context })),
    question_text: String(questionText || ''),
    context: String(context || ''),
    first_answer: String(firstAnswer || ''),
    original_verdict: String(originalVerdict || 'incorrect'),
    user_rationale: String(userRationale || '我认为我的答案也成立'),
    review_outcome: null
  };
}

export function resolveDisputeRecord(dispute, { outcome = 'UPHELD_ORIGINAL', reviewerNote = '', reviewedAt = new Date().toISOString() } = {}) {
  return {
    ...dispute,
    status: 'REVIEWED',
    review_outcome: {
      outcome, // 'ACCEPTED_ALTERNATIVE' | 'UPHELD_ORIGINAL' | 'QUESTION_AMBIGUOUS'
      reviewer_note: String(reviewerNote || ''),
      reviewed_at: reviewedAt,
      original_verdict_preserved: dispute.original_verdict
    }
  };
}

/**
 * #4 Tiered hints per question type, recording exact tier reached.
 */
export function createTieredHintSession(questionType = 'word', hintsByTier = {}) {
  const tiers = HINT_TIERS_BY_TYPE[questionType] || HINT_TIERS_BY_TYPE.word;
  return {
    questionType,
    tiers: tiers.slice(),
    hintsByTier: { ...hintsByTier },
    currentTierIndex: -1,
    tiersUsed: [],
    maxHintTierUsed: null
  };
}

export function revealNextHintTier(session) {
  if (!session || !Array.isArray(session.tiers)) return { session, tier: null, text: '' };
  const nextIdx = session.currentTierIndex + 1;
  if (nextIdx >= session.tiers.length) {
    const lastTier = session.tiers[session.tiers.length - 1];
    return { session, tier: lastTier, text: String(session.hintsByTier[lastTier] || ''), exhausted: true };
  }
  const tier = session.tiers[nextIdx];
  const updated = {
    ...session,
    currentTierIndex: nextIdx,
    tiersUsed: [...session.tiersUsed, tier],
    maxHintTierUsed: tier
  };
  return {
    session: updated,
    tier,
    text: String(session.hintsByTier[tier] || ''),
    exhausted: nextIdx >= session.tiers.length - 1
  };
}

/**
 * #6 Unannounced transfer prompt: hides target links until after submission.
 */
export function buildUnannouncedTransferPrompt({ dialogueText = '', hiddenTargets = [] } = {}) {
  return {
    mode: 'unannounced_transfer',
    dialogueText: String(dialogueText || ''),
    visibleTargetLabels: [], // explicitly empty before submission
    hiddenTargets: Array.isArray(hiddenTargets) ? hiddenTargets.map(t => ({
      weaknessId: String(t.weaknessId || ''),
      target: String(t.target || ''),
      sourceNote: String(t.sourceNote || '')
    })) : [],
    submitted: false
  };
}

export function revealUnannouncedLinks(task, userResponse = '') {
  const norm = normalizeLexeme(userResponse);
  const matches = (task.hiddenTargets || []).map(item => {
    const escaped = String(item.target || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const used = escaped ? new RegExp(`(?<!\\w)${escaped}(?!\\w)`, 'i').test(norm) : false;
    return { ...item, usedSpontaneously: used };
  });
  return {
    ...task,
    submitted: true,
    userResponse: String(userResponse || ''),
    revealedLinks: matches,
    spontaneousHitCount: matches.filter(m => m.usedSpontaneously).length
  };
}

/**
 * #31 Confidence tracking: separates lucky guesses and high-confidence errors.
 */
export function recordConfidenceTag({ attemptId = '', itemId = '', confidence = 'unknown', correct = false } = {}) {
  const level = CONFIDENCE_LEVELS.includes(confidence) ? confidence : 'unknown';
  let category = 'standard';
  if (level === 'guess' && correct) category = 'guessed_correct';
  else if (level === 'certain' && !correct) category = 'high_confidence_error';
  else if (level === 'unknown') category = 'confidence_unreported';
  return {
    attemptId: String(attemptId || ''),
    itemId: String(itemId || ''),
    confidence: level,
    correct: Boolean(correct),
    category,
    prioritizeFreshContext: category === 'high_confidence_error' || category === 'guessed_correct'
  };
}

export function summarizeConfidenceDiagnostics(records = []) {
  const list = Array.isArray(records) ? records : [];
  const guessedCorrect = list.filter(r => r.category === 'guessed_correct');
  const highConfidenceErrors = list.filter(r => r.category === 'high_confidence_error');
  const unreported = list.filter(r => r.category === 'confidence_unreported');
  return {
    total: list.length,
    guessedCorrectCount: guessedCorrect.length,
    highConfidenceErrorCount: highConfidenceErrors.length,
    unreportedCount: unreported.length,
    priorityRetestIds: [...new Set([
      ...highConfidenceErrors.map(r => r.itemId),
      ...guessedCorrect.map(r => r.itemId)
    ])].filter(Boolean)
  };
}

/**
 * #32 Synonym boundary drill (minimal pair changing 1 condition, accepts both when valid).
 */
export function createSynonymBoundaryDrill({
  pair = ['borrow', 'lend'],
  scenario = '',
  changedCondition = '',
  acceptedWords = [],
  nuanceNote = ''
} = {}) {
  return {
    type: 'synonym_boundary',
    pair: pair.slice(0, 2),
    scenario: String(scenario || ''),
    changedCondition: String(changedCondition || ''),
    acceptedWords: acceptedWords.map(normalizeLexeme),
    nuanceNote: String(nuanceNote || '')
  };
}

export function evaluateSynonymBoundary(drill, { chosenWord = '', conditionExplanation = '' } = {}) {
  const chosen = normalizeLexeme(chosenWord);
  const valid = Array.isArray(drill.acceptedWords) && drill.acceptedWords.includes(chosen);
  const bothAcceptable = Array.isArray(drill.acceptedWords) && drill.acceptedWords.length > 1;
  return {
    chosenWord: chosen,
    accepted: valid,
    bothAcceptable,
    conditionExplanation: String(conditionExplanation || '').trim(),
    hasConditionExplanation: String(conditionExplanation || '').trim().length > 0,
    nuanceNote: drill.nuanceNote || ''
  };
}

/**
 * #33 Blind retest of AI-assisted items: hides prior draft, hints & AI rewrite until submitted.
 */
export function createBlindRetestTask({
  taskId = '',
  prompt = '',
  priorDraft = '',
  priorAiRewrite = '',
  priorHints = []
} = {}) {
  return {
    taskId: String(taskId || ''),
    prompt: String(prompt || ''),
    lockedPrior: {
      priorDraft: String(priorDraft || ''),
      priorAiRewrite: String(priorAiRewrite || ''),
      priorHints: Array.isArray(priorHints) ? priorHints.slice() : []
    },
    visiblePrior: null, // strictly hidden before blind submission
    submitted: false,
    blindAnswer: ''
  };
}

export function revealBlindRetestComparison(task, blindAnswer = '') {
  return {
    ...task,
    submitted: true,
    blindAnswer: String(blindAnswer || ''),
    visiblePrior: { ...task.lockedPrior }
  };
}

/**
 * #38 Fatigue & recent-exposure guard for long packs + "stop here today" checkpoint.
 */
export function detectRecentExposure(word, recentHistory = [], windowSize = 8) {
  const norm = normalizeLexeme(word);
  if (!norm) return { recentlyExposed: false, exposureCount: 0 };
  const slice = (Array.isArray(recentHistory) ? recentHistory : []).slice(-windowSize);
  const hits = slice.filter(entry => {
    const text = normalizeLexeme(typeof entry === 'string' ? entry : (entry?.target || entry?.word || entry?.text || ''));
    return text === norm || (text && new RegExp(`(?<!\\w)${norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`).test(text));
  });
  return {
    recentlyExposed: hits.length > 0,
    exposureCount: hits.length,
    tag: hits.length > 0 ? 'RECENTLY_EXPOSED' : 'FRESH_WINDOW'
  };
}

export function selectFatigueAwareNextItem(queue = [], recentTypes = [], maxConsecutiveSameType = 3) {
  if (!Array.isArray(queue) || !queue.length) return null;
  const tail = (Array.isArray(recentTypes) ? recentTypes : []).slice(-maxConsecutiveSameType);
  const saturatedType = tail.length === maxConsecutiveSameType && tail.every(t => t === tail[0]) ? tail[0] : null;
  if (saturatedType) {
    const alternate = queue.find(item => (item.type || item.kind || item.module) !== saturatedType);
    if (alternate) return { item: alternate, fatigueSwitched: true, avoidedType: saturatedType };
  }
  return { item: queue[0], fatigueSwitched: false, avoidedType: null };
}

export function markStopHereCheckpoint({ packId = '', stage = '', itemIndex = 0, note = '' } = {}) {
  return {
    packId: String(packId || ''),
    stage: String(stage || ''),
    nextStartIndex: Math.max(0, Number(itemIndex) || 0),
    markedAt: new Date().toISOString(),
    note: String(note || '今天做到这里，下次从此自然接续')
  };
}
