/*
 * Contextual Discrimination & Transfer Lab (CDTL)
 *
 * This module deliberately has no DOM or storage dependency.  A CDTL task is
 * an optional, schema-2 extension: normalising it must never manufacture
 * choices or reinterpret an open production answer as a scored answer.
 */

const MAX_TEXT = 20000;
const VALID_RATINGS = new Set(['K', 'V', 'N']);

function text(value, limit = MAX_TEXT) {
  if (value === null || value === undefined) return '';
  const result = String(value).trim();
  return result.length <= limit ? result : result.slice(0, limit);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function key(value) {
  return text(value)
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[\u200b\s.,!?;:'"“”‘’`_\-–—()[\]{}<>/\\]+/g, '');
}

function displayKey(value) {
  return text(value).toLocaleLowerCase().normalize('NFKC');
}

function pick(raw, ...names) {
  for (const name of names) {
    const value = text(raw?.[name]);
    if (value) return value;
  }
  return '';
}

function optionText(option) {
  return typeof option === 'object' && option !== null
    ? pick(option, 'text', 'label', 'value', 'option')
    : text(option);
}

function normalizeOptionList(rawOptions) {
  const result = [];
  const seen = new Set();
  // Keep a bounded inspection window for hostile imports, but retain enough
  // entries to reject an overfull multiple-choice set instead of truncating
  // it into a seemingly valid four-option task.
  for (const raw of list(rawOptions).slice(0, 8)) {
    const value = optionText(raw);
    const normalized = displayKey(value);
    if (!value || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

function resolveAnswer(rawAnswer, options) {
  const answer = text(rawAnswer);
  if (!answer) return '';
  const index = options.findIndex((option, i) =>
    displayKey(option) === displayKey(answer) ||
    answer.toUpperCase().replace(/[.)、]$/, '') === String.fromCharCode(65 + i));
  return index >= 0 ? options[index] : answer;
}

function resolveAnswers(rawAnswer, options) {
  const values = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
  const resolved = values.map(value => resolveAnswer(value, options)).filter(Boolean);
  return [...new Map(resolved.map(value => [displayKey(value), value])).values()];
}

function normalizeContext(raw = {}, taskId, index, errors) {
  if (!raw || typeof raw !== 'object') {
    errors.push(`${taskId}: context ${index + 1} is not an object`);
    return null;
  }
  const id = pick(raw, 'id', 'context_id', 'contextId') || `${taskId}:context-${index + 1}`;
  const errorStart = errors.length;
  const prompt = pick(raw, 'prompt', 'question', 'sentence', 'context');
  const rawOptions = list(raw.options || raw.choices);
  const options = normalizeOptionList(rawOptions);
  const rawAnswer = raw.answers ?? raw.correct_answers ?? raw.correctAnswers ?? raw.answer ?? raw.correct_answer ?? raw.correctAnswer ?? raw.correct_option_id ?? raw.correctOptionId;
  const answers = resolveAnswers(rawAnswer, options);
  const answer = answers[0] || '';
  if (!prompt) errors.push(`${taskId}/${id}: missing prompt`);
  if (rawOptions.length !== options.length) errors.push(`${taskId}/${id}: options must be unique and non-empty`);
  if (options.length < 2 || options.length > 4) errors.push(`${taskId}/${id}: options must contain 2 to 4 distinct choices`);
  if (!answers.length || answers.some(value => !options.some(option => displayKey(option) === displayKey(value)))) {
    errors.push(`${taskId}/${id}: answer must be one of the visible options`);
  }
  const explanation = pick(raw, 'explanation', 'explanation_en', 'why');
  const productionPrompt = pick(raw, 'production_prompt', 'productionPrompt', 'transfer_prompt', 'transferPrompt');
  if (!explanation) errors.push(`${taskId}/${id}: explanation is required with the answer`);
  if (errors.length > errorStart) return null;
  return {
    id,
    prompt,
    options,
    answer,
    answers,
    correctOptionIds: answers.length ? options.map((option, i) => answers.some(value => displayKey(option) === displayKey(value)) ? String.fromCharCode(65 + i) : null).filter(Boolean) : [],
    explanation: explanation || null,
    productionPrompt: productionPrompt || null,
    sourceReference: pick(raw, 'source_reference', 'sourceReference') || null,
    targetSense: pick(raw, 'target_sense', 'targetSense') || null,
    type: pick(raw, 'type', 'task_type', 'taskType') || 'contextual_discrimination'
  };
}

/** Normalize optional schema-2 `cdtl_tasks` without inventing distractors. */
export function normalizeCDTLTasks(value, packId = '') {
  const rows = Array.isArray(value) ? value : [];
  const tasks = [];
  const errors = [];
  const seenTaskIds = new Set();
  for (const [index, raw] of rows.entries()) {
    if (!raw || typeof raw !== 'object') {
      errors.push(`task ${index + 1} is not an object`);
      continue;
    }
    const id = pick(raw, 'id', 'task_id', 'taskId') || `cdtl-${index + 1}`;
    if (seenTaskIds.has(id)) {
      errors.push(`${id}: duplicate task id`);
      continue;
    }
    seenTaskIds.add(id);
    const contexts = [];
    const seenContextIds = new Set();
    for (const [contextIndex, rawContext] of list(raw.contexts || raw.questions).entries()) {
      const context = normalizeContext(rawContext, id, contextIndex, errors);
      if (!context) continue;
      if (seenContextIds.has(context.id)) {
        errors.push(`${id}: duplicate context id ${context.id}`);
        continue;
      }
      seenContextIds.add(context.id);
      contexts.push(context);
    }
    if (!contexts.length) {
      errors.push(`${id}: requires at least one valid context`);
      continue;
    }
    tasks.push({
      id,
      packId: text(packId) || null,
      title: pick(raw, 'title', 'name') || id,
      targets: list(raw.targets || raw.target_words || raw.targetWords).map(value => text(value)).filter(Boolean),
      sourceItemId: pick(raw, 'source_item_id', 'sourceItemId') || null,
      skillType: pick(raw, 'skill_type', 'skillType') || 'contextual_discrimination',
      contexts,
      productionPrompt: pick(raw, 'production_prompt', 'productionPrompt') || null,
      sourceReference: pick(raw, 'source_reference', 'sourceReference') || null
    });
  }
  return { tasks, errors };
}

function resolveExpected(context = {}) {
  const options = normalizeOptionList(context.options || context.choices);
  const expectedRaw = context.answers ?? context.correct_answers ?? context.correctAnswers ?? context.answer ?? context.correct_answer ?? context.correctAnswer ?? context.correct_option_ids ?? context.correctOptionIds;
  const expected = resolveAnswers(expectedRaw, options);
  return { options, expected };
}

/** Deterministic choice check.  It does not score open production text. */
export function compareCDTLChoice(userAnswer, context = {}) {
  const rawUser = text(userAnswer);
  if (!rawUser) return { status: 'blank', user: '', expected: text(context.answer), accepted: false };
  const { options, expected } = resolveExpected(context);
  const expectedText = expected[0] || '';
  if (!expected.length) return { status: 'invalid', user: rawUser, expected: '', expectedAnswers: [], accepted: false };
  if (!options.length) {
    if (expected.includes(rawUser)) return { status: 'correct', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: true };
    if (expected.some(value => displayKey(rawUser) === displayKey(value) || key(rawUser) === key(value))) {
      return { status: 'case_or_punctuation', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: true };
    }
    return { status: 'incorrect', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: false };
  }
  const user = resolveAnswer(rawUser, options);
  if (!user || !options.some(option => displayKey(option) === displayKey(user))) {
    return { status: 'invalid', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: false };
  }
  if (expected.includes(user)) return { status: 'correct', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: true };
  if (expected.some(value => displayKey(user) === displayKey(value) || key(user) === key(value))) {
    return { status: 'case_or_punctuation', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: true };
  }
  return { status: 'incorrect', user: rawUser, expected: expectedText, expectedAnswers: expected, accepted: false };
}

function nonEmpty(value) {
  return text(value) || null;
}

/** Build an append-only attempt; first answers are never replaced by retries. */
export function buildCDTLAttempt(input = {}) {
  const at = pick(input, 'at', 'createdAt', 'created_at') || new Date().toISOString();
  const choiceCheck = input.choiceCheck || input.choice_check || null;
  const firstChoice = input.firstChoice ?? input.first_choice ?? input.choice ?? '';
  const firstProductionAnswer = input.firstProductionAnswer ?? input.first_production_answer ?? input.productionAnswer ?? '';
  const retryChoice = input.retryChoice ?? input.retry_choice ?? '';
  const retryProductionAnswer = input.retryProductionAnswer ?? input.retry_production_answer ?? input.retryAnswer ?? '';
  const skipped = Boolean(input.skipped || input.status === 'skipped' || input.evidenceType === 'skipped');
  const hintUsed = Boolean(input.hintUsed ?? input.hint_used ?? input.promptUsed ?? input.prompt_used);
  const referenceViewed = Boolean(input.referenceViewed ?? input.reference_viewed ?? input.modelAnswerViewed ?? input.model_answer_viewed);
  let evidenceType = text(input.evidenceType || input.evidence_type);
  if (!evidenceType) evidenceType = skipped ? 'skipped' : (firstProductionAnswer && !hintUsed && !referenceViewed ? 'independent' : firstProductionAnswer ? 'prompted' : 'recognition');
  if (skipped) evidenceType = 'skipped';
  return {
    id: text(input.id) || `cdtl-attempt:${text(input.taskId || input.task_id || input.contextId || input.context_id)}:${at}`,
    taskId: nonEmpty(input.taskId ?? input.task_id),
    contextId: nonEmpty(input.contextId ?? input.context_id),
    packId: nonEmpty(input.packId ?? input.pack_id),
    targets: list(input.targets).map(value => text(value)).filter(Boolean),
    firstChoice: text(firstChoice),
    firstChoiceAt: pick(input, 'firstChoiceAt', 'first_choice_at', 'firstSubmittedAt', 'first_submitted_at') || at,
    choiceCheck,
    retryChoice: text(retryChoice),
    retryChoiceAt: pick(input, 'retryChoiceAt', 'retry_choice_at', 'retrySubmittedAt', 'retry_submitted_at') || null,
    firstProductionAnswer: text(firstProductionAnswer),
    firstProductionSubmittedAt: pick(input, 'firstProductionSubmittedAt', 'first_production_submitted_at') || (firstProductionAnswer ? at : null),
    retryProductionAnswer: text(retryProductionAnswer),
    retryProductionSubmittedAt: pick(input, 'retryProductionSubmittedAt', 'retry_production_submitted_at') || null,
    referenceAnswer: nonEmpty(input.referenceAnswer ?? input.reference_answer),
    productionPrompt: nonEmpty(input.productionPrompt ?? input.production_prompt),
    hintUsed,
    hintEvents: list(input.hintEvents || input.hint_events),
    referenceViewed,
    referenceViewedAt: pick(input, 'referenceViewedAt', 'reference_viewed_at') || null,
    rating: VALID_RATINGS.has(input.rating) ? input.rating : null,
    evidenceType,
    status: skipped ? 'skipped' : (text(input.status) || (choiceCheck?.status || (firstProductionAnswer ? 'submitted' : 'not_started'))),
    skipped,
    at
  };
}

export function summarizeCDTLAttempts(value = []) {
  const attempts = Array.isArray(value) ? value : [];
  const summary = { total: attempts.length, choiceCorrect: 0, choiceIncorrect: 0, independent: 0, prompted: 0, skipped: 0, rated: 0, K: 0, V: 0, N: 0, unassessed: 0 };
  for (const attempt of attempts) {
    const status = text(attempt?.choiceCheck?.status || attempt?.choice_check?.status).toLowerCase();
    if (status === 'correct') summary.choiceCorrect++;
    if (status === 'incorrect') summary.choiceIncorrect++;
    const evidence = text(attempt?.evidenceType || attempt?.evidence_type).toLowerCase();
    if (['independent', 'independent_recall'].includes(evidence)) summary.independent++;
    if (evidence === 'prompted') summary.prompted++;
    if (attempt?.skipped || text(attempt?.status).toLowerCase() === 'skipped' || evidence === 'skipped') summary.skipped++;
    const rating = VALID_RATINGS.has(attempt?.rating) ? attempt.rating : null;
    if (rating) { summary.rated++; summary[rating]++; }
    else if (!(attempt?.skipped || text(attempt?.status).toLowerCase() === 'skipped' || evidence === 'skipped')) summary.unassessed++;
  }
  return summary;
}

