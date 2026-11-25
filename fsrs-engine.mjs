// YanDao v20.0.4 — Pure Client-Side FSRS-6 DSR Memory & Scheduling Engine (Zero Dependencies)

export const FSRS_DEFAULTS = {
  desiredRetention: 0.90,
  minRetentionFloor: 0.80,
  maxRetentionCap: 0.93,
  lowEnergyRetention: 0.85,
  leechLapseThreshold: 4,
  threeDayCriterion: 3,
  w: [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]
};

export function clampDesiredRetention(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return FSRS_DEFAULTS.desiredRetention;
  return Math.max(FSRS_DEFAULTS.minRetentionFloor, Math.min(FSRS_DEFAULTS.maxRetentionCap, Math.round(n * 100) / 100));
}

export function createFsrsCard(nowMs = Date.now()) {
  return {
    d: 5.0,
    s: 0.0,
    reps: 0,
    lapses: 0,
    consecutiveMisses: 0,
    distinctCorrectDays: [],
    lastReviewMs: null,
    dueMs: nowMs,
    suspended: false,
    leech: false
  };
}

export function computeRetrievability(stabilityDays, elapsedDays) {
  const s = Math.max(0.05, Number(stabilityDays) || 0.05);
  const t = Math.max(0, Number(elapsedDays) || 0);
  // Power-law forgetting curve (FSRS-5/6)
  return Math.pow(1 + (19 / 81) * (t / s), -0.5);
}

export function mapBehaviorToFsrsRating({ correct, usedHint = false, rtMs = 3000 }) {
  if (!correct) return 1; // Again
  if (usedHint || rtMs > 6500) return 2; // Hard
  if (rtMs > 0 && rtMs <= 1800) return 4; // Easy
  return 3; // Good
}

export function nextIntervalDays(stabilityDays, desiredRetention = FSRS_DEFAULTS.desiredRetention) {
  const r = clampDesiredRetention(desiredRetention);
  const s = Math.max(0.1, Number(stabilityDays) || 0.1);
  const factor = (81 / 19) * (Math.pow(r, -2) - 1);
  return Math.max(1, Math.round(s * factor));
}

export function scheduleFsrsReview(cardInput, rating, { nowMs = Date.now(), desiredRetention = FSRS_DEFAULTS.desiredRetention, isPretest = false } = {}) {
  const card = { ...createFsrsCard(nowMs), ...(cardInput || {}) };
  card.distinctCorrectDays = Array.isArray(card.distinctCorrectDays) ? [...card.distinctCorrectDays] : [];
  if (isPretest) {
    // Pretesting (errorful generation) is a desirable priming signal; never pollutes lapses or difficulty
    return { ...card, pretestedAt: nowMs };
  }

  const rTarget = clampDesiredRetention(desiredRetention);
  const w = FSRS_DEFAULTS.w;
  const elapsedDays = card.lastReviewMs ? Math.max(0, (nowMs - card.lastReviewMs) / 86400000) : 0;
  const retrievability = card.s > 0 ? computeRetrievability(card.s, elapsedDays) : 0.9;
  const dayKey = new Date(nowMs).toISOString().slice(0, 10);

  let d = card.d;
  let s = card.s;
  let reps = card.reps + 1;
  let lapses = card.lapses;
  let consecutiveMisses = card.consecutiveMisses;

  if (card.reps === 0 || s <= 0) {
    // Initial stability & difficulty
    s = w[Math.max(0, Math.min(3, rating - 1))];
    d = Math.max(1, Math.min(10, w[4] - Math.exp(w[5] * (rating - 1)) + 1));
  } else {
    // Difficulty update with mean reversion (eliminates SM-2 Ease Hell)
    const deltaD = -w[6] * (rating - 3);
    const meanD = w[4];
    d = Math.max(1, Math.min(10, w[7] * meanD + (1 - w[7]) * (d + deltaD)));

    if (rating === 1) {
      lapses += 1;
      consecutiveMisses += 1;
      s = Math.max(0.2, w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - retrievability)));
    } else {
      consecutiveMisses = 0;
      const hardPenalty = rating === 2 ? w[15] : 1;
      const easyBonus = rating === 4 ? w[16] : 1;
      const sInc = 1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - retrievability)) - 1) * hardPenalty * easyBonus;
      s = Math.min(3650, Math.max(0.5, s * sInc));
    }
  }

  if (rating >= 2) {
    if (!card.distinctCorrectDays.includes(dayKey)) card.distinctCorrectDays.push(dayKey);
  }

  const intervalDays = rating === 1 ? 1 : nextIntervalDays(s, rTarget);
  const leech = lapses >= FSRS_DEFAULTS.leechLapseThreshold || (d >= 9.5 && consecutiveMisses >= 3);

  return {
    ...card,
    d: Math.round(d * 100) / 100,
    s: Math.round(s * 100) / 100,
    r: Math.round(retrievability * 1000) / 1000,
    reps,
    lapses,
    consecutiveMisses,
    leech,
    intervalDays,
    lastReviewMs: nowMs,
    dueMs: nowMs + intervalDays * 86400000
  };
}

export function isLeechCard(card) {
  if (!card) return false;
  return Boolean(card.leech || (Number(card.lapses) || 0) >= FSRS_DEFAULTS.leechLapseThreshold || ((Number(card.d) || 0) >= 9.5 && (Number(card.consecutiveMisses) || 0) >= 3));
}

