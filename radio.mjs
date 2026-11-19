/**
 * Pocket Immersion Radio Engine (14.1.0)
 * Turns the learner's active daily pack OR full local history into a hands-free,
 * lock-screen friendly English audio stream with:
 * - Exact single-segment Kokoro `af_heart` MP3 matching (`segments: string[]`)
 * - Scope selector (`today` vs `all` history)
 * - Stop-after-round anti-repetition toggle + optional shuffle
 * - Dynamic Shadowing Pauses & Sleep Timer
 *
 * CRITICAL INTEGRITY RULE:
 * Passive radio listening is tracked strictly as audio exposure (`exposureOnly: true`)
 * and NEVER counts as K or independent retrieval mastery.
 */

const cleanRad = value => String(value ?? '').replace(/\r/g, '').trim();

export const RADIO_CHANNELS = Object.freeze([
  { id: 'weak_sniper', label: '🎯 错词与难词狙击', desc: '优先连播今日错选词、N/V 弱词与易混对比句' },
  { id: 'today_full', label: '📖 核心词句全连播', desc: '按「词条 → 例句 → 句子听力」顺序自动连播' },
  { id: 'sentences_listening', label: '🎧 句子与听力精磨', desc: '专攻完整英文句子与听力语段，适合影子跟读' },
  { id: 'sleep_slow', label: '🌙 睡前慢速磨耳朵', desc: '默认 0.8× 温和语速，可配睡眠定时自动停播' }
]);

/**
 * Computes a natural shadowing pause duration (ms) proportional to English text length
 * so the learner has time to repeat aloud hands-free while wearing AirPods.
 */
