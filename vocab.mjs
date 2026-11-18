/**
 * Smart Vocabulary Touch Engine (10.5.0)
 * Supports 14 candidate vocabulary question types, strict schema 2.0 validation,
 * source-archive lookup, and honest recognition-only evidence grading.
 *
 * CRITICAL RULE: Multiple-choice recognition is NEVER recorded as K or independent recall.
 */

export const VOCAB_QUESTION_TYPES = Object.freeze([
  'contextual_inference',
  'contextual_cloze',
  'reverse_definition',
  'definition_recognition',
  'synonym_discrimination',
  'collocation_challenge',
  'confusable_words',
  'phrasal_verb_selection',
  'register_appropriateness',
  'morphology_derivation',
  'antonym_contrast',
  'idiom_in_context',
  'audio_word_recognition',
  'sentence_paraphrase_match'
]);

export const VOCAB_TYPE_LABELS = Object.freeze({
  contextual_inference: '语境词义推断 · Context Inference',
  contextual_cloze: '语境选词填空 · Contextual Cloze',
  reverse_definition: '释义选词 · Reverse Definition',
  definition_recognition: '核心词义识别 · Definition Match',
  synonym_discrimination: '近义词精析 · Synonym Nuance',
  collocation_challenge: '地道搭配选择 · Collocation',
  confusable_words: '形近/易混词辨析 · Confusable Words',
  phrasal_verb_selection: '短语动词辨析 · Phrasal Verb',
  register_appropriateness: '语域与正式度 · Register',
  morphology_derivation: '词形与派生 · Word Family',
  antonym_contrast: '反义语境对比 · Antonym Contrast',
  idiom_in_context: '习语语境运用 · Idiom in Context',
  audio_word_recognition: '听音辨词 · Audio Recognition',
  sentence_paraphrase_match: '同义句转换 · Paraphrase Match'
});

const cleanVocab = value => String(value ?? '').replace(/\r/g, '').trim();
const normVocab = value => cleanVocab(value).toLocaleLowerCase().replace(/\s+/g, ' ');