export function evaluateThreeDayCriterion(card) {
  const days = Array.isArray(card?.distinctCorrectDays) ? card.distinctCorrectDays.length : 0;
  const target = FSRS_DEFAULTS.threeDayCriterion;
  const filled = Math.min(target, days);
  return {
    days: filled,
    target,
    graduated: filled >= target,
    dots: `${'● '.repeat(filled)}${'○ '.repeat(Math.max(0, target - filled))}`.trim()
  };
}

export function selectDifficultyTierByStability(stabilityDays = 0) {
  const s = Number(stabilityDays) || 0;
  if (s < 7) return { tier: 1, mode: 'recognition_choice', label: 'Tier 1 · 识别建通路' };
  if (s < 30) return { tier: 2, mode: 'chunk_or_cloze', label: 'Tier 2 · 语块/完形巩固' };
  return { tier: 3, mode: 'audio_or_free_recall', label: 'Tier 3 · 听音/自由提取' };
}

export function sortByDescendingRetrievability(cards = [], nowMs = Date.now(), { dailyCap = 80 } = {}) {
  const scored = (Array.isArray(cards) ? cards : []).map((c) => {
    const elapsed = c.lastReviewMs ? Math.max(0, (nowMs - c.lastReviewMs) / 86400000) : 1;
    const r = c.s > 0 ? computeRetrievability(c.s, elapsed) : 0.5;
    return { ...c, currentR: r };
  });
  scored.sort((a, b) => b.currentR - a.currentR);
  return {
    dueToday: scored.slice(0, dailyCap),
    postponed: scored.slice(dailyCap)
  };
}

export function applySmartFuzzLoadBalance(baseIntervalDays, futureLoadByDay = {}, { nowMs = Date.now(), easyWeekdays = [0] } = {}) {
  const base = Math.max(1, Math.round(Number(baseIntervalDays) || 1));
  if (base <= 2) return base;
  const fuzz = Math.max(1, Math.round(base * 0.1));
  let bestDay = base;
  let bestScore = Infinity;
  for (let delta = -fuzz; delta <= fuzz; delta++) {
    const cand = Math.max(2, base + delta);
    const dt = new Date(nowMs + cand * 86400000);
    const key = dt.toISOString().slice(0, 10);
    const rawLoad = Number(futureLoadByDay[key] || 0);
    const isEasyDay = Array.isArray(easyWeekdays) && easyWeekdays.includes(dt.getUTCDay());
    const score = rawLoad + (isEasyDay ? 25 : 0) + Math.abs(delta) * 0.01;
    if (score < bestScore) {
      bestScore = score;
      bestDay = cand;
    }
  }
  return bestDay;
}

export function disperseSiblingDates(cards = [], minGapDays = 2) {
  const byLemma = new Map();
  const out = cards.map((c) => ({ ...c }));
  for (const card of out) {
    const key = String(card.lemmaId || card.target || '').toLowerCase().trim();
    if (!key) continue;
    const prev = byLemma.get(key) || [];
    for (const other of prev) {
      const diffDays = Math.abs((card.dueMs || 0) - (other.dueMs || 0)) / 86400000;
      if (diffDays < minGapDays) {
        card.dueMs = (other.dueMs || Date.now()) + minGapDays * 86400000;
      }
    }
    prev.push(card);
    byLemma.set(key, prev);
  }
  return out;
}

function normLevenshtein(a, b) {
  const x = String(a || '').toLowerCase();
  const y = String(b || '').toLowerCase();
  const m = x.length, n = y.length;
  if (!m || !n) return 1;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = x[i - 1] === y[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n] / Math.max(m, n);
}

export function burySameDayConfusables(queue = [], stabilityByWord = {}) {
  const kept = [];
  const buried = [];
  for (const item of (Array.isArray(queue) ? queue : [])) {
    const w = String(item?.target || '').toLowerCase().trim();
    const s = Number(stabilityByWord[w] || 0);
    if (w.length >= 4 && s < 7) {
      const clashes = kept.some((k) => {
        const kw = String(k?.target || '').toLowerCase().trim();
        const ks = Number(stabilityByWord[kw] || 0);
        return kw && kw !== w && ks < 7 && normLevenshtein(w, kw) <= 0.35;
      });
      if (clashes) {
        buried.push({ ...item, buriedReason: 'same_day_confusable_anti_clustering', delayDays: 3 });
        continue;
      }
    }
    kept.push(item);
  }
  return { kept, buried };
}

export function interleaveReviewQueue(items = []) {
  const list = Array.isArray(items) ? [...items] : [];
  if (list.length <= 2) return list;
  const buckets = new Map();
  for (const it of list) {
    const key = String(it.batchGroup || it.topic || it.type || 'default');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(it);
  }
  const result = [];
  const keys = [...buckets.keys()];
  let remaining = list.length;
  while (remaining > 0) {
    for (const k of keys) {
      const b = buckets.get(k);
      if (b && b.length) {
        result.push(b.shift());
        remaining--;
      }
    }
  }
  return result;
}

export function computeStabilityDistribution(fsrsMap = {}) {
  const dist = { sprout: 0, solidifying: 0, longTerm: 0, permanent: 0 };
  for (const card of Object.values(fsrsMap || {})) {
    const s = Number(card?.s || 0);
    if (s < 7) dist.sprout++;
    else if (s < 30) dist.solidifying++;
    else if (s < 90) dist.longTerm++;
    else dist.permanent++;
  }
  return dist;
}
