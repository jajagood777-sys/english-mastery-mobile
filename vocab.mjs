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
    const optGloss = cleanVocab(typeof opt === 'object' ? (opt.gloss || opt.gloss_en || opt.microGloss || '') : '');
    options.push(optGloss ? { id: optId, text: optText, gloss: optGloss } : { id: optId, text: optText });
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
      lookalikes: Array.isArray(raw.lookalikes)
        ? raw.lookalikes.map((entry) => {
            if (typeof entry === 'string') return { word: cleanVocab(entry), gloss: '', diffHint: '' };
            if (!entry || typeof entry !== 'object') return null;
            const word = cleanVocab(entry.word || entry.target || '');
            if (!word) return null;
            return {
              word,
              gloss: cleanVocab(entry.gloss || entry.gloss_en || entry.sense_en || ''),
              diffHint: cleanVocab(entry.diffHint || entry.diff_hint || '')
            };
          }).filter(Boolean)
        : [],
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


// v20.0.5: Post-answer Known-Word Micro-Gloss & Optional Look-Alike Diff
const BUILTIN_CONFUSABLE_GROUPS = [
  [
    { word: 'acquaintance', gloss: 'someone you know slightly' },
    { word: 'apprentice', gloss: 'learner in a skilled trade' }
  ],
  [
    { word: 'prophecy', gloss: 'prediction of the future' },
    { word: 'hypocrisy', gloss: 'saying one thing, doing another' }
  ],
  [
    { word: 'desolate', gloss: 'empty, bleak & lonely' },
    { word: 'defective', gloss: 'broken or faulty' },
    { word: 'dissolve', gloss: 'melt into liquid / end' }
  ],
  [
    { word: 'exempt', gloss: 'free from a rule or duty' },
    { word: 'excerpt', gloss: 'short part taken from a text' }
  ],
  [
    { word: 'bustle', gloss: 'busy, noisy movement' },
    { word: 'bristle', gloss: 'stiff hair / react angrily' },
    { word: 'hustle', gloss: 'push or move hurriedly' }
  ],
  [
    { word: 'staggered', gloss: 'walked unsteadily / shocked' },
    { word: 'swaggered', gloss: 'walked in a proud, boastful way' }
  ],
  [
    { word: 'strand', gloss: 'thin thread / leave stuck' },
    { word: 'stride', gloss: 'long, confident step' },
    { word: 'stranded', gloss: 'stuck with no way to leave' }
  ],
  [
    { word: 'tread', gloss: 'step carefully on something' },
    { word: 'thread', gloss: 'thin string for sewing' },
    { word: 'treat', gloss: 'act toward / medical care' }
  ],
  [
    { word: 'emerge', gloss: 'come out into view' },
    { word: 'immerse', gloss: 'dip deeply into water or study' }
  ],
  [
    { word: 'adapt', gloss: 'adjust to new conditions' },
    { word: 'adopt', gloss: 'take on as your own' }
  ],
  [
    { word: 'complement', gloss: 'complete or go well with' },
    { word: 'compliment', gloss: 'polite praise' }
  ],
  [
    { word: 'elicit', gloss: 'draw out a reply or reaction' },
    { word: 'illicit', gloss: 'illegal or forbidden' }
  ],
  [
    { word: 'eminent', gloss: 'famous and respected' },
    { word: 'imminent', gloss: 'about to happen very soon' }
  ],
  [
    { word: 'discrete', gloss: 'separate and distinct' },
    { word: 'discreet', gloss: 'careful and private' }
  ],
  [
    { word: 'stationary', gloss: 'not moving, standing still' },
    { word: 'stationery', gloss: 'paper, pens & office supplies' }
  ],
  [
    { word: 'principal', gloss: 'main / school head' },
    { word: 'principle', gloss: 'basic rule or moral belief' }
  ],
  [
    { word: 'affect', gloss: 'influence or change (verb)' },
    { word: 'effect', gloss: 'result or outcome (noun)' }
  ],
  [
    { word: 'allusion', gloss: 'indirect hint or reference' },
    { word: 'illusion', gloss: 'false visual trick or belief' }
  ],
  [
    { word: 'censure', gloss: 'formal strong criticism' },
    { word: 'censor', gloss: 'block or cut sensitive content' }
  ],
  [
    { word: 'dissipate', gloss: 'fade away gradually' },
    { word: 'participate', gloss: 'take part in an activity' }
  ],
  [
    { word: 'pervade', gloss: 'spread through every part' },
    { word: 'persuade', gloss: 'convince someone to agree' },
    { word: 'evade', gloss: 'escape or avoid cleverly' }
  ],
  [
    { word: 'repatriate', gloss: 'send back to home country' },
    { word: 'perpetuate', gloss: 'keep something going forever' }
  ],
  [
    { word: 'render', gloss: 'cause to become / provide' },
    { word: 'tender', gloss: 'soft, gentle / formal offer' },
    { word: 'vendor', gloss: 'person or shop selling goods' }
  ],
  [
    { word: 'rustle', gloss: 'soft dry leaf/paper sound' },
    { word: 'tussle', gloss: 'short rough struggle' }
  ],
  [
    { word: 'scramble', gloss: 'rush or climb hurriedly' },
    { word: 'scribble', gloss: 'write quickly and messily' }
  ],
  [
    { word: 'cater', gloss: 'provide food or service for' },
    { word: 'crater', gloss: 'large bowl-shaped hole' }
  ],
  [
    { word: 'lumber', gloss: 'cut wood / move heavily' },
    { word: 'slumber', gloss: 'calm, deep sleep' }
  ],
  [
    { word: 'foraging', gloss: 'searching widely for food' },
    { word: 'forging', gloss: 'shaping metal / faking a copy' }
  ],
  [
    { word: 'incentive', gloss: 'reward that motivates action' },
    { word: 'inventive', gloss: 'creative and original' }
  ],
  [
    { word: 'induce', gloss: 'cause or persuade to happen' },
    { word: 'deduce', gloss: 'figure out from clues' },
    { word: 'reduce', gloss: 'make smaller or less' }
  ],
  [
    { word: 'chronic', gloss: 'lasting a long time' },
    { word: 'chronicle', gloss: 'written record of events in order' }
  ],
  [
    { word: 'surge', gloss: 'sudden strong rise or wave' },
    { word: 'purge', gloss: 'remove unwanted things cleanly' }
  ],
  [
    { word: 'stall', gloss: 'stop or delay progress' },
    { word: 'stroll', gloss: 'walk slowly and casually' }
  ],
  [
    { word: 'warp', gloss: 'bend or twist out of shape' },
    { word: 'wrap', gloss: 'cover or fold around' }
  ],
  [
    { word: 'dock', gloss: 'platform where ships load' },
    { word: 'deck', gloss: 'floor of a ship' }
  ],
  [
    { word: 'ferry', gloss: 'boat carrying people across water' },
    { word: 'fairy', gloss: 'tiny magical storybook creature' },
    { word: 'fury', gloss: 'wild, intense anger' }
  ],
  [
    { word: 'pier', gloss: 'walkway built out over water' },
    { word: 'peer', gloss: 'equal in age/status / look closely' }
  ],
  [
    { word: 'juvenile', gloss: 'young, not yet grown-up' },
    { word: 'jovial', gloss: 'cheerful and friendly' }
  ],
  [
    { word: 'trail', gloss: 'country path / track left behind' },
    { word: 'trial', gloss: 'court hearing / test run' }
  ],
  [
    { word: 'ware', gloss: 'made goods like pottery' },
    { word: 'wary', gloss: 'careful and suspicious of danger' }
  ],
  [
    { word: 'gust', gloss: 'sudden brief rush of wind' },
    { word: 'gist', gloss: 'main point or core idea' }
  ],
  [
    { word: 'portable', gloss: 'easy to carry around' },
    { word: 'potable', gloss: 'safe to drink' }
  ],
  [
    { word: 'confidential', gloss: 'kept secret and private' },
    { word: 'confident', gloss: 'sure of your own ability' }
  ],
  [
    { word: 'excessive', gloss: 'too much, beyond normal' },
    { word: 'exclusive', gloss: 'limited to a select group' }
  ],
  [
    { word: 'antique', gloss: 'valuable old collectible' },
    { word: 'antic', gloss: 'playful or silly trick' }
  ],
  [
    { word: 'sting', gloss: 'sharp sudden pain or bite' },
    { word: 'sling', gloss: 'strap for carrying or throwing' }
  ]
];

