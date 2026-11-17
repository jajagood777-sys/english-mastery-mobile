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