export function validateVocabularyTask(raw, index = 0) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: [`词汇题第 ${index + 1} 项不是有效对象。`], task: null };
  }
  const id = cleanVocab(raw.id || raw.task_id || raw.question_id);
  const sourceItemId = cleanVocab(raw.source_item_id || raw.sourceItemId || id);
  const rawType = cleanVocab(raw.type || raw.question_type || 'definition_recognition').toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  const type = VOCAB_QUESTION_TYPES.includes(rawType) ? rawType : 'definition_recognition';
  const prompt = cleanVocab(raw.prompt || raw.question);
  if (!id) errors.push(`词汇题第 ${index + 1} 项缺少稳定 id。`);
  if (!prompt || prompt.length < 6) errors.push(`词汇题 ${id || index + 1} 缺少有效题干 prompt。`);

  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  if (rawOptions.length < 2 || rawOptions.length > 6) {
    errors.push(`词汇题 ${id || index + 1} 选项数量必须为 2–6 个（当前 ${rawOptions.length} 个）。`);
  }
  const options = [];
  const optionIds = new Set();
  const optionTexts = new Set();
  rawOptions.forEach((opt, optIdx) => {
    const optId = cleanVocab(typeof opt === 'object' ? (opt.id || opt.key || String.fromCharCode(65 + optIdx)) : String.fromCharCode(65 + optIdx));
    const optText = cleanVocab(typeof opt === 'object' ? (opt.text || opt.label || opt.value) : opt);
    if (!optText) {
      errors.push(`词汇题 ${id || index + 1} 选项 ${optId} 内容为空。`);
      return;
    }
    if (optionIds.has(optId)) {
      errors.push(`词汇题 ${id || index + 1} 存在重复选项 ID: ${optId}。`);
      return;
    }
    const textKey = normVocab(optText);
    if (optionTexts.has(textKey)) {
      errors.push(`词汇题 ${id || index + 1} 存在重复选项文本: "${optText}"。`);
      return;
    }
    optionIds.add(optId);
    optionTexts.add(textKey);
    options.push({ id: optId, text: optText });
  });

  const rawCorrect = Array.isArray(raw.correct_option_ids)
    ? raw.correct_option_ids
    : Array.isArray(raw.correctOptionIds)
      ? raw.correctOptionIds
      : raw.correct_option_id || raw.correctOptionId || raw.answer
        ? [raw.correct_option_id || raw.correctOptionId || raw.answer]
        : [];
  const correctOptionIds = rawCorrect.map(cleanVocab).filter(Boolean);
  if (!correctOptionIds.length) {
    errors.push(`词汇题 ${id || index + 1} 缺少正确答案 correct_option_ids。`);
  } else {
    for (const cid of correctOptionIds) {
      if (!optionIds.has(cid)) {
        errors.push(`词汇题 ${id || index + 1} 正确答案 "${cid}" 不在选项列表中。`);
      }
    }
  }

  const explanationEn = cleanVocab(raw.explanation_en || raw.explanationEn || raw.explanation);
  if (!explanationEn) {
    errors.push(`词汇题 ${id || index + 1} 缺少英文解析 explanation_en。`);
  }

  if (errors.length) return { valid: false, errors, task: null };

  const sourceObj = raw.source && typeof raw.source === 'object' ? raw.source : {};
  return {
    valid: true,
    errors: [],
    task: {
      id,
      sourceItemId,
      type,
      typeLabel: VOCAB_TYPE_LABELS[type] || VOCAB_TYPE_LABELS.definition_recognition,
      target: cleanVocab(raw.target || raw.word || ''),
      targetSense: cleanVocab(raw.target_sense || raw.targetSense || ''),
      prompt,
      options,
      correctOptionIds,
      explanationEn,
      productionPrompt: cleanVocab(raw.production_prompt || raw.productionPrompt || ''),
      audioUrl: cleanVocab(raw.audio_url || raw.audioUrl || ''),
      supportLevel: cleanVocab(raw.support_level || raw.supportLevel || 'ORIGINAL_WORD_AND_EXAMPLE_WITH_NEW_DISTRACTORS'),
      source: {
        id: cleanVocab(sourceObj.id || raw.pack_id || ''),
        name: cleanVocab(sourceObj.name || 'Daily pack'),
        locator: cleanVocab(sourceObj.locator || sourceItemId)
      }
    }
  };
}

export function normalizeVocabularyPractice(rawList = [], archiveWords = [], packId = '') {
  const list = Array.isArray(rawList) ? rawList : [];
  const archive = Array.isArray(archiveWords) ? archiveWords : [];
  const archiveBySourceId = new Map();
  for (const row of archive) {
    if (!row || typeof row !== 'object') continue;
    const sid = cleanVocab(row.id || row.source_item_id || row.sourceItemId);
    if (sid) archiveBySourceId.set(sid, row);
  }

  const tasks = [];
  const errors = [];
  const seenIds = new Set();

  list.forEach((raw, index) => {
    const checked = validateVocabularyTask(raw, index);
    if (!checked.valid) {
      errors.push(...checked.errors);
      return;
    }
    const task = checked.task;
    if (seenIds.has(task.id)) {
      errors.push(`重复的触控词汇题 ID：${task.id}`);
      return;
    }
    seenIds.add(task.id);

    const archivedWord = archiveBySourceId.get(task.sourceItemId) || null;
    if (archivedWord) {
      if (!task.target) task.target = cleanVocab(archivedWord.target);
      if (!task.targetSense) task.targetSense = cleanVocab(archivedWord.definition_en || archivedWord.definitionEn);
      task.archivedExample = cleanVocab(archivedWord.example || '');
      task.archivedAdditionalContexts = Array.isArray(archivedWord.additional_contexts)
        ? archivedWord.additional_contexts.map(cleanVocab).filter(Boolean)
        : [];
      task.momoHistory = archivedWord.momo_history || null;
      task.externalWeakStatus = cleanVocab(archivedWord.external_weak_status || '');
    } else if (!task.target) {
      const correctOpt = task.options.find(opt => task.correctOptionIds.includes(opt.id));
      if (correctOpt && correctOpt.text.split(/\s+/).length <= 4) {
        task.target = correctOpt.text;
      }
    }
    task.packId = cleanVocab(task.source.id || packId);
    tasks.push(task);
  });

  return { tasks, errors };
}

