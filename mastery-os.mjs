/**
 * Long-Term Mastery OS Engine (12.0.0)
 * - 90-Day Authentic Cultivation Heatmap aggregator (real active minutes only)
 * - FSRS 6.3.2 7-Day Review Load Forecast & High-Risk Decay Radar
 * - 100% Offline Cross-Pack Instant Dictionary Lookup
 * - 5-Minute Commute Quick-Sprint Queue Builder
 * - Backup Freshness & Storage Health Advisor
 */

import { dateKeyInTimeZone, replayFsrsShadowHistory } from './core.mjs';

const cleanOs = value => String(value ?? '').replace(/\r/g, '').trim();
const normOs = value => cleanOs(value).toLocaleLowerCase('en').replace(/\s+/g, ' ');

/**
 * Builds a 90-day authentic study heatmap from local sessions and active journey time.
 * Never invents minutes or streaks for days without real recorded foreground activity.
 */
export function buildCultivationHeatmap(sessions = [], { days = 90, now = new Date(), timeZone = 'Asia/Shanghai' } = {}) {
  const totalDays = Math.max(7, Math.min(365, Number(days) || 90));
  const dailyMs = new Map();

  for (const s of (Array.isArray(sessions) ? sessions : [])) {
    if (!s || typeof s !== 'object') continue;
    const buckets = s.activeByDay;
    if (buckets && typeof buckets === 'object' && !Array.isArray(buckets)) {
      for (const [day, ms] of Object.entries(buckets)) {
        const val = Math.max(0, Number(ms) || 0);
        if (day && val > 0) dailyMs.set(day, (dailyMs.get(day) || 0) + val);
      }
    } else if (s.startedAt && s.endedAt) {
      const startKey = dateKeyInTimeZone(s.startedAt, timeZone);
      const endKey = dateKeyInTimeZone(s.endedAt, timeZone);
      const val = Math.max(0, Number(s.activeMs) || 0);
      if (startKey && startKey === endKey && val > 0) {
        dailyMs.set(startKey, (dailyMs.get(startKey) || 0) + val);
      }
    }
  }

  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const cells = [];
  let activeDays = 0;
  let totalMinutes = 0;
  let maxDayMinutes = 0;

  for (let offset = totalDays - 1; offset >= 0; offset--) {
    const dayDate = new Date(nowMs - offset * 86400000);
    const key = dateKeyInTimeZone(dayDate, timeZone);
    const minutes = Math.round((dailyMs.get(key) || 0) / 60000);
    if (minutes > 0) activeDays++;
    totalMinutes += minutes;
    if (minutes > maxDayMinutes) maxDayMinutes = minutes;
    const level = minutes === 0 ? 0 : minutes < 10 ? 1 : minutes < 25 ? 2 : minutes < 45 ? 3 : 4;
    cells.push({ date: key, minutes, level });
  }

  // Real consecutive streak ending today or yesterday
  let currentStreak = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].minutes > 0) {
      currentStreak++;
    } else if (i === cells.length - 1) {
      // Allow today not finished yet; check if yesterday had activity
      continue;
    } else {
      break;
    }
  }

  return {
    days: totalDays,
    activeDays,
    totalMinutes,
    maxDayMinutes,
    currentStreak,
    cells
  };
}

/**
 * Forecasts FSRS 6.3.2 independent review load over the next 7 days
 * and ranks top high-risk decaying cards for targeted rescue drills.
 */
export function buildFsrsForecast(attempts = [], items = [], { horizonDays = 7, now = new Date(), timeZone = 'Asia/Shanghai' } = {}) {
  const shadow = replayFsrsShadowHistory(attempts, now);
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();
  const itemMap = new Map((Array.isArray(items) ? items : []).map(i => [String(i?.id || ''), i]));

  const buckets = [];
  for (let d = 0; d < horizonDays; d++) {
    const dayKey = dateKeyInTimeZone(new Date(nowMs + d * 86400000), timeZone);
    buckets.push({ dayOffset: d, date: dayKey, label: d === 0 ? '今天/已到期' : `+${d}天`, dueCount: 0 });
  }

  const riskCards = [];
  for (const [cardId, st] of Object.entries(shadow.cards || {})) {
    const dueMs = new Date(st.dueAt).getTime();
    const diffDays = Math.floor((dueMs - nowMs) / 86400000);
    if (diffDays <= 0) {
      buckets[0].dueCount++;
    } else if (diffDays < horizonDays) {
      buckets[diffDays].dueCount++;
    }
    const item = itemMap.get(cardId);
    riskCards.push({
      itemId: cardId,
      target: cleanOs(item?.target || item?.text || cardId),
      kind: item?.kind || 'word',
      stabilityDays: st.stability,
      difficulty: st.difficulty,
      retrievability: st.retrievability,
      dueAt: st.dueAt,
      overdueDays: diffDays < 0 ? Math.abs(diffDays) : 0
    });
  }

  riskCards.sort((a, b) => a.stabilityDays - b.stabilityDays || b.overdueDays - a.overdueDays);

  return {
    model: shadow.model,
    trackedCards: shadow.trackedCards,
    avgStabilityDays: shadow.avgStabilityDays,
    highRiskCount: shadow.highRiskCount,
    dailyBuckets: buckets,
    topRiskCards: riskCards.slice(0, 10)
  };
}

