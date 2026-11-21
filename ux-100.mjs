/**
 * ux-100.mjs — Pure, deterministic UX helpers for YanDao v19.5.0
 * Covers: #1-#10 Home/Return/Env, #2 Deferred Speaking, #4/#57 Audio Compare,
 * #5/#65/#66 Minimal Word Diff, #8/#71/#80 End-of-Day Continuation,
 * #63 Cursor-Preserving Dictation, #76 Weekly 3-Pair Evidence.
 */

export function insertDictationAtCursor(currentValue = '', spokenText = '', selStart = null, selEnd = null) {
  const base = String(currentValue || '');
  const spoken = String(spokenText || '').trim();
  if (!spoken) return { value: base, caret: base.length };
  const start = Number.isInteger(selStart) ? Math.max(0, Math.min(base.length, selStart)) : base.length;
  const end = Number.isInteger(selEnd) ? Math.max(start, Math.min(base.length, selEnd)) : start;
  const before = base.slice(0, start);
  const after = base.slice(end);
  const needLeadSpace = before.length > 0 && !/\s$/.test(before);
  const needTrailSpace = after.length > 0 && !/^\s/.test(after);
  const inserted = `${needLeadSpace ? ' ' : ''}${spoken}${needTrailSpace ? ' ' : ''}`;
  const value = before + inserted + after;
  const caret = before.length + (needLeadSpace ? 1 : 0) + spoken.length;
  return { value, caret };
}

