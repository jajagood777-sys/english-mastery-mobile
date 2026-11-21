/**
 * YanDao Cultivation Palace v19.0.0 — Continuity, Safety, Privacy, Review & Quality OS
 * Covers roadmap items: #17, #18, #19/#21 prefs, #20, #22, #23, #24, #25, #26, #27, plus #41/#42.
 * Pure, deterministic, local-first ES module (zero network calls).
 */

/**
 * #17 Exact resume state including pre/post-reveal evidence conditions.
 */
export function captureExactResumeState({
  packId = '',
  page = 'home',
  stage = '',
  itemId = '',
  paragraphIndex = 0,
  draftText = '',
  audioTimeSec = 0,
  answerRevealedBeforeExit = false,
  hintTierBeforeExit = null,
  capturedAt = new Date().toISOString()
} = {}) {
  return {
    schema: 'exact-resume-v1',
    packId: String(packId || ''),
    page: String(page || 'home'),
    stage: String(stage || ''),
    itemId: String(itemId || ''),
    paragraphIndex: Math.max(0, Number(paragraphIndex) || 0),
    draftText: String(draftText || ''),
    audioTimeSec: Math.max(0, Number(audioTimeSec) || 0),
    answerRevealedBeforeExit: Boolean(answerRevealedBeforeExit),
    hintTierBeforeExit: hintTierBeforeExit || null,
    capturedAt
  };
}

export function restoreExactResumeState(saved, currentPackId = '') {
  if (!saved || saved.schema !== 'exact-resume-v1') return null;
  if (currentPackId && saved.packId && saved.packId !== currentPackId) {
    return { ...saved, packMismatch: true };
  }
  return {
    ...saved,
    packMismatch: false,
    preservePromptedFlag: Boolean(saved.answerRevealedBeforeExit || saved.hintTierBeforeExit)
  };
}

/**
 * #18 Time-sliced continuation inside the SAME pack_id (5 / 15 / 30 minutes).
 */
export function buildTimeSlicedContinuation({ packId = '', remainingItems = [], availableMinutes = 15 } = {}) {
  const mins = [5, 15, 30].includes(Number(availableMinutes)) ? Number(availableMinutes) : 15;
  const budgetItems = mins === 5 ? 4 : (mins === 15 ? 10 : 20);
  const selected = (Array.isArray(remainingItems) ? remainingItems : []).slice(0, budgetItems);
  return {
    packId: String(packId || ''),
    availableMinutes: mins,
    selectedCount: selected.length,
    remainingAfterSlice: Math.max(0, (remainingItems?.length || 0) - selected.length),
    items: selected,
    preservesOriginalPackId: true
  };
}

/**
 * #20 Offline readiness audit for current pack before commute/subway.
 */
export function auditPackOfflineReadiness({ pack = null, cachedAudioKeys = [], queueEpisodes = [] } = {}) {
  const cachedSet = new Set(Array.isArray(cachedAudioKeys) ? cachedAudioKeys : []);
  const textItems = Array.isArray(pack?.items) ? pack.items : [];
  const readings = Array.isArray(pack?.readings) ? pack.readings : [];
  const audioRefs = [
    ...textItems.filter(i => i.audioUrl || i.audioKey).map(i => ({ id: i.id, key: i.audioKey || i.audioUrl, label: i.target || i.text || i.id })),
    ...readings.filter(r => r.audioUrl || r.audioKey).map(r => ({ id: r.id, key: r.audioKey || r.audioUrl, label: r.title || r.id }))
  ];
  const cachedAudio = audioRefs.filter(a => cachedSet.has(a.key));
  const missingAudio = audioRefs.filter(a => !cachedSet.has(a.key));
  const qList = Array.isArray(queueEpisodes) ? queueEpisodes : [];
  const qReady = qList.filter(q => q && q.isLocalReady).length;
  const qMissing = qList.map((q, i) => ({ ...q, order: i + 1 })).filter(q => !q.isLocalReady);
  return {
    hasPackTextOffline: Boolean(pack && (textItems.length > 0 || readings.length > 0)),
    textItemCount: textItems.length,
    readingCount: readings.length,
    totalAudioCount: audioRefs.length,
    cachedAudioCount: cachedAudio.length,
    missingAudioCount: missingAudio.length,
    missingAudio,
    queueTotal: qList.length,
    queueReadyCount: qReady,
    queueMissing: qMissing,
    readyForSubway: Boolean(pack) && missingAudio.length === 0 && qMissing.length === 0
  };
}