export function evaluateVocabularyChoice(task, selectedOptionId) {
  if (!task || typeof task !== 'object') throw Error('Invalid vocabulary task.');
  const chosenId = cleanVocab(selectedOptionId);
  const options = Array.isArray(task.options) ? task.options : [];
  const chosenOpt = options.find(opt => opt.id === chosenId) || null;
  const correctIds = Array.isArray(task.correctOptionIds) ? task.correctOptionIds : [];
  const correctOpts = options.filter(opt => correctIds.includes(opt.id));
  if (!chosenOpt) {
    return {
      status: 'blank',
      correct: false,
      selectedOptionId: '',
      selectedText: '',
      correctOptionIds: correctIds,
      correctText: correctOpts.map(o => `${o.id}. ${o.text}`).join(' / '),
      recognitionOnly: true,
      countsAsMasteryK: false
    };
  }
  const isCorrect = correctIds.includes(chosenOpt.id);
  return {
    status: isCorrect ? 'correct' : 'incorrect',
    correct: isCorrect,
    selectedOptionId: chosenOpt.id,
    selectedText: chosenOpt.text,
    correctOptionIds: correctIds,
    correctText: correctOpts.map(o => `${o.id}. ${o.text}`).join(' / '),
    explanationEn: cleanVocab(task.explanationEn),
    recognitionOnly: true,
    countsAsMasteryK: false
  };
}

export function summarizeVocabularyPractice(tasks = [], attempts = []) {
  const validTasks = Array.isArray(tasks) ? tasks : [];
  const validAttempts = Array.isArray(attempts) ? attempts : [];
  const byTask = new Map();
  for (const row of validAttempts) {
    if (!row || typeof row !== 'object') continue;
    const tid = cleanVocab(row.taskId || row.id);
    if (tid && !byTask.has(tid)) byTask.set(tid, row);
  }
  let answered = 0;
  let correctFirst = 0;
  let incorrectFirst = 0;
  let skipped = 0;
  let productionSubmitted = 0;

  for (const task of validTasks) {
    const attempt = byTask.get(task.id);
    if (!attempt) continue;
    if (attempt.skipped) {
      skipped++;
      continue;
    }
    if (attempt.selectedOptionId) {
      answered++;
      if (attempt.firstCheck?.correct || attempt.correct) correctFirst++;
      else incorrectFirst++;
    }
    if (cleanVocab(attempt.productionAnswer)) productionSubmitted++;
  }

  return {
    total: validTasks.length,
    answered,
    correctFirst,
    incorrectFirst,
    skipped,
    remaining: Math.max(0, validTasks.length - answered - skipped),
    productionSubmitted,
    recognitionOnlyNotice: '触控选择题仅代表语境识别（Recognition），不自动计为 K 或独立无提示掌握。'
  };
}


// Legacy stable API preserved from 10.4.2 for existing imports and persisted evidence.
/**
 * Evidence-aware vocabulary question engine.
 *
 * This module is deliberately independent of the app state and rendering code:
 * invalid imported questions are rejected rather than repaired with invented
 * distractors, and recognition is never treated as independent recall.
 */

export const VOCABULARY_TASK_TYPES = Object.freeze([
  'definition_recognition', 'reverse_definition', 'contextual_cloze',
  'contextual_inference', 'synonym_discrimination', 'antonym_recognition',
  'confusable_words', 'word_formation', 'collocation_challenge',
  'phrasal_verb_selection', 'polysemy_in_context', 'register_and_tone',
  'listening_word_recognition', 'misuse_detection'
]);