export function computeShadowPauseMs(text = '', { enabled = false, baseMs = 1500, msPerWord = 360, maxMs = 8000 } = {}) {
  if (!enabled) return 900;
  const words = (cleanRad(text).match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
  return Math.min(maxMs, Math.max(baseMs, baseMs + words * msPerWord));
}

/**
 * Builds a deterministic, deduplicated playlist of playable audio tracks.
 * Each track carries `segments` matching the exact unit strings hashed by
 * `audio-tasks.mjs` (`target`, `example`, sentence text) so offline Kokoro
 * `af_heart` MP3 clips match with 100% precision.
 */
export function buildRadioPlaylist({
  channel = 'today_full',
  scope = 'all',
  activePackId = '',
  shuffle = false,
  items = [],
  vocabularyPractice = [],
  vocabularyAttempts = [],
  speeches = []
} = {}) {
  const tracks = [];
  const seenText = new Set();

  const pushTrack = (track) => {
    const rawSegments = Array.isArray(track.segments) ? track.segments.map(cleanRad).filter(Boolean) : [];
    const text = cleanRad(track.text || rawSegments.join('. '));
    const segments = rawSegments.length ? rawSegments : (text ? [text] : []);
    if (!text || text.length < 2 || !segments.length) return;
    const key = text.toLocaleLowerCase('en');
    if (seenText.has(key)) return;
    seenText.add(key);
    tracks.push({
      id: track.id || `radio:${tracks.length + 1}`,
      kind: track.kind || 'word',
      badge: track.badge || '词条',
      title: cleanRad(track.title) || segments[0].slice(0, 48),
      text,
      segments,
      subtext: cleanRad(track.subtext || ''),
      audioUrl: cleanRad(track.audioUrl || ''),
      priority: Number(track.priority || 10),
      exposureOnly: true
    });
  };

  const inScope = row => {
    if (scope !== 'today' || !activePackId) return true;
    return cleanRad(row?.packId || row?.source?.id) === cleanRad(activePackId);
  };

  const missedVocabIds = new Set(
    (Array.isArray(vocabularyAttempts) ? vocabularyAttempts : [])
      .filter(a => a && !a.skipped && (a.firstCheck ? !a.firstCheck.correct : a.correct === false))
      .map(a => cleanRad(a.taskId || a.id))
  );

  // 1. Vocabulary practice tracks (split into exact [target, example] segments for Kokoro MP3 hits)
  if (channel !== 'sentences_listening') {
    for (const v of (Array.isArray(vocabularyPractice) ? vocabularyPractice : [])) {
      if (!inScope(v)) continue;
      const isMissed = missedVocabIds.has(cleanRad(v?.id));
      if (channel === 'weak_sniper' && !isMissed) continue;
      const head = cleanRad(v?.target);
      const ex = cleanRad(v?.archivedExample);
      const segments = [head, ex].filter(Boolean);
      if (segments.length) {
        pushTrack({
          id: `radio:vocab:${v.id}`,
          kind: 'vocab',
          badge: isMissed ? '今日错词' : '今日词汇',
          title: head || 'Vocabulary',
          text: segments.join(' — '),
          segments,
          subtext: cleanRad(v?.targetSense || ''),
          audioUrl: cleanRad(v?.audioUrl || ''),
          priority: isMissed ? 1 : 5
        });
      }
    }
  }

  // 2. Card items (words, sentences, listening)
  for (const item of (Array.isArray(items) ? items : [])) {
    if (!item || item.archived || item.paused || !inScope(item)) continue;
    const isWeak = item.status === 'N' || item.status === 'V';
    if (channel === 'weak_sniper' && !isWeak) continue;
    if (channel === 'sentences_listening' && item.kind !== 'sentence') continue;

    if (item.kind === 'word') {
      const head = cleanRad(item.target);
      const ex = cleanRad(item.example);
      const segments = [head, ex].filter(Boolean);
      pushTrack({
        id: `radio:item:${item.id}`,
        kind: 'word',
        badge: isWeak ? `弱词 (${item.status})` : '词卡',
        title: head,
        text: segments.join(' — '),
        segments,
        subtext: cleanRad(item.definitionEn || item.meaningZh || item.cue || ''),
        audioUrl: cleanRad(item.audioUrl || ''),
        priority: item.status === 'N' ? 1 : item.status === 'V' ? 2 : 6
      });
    } else if (item.kind === 'sentence') {
      const sent = cleanRad(item.text);
      pushTrack({
        id: `radio:item:${item.id}`,
        kind: item.module === 'listening' ? 'listening' : 'sentence',
        badge: item.module === 'listening' ? '听力句' : '地道例句',
        title: item.module === 'listening' ? 'Listening Sentence' : 'Context Sentence',
        text: sent,
        segments: [sent],
        subtext: cleanRad(item.source || ''),
        audioUrl: cleanRad(item.audioUrl || ''),
        priority: isWeak ? 2 : 7
      });
    }
  }

  // 3. Speeches (split into natural sentences)
  if (channel !== 'weak_sniper') {
    for (const sp of (Array.isArray(speeches) ? speeches : [])) {
      if (!inScope(sp)) continue;
      const sentences = cleanRad(sp?.scriptEn)
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length >= 16)
        .slice(0, 6);
      sentences.forEach((sent, idx) => {
        pushTrack({
          id: `radio:speech:${sp.id}:${idx + 1}`,
          kind: 'speech',
          badge: `演讲片段 ${idx + 1}`,
          title: cleanRad(sp.title) || 'Speech',
          text: sent,
          segments: [sent],
          subtext: cleanRad(sp.authorOrSpeaker || 'Speech Chamber'),
          priority: 8
        });
      });
    }
  }

  // Fallback for weak_sniper when learner has 0 errors yet
  if (channel === 'weak_sniper' && tracks.length === 0) {
    return buildRadioPlaylist({
      channel: 'today_full',
      scope,
      activePackId,
      shuffle,
      items,
      vocabularyPractice,
      vocabularyAttempts,
      speeches
    }).slice(0, 15);
  }

  if (shuffle) {
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
  } else {
    tracks.sort((a, b) => a.priority - b.priority);
  }
  return tracks;
}

/**
 * Formats passive radio exposure summary for honest Battle Report logging.
 */
export function summarizeRadioExposure(radioLog = {}) {
  return {
    clipsPlayed: Math.max(0, Number(radioLog?.clipsPlayed || 0)),
    activeSeconds: Math.max(0, Math.round(Number(radioLog?.activeMs || 0) / 1000)),
    channelUsed: cleanRad(radioLog?.lastChannel || ''),
    exposureOnly: true,
    countsAsMasteryK: false
  };
}