const BUILTIN_GLOSS_BY_WORD = new Map();
for (const group of BUILTIN_CONFUSABLE_GROUPS) {
  for (const item of group) {
    BUILTIN_GLOSS_BY_WORD.set(normVocab(item.word), item.gloss);
  }
}

export function compressEnglishGloss(definition = '') {
  let s = cleanVocab(definition);
  if (!s) return '';
  s = s.replace(/^(?:to\s+cause\s+someone\s+or\s+something\s+to\s+|relating\s+to\s+|a\s+person\s+who\s+|a\s+thing\s+that\s+|able\s+to\s+be\s+|intended\s+to\s+be\s+|to\s+|a\s+|an\s+|the\s+)/i, '');
  s = s.split(/[;.]/)[0].trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 12) s = words.slice(0, 12).join(' ');
  // Strip any dangling conjunction/preposition/article at the end so gloss always reads completely
  while (/\s+(?:or|and|of|to|with|in|on|for|by|as|at|the|a|an|that|which|who)$/i.test(s)) {
    s = s.replace(/\s+(?:or|and|of|to|with|in|on|for|by|as|at|the|a|an|that|which|who)$/i, '').trim();
  }
  s = s.replace(/[,:;/-]+$/, '').trim();
  return s;
}

export function resolveOptionMicroGloss(opt, task, archiveWords = []) {
  if (!opt || typeof opt !== 'object') return '';
  const text = cleanVocab(opt.text || '');
  if (!text || text.split(/\s+/).length > 4) return '';
  if (cleanVocab(opt.gloss || '')) return cleanVocab(opt.gloss);
  const key = normVocab(text);
  if (BUILTIN_GLOSS_BY_WORD.has(key)) return BUILTIN_GLOSS_BY_WORD.get(key);
  const arch = Array.isArray(archiveWords) ? archiveWords : [];
  const hit = arch.find((row) => normVocab(row?.target || row?.word || '') === key);
  if (hit) {
    if (cleanVocab(hit.gloss_en || hit.gloss || '')) return cleanVocab(hit.gloss_en || hit.gloss);
    const compressed = compressEnglishGloss(hit.definition_en || hit.definitionEn || '');
    if (compressed) return compressed;
  }
  if (task && normVocab(task.target || '') === key && cleanVocab(task.targetSense || '')) {
    return compressEnglishGloss(task.targetSense);
  }
  return '';
}

