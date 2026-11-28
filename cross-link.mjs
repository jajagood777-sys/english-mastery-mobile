// YanDao v20.4.4 Cross-Module Vocabulary & Historical-Word Linkage Engine
// Connects Vocab Practice, Reading Marks/Harvest, Spelling Leeches, Speech, Complex Lab & Output.

function normWord(w) {
  return String(w || '').trim().toLowerCase().replace(/^[^a-z]+|[^a-z']+$/g, '');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function collectCrossModuleLexicon(data = {}) {
  const map = new Map();
  const pack = data?.dailyPack || {};
  const journey = data?.dailyJourney || {};

  const upsert = (rawWord, info) => {
    const key = normWord(rawWord);
    if (!key || key.length < 3) return;
    const prev = map.get(key);
    if (!prev || info.priority > prev.priority) {
      map.set(key, {
        word: String(rawWord).trim(),
        key,
        badge: info.badge,
        source: info.source,
        gloss: info.gloss || prev?.gloss || '',
        priority: info.priority
      });
    } else if (!prev.gloss && info.gloss) {
      prev.gloss = info.gloss;
    }
  };

  // 1) Today's Vocab Practice (missed / review mistakes / target)
  const wrongIds = new Set(
    [
      ...(Array.isArray(journey?.vocabularyAttempts) ? journey.vocabularyAttempts : []),
      ...(Array.isArray(data?.vocabularyAttempts) ? data.vocabularyAttempts.filter(r => r && r.packId === pack?.packId) : [])
    ]
      .filter(r => r && (r.correct === false || r.status === 'wrong' || r.isCorrect === false))
      .map(r => r.taskId)
  );
  for (const t of Array.isArray(pack?.vocabularyPractice) ? pack.vocabularyPractice : []) {
    if (!t?.target) continue;
    const isMiss = wrongIds.has(t.id);
    const isHist = Boolean(t.is_review_mistake || t.isReviewMistake || t.batch_group || t.wakeup_cohort);
    upsert(t.target, {
      badge: isMiss ? '错词复现' : isHist ? '历史复现' : '今日词',
      source: isMiss ? 'vocab_miss' : isHist ? 'historical_review' : 'vocab_today',
      gloss: t.gloss || t.meaning || t.hint || '',
      priority: isMiss ? 100 : isHist ? 85 : 70
    });
  }

  // 2) Reading Marks (N / V harvested words)
  for (const m of Array.isArray(data?.readingMarks) ? data.readingMarks : []) {
    const w = m?.word || m?.text;
    if (!w) continue;
    const st = String(m?.status || 'N').toUpperCase();
    if (st === 'K') continue;
    upsert(w, {
      badge: '阅读生词',
      source: 'reading_mark',
      gloss: m?.savedGloss?.en || m?.savedGloss?.zh || m?.note || '',
      priority: 95
    });
  }

  // 3) Spelling Tasks (Leech / Stubborn words)
  for (const s of Array.isArray(pack?.spellingTasks) ? pack.spellingTasks : []) {
    if (!s?.target) continue;
    upsert(s.target, {
      badge: '拼写重点',
      source: 'spelling',
      gloss: s.meaning || s.hint || '',
      priority: 90
    });
  }

  // 4) Previously Learned / FSRS / Mastered Pool (Historical reuse!)
  const mastered = Array.isArray(data?.masteredVocabWords)
    ? data.masteredVocabWords
    : Object.keys(data?.masteredVocabWords || {});
  for (const w of mastered) {
    upsert(w, { badge: '已学复用', source: 'learned_pool', gloss: '', priority: 40 });
  }
  for (const w of Object.keys(data?.fsrsState || {})) {
    upsert(w, { badge: '已学复用', source: 'fsrs_pool', gloss: '', priority: 45 });
  }
  for (const item of Array.isArray(data?.items) ? data.items : []) {
    if (item?.kind === 'word' && item?.target) {
      upsert(item.target, {
        badge: item.status === 'K' ? '已学复用' : '历史待固',
        source: 'items_bank',
        gloss: item.meaning || '',
        priority: item.status === 'K' ? 42 : 75
      });
    }
  }

  return [...map.values()].sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
}

export function matchCrossModuleWordsInText(text, lexicon = [], limit = 12) {
  const raw = String(text || '');
  if (!raw.trim() || !Array.isArray(lexicon) || !lexicon.length) return [];
  const lower = raw.toLowerCase();
  const hits = [];
  for (const entry of lexicon) {
    if (hits.length >= limit) break;
    const key = entry?.key || normWord(entry?.word);
    if (!key || key.length < 3) continue;
    // Match exact word/phrase or simple English inflections (-s, -es, -ed, -ing, -d)
    const pat = key.includes(' ')
      ? new RegExp(`\\b${escapeRegex(key)}\\b`, 'i')
      : new RegExp(`\\b${escapeRegex(key)}(?:s|es|ed|d|ing)?\\b`, 'i');
    if (pat.test(lower)) {
      hits.push(entry);
    }
  }
  return hits;
}
