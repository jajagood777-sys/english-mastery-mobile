// YanDao v20.1.0 — Spoken Complex Sentence Imitation Lab (口语复杂句仿说工坊)
// SLA-backed 3-stage syntactic priming loop:
//   Stage 1: Full Spoken Model + Thought-Group Slashes (/) + Highlighted Frame
//   Stage 2: Skeleton Fading (keeps grammar frame + anchor slots, hides filler)
//   Stage 3: Free Slot-Swap (links user's real learned vocabulary into the same spoken frame)

export const COMPLEX_FRAME_TYPES = [
  {
    id: 'wh_cleft',
    label: 'Wh-Cleft 强调句',
    pattern: 'What really matters is (that)...',
    tip: '口语中 94.6% 会在 is 前后分成两个语调意群，停顿自然最提分。',
    triggers: ['What really matters is', "What I've noticed is", 'What surprised me is', 'What makes it tough is']
  },
  {
    id: 'conditional',
    label: '条件连锁句',
    pattern: "If you [V], you'll end up [V-ing]...",
    tip: '用真实口语结果动词 end up / tend to，别背僵硬书面虚拟式。',
    triggers: ['If you', "you'll end up", 'unless you', 'as long as']
  },
  {
    id: 'concession',
    label: '让步转折句',
    pattern: 'Even though [clause], [main clause]...',
    tip: '先让步再亮观点，Even though 轻读起调，主句重音落核心词。',
    triggers: ['Even though', 'Although']
  },
  {
    id: 'contrast',
    label: '对比平衡句',
    pattern: 'While [clause A], [clause B]...',
    tip: '雅思口语 Part 3 黄金句型：前半分句微升调，后半分句稳稳降调。',
    triggers: ['While']
  },
  {
    id: 'cause_result',
    label: '因果推进句',
    pattern: 'Since [clause], [main clause]...',
    tip: '口语里用 Since / Because 开头比书面 Therefore 更自然流畅。',
    triggers: ['Since', 'Because']
  },
  {
    id: 'frame_relative',
    label: '框架定语从句',
    pattern: 'One of the things I [V] is ... that ...',
    tip: '先抛外壳词块争取 1 秒思考时间，再接 that 定语从句展开。',
    triggers: ['One of the things', 'The kind of', 'that']
  },
  {
    id: 'which_comment',
    label: 'Which 评论尾句',
    pattern: '..., which makes it [adj] to ...',
    tip: '先说完一个简单句，再自然顺接 which 补一句评价，零卡顿升级复杂句。',
    triggers: [', which makes it', ', which is why', ', which means']
  },
  {
    id: 'cognitive_comp',
    label: '观点缓冲补语',
    pattern: 'I tend to think (that) ...',
    tip: '用 I tend to think / It seems to me 柔和引出观点，流利度高且显地道。',
    triggers: ['I tend to think', 'It seems to me', "I've found that"]
  }
];

export const COMPLEX_STAGE_META = [
  { id: 'imitate', label: '1. 原句仿说', hint: '看意群斜杠 `/` 与高亮骨架，先听示范再模仿语调。' },
  { id: 'skeleton', label: '2. 骨架挖空', hint: '遮住细节词，只看语法骨架把整句顺口说出来。' },
  { id: 'swap', label: '3. 换词自造', hint: '保留同一口语骨架，把下方「已学词」换进去造你自己的话！' }
];