const TYPES = new Set(VOCABULARY_TASK_TYPES);
const TYPE_ALIASES = new Map([
  ['definition', 'definition_recognition'], ['definition_recognition', 'definition_recognition'],
  ['reverse_definition', 'reverse_definition'], ['reverse_definition_recognition', 'reverse_definition'],
  ['contextual_cloze', 'contextual_cloze'], ['cloze', 'contextual_cloze'],
  ['contextual_inference', 'contextual_inference'], ['inference', 'contextual_inference'],
  ['synonym_discrimination', 'synonym_discrimination'], ['synonym', 'synonym_discrimination'],
  ['antonym_recognition', 'antonym_recognition'], ['antonym', 'antonym_recognition'],
  ['confusable_words', 'confusable_words'], ['confusable', 'confusable_words'],
  ['word_formation', 'word_formation'], ['collocation_challenge', 'collocation_challenge'],
  ['collocation', 'collocation_challenge'], ['phrasal_verb_selection', 'phrasal_verb_selection'],
  ['phrasal_verb', 'phrasal_verb_selection'], ['polysemy_in_context', 'polysemy_in_context'],
  ['polysemy', 'polysemy_in_context'], ['register_and_tone', 'register_and_tone'],
  ['register_tone', 'register_and_tone'], ['listening_word_recognition', 'listening_word_recognition'],
  ['listening_word', 'listening_word_recognition'], ['misuse_detection', 'misuse_detection'],
  ['misuse', 'misuse_detection']
]);

const text = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
const key = value => text(value).normalize('NFKC').toLocaleLowerCase();
const list = value => Array.isArray(value) ? value : value == null ? [] : [value];
const safeText = (value, max = 4000) => {
  const out = text(value);
  return out && out.length <= max ? out : '';
};
const canonicalType = value => {
  const raw = key(value).replace(/[\s-]+/g, '_');
  return TYPE_ALIASES.get(raw) || (TYPES.has(raw) ? raw : '');
};
const optionLabel = (index) => String.fromCharCode(65 + index);

function normalizeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return {options: [], error: 'options must be an array'};
  const options = rawOptions.map((raw, index) => {
    if (raw && typeof raw === 'object') {
      const optionText = safeText(raw.text ?? raw.label ?? raw.value, 500);
      return {id: safeText(raw.id, 20) || optionLabel(index), text: optionText};
    }
    return {id: optionLabel(index), text: safeText(raw, 500)};
  });
  if (options.some(option => !option.text)) return {options, error: 'every option needs non-empty text'};
  const ids = options.map(option => key(option.id));
  const labels = options.map(option => key(option.text));
  if (new Set(ids).size !== ids.length) return {options, error: 'option IDs must be unique'};
  if (new Set(labels).size !== labels.length) return {options, error: 'option texts must be unique'};
  return {options, error: ''};
}

function resolveCorrectIds(raw, options) {
  let values = raw.correct_option_ids ?? raw.correctOptionIds ?? raw.correct_option_id ?? raw.correctOptionId;
  if (values == null) values = raw.answer ?? raw.correct_answer ?? raw.correctAnswer;
  const supplied = list(values).map(value => text(value)).filter(Boolean);
  const ids = [];
  for (const value of supplied) {
    const found = options.find(option => key(option.id) === key(value) || key(option.text) === key(value));
    if (!found) return {ids: [], error: `correct answer ${value} is not one of the visible options`};
    if (!ids.includes(found.id)) ids.push(found.id);
  }
  return {ids, error: ''};
}

function normalizedSource(raw, packId) {
  const source = raw.source && typeof raw.source === 'object' ? raw.source : {};
  const out = {};
  if (typeof raw.source === 'string' && safeText(raw.source, 500)) out.name = safeText(raw.source, 500);
  for (const name of ['id', 'name', 'locator', 'url', 'reference']) {
    const value = safeText(source[name] ?? raw[`source_${name}`], 500);
    if (value) out[name] = value;
  }
  if (!out.id && text(packId)) out.id = text(packId);
  return out;
}