/**
 * 100% Offline Cross-Pack Instant Dictionary Lookup.
 * Searches current items, vocabularyPractice, and originalWordArchive without any network calls.
 */
export function lookupOfflineLexicon(query = '', { items = [], vocabularyPractice = [], originalWordArchive = [] } = {}) {
  const needle = normOs(query);
  if (!needle || needle.length < 2) return [];

  const results = [];
  const seen = new Set();

  const pushEntry = (entry) => {
    const key = normOs(entry.headword);
    if (!key || seen.has(key)) return;
    seen.add(key);
    results.push(entry);
  };

  for (const w of (Array.isArray(originalWordArchive) ? originalWordArchive : [])) {
    const hw = cleanOs(w?.target);
    const def = cleanOs(w?.definition_en || w?.definitionEn);
    const ex = cleanOs(w?.example);
    if (normOs(`${hw} ${def} ${ex}`).includes(needle)) {
      pushEntry({ headword: hw, senseEn: def, meaningZh: cleanOs(w?.meaning_zh || w?.cue), example: ex, source: '学习包词库归档', status: 'ARCHIVE' });
    }
  }

  for (const v of (Array.isArray(vocabularyPractice) ? vocabularyPractice : [])) {
    const hw = cleanOs(v?.target);
    const def = cleanOs(v?.targetSense);
    const ex = cleanOs(v?.archivedExample || v?.prompt);
    if (hw && normOs(`${hw} ${def} ${ex}`).includes(needle)) {
      pushEntry({ headword: hw, senseEn: def, meaningZh: '', example: ex, source: '今日触控词包', status: 'PACK' });
    }
  }

  for (const item of (Array.isArray(items) ? items : [])) {
    if (item?.kind !== 'word') continue;
    const hw = cleanOs(item.target);
    const def = cleanOs(item.definitionEn || item.cue || item.meaningZh);
    const ex = cleanOs(item.example);
    if (hw && normOs(`${hw} ${def} ${ex}`).includes(needle)) {
      pushEntry({ headword: hw, senseEn: cleanOs(item.definitionEn), meaningZh: cleanOs(item.meaningZh || item.cue), example: ex, source: cleanOs(item.source) || '本机词库', status: item.status || 'UNTESTED' });
    }
  }

  results.sort((a, b) => {
    const aExact = normOs(a.headword) === needle ? 0 : normOs(a.headword).startsWith(needle) ? 1 : 2;
    const bExact = normOs(b.headword) === needle ? 0 : normOs(b.headword).startsWith(needle) ? 1 : 2;
    return aExact - bExact || a.headword.localeCompare(b.headword);
  });

  return results.slice(0, 12);
}

/**
 * Selects a compact 5-minute commute sprint queue (up to 5 due/weak words + 2 sentences)
 * for fragmented time without disturbing the main dailyJourney.
 */
export function buildCommuteSprintQueue(items = [], { maxWords = 5, maxSentences = 2, now = Date.now() } = {}) {
  const active = (Array.isArray(items) ? items : []).filter(i => i && !i.archived && !i.paused);
  const score = item => {
    const overdue = item.dueAt && new Date(item.dueAt).getTime() <= now ? 0 : 1;
    const weak = item.status === 'N' ? 0 : item.status === 'V' ? 1 : item.status === 'UNTESTED' ? 2 : 3;
    return overdue * 10 + weak;
  };
  const words = active.filter(i => i.kind === 'word').sort((a, b) => score(a) - score(b)).slice(0, maxWords);
  const sentences = active.filter(i => i.kind === 'sentence').sort((a, b) => score(a) - score(b)).slice(0, maxSentences);
  return [...words, ...sentences].map(i => i.id);
}

/**
 * Checks whether local backup is overdue (> 7 days since last user export)
 * when the learner has accumulated meaningful records.
 */
export function evaluateBackupFreshness(settings = {}, itemCount = 0, attemptCount = 0, now = new Date()) {
  if (itemCount < 5 && attemptCount < 3) {
    return { needsReminder: false, daysSinceBackup: null, message: '' };
  }
  const last = settings?.lastBackupExportAttemptAt;
  if (!last || Number.isNaN(new Date(last).getTime())) {
    return {
      needsReminder: true,
      daysSinceBackup: null,
      message: '你尚未导出过本机 JSON 备份。建议定期备份到 iPhone“文件”或 Google Drive，防止 Safari 意外清理数据。'
    };
  }
  const days = Math.floor(((now instanceof Date ? now : new Date(now)).getTime() - new Date(last).getTime()) / 86400000);
  if (days >= 7) {
    return {
      needsReminder: true,
      daysSinceBackup: days,
      message: `距离上次主动备份已过去 ${days} 天。建议点击「设置 → 导出本机 JSON 备份」留一份安全快照。`
    };
  }
  return { needsReminder: false, daysSinceBackup: days, message: '' };
}