export const COMPLEX_IMITATION_TOPICS = [
  {
    id: 'work_routine',
    label: '工作与日常',
    drills: [
      {
        id: 'work-wh-1',
        frameId: 'wh_cleft',
        sentence: "What really matters is keeping a steady pace, rather than burning out in the first two hours.",
        chunks: "What really matters / is keeping a steady pace, / rather than burning out / in the first two hours.",
        skeleton: "What really matters / is [keeping ___], / rather than [___] / in the first two hours.",
        swapTemplate: "What really matters is [V-ing + 已学词], rather than [contrast].",
        defaultWords: ['steady', 'pace', 'burn out']
      },
      {
        id: 'work-concession-2',
        frameId: 'concession',
        sentence: "Even though my morning schedule gets tight, setting clear priorities keeps me from feeling scattered.",
        chunks: "Even though my morning schedule gets tight, / setting clear priorities / keeps me from feeling scattered.",
        skeleton: "Even though [morning ___ gets ___], / [setting ___] / keeps me from [___].",
        swapTemplate: "Even though [situation], [action + 已学词] keeps me from [problem].",
        defaultWords: ['priority', 'schedule', 'scattered']
      },
      {
        id: 'work-which-3',
        frameId: 'which_comment',
        sentence: "I try to finish the toughest task before lunch, which makes it much easier to stay calm in the afternoon.",
        chunks: "I try to finish / the toughest task before lunch, / which makes it much easier / to stay calm in the afternoon.",
        skeleton: "I try to [___] before lunch, / which makes it much easier / to [___] in the afternoon.",
        swapTemplate: "I try to [habit + 已学词], which makes it much easier to [benefit].",
        defaultWords: ['task', 'calm', 'routine']
      },
      {
        id: 'work-cond-4',
        frameId: 'conditional',
        sentence: "If you leave small admin tasks until Friday, you'll end up wasting half your weekend catching up.",
        chunks: "If you leave small admin tasks until Friday, / you'll end up wasting / half your weekend catching up.",
        skeleton: "If you [leave ___ until ___], / you'll end up [___-ing] / half your [___].",
        swapTemplate: "If you [action + 已学词], you'll end up [V-ing consequence].",
        defaultWords: ['admin', 'catch up', 'deadline']
      }
    ]
  },
  {
    id: 'teaching_learning',
    label: '教学与学习',
    drills: [
      {
        id: 'teach-contrast-1',
        frameId: 'contrast',
        sentence: "While memorizing word lists feels productive, using new words in short spoken stories actually makes them stick.",
        chunks: "While memorizing word lists feels productive, / using new words in short spoken stories / actually makes them stick.",
        skeleton: "While [___ feels ___], / [using ___ in ___] / actually makes them [___].",
        swapTemplate: "While [old habit], [better method + 已学词] actually makes [result].",
        defaultWords: ['productive', 'stick', 'spoken']
      },
      {
        id: 'teach-rel-2',
        frameId: 'frame_relative',
        sentence: "One of the things I notice with young learners is that quick visual cues work far better than long explanations.",
        chunks: "One of the things I notice / with young learners / is that quick visual cues / work far better than long explanations.",
        skeleton: "One of the things I notice / with [___] / is that [___] / work far better than [___].",
        swapTemplate: "One of the things I notice is that [noun + 已学词] works better than [alternative].",
        defaultWords: ['cue', 'explanation', 'learner']
      },
      {
        id: 'teach-cause-3',
        frameId: 'cause_result',
        sentence: "Since kids lose focus after a few minutes, switching to a quick movement game brings their attention right back.",
        chunks: "Since kids lose focus / after a few minutes, / switching to a quick movement game / brings their attention right back.",
        skeleton: "Since [___ lose ___], / [switching to ___] / brings [___] right back.",
        swapTemplate: "Since [reason], [action + 已学词] brings [positive result].",
        defaultWords: ['focus', 'attention', 'switch']
      }
    ]
  },
  {
    id: 'city_living',
    label: '城市与生活',
    drills: [
      {
        id: 'city-contrast-1',
        frameId: 'contrast',
        sentence: "While big cities offer endless convenience, quieter towns give you the breathing room to hear yourself think.",
        chunks: "While big cities offer endless convenience, / quieter towns give you / the breathing room / to hear yourself think.",
        skeleton: "While [___ offer ___], / [___ give you] / [the ___] / to [___].",
        swapTemplate: "While [place A], [place B + 已学词] gives you [benefit].",
        defaultWords: ['convenience', 'breathing room', 'quiet']
      },
      {
        id: 'city-which-2',
        frameId: 'which_comment',
        sentence: "Everything in my neighborhood is within walking distance, which is why I barely ever feel stressed about commuting.",
        chunks: "Everything in my neighborhood / is within walking distance, / which is why / I barely ever feel stressed about commuting.",
        skeleton: "Everything in [___] / is [___], / which is why / I barely ever [___].",
        swapTemplate: "[Fact about your area + 已学词], which is why I [personal habit].",
        defaultWords: ['neighborhood', 'commute', 'distance']
      },
      {
        id: 'city-cog-3',
        frameId: 'cognitive_comp',
        sentence: "I tend to think that a livable city depends more on friendly public spaces than on shiny skyscrapers.",
        chunks: "I tend to think / that a livable city / depends more on friendly public spaces / than on shiny skyscrapers.",
        skeleton: "I tend to think / that [___] / depends more on [___] / than on [___].",
        swapTemplate: "I tend to think that [topic] depends more on [已学词] than on [contrast].",
        defaultWords: ['livable', 'public space', 'depend']
      }
    ]
  },
  {
    id: 'travel_changes',
    label: '出行与变化',
    drills: [
      {
        id: 'travel-wh-1',
        frameId: 'wh_cleft',
        sentence: "What surprised me most about moving to a new place is how quickly small local habits start feeling familiar.",
        chunks: "What surprised me most / about moving to a new place / is how quickly / small local habits start feeling familiar.",
        skeleton: "What surprised me most / about [___] / is how quickly / [___] start feeling [___].",
        swapTemplate: "What surprised me most about [change] is how [已学词] ...",
        defaultWords: ['familiar', 'local', 'adapt']
      },
      {
        id: 'travel-concession-2',
        frameId: 'concession',
        sentence: "Even though long train journeys test your patience, watching the landscape shift outside the window clears my head.",
        chunks: "Even though long train journeys / test your patience, / watching the landscape shift / outside the window clears my head.",
        skeleton: "Even though [___] / test your [___], / [___] / clears my head.",
        swapTemplate: "Even though [travel hassle], [experience + 已学词] makes it worth it.",
        defaultWords: ['landscape', 'patience', 'shift']
      },
      {
        id: 'travel-rel-3',
        frameId: 'frame_relative',
        sentence: "The kind of trip that stays with me longest is one where I slow down and talk to local people.",
        chunks: "The kind of trip / that stays with me longest / is one where I slow down / and talk to local people.",
        skeleton: "The kind of [___] / that stays with me longest / is one where [___] / and [___].",
        swapTemplate: "The kind of [noun] that [verb + 已学词] is one where [detail].",
        defaultWords: ['slow down', 'local', 'memorable']
      }
    ]
  },
  {
    id: 'tech_habits',
    label: '科技与习惯',
    drills: [
      {
        id: 'tech-cond-1',
        frameId: 'conditional',
        sentence: "If you keep notifications turned on all day, you'll end up reacting to everyone else instead of doing real work.",
        chunks: "If you keep notifications turned on all day, / you'll end up reacting / to everyone else / instead of doing real work.",
        skeleton: "If you keep [___] all day, / you'll end up [___-ing] / instead of [___].",
        swapTemplate: "If you [tech habit + 已学词], you'll end up [result].",
        defaultWords: ['notification', 'react', 'distract']
      },
      {
        id: 'tech-which-2',
        frameId: 'which_comment',
        sentence: "Offline audio lets me review English while walking, which means I don't have to stare at a screen at night.",
        chunks: "Offline audio lets me review English / while walking, / which means / I don't have to stare at a screen at night.",
        skeleton: "[___] lets me [___] / while [___], / which means / I don't have to [___].",
        swapTemplate: "[Tool + 已学词] lets me [action], which means [benefit].",
        defaultWords: ['offline', 'review', 'screen']
      },
      {
        id: 'tech-cog-3',
        frameId: 'cognitive_comp',
        sentence: "It seems to me that AI tools help most when they cut out repetitive prep work rather than doing the thinking for you.",
        chunks: "It seems to me / that AI tools help most / when they cut out repetitive prep work / rather than doing the thinking for you.",
        skeleton: "It seems to me / that [___] help most / when they [___] / rather than [___].",
        swapTemplate: "It seems to me that [tech + 已学词] helps most when [condition].",
        defaultWords: ['repetitive', 'prep', 'tool']
      }
    ]
  },
  {
    id: 'health_energy',
    label: '精力与健康',
    drills: [
      {
        id: 'health-cause-1',
        frameId: 'cause_result',
        sentence: "Since bright morning sunlight resets my body clock, stepping outside right after waking gives me cleaner energy than coffee.",
        chunks: "Since bright morning sunlight / resets my body clock, / stepping outside right after waking / gives me cleaner energy than coffee.",
        skeleton: "Since [___] / resets [___], / [stepping ___] / gives me [___].",
        swapTemplate: "Since [health trigger + 已学词], [daily action] gives me [benefit].",
        defaultWords: ['sunlight', 'reset', 'steady']
      },
      {
        id: 'health-concession-2',
        frameId: 'concession',
        sentence: "Even though a ten-minute afternoon rest sounds tiny, closing my eyes without scrolling completely restores my focus.",
        chunks: "Even though a ten-minute afternoon rest / sounds tiny, / closing my eyes without scrolling / completely restores my focus.",
        skeleton: "Even though [___] / sounds [___], / [___] / completely restores my [___].",
        swapTemplate: "Even though [small habit] sounds tiny, [action + 已学词] restores my [state].",
        defaultWords: ['restore', 'focus', 'scroll']
      },
      {
        id: 'health-wh-3',
        frameId: 'wh_cleft',
        sentence: "What I've noticed is that protecting my sleep schedule makes every other habit fall into place naturally.",
        chunks: "What I've noticed / is that protecting my sleep schedule / makes every other habit / fall into place naturally.",
        skeleton: "What I've noticed / is that [protecting ___] / makes [___] / fall into place naturally.",
        swapTemplate: "What I've noticed is that [habit + 已学词] makes [outcome].",
        defaultWords: ['protect', 'schedule', 'naturally']
      }
    ]
  }
];

