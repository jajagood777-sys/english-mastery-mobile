/**
 * YanDao Cultivation Palace — Adaptive Paper-Companion Lab (v20.4.6)
 * Schema-driven companion engine that adapts its UI & audio tools to any printed study sheet
 * (Phonics Day 01–10, VOA Reading, Grammar, Stories, Mock Teaching, or custom JSON packs).
 */

export const PHONICS_DAY_01_MODULE = {
  id: 'phonics-day-01',
  homeLabel: '📄 伴学·拼读 Day 1',
  shortTitle: '自然拼读 Day 01',
  badge: 'PAPER COMPANION · PHONICS DAY 01',
  title: '自然拼读 Day 01 · 纸质伴学台',
  paperRef: '配套打印：04_Phonics_Day01-10_Expanded.docx · DAY 01 & PRACTICUM P01',
  subtitle: '功能随打印材料自适应切换。今天配套第 1 天纸面：听音素、练拼合、盲听听写与 1 分钟 TPR 试讲。',
  blocks: [
    {
      id: 'd01-rule',
      type: 'rule_focus',
      sectionTag: 'PAPER RULE & CAUTION',
      title: 'Core Rule: Letter Names ≠ Phonemes',
      rule: 'Practice short a /æ/ and short i /ɪ/, plus consonants s /s/, t /t/, p /p/, n /n/, m /m/, d /d/. Blend each phoneme left to right instead of saying letter names.',
      cautions: [
        'Do not add an extra vowel /uh/ after /p/ or /t/.',
        'Keep final consonants clear and audible (sat, pin, dip).',
        'Saying "pee-eye-en" is naming letters, not blending /p/ + /ɪ/ + /n/.'
      ],
      contrastDemo: [
        { label: 'sat (/æ/)', speak: 'sat', note: 'short a /æ/' },
        { label: 'sit (/ɪ/)', speak: 'sit', note: 'short i /ɪ/' },
        { label: 'pan (/æ/)', speak: 'pan', note: 'short a /æ/' },
        { label: 'pin (/ɪ/)', speak: 'pin', note: 'short i /ɪ/' }
      ]
    },
    {
      id: 'd01-sounds',
      type: 'sound_board',
      sectionTag: 'SOUND BOARD · 8 TARGET SOUNDS',
      title: 'Tap-to-Hear Target Phonemes',
      instruction: 'Tap a tile to hear the anchor sound in context. Say only the pure consonant or short vowel sound aloud.',
      tiles: [
        { id: 's-a', grapheme: 'a', ipa: '/æ/', kind: 'vowel', anchor: 'sat', speak: 'a, as in sat', tip: 'Open jaw slightly, flat short a' },
        { id: 's-i', grapheme: 'i', ipa: '/ɪ/', kind: 'vowel', anchor: 'sit', speak: 'i, as in sit', tip: 'Short relaxed i, not long /iː/' },
        { id: 's-s', grapheme: 's', ipa: '/s/', kind: 'consonant', anchor: 'sat', speak: 'sat, sad', tip: 'Continuous voiceless hiss' },
        { id: 's-t', grapheme: 't', ipa: '/t/', kind: 'consonant', anchor: 'tip', speak: 'tip, tap', tip: 'Crisp release, no extra /uh/' },
        { id: 's-p', grapheme: 'p', ipa: '/p/', kind: 'consonant', anchor: 'pin', speak: 'pin, pat', tip: 'Quick air puff, no extra /uh/' },
        { id: 's-n', grapheme: 'n', ipa: '/n/', kind: 'consonant', anchor: 'nap', speak: 'nap, nip', tip: 'Tongue tip behind upper teeth' },
        { id: 's-m', grapheme: 'm', ipa: '/m/', kind: 'consonant', anchor: 'map', speak: 'map, mat', tip: 'Lips closed, hum through nose' },
        { id: 's-d', grapheme: 'd', ipa: '/d/', kind: 'consonant', anchor: 'dip', speak: 'dip, mad', tip: 'Clear voiced release at end' }
      ]
    },
    {
      id: 'd01-blend',
      type: 'blend_stepper',
      sectionTag: 'PAPER SEC B · SEGMENT & BLEND',
      title: 'Guided Blending & 12 Syllabus Words',
      instruction: 'Follow "touch → sound → blend" with your printed sheet. Tap Slow (0.75×) or Normal to verify.',
      guided: [
        { id: 'b-sat', word: 'sat', parts: ['s', 'a', 't'], ipa: '/s/ + /æ/ + /t/' },
        { id: 'b-pin', word: 'pin', parts: ['p', 'i', 'n'], ipa: '/p/ + /ɪ/ + /n/' },
        { id: 'b-map', word: 'map', parts: ['m', 'a', 'p'], ipa: '/m/ + /æ/ + /p/' },
        { id: 'b-tin', word: 'tin', parts: ['t', 'i', 'n'], ipa: '/t/ + /ɪ/ + /n/' },
        { id: 'b-nap', word: 'nap', parts: ['n', 'a', 'p'], ipa: '/n/ + /æ/ + /p/' }
      ],
      wordList: ['sat', 'sit', 'pin', 'tip', 'tap', 'nap', 'map', 'mat', 'mad', 'sad', 'dip', 'tin']
    },
    {
      id: 'd01-unseen',
      type: 'unseen_decoder',
      sectionTag: 'PAPER SEC C · UNSEEN TRANSFER (10 ITEMS)',
      title: 'Pseudoword Decoding Check',
      instruction: 'Read each pseudoword on paper FIRST without guessing a real-word meaning. Then tap Listen to check and mark whether your blend was clean.',
      items: [
        { id: 'u-01', text: 'tas*', pattern: 'CVC (short a)', ipa: '/t/ /æ/ /s/', speak: 'tass' },
        { id: 'u-02', text: 'pam*', pattern: 'CVC (short a)', ipa: '/p/ /æ/ /m/', speak: 'pam' },
        { id: 'u-03', text: 'nat*', pattern: 'CVC (short a)', ipa: '/n/ /æ/ /t/', speak: 'nat' },
        { id: 'u-04', text: 'mip*', pattern: 'CVC (short i)', ipa: '/m/ /ɪ/ /p/', speak: 'mip' },
        { id: 'u-05', text: 'pis*', pattern: 'CVC (short i)', ipa: '/p/ /ɪ/ /s/', speak: 'piss' },
        { id: 'u-06', text: 'tam*', pattern: 'CVC (short a)', ipa: '/t/ /æ/ /m/', speak: 'tam' },
        { id: 'u-07', text: 'nim*', pattern: 'CVC (short i)', ipa: '/n/ /ɪ/ /m/', speak: 'nim' },
        { id: 'u-08', text: 'das*', pattern: 'CVC (short a)', ipa: '/d/ /æ/ /s/', speak: 'dass' },
        { id: 'u-09', text: 'dat*', pattern: 'CVC (short a)', ipa: '/d/ /æ/ /t/', speak: 'dat' },
        { id: 'u-10', text: 'tis*', pattern: 'CVC (short i)', ipa: '/t/ /ɪ/ /s/', speak: 'tiss' }
      ]
    },
    {
      id: 'd01-dictation',
      type: 'blind_dictation',
      sectionTag: 'PAPER SEC F · BLIND AUDIO DICTATION (5 WORDS)',
      title: 'Blind Listening & Spelling Test',
      instruction: 'Words stay hidden until you reveal them. Tap Play, write your answer on Paper Section F (or type below), then reveal to check.',
      words: [
        { id: 'dict-1', word: 'sat', hint: 'CVC · short a /æ/' },
        { id: 'dict-2', word: 'pin', hint: 'CVC · short i /ɪ/' },
        { id: 'dict-3', word: 'mat', hint: 'CVC · short a /æ/' },
        { id: 'dict-4', word: 'dip', hint: 'CVC · short i /ɪ/' },
        { id: 'dict-5', word: 'nap', hint: 'CVC · short a /æ/' }
      ]
    },
    {
      id: 'd01-reading',
      type: 'reading_companion',
      sectionTag: 'PAPER SEC E · CONTROLLED READING',
      title: 'Sam and the Map',
      instruction: 'Tap any sentence to hear clean pronunciation. Complete the 4 reflection tasks on your printed sheet.',
      sentences: [
        'Sam has a map.',
        'Pam sat on a mat.',
        'Tim has a pin.',
        'Sam taps the map and points to a spot.',
        'Pam can see the mark.',
        'Tim sits and pats the mat.',
        '"Can we go?" asks Pam.',
        'They take the map and set off.',
        'The little trip gives them a reason to say each sound clearly.'
      ],
      tasks: [
        'Write or say a one-sentence summary without looking back.',
        'Underline three words on paper with today’s CVC pattern.',
        'Find one sentence showing a sequence of actions.',
        'Change one detail and retell the scene in two complete English sentences.'
      ]
    },
    {
      id: 'd01-tpr',
      type: 'tpr_timer',
      sectionTag: 'PAPER SEC G & PRACTICUM P01 · MOCK TEACHING',
      title: '1-Min TPR & 6:30 Practicum Timer',
      instruction: 'Rehearse with <=3 short English instructions. Do not praise a wrong sound as correct.',
      teacherVoice: 'Point to M. Say /m/. Blend /m/ + /a/ + /p/. Now try a different target without my model.',
      presets: [
        { id: 't-60', label: '1 分钟微试讲 (60s)', seconds: 60 },
        { id: 't-390', label: '完整 P01 演练 (6:30)', seconds: 390 }
      ],
      phases: [
        '0:00–0:45 · Greeting + one clear observable objective',
        '0:45–2:00 · Accurate demo: sound + gesture + print together',
        '2:00–4:00 · Two scaffolded attempts with a varied target',
        '4:00–5:30 · One independent unseen item (note if hints needed)',
        '5:30–6:30 · Non-shaming correction + one new exit check'
      ],
      checklist: [
        'Used <=3 short English classroom instructions',
        'Contrasted letter name vs. pure phoneme sound',
        'Included one non-shaming correction phrase',
        'Ended with one unseen transfer exit check'
      ]
    }
  ]
};