/**
 * #22 Isolated backup dry-run restore preview (zero mutation of live state).
 */
export function dryRunBackupRestore(liveState = {}, backupPayload = null) {
  if (!backupPayload || typeof backupPayload !== 'object') {
    return { ok: false, reason: '备份文件格式无效', recoverable: null, conflicts: [] };
  }
  const liveReports = new Set((liveState.reports || []).map(r => r.report_id).filter(Boolean));
  const backupReports = Array.isArray(backupPayload.reports) ? backupPayload.reports : [];
  const newReports = backupReports.filter(r => r.report_id && !liveReports.has(r.report_id));
  const overlappingReports = backupReports.filter(r => r.report_id && liveReports.has(r.report_id));

  const liveAttempts = new Set((liveState.attempts || []).map(a => a.attemptId || a.attempt_id).filter(Boolean));
  const backupAttempts = Array.isArray(backupPayload.attempts) ? backupPayload.attempts : [];
  const newAttempts = backupAttempts.filter(a => (a.attemptId || a.attempt_id) && !liveAttempts.has(a.attemptId || a.attempt_id));

  const liveRetellings = new Set((liveState.readingRetellingAttempts || []).map(r => r.id).filter(Boolean));
  const backupRetellings = Array.isArray(backupPayload.readingRetellingAttempts) ? backupPayload.readingRetellingAttempts : [];
  const newRetellings = backupRetellings.filter(r => r.id && !liveRetellings.has(r.id));

  const liveSpeechTransfers = new Set((liveState.speechTransferAttempts || []).map(r => r.id).filter(Boolean));
  const backupSpeechTransfers = Array.isArray(backupPayload.speechTransferAttempts) ? backupPayload.speechTransferAttempts : [];
  const newSpeechTransfers = backupSpeechTransfers.filter(r => r.id && !liveSpeechTransfers.has(r.id));

  const myAudioCount = Array.isArray(backupPayload.myAudioTracks) ? backupPayload.myAudioTracks.length : 0;
  const draftsCount = (backupPayload.exactResume?.draftText || backupPayload.v19?.exactResume?.draftText) ? 1 : 0;
  const recordingMetaCount = Array.isArray(backupPayload.recordingsMeta) ? backupPayload.recordingsMeta.length : 0;

  return {
    ok: true,
    isolatedDryRun: true,
    liveStateUntouched: true,
    recoverable: {
      totalBackupReports: backupReports.length,
      newReportsToAdd: newReports.length,
      newAttemptsToAdd: newAttempts.length,
      newRetellingsToAdd: newRetellings.length,
      newSpeechTransfersToAdd: newSpeechTransfers.length,
      myAudioTracksNeedingSourceFiles: myAudioCount,
      draftsFound: draftsCount,
      recordingMetaCount
    },
    conflicts: overlappingReports.map(r => ({
      type: 'report_id_exists',
      reportId: r.report_id,
      resolution: '保留本机原件并跳过重复写入'
    }))
  };
}

/**
 * #23 Storage space breakdown separating re-downloadable caches vs irreplaceable user data.
 */
export function computeStorageBreakdown({
  podcastCacheBytes = 0,
  referenceAudioBytes = 0,
  userRecordingsBytes = 0,
  draftsAndReportsBytes = 0
} = {}) {
  const redownloadableBytes = Math.max(0, Number(podcastCacheBytes) || 0) + Math.max(0, Number(referenceAudioBytes) || 0);
  const irreplaceableBytes = Math.max(0, Number(userRecordingsBytes) || 0) + Math.max(0, Number(draftsAndReportsBytes) || 0);
  return {
    totalBytes: redownloadableBytes + irreplaceableBytes,
    redownloadable: {
      label: '可重新下载缓存（可安全清理）',
      podcastCacheBytes: Math.max(0, Number(podcastCacheBytes) || 0),
      referenceAudioBytes: Math.max(0, Number(referenceAudioBytes) || 0),
      subtotalBytes: redownloadableBytes
    },
    irreplaceable: {
      label: '不可替代个人资产（切勿误删）',
      userRecordingsBytes: Math.max(0, Number(userRecordingsBytes) || 0),
      draftsAndReportsBytes: Math.max(0, Number(draftsAndReportsBytes) || 0),
      subtotalBytes: irreplaceableBytes
    }
  };
}