/** Return a quality-gate result without modifying the source object. */
export function qualityGateVocabularyTask(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {ok: false, reason: 'task must be an object'};
  const type = canonicalType(raw.type ?? raw.task_type ?? raw.taskType ?? raw.question_type);
  if (!type) return {ok: false, reason: 'unsupported vocabulary task type'};
  const prompt = safeText(raw.prompt ?? raw.question ?? raw.stem, 4000);
  if (!prompt) return {ok: false, reason: 'prompt is required'};
  const normalized = normalizeOptions(raw.options ?? raw.choices);
  if (normalized.error) return {ok: false, reason: normalized.error};
  const allowTwo = raw.allow_two_options === true || raw.allowTwoOptions === true;
  if (normalized.options.length !== 4 && !(normalized.options.length === 2 && allowTwo)) {
    return {ok: false, reason: 'a vocabulary choice task needs four options; a two-option task must explicitly allow_two_options'};
  }
  const answers = resolveCorrectIds(raw, normalized.options);
  if (answers.error || !answers.ids.length) return {ok: false, reason: answers.error || 'a correct answer is required'};
  if (answers.ids.length > 1 && raw.allow_multiple_correct !== true && raw.allowMultipleCorrect !== true) {
    return {ok: false, reason: 'exactly one correct option is required unless multiple answers are explicitly allowed'};
  }
  const explanation = safeText(raw.explanation_en ?? raw.explanation ?? raw.rationale, 4000);
  if (!explanation) return {ok: false, reason: 'answer and explanation must be supplied together'};
  if (type === 'listening_word_recognition') {
    const audio = safeText(raw.audio_url ?? raw.audioUrl, 2000);
    try {
      if (!audio || new URL(audio).protocol !== 'https:') throw new Error();
    } catch {
      return {ok: false, reason: 'listening word recognition requires a valid HTTPS audio URL'};
    }
  }
  return {ok: true, reason: '', type, prompt, options: normalized.options, correctOptionIds: answers.ids, explanation};
}

/** Normalize one imported task; no distractor is generated when quality fails. */
export function normalizeVocabularyTask(raw = {}, index = 0, packId = '') {
  const gate = qualityGateVocabularyTask(raw);
  if (!gate.ok) return {ok: false, task: null, error: gate.reason, index};
  const sourceItemId = safeText(raw.source_item_id ?? raw.sourceItemId ?? raw.item_id ?? raw.itemId, 500) || null;
  const id = safeText(raw.id ?? raw.task_id ?? raw.taskId, 200) || `${text(packId) || 'pack'}:vocab:${index + 1}`;
  const targetSense = safeText(raw.target_sense ?? raw.targetSense ?? raw.sense, 1000) || null;
  const productionPrompt = safeText(raw.production_prompt ?? raw.productionPrompt, 2000) || null;
  const listeningAudio = safeText(raw.audio_url ?? raw.audioUrl, 2000) || null;
  const task = {
    id, sourceItemId, type: gate.type, targetSense, prompt: gate.prompt,
    options: gate.options, correctOptionIds: gate.correctOptionIds,
    explanation: gate.explanation, productionPrompt, source: normalizedSource(raw, packId),
    allowMultipleCorrect: Boolean(raw.allow_multiple_correct ?? raw.allowMultipleCorrect),
    allowTwoOptions: gate.options.length === 2,
    audioUrl: listeningAudio
  };
  return {ok: true, task, error: null, index};
}

export function normalizeVocabularyTasks(rawTasks = [], packId = '') {
  const rows = Array.isArray(rawTasks) ? rawTasks : [];
  const tasks = [], errors = [];
  const ids = new Set();
  for (let index = 0; index < rows.length; index++) {
    const result = normalizeVocabularyTask(rows[index], index, packId);
    if (!result.ok) { errors.push(`Vocabulary task ${index + 1}: ${result.error}`); continue; }
    if (ids.has(result.task.id)) { errors.push(`Vocabulary task ${index + 1}: duplicate task ID ${result.task.id}`); continue; }
    ids.add(result.task.id); tasks.push(result.task);
  }
  return {tasks, errors, fallbacks: errors.length};
}

function findChoice(choice, task) {
  const raw = text(choice);
  if (!raw) return {status: 'blank', option: null, raw};
  const options = Array.isArray(task?.options) ? task.options : [];
  const option = options.find(item => key(item.id) === key(raw) || key(item.text) === key(raw));
  return option ? {status: 'selected', option, raw} : {status: 'invalid', option: null, raw};
}