export const BUILTIN_COMPANION_MODULES = [PHONICS_DAY_01_MODULE];

/**
 * Normalize any user/pack-provided companion module JSON into a safe structure.
 */
export function normalizeCompanionModule(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim() || `custom-${Date.now()}`;
  const title = String(raw.title || raw.name || '自适应伴学台').trim();
  const shortTitle = String(raw.shortTitle || raw.short_title || title).trim().slice(0, 18);
  const homeLabel = String(raw.homeLabel || raw.home_label || `📄 伴学·${shortTitle}`).trim();
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.filter(b => b && typeof b === 'object' && typeof b.type === 'string')
    : [];
  if (!blocks.length) return null;
  return {
    id,
    homeLabel,
    shortTitle,
    badge: String(raw.badge || 'ADAPTIVE PAPER COMPANION').trim(),
    title,
    paperRef: String(raw.paperRef || raw.paper_ref || '').trim(),
    subtitle: String(raw.subtitle || '').trim(),
    blocks
  };
}

/**
 * Collect all available companion modules:
 * 1) Daily pack embedded companion_lab / adaptive_companion (highest priority when present)
 * 2) User-imported custom modules in data.companionState.customModules
 * 3) Built-in modules (Phonics Day 01 default)
 */
export function listCompanionModules(data = {}) {
  const byId = new Map();
  const packComp = data?.dailyPack?.companion_lab || data?.dailyPack?.adaptive_companion || data?.dailyPack?.companionLab || null;
  if (packComp) {
    const arr = Array.isArray(packComp) ? packComp : [packComp];
    for (const item of arr) {
      const norm = normalizeCompanionModule(item);
      if (norm) byId.set(norm.id, { ...norm, source: 'daily_pack' });
    }
  }
  const custom = Array.isArray(data?.companionState?.customModules) ? data.companionState.customModules : [];
  for (const item of custom) {
    const norm = normalizeCompanionModule(item);
    if (norm && !byId.has(norm.id)) byId.set(norm.id, { ...norm, source: 'custom' });
  }
  for (const item of BUILTIN_COMPANION_MODULES) {
    if (!byId.has(item.id)) byId.set(item.id, { ...item, source: 'builtin' });
  }
  return [...byId.values()];
}

