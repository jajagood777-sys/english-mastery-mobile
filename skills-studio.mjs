/**
 * YanDao Cultivation Palace v19.0.0 — Skills Studio Engines
 * Covers roadmap items: #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #34, #35, #36, #37.
 * Pure, deterministic, local-first ES module (zero network calls).
 */

function norm(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * #7 Reading evidence locator: compares learner-selected supporting sentence vs reference sentence.
 */
export function compareReadingEvidence({
  answerCorrect = false,
  selectedSentence = '',
  referenceSentence = '',
  selectedParagraphIndex = -1,
  referenceParagraphIndex = -1
} = {}) {
  const sameSentence = Boolean(selectedSentence && referenceSentence)
    && (norm(selectedSentence) === norm(referenceSentence)
      || norm(selectedSentence).includes(norm(referenceSentence))
      || norm(referenceSentence).includes(norm(selectedSentence)));
  const sameParagraph = selectedParagraphIndex >= 0 && selectedParagraphIndex === referenceParagraphIndex;
  let diagnosis = 'wrong_paragraph';
  let label = '未定位到正确段落';
  if (sameSentence && answerCorrect) {
    diagnosis = 'right_evidence_right_answer';
    label = '定位准确且理解正确';
  } else if ((sameSentence || sameParagraph) && !answerCorrect) {
    diagnosis = 'right_evidence_wrong_interpretation';
    label = '找对了证据句，但句意理解有偏差';
  } else if (!sameSentence && answerCorrect) {
    diagnosis = 'right_answer_unverified_evidence';
    label = '答案正确，但所选证据句与解析不一致';
  }
  return { diagnosis, label, sameSentence, sameParagraph };
}

/**
 * #8 Long/complex sentence structural breakdown (local heuristic core/clauses/modifiers).
 */
export function analyzeLongSentenceStructure(sentence = '') {
  const raw = String(sentence || '').trim();
  if (!raw) return { original: '', core: '', clauses: [], modifiers: [], promptForParaphrase: '' };
  const clauseMarkers = /\b(although|though|because|since|while|whereas|which|that|who|whose|where|when|if|unless|whether|so that|in order that)\b/gi;
  const parts = raw.split(/(?=[,;:]|\b(?:although|though|because|since|while|whereas|which|who|whose|when|if|unless)\b)/i)
    .map(s => s.trim())
    .filter(Boolean);
  const clauses = [];
  const modifiers = [];
  let core = parts[0] || raw;
  for (const part of parts) {
    if (clauseMarkers.test(part)) {
      clauses.push(part);
    } else if (/^(in|on|at|with|without|by|for|from|despite|during|after|before|including)\b/i.test(part) || part.startsWith(',')) {
      modifiers.push(part.replace(/^,\s*/, ''));
    } else if (part.length > core.length && !clauseMarkers.test(part)) {
      core = part;
    }
    clauseMarkers.lastIndex = 0;
  }
  return {
    original: raw,
    core,
    clauses,
    modifiers,
    promptForParaphrase: '请用一句更简单的英文复述这句的核心意思：'
  };
}

/**
 * #9 Listening error replay ladder: normal_speed -> short_loop -> subtitle_check.
 */
export const LISTENING_REPLAY_STEPS = Object.freeze(['normal_speed', 'short_loop', 'subtitle_check']);

export function createListeningErrorReplay({ clipId = '', startSec = 0, endSec = 5, transcript = '' } = {}) {
  return {
    clipId: String(clipId || ''),
    startSec: Math.max(0, Number(startSec) || 0),
    endSec: Math.max(0.5, Number(endSec) || 5),
    transcript: String(transcript || ''),
    stepIndex: 0,
    currentStep: LISTENING_REPLAY_STEPS[0],
    understoodAtStep: null,
    diagnosis: null
  };
}

export function advanceListeningReplayStep(state, { understood = false } = {}) {
  if (!state) return null;
  if (understood) {
    const step = state.currentStep;
    const diagnosis = step === 'subtitle_check'
      ? 'connected_speech_or_sound_form_gap'
      : (step === 'short_loop' ? 'speed_or_linking_difficulty' : 'attention_slip_recovered');
    return { ...state, understoodAtStep: step, diagnosis };
  }
  const nextIdx = Math.min(state.stepIndex + 1, LISTENING_REPLAY_STEPS.length - 1);
  return { ...state, stepIndex: nextIdx, currentStep: LISTENING_REPLAY_STEPS[nextIdx] };
}

/**
 * #10 Phonics linked to actual verified spelling/listening errors.
 */
const PHONICS_PATTERNS = [
  { id: 'tion', regex: /tion$/i, rule: '-tion 常读 /ʃən/', transferWord: 'nation', example: 'Attention helps every nation grow.' },
  { id: 'ph', regex: /ph/i, rule: 'ph 组合常读 /f/', transferWord: 'phrase', example: 'Repeat the short phrase aloud.' },
  { id: 'kn', regex: /^kn/i, rule: '词首 kn 中的 k 不发音，读 /n/', transferWord: 'knock', example: 'Please knock before entering.' },
  { id: 'igh', regex: /igh/i, rule: 'igh 组合常读长元音 /aɪ/', transferWord: 'bright', example: 'The morning light looks bright.' },
  { id: 'ea', regex: /ea/i, rule: 'ea 常见长音 /iː/（偶见短音 /e/）', transferWord: 'steady', example: 'Keep a steady pace each day.' },
  { id: 'ough', regex: /ough/i, rule: 'ough 拼写固定但读音多变，需按词族记', transferWord: 'thorough', example: 'Do a thorough check before leaving.' },
  { id: 'silent_e', regex: /[aeiou][^aeiou]e$/i, rule: '词尾不发音 e 常使前元音读字母本音', transferWord: 'refine', example: 'We can refine the draft tonight.' }
];

export function buildErrorLinkedPhonicsDrill(errorWords = []) {
  const drills = [];
  const seenRules = new Set();
  for (const raw of (Array.isArray(errorWords) ? errorWords : [])) {
    const word = String(typeof raw === 'string' ? raw : (raw?.target || raw?.word || '')).trim();
    if (!word) continue;
    for (const pat of PHONICS_PATTERNS) {
      if (pat.regex.test(word) && !seenRules.has(pat.id)) {
        seenRules.add(pat.id);
        drills.push({
          sourceErrorWord: word,
          patternId: pat.id,
          rule: pat.rule,
          transferWord: pat.transferWord.toLowerCase() === word.toLowerCase() ? `${pat.transferWord}s` : pat.transferWord,
          transferExample: pat.example
        });
        break;
      }
    }
  }
  return drills;
}

/**
 * #11 Sentence-level speaking feedback with timestamps + user ASR correction + stale-feedback invalidation.
 */
export function alignSpeakingTranscript({ recordingId = '', segments = [], feedbackItems = [] } = {}) {
  const normalizedSegments = (Array.isArray(segments) ? segments : []).map((seg, idx) => ({
    segmentId: String(seg.segmentId || `seg-${idx + 1}`),
    startSec: Math.max(0, Number(seg.startSec) || 0),
    endSec: Math.max(0, Number(seg.endSec) || 0),
    rawAsrText: String(seg.text || seg.rawAsrText || ''),
    userCorrectedText: seg.userCorrectedText != null ? String(seg.userCorrectedText) : null,
    asrUncertain: Boolean(seg.asrUncertain)
  }));
  const normalizedFeedback = (Array.isArray(feedbackItems) ? feedbackItems : []).map((fb, idx) => ({
    feedbackId: String(fb.feedbackId || `fb-${idx + 1}`),
    segmentId: String(fb.segmentId || normalizedSegments[0]?.segmentId || 'seg-1'),
    issue: String(fb.issue || ''),
    suggestion: String(fb.suggestion || ''),
    status: String(fb.status || 'ACTIVE') // 'ACTIVE' | 'PENDING_REVIEW'
  }));
  return {
    recordingId: String(recordingId || ''),
    segments: normalizedSegments,
    feedbackItems: normalizedFeedback
  };
}

export function editAsrSegment(aligned, segmentId, correctedText) {
  if (!aligned) return null;
  const nextSegments = aligned.segments.map(seg => (
    seg.segmentId === segmentId
      ? { ...seg, userCorrectedText: String(correctedText || '').trim(), asrUncertain: false }
      : { ...seg }
  ));
  const changed = aligned.segments.some(seg => seg.segmentId === segmentId && norm(seg.rawAsrText) !== norm(correctedText));
  const nextFeedback = aligned.feedbackItems.map(fb => (
    changed && fb.segmentId === segmentId
      ? { ...fb, status: 'PENDING_REVIEW', invalidationReason: 'user_corrected_asr_transcript' }
      : { ...fb }
  ));
  return { ...aligned, segments: nextSegments, feedbackItems: nextFeedback };
}

/**
 * #12 Initial, retry, and next-day retest side-by-side speaking comparison.
 */
export function buildThreeStageSpeakingComparison({
  taskId = '',
  initial = null,
  retry = null,
  nextDayRetest = null,
  revealPrior = false
} = {}) {
  return {
    taskId: String(taskId || ''),
    revealPrior: Boolean(revealPrior),
    stages: {
      initial: revealPrior ? initial : (initial ? { hiddenUntilSubmit: true, hasRecording: Boolean(initial.recordingId) } : null),
      retry: revealPrior ? retry : (retry ? { hiddenUntilSubmit: true, hasRecording: Boolean(retry.recordingId) } : null),
      nextDayRetest
    }
  };
}

/**
 * #13 Scenario dialogue branching + #34 Conversational repair detection + #35 Info-gap outcome check.
 */
const REPAIR_PATTERNS = [
  /did you say\b/i,
  /could you repeat\b/i,
  /can you say that again\b/i,
  /sorry,\s*(was that|do you mean)/i,
  /just to (confirm|make sure|check)/i,
  /do you mean\b/i,
  /pardon\b/i
];

export function detectRepairMove(utterance = '') {
  const text = String(utterance || '').trim();
  const matched = REPAIR_PATTERNS.some(re => re.test(text));
  return {
    utterance: text,
    isRepairMove: matched,
    label: matched ? '主动确认/澄清补救' : '常规表达'
  };
}

export function chooseFollowUpBranch(branches = [], userUtterance = '') {
  const u = norm(userUtterance);
  const list = Array.isArray(branches) ? branches : [];
  for (const branch of list) {
    const triggers = Array.isArray(branch.triggers) ? branch.triggers : [];
    if (triggers.some(t => u.includes(norm(t)))) {
      return { branchId: branch.id || 'matched', prompt: branch.prompt || '', matchedTrigger: true };
    }
  }
  const fallback = list[0] || { id: 'default_reason', prompt: 'Could you give one concrete reason or example for that?' };
  return { branchId: fallback.id || 'default', prompt: fallback.prompt || '', matchedTrigger: false };
}

export function evaluateInfoGapOutcome({ userFreeSlots = [], partnerFreeSlots = [], agreedSlot = '' } = {}) {
  const userSet = new Set((userFreeSlots || []).map(norm));
  const partnerSet = new Set((partnerFreeSlots || []).map(norm));
  const target = norm(agreedSlot);
  const mutuallyAvailable = Boolean(target) && userSet.has(target) && partnerSet.has(target);
  return {
    agreedSlot: String(agreedSlot || ''),
    completed: mutuallyAvailable,
    reason: mutuallyAvailable
      ? '双方时段吻合，信息差任务达成'
      : '约定时间未同时满足双方空闲条件'
  };
}

/**
 * #14 Four-paragraph speech memorized-recall view modes (full_text / keywords_only / hidden) + omission check.
 */
export function renderSpeechRecallView(paragraphs = [], mode = 'full_text') {
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  return list.map((para, idx) => {
    const text = String(typeof para === 'string' ? para : (para?.text || ''));
    if (mode === 'hidden') {
      return { index: idx, mode, visibleText: `第 ${idx + 1} 段（已隐藏原文，请脱稿复述）`, keywords: [] };
    }
    if (mode === 'keywords_only') {
      const words = text.split(/\s+/).filter(w => w.replace(/[^a-z]/gi, '').length >= 6);
      const unique = [...new Set(words.map(w => w.replace(/^[^a-z]+|[^a-z]+$/gi, '')))].slice(0, 6);
      return { index: idx, mode, visibleText: unique.join(' · '), keywords: unique };
    }
    return { index: idx, mode: 'full_text', visibleText: text, keywords: [] };
  });
}

export function compareSpeechRecallOmissions(referenceKeyPoints = [], spokenTranscript = '') {
  const spoken = norm(spokenTranscript);
  const results = (Array.isArray(referenceKeyPoints) ? referenceKeyPoints : []).map(pt => {
    const phrase = String(pt || '').trim();
    const tokens = norm(phrase).split(' ').filter(w => w.length >= 4);
    const covered = tokens.length ? tokens.filter(t => spoken.includes(t)).length / tokens.length >= 0.5 : false;
    return { point: phrase, covered };
  });
  return {
    total: results.length,
    coveredCount: results.filter(r => r.covered).length,
    omittedPoints: results.filter(r => !r.covered).map(r => r.point),
    details: results
  };
}

/**
 * #15 Focused writing partial rewrite (1-2 key clarity issues, self-rewrite before model reveal).
 */
export function createFocusedWritingRewrite({ originalDraft = '', issues = [] } = {}) {
  const focused = (Array.isArray(issues) ? issues : []).slice(0, 2).map((iss, idx) => ({
    issueId: String(iss.issueId || `w-iss-${idx + 1}`),
    sentence: String(iss.sentence || ''),
    focusReason: String(iss.focusReason || ''),
    modelRewrite: String(iss.modelRewrite || ''),
    selfRewrite: '',
    modelRevealed: false
  }));
  return {
    originalDraft: String(originalDraft || ''),
    focusedIssues: focused
  };
}

/**
 * #16 Cross-module integrated theme task (reading + contrasting listening -> spoken/written judgment).
 */
export function createIntegratedThemeTask({ theme = '', readingExcerpt = '', listeningViewpoint = '', outputPrompt = '' } = {}) {
  return {
    type: 'integrated_theme_task',
    theme: String(theme || ''),
    readingExcerpt: String(readingExcerpt || ''),
    listeningViewpoint: String(listeningViewpoint || ''),
    outputPrompt: String(outputPrompt || '结合阅读材料与不同听力观点，给出你的判断并说明理由。'),
    completed: false
  };
}

/**
 * #36 Real-life ad-hoc short task (explicitly user_self_report, never auto-generates K/V/N).
 */
export function createRealLifeMiniTask({ scenarioTitle = '', targetExpression = '', createdAt = new Date().toISOString() } = {}) {
  return {
    taskId: `life-${Date.now().toString(36)}`,
    scenarioTitle: String(scenarioTitle || '').trim(),
    targetExpression: String(targetExpression || '').trim(),
    createdAt,
    evidenceType: 'user_self_report',
    generatesKvnOrScore: false,
    nextDayFeedback: null
  };
}

export function recordNextDayOutcome(task, { usedExpressions = '', stuckPoint = '', reportedAt = new Date().toISOString() } = {}) {
  return {
    ...task,
    evidenceType: 'user_self_report',
    generatesKvnOrScore: false,
    nextDayFeedback: {
      usedExpressions: String(usedExpressions || '').trim(),
      stuckPoint: String(stuckPoint || '').trim(),
      reportedAt
    }
  };
}

/**
 * #37 Native-listener critical info verification (dates, numbers, names, addresses, requests).
 */
export function compareIntendedVsAsrInfo({ intendedSlots = {}, asrText = '', listenerConfirmed = null } = {}) {
  const transcript = norm(asrText);
  const checks = Object.entries(intendedSlots || {}).map(([slot, expectedVal]) => {
    const exp = String(expectedVal || '').trim();
    const matchedInAsr = exp ? transcript.includes(norm(exp)) : false;
    return {
      slot,
      intended: exp,
      matchedInAsr,
      status: matchedInAsr ? 'MATCHED_IN_ASR' : 'NEEDS_PLAYBACK_CHECK'
    };
  });
  return {
    checks,
    needsPlaybackCheckCount: checks.filter(c => c.status === 'NEEDS_PLAYBACK_CHECK').length,
    listenerFeedbackRecorded: listenerConfirmed !== null,
    listenerConfirmed: listenerConfirmed === null ? null : Boolean(listenerConfirmed)
  };
}