/**
 * #24 AI outbound content preview before sending to external provider.
 */
export function buildAiOutboundPreview({ provider = 'Google AI Studio', model = '', payloadText = '', selectedExcerpt = '', includesAudio = false } = {}) {
  const effectiveText = String(selectedExcerpt || payloadText || '').trim();
  return {
    provider: String(provider || 'External AI'),
    model: String(model || ''),
    excerptOnly: Boolean(selectedExcerpt && selectedExcerpt !== payloadText),
    charCount: effectiveText.length,
    includesAudio: Boolean(includesAudio),
    previewText: effectiveText,
    requiresUserConfirm: true
  };
}

/**
 * #25 Weekly evidence review answering: "Which expressions still failed after changing context?"
 */
function shanghaiDayKey(isoOrDate) {
  if (!isoOrDate) return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  }
}

export function buildWeeklyEvidenceReview(attempts = [], transferPlans = [], { now = null } = {}) {
  const list = Array.isArray(attempts) ? attempts : [];
  const nowDay = now ? shanghaiDayKey(now) : '';
  const weekStartDay = now ? shanghaiDayKey(new Date((now instanceof Date ? now : new Date(now)).getTime() - 6 * 86400000)) : '';
  const inWeek = (row) => {
    if (!nowDay || !weekStartDay) return true;
    const dk = shanghaiDayKey(row?.at || row?.attempt_timestamp || row?.firstSubmittedAt);
    return Boolean(dk && dk >= weekStartDay && dk <= nowDay);
  };
  const scopedList = list.filter(inWeek);

  const firstError = scopedList.find(a => a.rating === 'N' || a.initial_check?.status === 'incorrect') || null;
  const promptedFix = scopedList.find(a => (a.prompt_used || a.hintTierUsed) && (a.rating === 'K' || a.rating === 'V' || a.retryCorrect)) || null;
  const nextDayIndependent = scopedList.find(a => {
    if (!a || a.prompt_used || a.promptUsed || a.viewed_answer || a.viewedAnswer) return false;
    if (a.rating !== 'K' && a.status !== 'K') return false;
    if (!a.isRetest) return false;
    const ans = String(a.answer ?? a.firstAnswer ?? a.first_answer ?? '').trim();
    if (!ans) return false;
    const curDay = shanghaiDayKey(a.at || a.attempt_timestamp);
    if (!curDay) return false;
    if (a.previousAt) {
      const prevDay = shanghaiDayKey(a.previousAt);
      if (!prevDay || curDay <= prevDay) return false;
    }
    return true;
  }) || null;

  const failedFromPlans = (Array.isArray(transferPlans) ? transferPlans : [])
    .filter(plan => inWeek(plan) && (plan.stages || []).slice(1).some(st => st.submitted && st.correct === false))
    .map(plan => ({
      weaknessId: plan.weaknessId,
      target: plan.target,
      source: plan.source || 'transfer_plan',
      originalAnswer: plan.stages?.[0]?.userAnswer || '',
      newContextAnswer: plan.stages?.[1]?.userAnswer || plan.stages?.[2]?.userAnswer || '',
      prompted: Boolean(plan.stages?.some(st => st.hintUsed))
    }));

  const failedFromAttempts = scopedList
    .filter(a => (a.weaknessId || a.taskType) && (a.rating === 'N' || a.rating === 'V' || a.hintUsed))
    .map(a => ({
      weaknessId: a.weaknessId || a.taskId || a.id,
      target: a.targetExpression || a.prompt || a.weaknessId || '迁移表达',
      source: a.sourceName || a.taskType || 'transfer_attempt',
      originalAnswer: a.firstAnswer || '',
      newContextAnswer: a.retryAnswer || a.firstAnswer || '',
      prompted: Boolean(a.hintUsed)
    }));

  const failedAfterContextChange = [...failedFromPlans, ...failedFromAttempts].slice(0, 3);

  return {
    highlights: [
      { role: 'first_error', label: '首次错答代表', record: firstError },
      { role: 'prompted_fix', label: '提示后改对代表', record: promptedFix },
      { role: 'next_day_independent', label: '隔日独立成功代表', record: nextDayIndependent }
    ],
    actionQuestion: '本周哪些表达在换了场景后仍然答错？',
    failedAfterContextChange
  };
}

