/**
 * Smart Vocabulary Touch Engine (11.0.0)
 * Supports 14 candidate vocabulary question types, strict schema 2.0 validation,
 * source-archive lookup, Intra-Journey Micro-Rehearsal (同轮错词微回炉),
 * and honest recognition-only evidence grading.
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
  sentence_paraphrase_match: '同轮同义转换 · Paraphrase Match'
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
      archivedExample: cleanVocab(raw.archived_example || raw.archivedExample || ''),
      commuteMode: cleanVocab(raw.commute_mode || raw.commuteMode || ''),
      batchGroup: cleanVocab(raw.batch_group || raw.batchGroup || ''),
      isReviewMistake: Boolean(raw.is_review_mistake || raw.isReviewMistake || /错题|回炉|review_mistake/i.test(String(raw.batch_group || raw.batchGroup || ''))),
      priorMistakeNote: cleanVocab(raw.prior_mistake_note || raw.priorMistakeNote || ''),
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

/**
 * Builds an Intra-Journey Micro-Rehearsal queue (同轮错词末端微回炉)
 * grounded in Retrieval Practice + Corrective Feedback research (Roediger & Karpicke 2006).
 * Selects up to `maxItems` tasks that were missed on the first attempt and not yet rehearsed.
 */
export function buildIntraSessionRehearsalQueue(tasks = [], attempts = [], { maxItems = 5 } = {}) {
  const validTasks = Array.isArray(tasks) ? tasks : [];
  const validAttempts = Array.isArray(attempts) ? attempts : [];
  const taskMap = new Map(validTasks.map(t => [cleanVocab(t?.id), t]));
  const queue = [];
  const seen = new Set();

  for (const attempt of validAttempts) {
    if (!attempt || attempt.skipped) continue;
    const tid = cleanVocab(attempt.taskId || attempt.id);
    if (!tid || seen.has(tid)) continue;
    const failedFirst = attempt.firstCheck ? !attempt.firstCheck.correct : attempt.correct === false;
    if (!failedFirst) continue;
    if (attempt.rehearsalCompleted) continue;
    const task = taskMap.get(tid);
    if (!task) continue;
    seen.add(tid);

    const correctOpt = (task.options || []).find(o => (task.correctOptionIds || []).includes(o.id));
    const targetWord = cleanVocab(task.target || correctOpt?.text || '');
    const normSense = cleanVocab(task.targetSense).toLowerCase().replace(/[.;!?]+$/, '');
    const normCorrectText = cleanVocab(correctOpt?.text || '').toLowerCase().replace(/[.;!?]+$/, '');
    const avgOptWords = (task.options || []).length
      ? (task.options || []).reduce((sum, o) => sum + cleanVocab(o?.text || '').split(/\s+/).filter(Boolean).length, 0) / task.options.length
      : 0;
    const optionsAreDefinitions = Boolean(
      ['definition_recognition', 'definition_selection', 'meaning_in_context'].includes(task.type)
      || (normSense && normCorrectText && (normCorrectText === normSense || normCorrectText.includes(normSense) || normSense.includes(normCorrectText)))
      || avgOptWords >= 4
    );

    // Deterministic seeded shuffle of options so user cannot memorize letter position
    const rawOpts = Array.isArray(task.options) ? task.options.map(o => ({ ...o, _wasCorrect: (task.correctOptionIds || []).includes(o.id) })) : [];
    let seed = 0;
    const seedStr = `${task.id || ''}:rehearsal:${targetWord}`;
    for (let s = 0; s < seedStr.length; s++) seed = ((seed * 31) + seedStr.charCodeAt(s)) >>> 0;
    for (let k = rawOpts.length - 1; k > 0; k--) {
      seed = ((seed * 1664525) + 1013904223) >>> 0;
      const swapIdx = seed % (k + 1);
      [rawOpts[k], rawOpts[swapIdx]] = [rawOpts[swapIdx], rawOpts[k]];
    }
    const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
    const shuffledOptions = rawOpts.map((o, idx) => ({ id: keys[idx] || String(idx + 1), text: o.text }));
    const shuffledCorrectIds = rawOpts.map((o, idx) => (o._wasCorrect ? (keys[idx] || String(idx + 1)) : null)).filter(Boolean);

    const firstLetterCue = targetWord
      ? `${targetWord[0]}_____ (${targetWord.length} letters)`
      : '';
    const archivedExample = cleanVocab(task.archivedExample || '');
    const maskedExample = archivedExample && targetWord
      ? archivedExample.replace(new RegExp(targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '_____')
      : '';

    queue.push({
      taskId: task.id,
      sourceItemId: task.sourceItemId,
      target: targetWord,
      targetSense: cleanVocab(task.targetSense),
      archivedExample,
      optionsAreDefinitions,
      firstLetterCue,
      maskedExample,
      originalPrompt: task.prompt,
      options: shuffledOptions.length ? shuffledOptions : task.options,
      correctOptionIds: shuffledCorrectIds.length ? shuffledCorrectIds : task.correctOptionIds,
      priorWrongChoice: cleanVocab(attempt.selectedText || attempt.selectedOptionId)
    });
    if (queue.length >= maxItems) break;
  }

  return queue;
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
  let rehearsedCorrect = 0;

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
    if (attempt.rehearsalPassed) rehearsedCorrect++;
  }

  return {
    total: validTasks.length,
    answered,
    correctFirst,
    incorrectFirst,
    skipped,
    remaining: Math.max(0, validTasks.length - answered - skipped),
    productionSubmitted,
    rehearsedCorrect,
    recognitionOnlyNotice: '触控选择题与同轮微回炉仅代表语境识别与短时修正，不自动计为 K 或独立无提示掌握。'
  };
}

