/**
 * Pocket Immersion Radio Engine (13.0.0)
 * Turns the learner's active daily pack (words, missed choices, CDTL pairs,
 * sentences, listening passages, and speeches) into a hands-free, lock-screen
 * friendly English audio stream with optional Shadowing Pauses & Sleep Timer.
 *
 * CRITICAL INTEGRITY RULE:
 * Passive radio listening is tracked strictly as audio exposure (`exposureOnly: true`)
 * and NEVER counts as K or independent retrieval mastery.
 */

const cleanRad = value => String(value ?? '').replace(/\r/g, '').trim();

export const RADIO_CHANNELS = Object.freeze([
  { id: 'weak_sniper', label: '🎯 错词与难词狙击', desc: '优先连播今日错选词、N/V 弱词与易混对比句' },
  { id: 'today_full', label: '📖 今日全包精华', desc: '按「词条 → 例句 → 句子听力」顺序自动连播' },
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
 * Builds a deterministic, deduplicated playlist of playable audio tracks
 * for the selected channel from current local state.
 */
export function buildRadioPlaylist({
  channel = 'today_full',
  items = [],
  vocabularyPractice = [],
  vocabularyAttempts = [],
  speeches = []
} = {}) {
  const tracks = [];
  const seenText = new Set();

  const pushTrack = (track) => {
    const text = cleanRad(track.text);
    if (!text || text.length < 2) return;
    const key = text.toLocaleLowerCase('en');
    if (seenText.has(key)) return;
    seenText.add(key);
    tracks.push({
      id: track.id || `radio:${tracks.length + 1}`,
      kind: track.kind || 'word',
      badge: track.badge || '词条',
      title: cleanRad(track.title) || text.slice(0, 48),
      text,
      subtext: cleanRad(track.subtext || ''),
      audioUrl: cleanRad(track.audioUrl || ''),
      priority: Number(track.priority || 10),
      exposureOnly: true
    });
  };

  const missedVocabIds = new Set(
    (Array.isArray(vocabularyAttempts) ? vocabularyAttempts : [])
      .filter(a => a && !a.skipped && (a.firstCheck ? !a.firstCheck.correct : a.correct === false))
      .map(a => cleanRad(a.taskId || a.id))
  );

  // 1. Vocabulary practice tracks (prioritize missed ones in weak_sniper)
  if (channel !== 'sentences_listening') {
    for (const v of (Array.isArray(vocabularyPractice) ? vocabularyPractice : [])) {
      const isMissed = missedVocabIds.has(cleanRad(v?.id));
      if (channel === 'weak_sniper' && !isMissed) continue;
      const head = cleanRad(v?.target);
      const ex = cleanRad(v?.archivedExample);
      const speakLine = head && ex ? `${head}. ${ex}` : (ex || head);
      if (speakLine) {
        pushTrack({
          id: `radio:vocab:${v.id}`,
          kind: 'vocab',
          badge: isMissed ? '今日错词' : '今日词汇',
          title: head || 'Vocabulary',
          text: speakLine,
          subtext: cleanRad(v?.targetSense || ''),
          audioUrl: cleanRad(v?.audioUrl || ''),
          priority: isMissed ? 1 : 5
        });
      }
    }
  }

  // 2. Card items (words, sentences, listening)
  for (const item of (Array.isArray(items) ? items : [])) {
    if (!item || item.archived || item.paused) continue;
    const isWeak = item.status === 'N' || item.status === 'V';
    if (channel === 'weak_sniper' && !isWeak) continue;
    if (channel === 'sentences_listening' && item.kind !== 'sentence') continue;

    if (item.kind === 'word') {
      const head = cleanRad(item.target);
      const ex = cleanRad(item.example);
      pushTrack({
        id: `radio:item:${item.id}`,
        kind: 'word',
        badge: isWeak ? `弱词 (${item.status})` : '词卡',
        title: head,
        text: head && ex ? `${head}. ${ex}` : (ex || head),
        subtext: cleanRad(item.definitionEn || item.meaningZh || item.cue || ''),
        audioUrl: cleanRad(item.audioUrl || ''),
        priority: item.status === 'N' ? 1 : item.status === 'V' ? 2 : 6
      });
    } else if (item.kind === 'sentence') {
      pushTrack({
        id: `radio:item:${item.id}`,
        kind: item.module === 'listening' ? 'listening' : 'sentence',
        badge: item.module === 'listening' ? '听力句' : '地道例句',
        title: item.module === 'listening' ? 'Listening Sentence' : 'Context Sentence',
        text: cleanRad(item.text),
        subtext: cleanRad(item.source || ''),
        audioUrl: cleanRad(item.audioUrl || ''),
        priority: isWeak ? 2 : 7
      });
    }
  }

  // 3. Speeches (split first 6 sentences for radio listening if not weak_sniper)
  if (channel !== 'weak_sniper') {
    for (const sp of (Array.isArray(speeches) ? speeches : [])) {
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
          subtext: cleanRad(sp.authorOrSpeaker || 'Speech Chamber'),
          priority: 8
        });
      });
    }
  }

  // Fallback for weak_sniper when learner has 0 errors yet: fall back to today_full top 15
  if (channel === 'weak_sniper' && tracks.length === 0) {
    return buildRadioPlaylist({
      channel: 'today_full',
      items,
      vocabularyPractice,
      vocabularyAttempts,
      speeches
    }).slice(0, 15);
  }

  tracks.sort((a, b) => a.priority - b.priority);
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