function cleanWordToken(raw) {
  const s = String(raw || '').trim().replace(/^[^A-Za-z]+|[^A-Za-z\-'\s]+$/g, '').trim();
  if (!s || s.length < 3 || s.length > 32) return '';
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(s)) return '';
  return s;
}

/**
 * Extract the user's real learned / recent / weak vocabulary words from YanDao state.
 * Prioritizes today's pack words, saved reading words, reviewed items, and FSRS cards.
 */
export function extractLearnedVocabPool(data = {}, maxCount = 24) {
  const seen = new Set();
  const pool = [];
  const pushWord = (rawWord, cue = '', source = 'learned', priority = 2) => {
    const word = cleanWordToken(rawWord);
    if (!word) return;
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pool.push({ word, cue: String(cue || '').trim().slice(0, 48), source, priority });
  };

  // 1. Today's dailyPack vocabulary_practice (highest relevance — actively learned today)
  const vp = data?.dailyPack?.vocabularyPractice || data?.dailyPack?.vocabulary_practice || [];
  if (Array.isArray(vp)) {
    for (const row of vp) {
      const target = row?.target || row?.word || row?.term;
      const cue = row?.cue || row?.meaning || row?.gloss || '';
      const isWeak = Boolean(row?.isReviewMistake || row?.is_review_mistake);
      pushWord(target, cue, isWeak ? '今日错词' : '今日新词', isWeak ? 0 : 1);
    }
  }

  // 2. Saved reading vocabulary marks
  if (Array.isArray(data?.readingMarks)) {
    for (const mark of data.readingMarks) {
      pushWord(mark?.word || mark?.text, mark?.note || '', '阅读生词', 1);
    }
  }

  // 3. Learned/attempted word items from item bank
  if (Array.isArray(data?.items)) {
    const sortedItems = [...data.items]
      .filter(it => it?.kind === 'word' && (it?.target || it?.word))
      .sort((a, b) => Number(b?.attempts || 0) - Number(a?.attempts || 0));
    for (const it of sortedItems) {
      pushWord(it.target || it.word, it.cue || '', it.attempts > 0 ? '已练词库' : '词库', it.attempts > 0 ? 1 : 2);
    }
  }

  // 4. Mastered vocab words
  if (Array.isArray(data?.masteredVocabWords)) {
    for (const w of data.masteredVocabWords) {
      pushWord(w, '', '已掌握词', 2);
    }
  }

  // 5. FSRS state keys (skip non-word IDs with colons/underscores)
  if (data?.fsrsState && typeof data.fsrsState === 'object') {
    for (const key of Object.keys(data.fsrsState)) {
      if (key.includes(':') || key.includes('_') || /\d/.test(key)) continue;
      pushWord(key, '', '记忆库', 3);
    }
  }

  pool.sort((a, b) => a.priority - b.priority);
  return pool.slice(0, Math.max(1, Number(maxCount) || 24));
}

export function getComplexFrameById(frameId) {
  return COMPLEX_FRAME_TYPES.find(f => f.id === frameId) || COMPLEX_FRAME_TYPES[0];
}

export function getComplexTopicById(topicId) {
  return COMPLEX_IMITATION_TOPICS.find(t => t.id === topicId) || COMPLEX_IMITATION_TOPICS[0];
}

/**
 * Build a linked complex sentence drill combining the chosen topic, model sentence,
 * grammar frame metadata, and 2-3 of the user's real learned words.
 */
export function buildLinkedComplexDrill({ topicId = 'work_routine', drillIndex = 0, learnedWords = [], customDrill = null } = {}) {
  const topic = getComplexTopicById(topicId);
  const safeIdx = topic.drills.length ? ((Number(drillIndex) % topic.drills.length) + topic.drills.length) % topic.drills.length : 0;
  const drill = customDrill && customDrill.sentence ? customDrill : topic.drills[safeIdx];
  const frame = getComplexFrameById(drill.frameId);

  const normalizedPool = (Array.isArray(learnedWords) ? learnedWords : [])
    .map(item => typeof item === 'string' ? { word: cleanWordToken(item), cue: '', source: '已学词' } : item)
    .filter(item => item && item.word);

  const sentenceLower = String(drill.sentence || '').toLowerCase();
  const matchedInSentence = normalizedPool.filter(item => {
    const escaped = item.word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(sentenceLower);
  });

  // Pick up to 3 linked words: prioritize matched words, then rotate deterministically from learned pool
  const linkedWords = [];
  const added = new Set();
  for (const m of matchedInSentence) {
    if (linkedWords.length >= 3) break;
    const k = m.word.toLowerCase();
    if (!added.has(k)) { added.add(k); linkedWords.push({ ...m, inModel: true }); }
  }
  if (normalizedPool.length > 0 && linkedWords.length < 3) {
    const offset = (safeIdx * 2) % normalizedPool.length;
    for (let i = 0; i < normalizedPool.length && linkedWords.length < 3; i++) {
      const candidate = normalizedPool[(offset + i) % normalizedPool.length];
      const k = candidate.word.toLowerCase();
      if (!added.has(k)) { added.add(k); linkedWords.push({ ...candidate, inModel: false }); }
    }
  }
  if (linkedWords.length === 0 && Array.isArray(drill.defaultWords)) {
    for (const w of drill.defaultWords.slice(0, 3)) {
      linkedWords.push({ word: w, cue: '', source: '本句核心词', inModel: true });
    }
  }

  const swapWords = linkedWords.slice(0, 2).map(w => w.word);
  const stage3Prompt = swapWords.length
    ? `保留「${frame.label}」骨架（${frame.pattern}），把 ${swapWords.map(w => `「${w}」`).join(' + ')} 换进你关于「${topic.label}」的真实句子里并录音。`
    : `保留「${frame.label}」骨架（${frame.pattern}），围绕「${topic.label}」自己造一句口语复杂句并录音。`;

  return {
    topic,
    drill,
    frame,
    drillIndex: safeIdx,
    totalInTopic: topic.drills.length,
    linkedWords,
    matchedInSentence,
    stage3Prompt
  };
}

/**
 * Build a concise prompt for AI Tutor to generate a fresh Band 7.5+ spoken complex sentence
 * combining the user's chosen topic, grammar frame, and real learned vocabulary.
 */
export function buildAiComplexSentencePrompt({ topicLabel, frame, learnedWords = [] } = {}) {
  const words = (Array.isArray(learnedWords) ? learnedWords : [])
    .map(w => (typeof w === 'string' ? w : w?.word))
    .filter(Boolean)
    .slice(0, 2);
  const wordRule = words.length
    ? `Naturally weave in these learned words: ${words.join(', ')}.`
    : 'Use natural everyday Band 7.5+ vocabulary.';
  return [
    `Create ONE natural spoken IELTS Band 7.5+ complex sentence (15–22 words, conversational cadence, NOT stiff essay prose).`,
    `Topic: ${topicLabel || 'Daily life'}.`,
    `Grammar frame: ${frame?.pattern || 'Even though ..., ...'}.`,
    wordRule,
    `Output EXACTLY 3 lines in English with these exact prefixes (no extra commentary):`,
    `SENTENCE: <the full spoken sentence>`,
    `CHUNKS: <the same sentence split into 3-4 natural thought groups with " / ">`,
    `SKELETON: <the same sentence keeping the grammar frame and replacing content phrases with [___]>`
  ].join('\n');
}

/**
 * Parse AI Tutor output into a structured custom drill object.
 */
export function parseAiComplexSentenceResponse(rawText, { topicId = 'work_routine', frameId = 'wh_cleft', linkedWords = [] } = {}) {
  const text = String(rawText || '').trim();
  if (!text) return null;
  const pickLine = (prefix) => {
    const m = text.match(new RegExp(`^${prefix}\\s*:\\s*(.+)$`, 'im'));
    return m ? m[1].trim().replace(/^["'“”]+|["'“”]+$/g, '') : '';
  };
  let sentence = pickLine('SENTENCE');
  let chunks = pickLine('CHUNKS');
  let skeleton = pickLine('SKELETON');

  if (!sentence) {
    // Graceful fallback: take first clean English sentence line
    const lines = text.split(/\n+/).map(l => l.trim()).filter(l => /[A-Za-z]{3,}/.test(l));
    sentence = (lines[0] || '').replace(/^[-*•\d.)\s]+/, '').trim();
  }
  if (!sentence) return null;
  if (!chunks) {
    // Insert thought-group slashes at punctuation or midpoint
    chunks = sentence.replace(/,\s+/g, ', / ');
    if (!chunks.includes('/')) {
      const words = sentence.split(/\s+/);
      if (words.length >= 8) {
        const mid = Math.floor(words.length / 2);
        chunks = `${words.slice(0, mid).join(' ')} / ${words.slice(mid).join(' ')}`;
      } else {
        chunks = sentence;
      }
    }
  }
  if (!skeleton) {
    const frame = getComplexFrameById(frameId);
    skeleton = `${frame.pattern.replace(/\.\.\./g, '[___]')}`;
  }
  const defaultWords = (Array.isArray(linkedWords) ? linkedWords : [])
    .map(w => (typeof w === 'string' ? w : w?.word))
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: `ai-complex-${topicId}-${Date.now()}`,
    topicId,
    frameId,
    sentence,
    chunks,
    skeleton,
    swapTemplate: `${getComplexFrameById(frameId).pattern} (+ 已学词)`,
    defaultWords,
    isAiGenerated: true
  };
}