function tokenizeWords(text = '') {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function normalizeToken(tok = '') {
  return String(tok || '').toLowerCase().replace(/^[^\w']+|[^\w']+$/g, '');
}

export function buildWordDiffHighlight(original = '', reference = '', { accepted = [] } = {}) {
  const origStr = String(original || '').trim();
  const refStr = String(reference || '').trim();
  const normOrig = origStr.toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const normRef = refStr.toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const acceptedList = (Array.isArray(accepted) ? accepted : []).map(x =>
    String(x || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]+$/, '')
  ).filter(Boolean);

  const isExact = Boolean(normOrig && normRef && normOrig === normRef);
  const isValidAlternative = Boolean(!isExact && normOrig && acceptedList.includes(normOrig));

  const origWords = tokenizeWords(origStr);
  const refWords = tokenizeWords(refStr);
  const origNorms = origWords.map(normalizeToken);
  const refNorms = refWords.map(normalizeToken);

  // LCS matrix for minimal word-level diff
  const m = origNorms.length;
  const n = refNorms.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = origNorms[i] === refNorms[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const origMatched = new Set();
  const refMatched = new Set();
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (origNorms[i] === refNorms[j]) {
      origMatched.add(i);
      refMatched.add(j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const originalTokens = origWords.map((word, idx) => ({ word, changed: !origMatched.has(idx) }));
  const referenceTokens = refWords.map((word, idx) => ({ word, changed: !refMatched.has(idx) }));
  const removed = originalTokens.filter(t => t.changed).map(t => t.word);
  const added = referenceTokens.filter(t => t.changed).map(t => t.word);

  let statusLabel = '对照最小修改处';
  let primaryDiffSummary = '';
  if (isExact) {
    statusLabel = '完全一致';
    primaryDiffSummary = '你的表达与参考表达完全一致。';
  } else if (isValidAlternative) {
    statusLabel = '你的说法也成立';
    primaryDiffSummary = '你的说法也成立；下方提供一种同样自然的常见表达供参考。';
  } else if (removed.length || added.length) {
    primaryDiffSummary = `重点差异：${removed.length ? `原句「${removed.slice(0, 4).join(' ')}」` : '缺省处'} → 更自然「${added.slice(0, 4).join(' ')}」`;
  }

  return {
    isExact,
    isValidAlternative,
    statusLabel,
    primaryDiffSummary,
    originalTokens,
    referenceTokens
  };
}

export function buildHomeResumeBanner(data = {}) {
  const j = data?.dailyJourney || null;
  const pack = data?.dailyPack || null;
  const deferred = (Array.isArray(data?.deferredSpeaking) ? data.deferredSpeaking : []).filter(x => x && x.status === 'deferred_speaking');
  const myAudioCount = Array.isArray(data?.myAudioTracks) ? data.myAudioTracks.length : 0;

  let primaryLabel = pack ? '开始／继续今日完整学习' : '开始今日修炼';
  let draftPreview = '';
  let lastLeaveReceipt = '';

  if (j && !j.finishedAt) {
    const stage = j.steps?.[j.index] || '';
    if (stage === 'reading') {
      const doneCount = Array.isArray(j.readingDoneIds) ? j.readingDoneIds.length : 0;
      primaryLabel = `继续第 ${doneCount + 1} 篇阅读`;
    } else if (stage === 'transfer') {
      const tIdx = Number(j.transferIndex) || 0;
      primaryLabel = `继续综合输出 · 第 ${tIdx + 1} 题`;
      if (String(j.transferDraft || '').trim()) {
        const clean = String(j.transferDraft).trim();
        draftPreview = `上次草稿：「${clean.slice(0, 42)}${clean.length > 42 ? '…' : ''}」`;
      }
      const lastAttempt = Array.isArray(j.transferAttempts) ? j.transferAttempts.at(-1) : null;
      if (lastAttempt && !lastAttempt.retryAnswer && (lastAttempt.firstAnswer || lastAttempt.recordingIds?.length)) {
        lastLeaveReceipt = `上次离开前：初答已保存${lastAttempt.recordingIds?.length ? '，录音仍在本机' : ''}，重答尚未提交。`;
      }
    } else if (stage === 'vocabulary') {
      primaryLabel = `继续词汇阶段 · 第 ${(Number(j.vocabIndex) || 0) + 1} 题`;
    } else if (stage === 'sentences') {
      primaryLabel = '继续句子与听力训练';
    }
  } else if (data?.activeSession) {
    primaryLabel = `继续上次训练（第 ${(Number(data.activeSession.index) || 0) + 1} 题）`;
  }

  const silentModules = [];
  if (pack?.readings?.length || data?.readings?.length) silentModules.push('阅读');
  if (pack?.vocabularyPractice?.length || data?.items?.length) silentModules.push('词汇/写作');
  const speakingNeeded = (Array.isArray(pack?.transferTasks) ? pack.transferTasks : [])
    .filter(t => ['speaking', 'reading_to_speaking', 'retelling'].includes(t?.taskType)).length + deferred.length;
  const envSummary = `可静音完成：${silentModules.length ? silentModules.join('、') : '随身电台字幕'}｜需要开口：${speakingNeeded} 段｜本机音频：${myAudioCount} 集`;

  const deferredSummary = deferred.length
    ? `还有 ${deferred.length} 段待开口复述，约 ${Math.max(1, deferred.length)} 分钟`
    : '';

  return {
    primaryLabel,
    draftPreview,
    envSummary,
    deferredCount: deferred.length,
    deferredSummary,
    lastLeaveReceipt
  };
}

export function buildEndOfDayContinuationCue(data = {}) {
  const unclearMarks = Array.isArray(data?.radioUnclearMarks) ? data.radioUnclearMarks : [];
  const replayedMark = unclearMarks.find(m => m && (m.resolved || Number(m.replayedCount) > 0) && m.sentenceText);
  if (replayedMark) {
    return {
      headline: `你今天在节目里没听清「${replayedMark.sentenceText.slice(0, 60)}」，回听 ${Math.max(1, Number(replayedMark.replayedCount) || 1)} 次后认出来了。明天试试不看原句，自己用它说一句。`,
      actionLabel: '下次从这句开始',
      actionType: 'radio_mark',
      payload: replayedMark
    };
  }
  const latestMark = unclearMarks.find(m => m && !m.resolved);
  if (latestMark) {
    return {
      headline: `你今天在「${latestMark.title}」记下了 ${latestMark.sentenceText ? `「${latestMark.sentenceText.slice(0, 56)}」` : `${Math.floor(latestMark.timeSec)} 秒处`} 没听清，明天直接从这句回听起步。`,
      actionLabel: '下次从这句开始',
      actionType: 'radio_mark',
      payload: latestMark
    };
  }
  const moments = Array.isArray(data?.radioMoments) ? data.radioMoments : [];
  if (moments.length > 0) {
    const m = moments[0];
    return {
      headline: `你收藏了「${m.sentenceText ? m.sentenceText.slice(0, 56) : m.title}」，明天直接从这句开口跟读。`,
      actionLabel: '下次从这句开始',
      actionType: 'radio_moment',
      payload: m
    };
  }
  const deferred = (Array.isArray(data?.deferredSpeaking) ? data.deferredSpeaking : []).filter(x => x && x.status === 'deferred_speaking');
  if (deferred.length > 0) {
    return {
      headline: `今天还有 ${deferred.length} 段「待开口」复述留在学习包里，明天方便开口时一键接上。`,
      actionLabel: '下次从这题开口',
      actionType: 'deferred_speaking',
      payload: deferred[0]
    };
  }
  return {
    headline: '今天的真实训练记录已保存在本机；明天打开首页可直接接着上次进度继续。',
    actionLabel: '下次从首页继续',
    actionType: 'home',
    payload: null
  };
}

export function buildWeeklyThreePairHighlights(data = {}) {
  const pairs = [];
  const attempts = [
    ...(Array.isArray(data?.transferAttempts) ? data.transferAttempts : []),
    ...(Array.isArray(data?.dailyJourney?.transferAttempts) ? data.dailyJourney.transferAttempts : [])
  ];
  const retried = attempts.filter(a => a && a.firstAnswer && a.retryAnswer);
  if (retried.length > 0) {
    const sample = retried[retried.length - 1];
    pairs.push({
      label: '初答 → 独立修改对照',
      detail: `「${String(sample.firstAnswer).slice(0, 36)}」→「${String(sample.retryAnswer).slice(0, 36)}」`
    });
  }
  const prompted = attempts.filter(a => a && a.hintUsed).length;
  const independent = attempts.filter(a => a && !a.hintUsed && a.rating === 'K').length;
  if (prompted > 0 || independent > 0) {
    pairs.push({
      label: '有提示 vs 独立掌握对照',
      detail: `独立自评 K ${independent} 次 · 使用提示 ${prompted} 次（两类证据分开记录）`
    });
  }
  const unclear = Array.isArray(data?.radioUnclearMarks) ? data.radioUnclearMarks : [];
  if (unclear.length > 0) {
    const resolved = unclear.filter(m => m.resolved).length;
    pairs.push({
      label: '通勤没听清 → 回听听懂',
      detail: `累计标记 ${unclear.length} 处没听清，已回听听懂 ${resolved} 处`
    });
  }
  return pairs.slice(0, 3);
}