/**
 * Resolve the currently active companion module for Home button & Companion page.
 */
export function resolveActiveCompanionModule(data = {}) {
  const list = listCompanionModules(data);
  const preferredId = String(data?.companionState?.activeModuleId || '').trim();
  if (preferredId) {
    const hit = list.find(m => m.id === preferredId);
    if (hit) return hit;
  }
  return list[0] || PHONICS_DAY_01_MODULE;
}

/**
 * Summarize companion progress for UI badge & Battle Report export.
 */
export function summarizeCompanionEvidence(data = {}) {
  const st = data?.companionState && typeof data.companionState === 'object' ? data.companionState : {};
  const active = resolveActiveCompanionModule(data);
  const progressMap = st.progress && typeof st.progress === 'object' ? st.progress : {};
  const modulesSummary = Object.entries(progressMap).map(([modId, p]) => {
    const doneIds = Array.isArray(p?.doneIds) ? [...new Set(p.doneIds)] : [];
    const unseen = p?.unseenMarks && typeof p.unseenMarks === 'object' ? p.unseenMarks : {};
    const dict = p?.dictationResults && typeof p.dictationResults === 'object' ? p.dictationResults : {};
    const unseenClean = Object.values(unseen).filter(v => v === 'clean').length;
    const unseenReview = Object.values(unseen).filter(v => v === 'review').length;
    const dictChecked = Object.values(dict).filter(v => v && v.revealed).length;
    const dictCorrect = Object.values(dict).filter(v => v && v.correct === true).length;
    return {
      module_id: modId,
      done_items: doneIds.length,
      unseen_clean: unseenClean,
      unseen_review: unseenReview,
      dictation_checked: dictChecked,
      dictation_correct: dictCorrect,
      last_studied_at: String(p?.lastStudiedAt || '')
    };
  });
  return {
    active_module_id: active?.id || '',
    active_module_title: active?.title || '',
    modules: modulesSummary,
    counts_as_mastery_k: false
  };
}
