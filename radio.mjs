/**
 * Pocket Immersion Radio Engine (15.3.0)
 * Turns built-in YouTube motivational speeches, NotebookLM spoken phrases & dialogues,
 * and the learner's active daily pack / local history into a hands-free, lock-screen
 * friendly English audio stream with:
 * - Gemini TTS priority + single unlocked <audio> channel + next-track prefetch
 * - Exact single-segment Kokoro `af_heart` MP3 offline fallback (`segments: string[]`)
 * - Watchdog-protected speechSynthesis fallback (prevents iOS Safari track-3 stalls)
 * - 4 streamlined channels: Weak Sniper, YouTube Motivational Speeches,
 *   Sentences & Listening, and Notebook Spoken Phrases & Dialogues
 * - Independent playback speed toggle (0.8x bedtime slow / 0.9x standard / 1.0x normal)
 * - Scope selector (`today` vs `all` history), stop-after-round, shuffle, shadowing pause & sleep timer
 *
 * CRITICAL INTEGRITY RULE:
 * Passive radio listening is tracked strictly as audio exposure (`exposureOnly: true`)
 * and NEVER counts as K or independent retrieval mastery.
 */

const cleanRad = value => String(value ?? '').replace(/\r/g, '').trim();

export const RADIO_CHANNELS = Object.freeze([
  { id: 'weak_sniper', label: '🎯 错词与难词狙击', desc: '优先连播今日错选词、N/V 弱词与易混对比句' },
  { id: 'youtube_speeches', label: '🎬 YouTube 励志演讲', desc: '精选 YouTube 经典励志演讲原声字幕分段，用 Gemini 语音流畅连播' },
  { id: 'sentences_listening', label: '🎧 句子与听力精磨', desc: '专攻完整英文句子与听力语段，适合影子跟读' },
  { id: 'notebook_spoken', label: '📓 Notebook 口语与对话', desc: '内置美音连读短语、词根高频口语与地道长对话，随时可找 Gemini 更新曲库' }
]);

export const RADIO_SPEED_PRESETS = Object.freeze([
  { rate: 0.8, label: '🐢 语速：0.8× 睡前慢速' },
  { rate: 0.9, label: '🎧 语速：0.9× 清晰标准' },
  { rate: 1.0, label: '⚡ 语速：1.0× 原速常听' }
]);

/**
 * Curated YouTube Motivational Speech library (transcript-grounded, public sources).
 * Update this array anytime to refresh the learner's built-in YouTube Walkman feed.
 */