function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

export function findLookAlikeWords(task, archiveWords = []) {
  const target = cleanVocab(task?.target || '');
  const targetKey = normVocab(target);
  if (!targetKey || targetKey.length < 3) return [];
  const out = [];
  const seen = new Set([targetKey]);
  const pushEntry = (word, gloss = '', diffHint = '', source = 'builtin') => {
    const w = cleanVocab(word);
    const k = normVocab(w);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push({ word: w, gloss: cleanVocab(gloss), diffHint: cleanVocab(diffHint), source });
  };

  // 1. Pack-curated lookalikes
  for (const item of (Array.isArray(task?.lookalikes) ? task.lookalikes : [])) {
    pushEntry(item.word, item.gloss, item.diffHint, 'pack');
  }

  // 2. Built-in high-value IELTS & learner confusables
  for (const group of BUILTIN_CONFUSABLE_GROUPS) {
    if (group.some((item) => normVocab(item.word) === targetKey || (targetKey.length >= 5 && normVocab(item.word).startsWith(targetKey.slice(0, 5)) && Math.abs(item.word.length - targetKey.length) <= 3))) {
      for (const item of group) {
        if (normVocab(item.word) !== targetKey) {
          pushEntry(item.word, item.gloss, '', 'curated');
        }
      }
    }
  }

  // 3. Dynamic orthographic similarity against current pack archive
  const arch = Array.isArray(archiveWords) ? archiveWords : [];
  const scored = [];
  for (const row of arch) {
    const w = cleanVocab(row?.target || row?.word || '');
    const k = normVocab(w);
    if (!k || seen.has(k) || k.includes(' ') || Math.abs(k.length - targetKey.length) > 3) continue;
    const dist = editDistance(targetKey, k);
    const maxLen = Math.max(targetKey.length, k.length);
    const sim = 1 - dist / maxLen;
    const sameStart = k.slice(0, 2) === targetKey.slice(0, 2);
    const sameEnd = k.slice(-2) === targetKey.slice(-2);
    if ((sim >= 0.5 && (sameStart || sameEnd)) || sim >= 0.62) {
      scored.push({
        word: w,
        gloss: cleanVocab(row.gloss_en || row.gloss || '') || compressEnglishGloss(row.definition_en || row.definitionEn || ''),
        sim
      });
    }
  }
  scored.sort((a, b) => b.sim - a.sim);
  for (const s of scored.slice(0, 3)) {
    pushEntry(s.word, s.gloss, '', 'archive');
  }
  return out.slice(0, 4);
}

export function highlightLookAlikeDiff(baseWord = '', otherWord = '') {
  const a = String(baseWord || '');
  const b = String(otherWord || '');
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  let prefix = 0;
  while (prefix < al.length && prefix < bl.length && al[prefix] === bl[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < al.length - prefix &&
    suffix < bl.length - prefix &&
    al[al.length - 1 - suffix] === bl[bl.length - 1 - suffix]
  ) {
    suffix++;
  }
  const segs = [];
  if (prefix > 0) segs.push({ text: b.slice(0, prefix), diff: false });
  const midEnd = b.length - suffix;
  if (midEnd > prefix) segs.push({ text: b.slice(prefix, midEnd), diff: true });
  if (suffix > 0) segs.push({ text: b.slice(midEnd), diff: false });
  return segs.length ? segs : [{ text: b, diff: false }];
}