// ==========================================================================
// v19.6.0 Anti-Leak Pack Gate & In-Session Delayed Interleaving (3-4 items)
// ==========================================================================
export const HIDE_TARGET_HEADER_TYPES = Object.freeze([
  'contextual_cloze',
  'reverse_definition',
  'collocation_challenge',
  'confusable_words',
  'confusable_pair',
  'synonym_discrimination',
  'phrasal_verb_selection',
  'register_appropriateness',
  'morphology_derivation',
  'antonym_contrast',
  'idiom_in_context',
  'sentence_paraphrase_match',
  'word_choice',
  'meaning_to_word'
]);

export function checkVocabularyTaskLeak(task = {}) {
  const leaks = [];
  if (!task || typeof task !== 'object') return { hasLeak: false, leaks };
  const target = String(task.target || '').trim();
  if (!target) return { hasLeak: false, leaks };
  const targetLower = target.toLowerCase();
  const options = Array.isArray(task.options) ? task.options : [];
  const optionHasTarget = options.some(o => String(o?.text || '').trim().toLowerCase() === targetLower);
  const promptLower = String(task.prompt || '').toLowerCase();
  const exampleLower = String(task.archivedExample || task.example || '').toLowerCase();
  const isMaskedType = HIDE_TARGET_HEADER_TYPES.includes(task.type) || optionHasTarget || /_{2,}/.test(promptLower);

  if (isMaskedType) {
    if (promptLower.includes(targetLower) && !/_{2,}/.test(promptLower)) {
      leaks.push(`题干 prompt 直接暴露了目标词 "${target}"`);
    }
    if (exampleLower && exampleLower.includes(targetLower)) {
      leaks.push(`例句 archivedExample 直接暴露了目标词 "${target}"`);
    }
  }
  return {
    hasLeak: leaks.length > 0,
    shouldHideHeader: isMaskedType,
    leaks
  };
}

export function scheduleInSessionDelayedRetry(queue = [], currentIndex = 0, task = null, { delayGap = 3 } = {}) {
  const list = Array.isArray(queue) ? [...queue] : [];
  if (!task || !task.id) return list;
  const retryId = `${task.id}__retry`;
  if (list.some(item => item && item.id === retryId)) return list;
  const insertAt = Math.min(list.length, Math.max(currentIndex + 1, currentIndex + 1 + delayGap));
  const maskedPrompt = task.target
    ? String(task.prompt || '').replace(new RegExp(task.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '______')
    : String(task.prompt || '');
  const retryTask = {
    ...task,
    id: retryId,
    isDelayedRetry: true,
    originalTaskId: task.id,
    typeLabel: '🔄 隔题回马枪 · 错词巩固',
    prompt: task.archivedExample
      ? `还记得刚才错过的词吗？根据语境选出正确词条：${String(task.archivedExample).replace(new RegExp((task.target || '___').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '______')}`
      : maskedPrompt
  };
  list.splice(insertAt, 0, retryTask);
  return list;
}

export function parseVocabPromptParts(prompt = '') {
  const raw = String(prompt || '').trim();
  if (!raw) return { instruction: '', blocks: [] };

  // Pattern 1: Structured English labels (Meaning: / Definition: / Sentence: / Example: / Context:)
  const labelRe = /\b(Meaning|Definition|Sentence|Example|Context):\s*/gi;
  const matches = [...raw.matchAll(labelRe)];
  if (matches.length > 0) {
    const instruction = raw.slice(0, matches[0].index).trim();
    const blocks = [];
    for (let i = 0; i < matches.length; i++) {
      const key = matches[i][1].toLowerCase();
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
      const text = raw.slice(start, end).trim();
      if (!text) continue;
      if (key === 'meaning' || key === 'definition') {
        blocks.push({ kind: 'meaning', label: key === 'definition' ? '英文释义 · DEFINITION' : '核心释义 · MEANING', text });
      } else {
        blocks.push({ kind: 'sentence', label: key === 'example' ? '例句语境 · EXAMPLE' : '语境原句 · SENTENCE', text });
      }
    }
    if (blocks.length > 0) return { instruction, blocks };
  }

  // Pattern 2: "Which word matches this English definition? <body...>" or "... Which one means: <body...>"
  const colonSplit = raw.match(/^(.+?(?:means|definition|sentence|example|词条|语境|释义)[:：])\s*(.+)$/i);
  if (colonSplit && colonSplit[2].trim()) {
    const inst = colonSplit[1].replace(/[:：]\s*$/, '').trim();
    const body = colonSplit[2].trim();
    const isSentence = /_{2,}|sentence|example|语境|词条/i.test(inst) || /_{2,}/.test(body);
    return {
      instruction: inst,
      blocks: [{ kind: isSentence ? 'sentence' : 'meaning', label: isSentence ? '语境原句 · CONTEXT' : '目标释义 · MEANING', text: body }]
    };
  }

  const qSplit = raw.match(/^([^?？]+[?？])\s+(.+)$/);
  if (qSplit && qSplit[2].trim()) {
    const inst = qSplit[1].trim();
    const body = qSplit[2].trim();
    const isSentence = /_{2,}/.test(body);
    return {
      instruction: inst,
      blocks: [{ kind: isSentence ? 'sentence' : 'meaning', label: isSentence ? '语境原句 · CONTEXT' : '英文释义 · DEFINITION', text: body }]
    };
  }

  return { instruction: '', blocks: [{ kind: 'plain', label: '', text: raw }] };
}