export function compareVocabularyChoice(choice, task = {}) {
  const found = findChoice(choice, task);
  if (found.status === 'blank') return {status: 'blank', selectedOptionId: null, selectedText: '', recognitionResult: 'UNASSESSED', rawChoice: ''};
  if (found.status === 'invalid') return {status: 'invalid', selectedOptionId: null, selectedText: found.raw, recognitionResult: 'UNASSESSED', rawChoice: found.raw};
  const correct = (task.correctOptionIds || []).some(id => key(id) === key(found.option.id));
  return {
    status: correct ? 'correct' : 'incorrect', selectedOptionId: found.option.id,
    selectedText: found.option.text, recognitionResult: correct ? 'RECOGNITION_CORRECT' : 'RECOGNITION_INCORRECT', rawChoice: found.raw,
    correctOptionIds: Array.isArray(task.correctOptionIds) ? [...task.correctOptionIds] : []
  };
}

export function buildVocabularyAttempt({task = {}, taskId = null, sourceItemId = null, choice = '', choiceCheck = null, firstSubmittedAt = null, retryChoice = '', retryCheck = null, productionAnswer = '', productionVerified = false, hintUsed = false, referenceViewed = false, skipped = false, rating = null, ratingSource = null, at = new Date().toISOString()} = {}) {
  const id = text(taskId || task.id) || `vocab:${Date.now()}`;
  const firstCheck = choiceCheck || compareVocabularyChoice(choice, task);
  const retry = text(retryChoice) ? (retryCheck || compareVocabularyChoice(retryChoice, task)) : null;
  const firstAnswer = choice == null ? '' : String(choice);
  const production = productionAnswer == null ? '' : String(productionAnswer);
  let evidenceType = 'UNASSESSED';
  let recognitionResult = 'UNASSESSED';
  if (skipped) evidenceType = 'SKIPPED';
  else {
    recognitionResult = firstCheck.recognitionResult || (firstCheck.status === 'correct' ? 'RECOGNITION_CORRECT' : firstCheck.status === 'incorrect' ? 'RECOGNITION_INCORRECT' : 'UNASSESSED');
    evidenceType = production.trim() ? (productionVerified ? 'TRANSFER_VERIFIED' : 'PRODUCTION_ATTEMPT') : recognitionResult;
  }
  const independent = evidenceType === 'TRANSFER_VERIFIED' && !hintUsed && !referenceViewed;
  return {
    id, taskId: text(task.id) || id, sourceItemId: text(sourceItemId || task.sourceItemId) || null,
    firstAnswer, firstSubmittedAt: firstSubmittedAt || at, firstChoiceCheck: firstCheck,
    retryAnswer: retryChoice == null ? '' : String(retryChoice), retryChoiceCheck: retry,
    productionAnswer: production, hintUsed: Boolean(hintUsed), referenceViewed: Boolean(referenceViewed),
    recognitionResult, evidenceType, isIndependent: independent, skipped: Boolean(skipped),
    rating: ['K','V','N'].includes(rating) ? rating : null, ratingSource: text(ratingSource) || null, at
  };
}

export function summarizeVocabularyAttempts(attempts = []) {
  const rows = Array.isArray(attempts) ? attempts : [];
  const summary = {total: rows.length, recognitionCorrect: 0, recognitionIncorrect: 0, independentRecall: 0, productionAttempts: 0, skipped: 0, unassessed: 0, K: 0, V: 0, N: 0};
  for (const row of rows) {
    if (row.recognitionResult === 'RECOGNITION_CORRECT') summary.recognitionCorrect++;
    if (row.recognitionResult === 'RECOGNITION_INCORRECT') summary.recognitionIncorrect++;
    if (row.evidenceType === 'INDEPENDENT_RECALL') summary.independentRecall++;
    if (row.evidenceType === 'PRODUCTION_ATTEMPT' || row.evidenceType === 'TRANSFER_VERIFIED') summary.productionAttempts++;
    if (row.evidenceType === 'SKIPPED' || row.skipped) summary.skipped++;
    if (row.evidenceType === 'UNASSESSED' && !row.skipped) summary.unassessed++;
    if (row.rating === 'K') summary.K++;
    if (row.rating === 'V') summary.V++;
    if (row.rating === 'N') summary.N++;
  }
  return summary;
}