/**
 * #26 Distinguish practiced vs transferred mastery per word/skill.
 */
export function classifySkillTransferStatus({
  originalCorrect = false,
  newContextCorrect = false,
  freeExpressionCorrect = false,
  hintUsedOnTransfer = false
} = {}) {
  if (freeExpressionCorrect && !hintUsedOnTransfer) {
    return { status: 'free_expression_ok', label: '自由表达中独立用对', transferred: true };
  }
  if (newContextCorrect && !hintUsedOnTransfer) {
    return { status: 'transferred_new_context_ok', label: '换题独立答对', transferred: true };
  }
  if (originalCorrect) {
    return { status: 'practiced_original_ok', label: '原题答对（尚未验证迁移）', transferred: false };
  }
  return { status: 'stuck_on_transfer', label: '换场景仍卡壳', transferred: false };
}

/**
 * #27 Aggregate question quality feedback for central pack builder.
 */
export function collectQuestionQualityFlags({ disputes = [], leakEvents = [], missingEvidenceFlags = [] } = {}) {
  const items = [];
  for (const d of (Array.isArray(disputes) ? disputes : [])) {
    items.push({
      flag_type: 'answer_dispute',
      pack_id: d.pack_id || '',
      question_id: d.question_id || '',
      question_version_hash: d.question_version_hash || '',
      detail: d.user_rationale || ''
    });
  }
  for (const l of (Array.isArray(leakEvents) ? leakEvents : [])) {
    items.push({
      flag_type: 'hint_or_prompt_leak',
      pack_id: l.pack_id || '',
      question_id: l.question_id || '',
      question_version_hash: l.question_version_hash || '',
      detail: l.detail || 'Prompt leaked target before submission'
    });
  }
  for (const m of (Array.isArray(missingEvidenceFlags) ? missingEvidenceFlags : [])) {
    items.push({
      flag_type: 'missing_text_evidence',
      pack_id: m.pack_id || '',
      question_id: m.question_id || '',
      question_version_hash: m.question_version_hash || '',
      detail: m.detail || 'No verbatim passage evidence matched'
    });
  }
  return {
    schema_version: '1.0',
    total_flags: items.length,
    flags: items
  };
}

/**
 * #41 (Bonus) Anti-avalanche overdue recovery cap (keeps real backlog honest while capping daily load).
 */
export function computeAntiAvalanchePlan(overdueItems = [], dailyCap = 15) {
  const list = Array.isArray(overdueItems) ? overdueItems : [];
  const cap = Math.max(1, Number(dailyCap) || 15);
  return {
    totalOverdueTruth: list.length,
    todayBatch: list.slice(0, cap),
    deferredHonestBacklog: Math.max(0, list.length - cap),
    estimatedDaysToClear: Math.ceil(list.length / cap)
  };
}

/**
 * #42 (Bonus) Pre-export health check combining recording status, unsaved drafts, disputes, and version hashes.
 */
export function runPreExportHealthCheck({ recordingStatus = null, exactResume = null, disputes = [], versionedAttemptsCount = 0 } = {}) {
  const warnings = [];
  if (recordingStatus && recordingStatus.includeRecordings && !recordingStatus.complete) {
    warnings.push(recordingStatus.summaryText || '部分录音未带齐');
  }
  if (exactResume && exactResume.draftText && exactResume.draftText.trim()) {
    warnings.push('检测到未提交草稿，已在本地续学状态中保留');
  }
  const pendingDisputes = (Array.isArray(disputes) ? disputes : []).filter(d => d.status === 'PENDING_REVIEW').length;
  return {
    ready: warnings.length === 0,
    warnings,
    pendingDisputes,
    versionedAttemptsCount: Math.max(0, Number(versionedAttemptsCount) || 0)
  };
}