export const BUILT_IN_YOUTUBE_SPEECHES = Object.freeze([
  // Admiral William H. McRaven — UT Austin 2014 Commencement ("Make Your Bed")
  {
    id: 'yt:mcraven:01',
    badge: 'YouTube 励志 · McRaven',
    title: 'Make Your Bed Every Morning',
    text: 'If you make your bed every morning, you will have accomplished the first task of the day. It will give you a small sense of pride, and it will encourage you to do another task, and another, and another.',
    subtext: '每天早上叠好被子，完成当天第一件事，小成就感会带动一整天的正向连锁反应 · UT Austin 2014',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:02',
    badge: 'YouTube 励志 · McRaven',
    title: 'The Little Things in Life Matter',
    text: 'Making your bed will also reinforce the fact that the little things in life matter. If you cannot do the little things right, you will never be able to do the big things right.',
    subtext: '把小事做好，才有能力把大事做好；哪怕度过糟糕的一天，回家还有一张自己叠好的床给你明日的希望',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:03',
    badge: 'YouTube 励志 · McRaven',
    title: 'Find Someone to Help You Paddle',
    text: 'You cannot change the world alone. You will need some help. To truly get from your starting point to your destination takes friends, colleagues, the goodwill of strangers, and a strong coxswain to guide you.',
    subtext: '你无法独自改变世界，去找到愿意和你一起划桨的同伴与引路人',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:04',
    badge: 'YouTube 励志 · McRaven',
    title: 'Measure a Person by the Size of Their Heart',
    text: 'Nothing mattered but your will to succeed—not your color, not your ethnic background, not your education, not your social status. If you want to change the world, measure a person by the size of their heart, not by the size of their flippers.',
    subtext: '衡量一个人的不是出身或外表，而是内心的格局与成功的意志',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:05',
    badge: 'YouTube 励志 · McRaven',
    title: 'Get Over Being a Sugar Cookie',
    text: 'Sometimes, no matter how well you prepare or how well you perform, you still end up as a sugar cookie. It is just the way life is sometimes. If you want to change the world, get over being a sugar cookie and keep moving forward.',
    subtext: '生活有时就是不公平，哪怕准备充分仍会受挫——别停在委屈里，继续往前走',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:06',
    badge: 'YouTube 励志 · McRaven',
    title: 'Do Not Be Afraid of the Circuses',
    text: 'Life is filled with circuses. You will fail. You will likely fail often. It will be painful and discouraging, and at times it will test you to your very core. Over time, the pain builds inner strength and physical resiliency.',
    subtext: '把每一次“加练与失败”当成锻造内心韧性的熔炉，不要害怕挫折',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:07',
    badge: 'YouTube 励志 · McRaven',
    title: 'Be Your Very Best in the Darkest Moments',
    text: 'Every SEAL knows that under the keel, at that darkest moment of the mission, is a time when you must be calm and composed—when all your tactical skills, your physical power, and your inner strength must be brought to bear.',
    subtext: '在最黑暗、最容易迷失方向的时刻，恰恰需要你保持冷静、拿出最好的状态',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:08',
    badge: 'YouTube 励志 · McRaven',
    title: 'Start Singing When You Are Up to Your Neck in Mud',
    text: 'One voice began to echo through the night, raised in song. One voice became two, and before long everyone was singing. Somehow the mud seemed a little warmer, the wind a little tamer, and the dawn not so far away.',
    subtext: '身陷泥潭时唱起歌，一个人点燃的希望可以照亮整片黑夜，黎明就不远了',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  {
    id: 'yt:mcraven:09',
    badge: 'YouTube 励志 · McRaven',
    title: 'Never, Ever Ring the Bell',
    text: 'All you have to do to quit is ring the bell. Ring the bell and you no longer have to wake up at five or endure the hardships of training. If you want to change the world, do not ever, ever ring the bell.',
    subtext: '放弃只需摇一下铃，但如果你想改变人生，永远不要按下放弃键',
    sourceUrl: 'https://www.youtube.com/watch?v=yaQZFhrW0fU'
  },
  // Denzel Washington — "Fall Forward" Motivational Speech
  {
    id: 'yt:denzel:01',
    badge: 'YouTube 励志 · Denzel',
    title: 'There Is No Passion in Playing Small',
    text: 'I found that nothing in life is worthwhile unless you take risks. Nelson Mandela said there is no passion to be found playing small, in settling for a life that is less than the one you are capable of living.',
    subtext: '人生中值得拥有的一切都需要敢于冒险；安于平庸、将就度日永远找不到真正的激情',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:02',
    badge: 'YouTube 励志 · Denzel',
    title: 'Fall Forward, Not Fall Back',
    text: 'People tell you to make sure you have something to fall back on. But I never understood that concept. If I am going to fall, I do not want to fall back on anything—I want to fall forward. At least this way I will see what I am going to hit.',
    subtext: '不要总想着退路，就算跌倒也要向前倒，至少你能看清前方要去的地方',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:03',
    badge: 'YouTube 励志 · Denzel',
    title: 'Dreams Without Goals Are Just Dreams',
    text: 'Without consistency, you will never finish. So do what you feel passionate about, take chances, and do not be afraid to think outside the box. Dream big, but remember: dreams without goals are just dreams.',
    subtext: '没有持续行动就永远到不了终点；没有具体目标的梦想只是空想',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:04',
    badge: 'YouTube 励志 · Denzel',
    title: 'Every Failed Experiment Is One Step Closer',
    text: 'Reggie Jackson struck out twenty-six hundred times in his career, but people remember the home runs. Thomas Edison conducted one thousand failed experiments, because the one thousand and first was the light bulb. Every failed experiment is one step closer to success.',
    subtext: '人们记住的是全垒打和第 1001 次点亮的灯泡——每一次失败都让你离成功更近一步',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:05',
    badge: 'YouTube 励志 · Denzel',
    title: 'Hang Around the Barbershop Long Enough',
    text: 'I did not quit. I walked out of there to prepare for the next audition, and the next audition. There is an old saying: you hang around the barbershop long enough, sooner or later you are going to get a haircut. So you will catch a break.',
    subtext: '只要一直在场、持续打磨，迟早会迎来属于你的突破时刻（catch a break）',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:06',
    badge: 'YouTube 励志 · Denzel',
    title: 'If You Do Not Fail, You Are Not Even Trying',
    text: 'Every graduate here today has the training and the talent to succeed, but do you have the guts to fail? If you do not fail, you are not even trying. To get something you never had, you have to do something you never did.',
    subtext: '从不失败说明你根本没真正尝试；想得到从未拥有的，就要做从未做过的事',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  },
  {
    id: 'yt:denzel:07',
    badge: 'YouTube 励志 · Denzel',
    title: 'Never Hold Back, Give Everything You Got',
    text: 'Taking risks is not just about going for a job. It is about being open to people and to ideas. Never be discouraged, never hold back, give everything you got, and when you fall throughout life, remember this: fall forward.',
    subtext: '永远不要气馁，不要保留实力，全力以赴，跌倒时永远向前跌',
    sourceUrl: 'https://www.youtube.com/watch?v=tbnzAVRZ9Xc'
  }
]);

/**
 * Curated NotebookLM Spoken English Phrases, Pronunciation Drills & Long Dialogue.
 * Grounded in the learner's English notebooks (Dropped D, Everyday Fluency, Grad/Gress Roots, Natural Dialogue).
 */
export const BUILT_IN_NOTEBOOK_SPOKEN = Object.freeze([
  // 1. Silent Consonants — Dropped D in American English (N + D + Consonant)
  {
    id: 'nb:dropped-d:01',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: friendship & my friend was',
    text: 'In natural American English, we drop the D between N and another consonant for smoothness. Listen closely: friendship, friendly, and my friend was there last week.',
    subtext: 'N + D + 辅音省掉 D 音（friennnship / my frien-was），但接元音时保留 D（my friend is here）',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  {
    id: 'nb:dropped-d:02',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: errands & all kinds of problems',
    text: 'Whew, I have a lot of errands to run today. And honestly, there are all kinds of problems we need to sort out before Friday.',
    subtext: '高频地道口语：have errands to run（有很多杂事要办）/ all kinds of problems（各种问题），errands 与 kinds 省读 D',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  {
    id: 'nb:dropped-d:03',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: around nine & found my phone',
    text: 'Let us meet around nine o-clock, or maybe around one. Hold on—I finally found my phone right behind the sofa.',
    subtext: '连读实战：around nine / around one（one 发 /w/ 辅音故省 D）/ found my phone / behind the',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  {
    id: 'nb:dropped-d:04',
    badge: 'Notebook 口语 · 美音连读',
    title: 'Dropped D: second time & second-hand',
    text: 'This is my second time visiting this city, and I love browsing local markets. I often buy second-hand books because they are still in great condition.',
    subtext: '高频口语：second time / second-hand（二手）/ in great condition（品相很好），second 后接辅音省读 D',
    sourceUrl: 'https://www.youtube.com/watch?v=cztw76aM-18'
  },
  // 2. Everyday Fluency Spoken Collocations
  {
    id: 'nb:fluency:01',
    badge: 'Notebook 口语 · 日常高频',
    title: 'insignificant amount & casual conversation',
    text: 'Do not stress over an insignificant amount of delay. When we have casual conversations with friends, sounding relaxed matters much more than using fancy words.',
    subtext: '实用搭配：an insignificant amount（微不足道的量）/ casual conversation（日常闲聊）/ fancy words（花哨词汇）',
    sourceUrl: 'https://www.youtube.com/watch?v=7P-R0Z5zXig'
  },
  {
    id: 'nb:fluency:02',
    badge: 'Notebook 口语 · 日常高频',
    title: 'breathe deeply & take a deep breath',
    text: 'Whenever you feel nervous before an interview or a demo class, pause for two seconds, take a deep breath, and breathe deeply before you start speaking.',
    subtext: '区分动词 breathe（/briːð/）与名词 breath（/breθ/）：面试或试讲紧张前先深呼吸',
    sourceUrl: 'https://www.youtube.com/watch?v=7P-R0Z5zXig'
  },
  // 3. Grad / Gress Etymology in Spoken Sentences
  {
    id: 'nb:etymology:01',
    badge: 'Notebook 口语 · 词根造句',
    title: 'progress vs. regress (-gress- = to step)',
    text: 'Even slow progress is still a step forward. You only regress when you stop showing up and let small habits slip away.',
    subtext: 'pro-（向前）+ -gress-（走）= progress 进步；re-（向后）+ -gress- = regress 退步；show up 坚持到场',
    sourceUrl: ''
  },
  {
    id: 'nb:etymology:02',
    badge: 'Notebook 口语 · 词根造句',
    title: 'aggressive & transgress in context',
    text: 'Setting an overly aggressive schedule often backfires. Instead of pushing so hard that you burn out, build a steady rhythm you can actually maintain.',
    subtext: 'aggressive schedule（过于激进的计划）/ backfire（适得其反）/ burn out（精疲力竭）',
    sourceUrl: ''
  },
  // 4. Long Natural Spoken Dialogue (Multi-Turn Everyday Fluency)
  {
    id: 'nb:dialogue:01',
    badge: 'Notebook 长对话 · 1/5',
    title: 'Long Dialogue: Keeping Momentum (Part 1)',
    text: 'Alex: Hey, you look way more energized today. Did something good happen? Sam: Honestly, nothing huge—I just decided to stop overthinking my whole plan and focus on one small win each morning.',
    subtext: '长对话磨耳朵（保持节奏）：look energized（看起来精力充沛）/ stop overthinking（别再过度内耗）/ one small win',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:02',
    badge: 'Notebook 长对话 · 2/5',
    title: 'Long Dialogue: Keeping Momentum (Part 2)',
    text: 'Alex: That actually makes a lot of sense. Whenever I try to overhaul my entire routine overnight, I stick with it for three days and then completely fall off.',
    subtext: '地道口语：overhaul my routine（彻底大改作息）/ stick with it（坚持下去）/ fall off（半途而废）',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:03',
    badge: 'Notebook 长对话 · 3/5',
    title: 'Long Dialogue: Keeping Momentum (Part 3)',
    text: 'Sam: Exactly. I realized that consistency beats intensity every single time. Even twenty minutes of focused listening while walking adds up faster than you think.',
    subtext: '金句口语：consistency beats intensity（持续胜过猛冲）/ adds up faster than you think（积少成多比你想象的快）',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:04',
    badge: 'Notebook 长对话 · 4/5',
    title: 'Long Dialogue: Keeping Momentum (Part 4)',
    text: 'Alex: How do you deal with those days when you feel completely drained and just want to scroll on your phone? Sam: I give myself permission to scale it down—just five minutes counts, as long as I do not break the chain.',
    subtext: '地道表达：feel completely drained（彻底电量耗尽）/ scale it down（降量保底）/ do not break the chain（不断链）',
    sourceUrl: ''
  },
  {
    id: 'nb:dialogue:05',
    badge: 'Notebook 长对话 · 5/5',
    title: 'Long Dialogue: Keeping Momentum (Part 5)',
    text: 'Alex: I love that mindset. Keep the bar low enough to start, and high enough to grow. Sam: Right? Show up every day, follow through on the basics, and sooner or later you will catch a break.',
    subtext: '收尾金句：keep the bar low enough to start（门槛低到能启动）/ follow through（坚持到底）/ catch a break（迎来转机）',
    sourceUrl: ''
  }
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
 * Computes a safe watchdog timeout (ms) for any audio or Web Speech segment
 * so iOS Safari can never stall indefinitely if `onended` / `onend` is dropped.
 */
export function computeSegmentWatchdogMs(text = '', rate = 0.9) {
  const words = (cleanRad(text).match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
  const safeRate = Math.max(0.5, Math.min(1.5, Number(rate) || 0.9));
  const estimatedMs = Math.round((words * 650) / safeRate);
  const ceiling = words > 120 ? 600000 : 45000;
  return Math.min(ceiling, Math.max(12000, estimatedMs + 8000));
}

/**
 * Builds a deterministic, deduplicated playlist of playable audio tracks.
 * Each track carries `segments` matching the exact unit strings hashed by
 * `audio-tasks.mjs` (`target`, `example`, sentence text) so offline Kokoro
 * `af_heart` MP3 clips match with 100% precision, while YouTube & Notebook
 * tracks stream smoothly via Gemini TTS.
 */
export function buildRadioPlaylist({
  channel = 'youtube_speeches',
  scope = 'all',
  activePackId = '',
  shuffle = false,
  items = [],
  vocabularyPractice = [],
  vocabularyAttempts = [],
  speeches = [],
  customYoutubeTracks = [],
  customNotebookTracks = []
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
      sourceUrl: cleanRad(track.sourceUrl || ''),
      priority: Number(track.priority || 10),
      exposureOnly: true
    });
  };

  // Channel: YouTube Motivational Speeches (built-in + optional custom/imported speeches)
  if (channel === 'youtube_speeches') {
    const ytList = [...BUILT_IN_YOUTUBE_SPEECHES, ...(Array.isArray(customYoutubeTracks) ? customYoutubeTracks : [])];
    ytList.forEach((entry, idx) => {
      pushTrack({
        id: entry.id || `radio:yt:${idx + 1}`,
        kind: 'youtube_speech',
        badge: entry.badge || 'YouTube 励志演讲',
        title: entry.title || `Speech Segment ${idx + 1}`,
        text: entry.text,
        segments: [entry.text],
        subtext: entry.subtext || '',
        sourceUrl: entry.sourceUrl || '',
        priority: idx + 1
      });
    });
    if (shuffle) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }
    return tracks;
  }

  // Channel: Notebook Spoken Phrases & Long Dialogues (built-in + optional custom tracks)
  if (channel === 'notebook_spoken') {
    const nbList = [...BUILT_IN_NOTEBOOK_SPOKEN, ...(Array.isArray(customNotebookTracks) ? customNotebookTracks : [])];
    nbList.forEach((entry, idx) => {
      pushTrack({
        id: entry.id || `radio:nb:${idx + 1}`,
        kind: 'notebook_spoken',
        badge: entry.badge || 'Notebook 口语',
        title: entry.title || `Spoken Clip ${idx + 1}`,
        text: entry.text,
        segments: [entry.text],
        subtext: entry.subtext || '',
        sourceUrl: entry.sourceUrl || '',
        priority: idx + 1
      });
    });
    if (shuffle) {
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }
    return tracks;
  }

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


/**
 * Bundles multiple radio tracks into compact long-form podcast episodes (<= maxChars each)
 * so an entire channel (e.g. all 16 YouTube speeches or all 13 Notebook clips) synthesizes
 * in ONE single Gemini TTS request (1 RPD) and caches permanently in IndexedDB.
 */
export function buildRadioPodcastEpisodes(tracks = [], { channel = '', maxChars = 3600 } = {}) {
  const list = Array.isArray(tracks) ? tracks.filter(t => t && cleanRad(t.text)) : [];
  if (!list.length) return [];
  const chMeta = RADIO_CHANNELS.find(c => c.id === channel);
  const chLabel = chMeta ? chMeta.label : '随身播客';
  const episodes = [];
  let bucket = [];
  let bucketText = '';

  const flush = () => {
    if (!bucket.length) return;
    const epNum = episodes.length + 1;
    const words = (bucketText.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
    const estimatedMinutes = Math.max(1, Math.round((words / 145) * 10) / 10);
    episodes.push({
      id: `podcast:${channel || 'mix'}:ep${epNum}`,
      badge: `🎙️ 整集播客 · 第 ${epNum} 集`,
      title: `${chLabel}（合集 ${bucket.length} 条 · 仅耗 1 次额度）`,
      text: bucketText.trim(),
      trackCount: bucket.length,
      estimatedMinutes,
      tracksIncluded: bucket.map(t => ({
        id: t.id,
        title: t.title,
        text: t.text,
        subtext: t.subtext || '',
        sourceUrl: t.sourceUrl || ''
      })),
      exposureOnly: true
    });
    bucket = [];
    bucketText = '';
  };

  for (const track of list) {
    const cleanBody = cleanRad(track.text);
    const piece = cleanBody.endsWith('.') || cleanBody.endsWith('!') || cleanBody.endsWith('?')
      ? cleanBody
      : `${cleanBody}.`;
    const candidate = bucketText ? `${bucketText}\n\n... ${piece}` : piece;
    if (bucket.length && candidate.length > maxChars) {
      flush();
      bucket.push(track);
      bucketText = piece;
    } else {
      bucket.push(track);
      bucketText = candidate;
    }
  }
  flush();
  return episodes;
}
