/**
 * Contextual Discrimination & Transfer Lab (CDTL · 11.0.0)
 * Provides side-by-side semantic nuance comparison, collocation contrast,
 * Memory Anchors, and an Interference Radar (顽固易混词对雷达) when a learner
 * misses a vocabulary choice or requests deeper lexical discrimination.
 */

const cleanCdtl = value => String(value ?? '').replace(/\r/g, '').trim();
const normCdtl = value => cleanCdtl(value).toLocaleLowerCase().replace(/\s+/g, ' ');

export function extractExampleFromExplanation(explanationEn = '') {
  const raw = cleanCdtl(explanationEn);
  if (!raw) return { meaning: '', example: '' };
  const match = raw.match(/Source meaning:\s*(.+?)(?:\.\s*Original example:\s*(.+?))?(?:\.\s*This is recognition evidence.*)?$/i);
  if (match) {
    return {
      meaning: cleanCdtl(match[1]),
      example: cleanCdtl(match[2] || '')
    };
  }
  return { meaning: raw, example: '' };
}

/**
 * Generates a concise contrastive memory anchor highlighting how the target
 * differs from the chosen distractor in meaning or collocation context.
 */
export function buildContrastAnchor(targetExpr = '', targetSense = '', distractorExpr = '', distractorSense = '') {
  const t = cleanCdtl(targetExpr);
  const d = cleanCdtl(distractorExpr);
  if (!t || !d) return '';
  const ts = cleanCdtl(targetSense).replace(/\.$/, '');
  const ds = cleanCdtl(distractorSense).replace(/\.$/, '');
  return `区分锚点：「${t}」聚焦 "${ts || '目标语境义'}"，而「${d}」侧重 "${ds || '干扰项语义'}"。`;
}

export function buildCdtlCard(task = {}, chosenOptionId = '', archiveWords = []) {
  if (!task || typeof task !== 'object') return null;
  const options = Array.isArray(task.options) ? task.options : [];
  const correctIds = Array.isArray(task.correctOptionIds) ? task.correctOptionIds : [];
  const correctOption = options.find(opt => correctIds.includes(opt.id)) || null;
  const chosenOption = options.find(opt => opt.id === cleanCdtl(chosenOptionId)) || null;

  const archive = Array.isArray(archiveWords) ? archiveWords : [];
  const findArchiveEntry = text => {
    const key = normCdtl(text);
    if (!key) return null;
    return archive.find(row => normCdtl(row?.target) === key) || null;
  };

  const parsed = extractExampleFromExplanation(task.explanationEn);
  const targetWord = cleanCdtl(task.target || correctOption?.text || '');
  const targetArchive = archive.find(row => cleanCdtl(row?.id) === cleanCdtl(task.sourceItemId)) || findArchiveEntry(targetWord);

  const correctDetail = {
    optionId: correctOption?.id || '',
    expression: correctOption?.text || targetWord,
    senseEn: cleanCdtl(task.targetSense || targetArchive?.definition_en || targetArchive?.definitionEn || parsed.meaning),
    exampleEn: cleanCdtl(task.archivedExample || targetArchive?.example || parsed.example),
    additionalContexts: Array.isArray(task.archivedAdditionalContexts) && task.archivedAdditionalContexts.length
      ? task.archivedAdditionalContexts
      : Array.isArray(targetArchive?.additional_contexts)
        ? targetArchive.additional_contexts.map(cleanCdtl).filter(Boolean)
        : []
  };

  let distractorDetail = null;
  if (chosenOption && !correctIds.includes(chosenOption.id)) {
    const distractorArchive = findArchiveEntry(chosenOption.text);
    distractorDetail = {
      optionId: chosenOption.id,
      expression: chosenOption.text,
      senseEn: cleanCdtl(distractorArchive?.definition_en || distractorArchive?.definitionEn || '与当前语境或核心语义不匹配的干扰项。'),
      exampleEn: cleanCdtl(distractorArchive?.example || '')
    };
  }

  const contrastAnchor = distractorDetail
    ? buildContrastAnchor(correctDetail.expression, correctDetail.senseEn, distractorDetail.expression, distractorDetail.senseEn)
    : '';

  return {
    taskId: cleanCdtl(task.id),
    sourceItemId: cleanCdtl(task.sourceItemId),
    questionType: cleanCdtl(task.type || 'definition_recognition'),
    prompt: cleanCdtl(task.prompt),
    isErrorComparison: Boolean(distractorDetail),
    correct: correctDetail,
    chosenDistractor: distractorDetail,
    contrastAnchor,
    explanationEn: cleanCdtl(task.explanationEn),
    productionPrompt: cleanCdtl(task.productionPrompt || (targetWord ? `Use "${targetWord}" in your own original sentence.` : '')),
    pedagogicalNote: 'CDTL 语境辨析：对比目标词与干扰项的核心搭配边界；选择正确仅记录识别，独立造句才构成主动产出证据。'
  };
}

export function buildCdtlBatchFromAttempts(tasks = [], attempts = [], archiveWords = []) {
  const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map(t => [cleanCdtl(t?.id), t]));
  const cards = [];
  const seen = new Set();

  for (const attempt of (Array.isArray(attempts) ? attempts : [])) {
    if (!attempt || attempt.skipped) continue;
    const tid = cleanCdtl(attempt.taskId || attempt.id);
    if (!tid || seen.has(tid)) continue;
    const isWrong = attempt.firstCheck ? !attempt.firstCheck.correct : attempt.correct === false;
    if (!isWrong) continue;
    const task = taskMap.get(tid);
    if (!task) continue;
    const card = buildCdtlCard(task, attempt.selectedOptionId, archiveWords);
    if (card) {
      seen.add(tid);
      cards.push(card);
    }
  }
  return cards;
}

/**
 * Builds an Interference Radar (顽固易混词对干扰雷达) from vocabulary attempts.
 * Groups recurring or first-attempt confusions into actionable pair cards for
 * the Battle Report and Central Immortal Aperture handoff.
 */
export function buildInterferenceRadar(tasks = [], attempts = [], archiveWords = []) {
  const cards = buildCdtlBatchFromAttempts(tasks, attempts, archiveWords);
  const pairMap = new Map();

  for (const card of cards) {
    if (!card.chosenDistractor) continue;
    const target = cleanCdtl(card.correct.expression);
    const distractor = cleanCdtl(card.chosenDistractor.expression);
    if (!target || !distractor) continue;
    const pairKey = `${normCdtl(target)}<->${normCdtl(distractor)}`;
    const prior = pairMap.get(pairKey);
    if (prior) {
      prior.count++;
      prior.taskIds.push(card.taskId);
    } else {
      pairMap.set(pairKey, {
        pairId: `pair:${normCdtl(target)}:${normCdtl(distractor)}`,
        target,
        targetSense: card.correct.senseEn,
        targetExample: card.correct.exampleEn,
        distractor,
        distractorSense: card.chosenDistractor.senseEn,
        distractorExample: card.chosenDistractor.exampleEn,
        contrastAnchor: card.contrastAnchor,
        questionType: card.questionType,
        count: 1,
        taskIds: [card.taskId]
      });
    }
  }

  const pairs = [...pairMap.values()].sort((a, b) => b.count - a.count || a.target.localeCompare(b.target));
  return {
    totalConfusedPairs: pairs.length,
    pairs
  };
}
