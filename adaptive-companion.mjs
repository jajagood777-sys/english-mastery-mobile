/**
 * YanDao Cultivation Palace — Adaptive Paper-Companion Lab (v20.5.0)
 * Schema-driven companion engine that lives directly inside the website (zero ZIP import needed)
 * with IPA-exact Kokoro audio, 5 evidence-based review modes (Bidirectional GPC Flash,
 * Word Chains, 4-Talker HVPT Minimal-Pair Listening, Cross-Day Error Bank + Connected Text,
 * Unscripted 60s Micro-Demo + A/B Recording), and unified Battle Report export.
 */

const D01_AUDIO = './assets/companion/phonics-d01';

export const PHONICS_DAY_01_MODULE = {
  id: 'phonics-day-01',
  homeLabel: '📄 伴学·拼读 Day 1',
  shortTitle: '自然拼读 Day 01',
  badge: 'PAPER COMPANION · PHONICS DAY 01',
  title: '自然拼读 Day 01 · 纸质伴学台',
  paperRef: '配套打印：04_Phonics_Day01-10_Expanded.docx · DAY 01 & PRACTICUM P01',
  subtitle: '直接内置在网站中，后续更新课程或复习无需导压缩包。含 59 条 Kokoro 精确音标与 4 音色 HVPT 音频 + 全套 5 合 1 复习模式。',
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
        { label: 'sat (/æ/)', speak: 'sat', note: 'short a /æ/', audioUrl: `${D01_AUDIO}/w-sat.mp3` },
        { label: 'sit (/ɪ/)', speak: 'sit', note: 'short i /ɪ/', audioUrl: `${D01_AUDIO}/w-sit.mp3` },
        { label: 'pan (/æ/)', speak: 'pan', note: 'short a /æ/', audioUrl: `${D01_AUDIO}/w-pan.mp3` },
        { label: 'pin (/ɪ/)', speak: 'pin', note: 'short i /ɪ/', audioUrl: `${D01_AUDIO}/w-pin.mp3` }
      ]
    },
    {
      id: 'd01-sounds',
      type: 'sound_board',
      sectionTag: 'SOUND BOARD · 8 TARGET SOUNDS',
      title: 'Tap-to-Hear Target Phonemes',
      instruction: 'Tap a tile to hear Kokoro IPA-exact pure phoneme + anchor words. Say only the pure consonant or short vowel sound aloud, then record yourself below.',
      recordPrompt: '依次读出这 8 个目标音素与锚点词（重点区分短 a /æ/ 与短 i /ɪ/），录完可直接回听。',
      tiles: [
        { id: 's-a', grapheme: 'a', ipa: '/æ/', kind: 'vowel', anchor: 'sat · map · pan', speak: 'sat', audioUrl: `${D01_AUDIO}/s-a.mp3`, tip: 'Open jaw slightly, flat short a /æ/' },
        { id: 's-i', grapheme: 'i', ipa: '/ɪ/', kind: 'vowel', anchor: 'sit · pin · dip', speak: 'sit', audioUrl: `${D01_AUDIO}/s-i.mp3`, tip: 'Short relaxed i /ɪ/, not long /iː/' },
        { id: 's-s', grapheme: 's', ipa: '/s/', kind: 'consonant', anchor: 'sat · sad', speak: 'sat', audioUrl: `${D01_AUDIO}/s-s.mp3`, tip: 'Continuous voiceless hiss' },
        { id: 's-t', grapheme: 't', ipa: '/t/', kind: 'consonant', anchor: 'tip · tap · sat', speak: 'tip', audioUrl: `${D01_AUDIO}/s-t.mp3`, tip: 'Crisp release, no extra /uh/' },
        { id: 's-p', grapheme: 'p', ipa: '/p/', kind: 'consonant', anchor: 'pin · pat · map', speak: 'pin', audioUrl: `${D01_AUDIO}/s-p.mp3`, tip: 'Quick air puff, no extra /uh/' },
        { id: 's-n', grapheme: 'n', ipa: '/n/', kind: 'consonant', anchor: 'nap · nip · pin', speak: 'nap', audioUrl: `${D01_AUDIO}/s-n.mp3`, tip: 'Tongue tip behind upper teeth' },
        { id: 's-m', grapheme: 'm', ipa: '/m/', kind: 'consonant', anchor: 'map · mat', speak: 'map', audioUrl: `${D01_AUDIO}/s-m.mp3`, tip: 'Lips closed, hum through nose' },
        { id: 's-d', grapheme: 'd', ipa: '/d/', kind: 'consonant', anchor: 'dip · mad · sad', speak: 'dip', audioUrl: `${D01_AUDIO}/s-d.mp3`, tip: 'Clear voiced release at end' }
      ]
    },
    {
      id: 'd01-blend',
      type: 'blend_stepper',
      sectionTag: 'PAPER SEC B · SEGMENT & BLEND',
      title: 'Guided Blending & 12 Syllabus Words',
      instruction: 'Follow "touch → sound → blend" with your printed sheet. Tap Slow (0.75×) or Normal to verify, then record your blending.',
      recordPrompt: '连续录下 5 个拆音拼合词（先逐音再连读）以及下方 12 个例词，方便我听你的尾音和 /æ/ 发音。',
      partAudioMap: {
        a: `${D01_AUDIO}/s-a.mp3`,
        i: `${D01_AUDIO}/s-i.mp3`,
        s: `${D01_AUDIO}/s-s.mp3`,
        t: `${D01_AUDIO}/s-t.mp3`,
        p: `${D01_AUDIO}/s-p.mp3`,
        n: `${D01_AUDIO}/s-n.mp3`,
        m: `${D01_AUDIO}/s-m.mp3`,
        d: `${D01_AUDIO}/s-d.mp3`
      },
      guided: [
        { id: 'b-sat', word: 'sat', parts: ['s', 'a', 't'], ipa: '/s/ + /æ/ + /t/', audioUrl: `${D01_AUDIO}/w-sat.mp3` },
        { id: 'b-pin', word: 'pin', parts: ['p', 'i', 'n'], ipa: '/p/ + /ɪ/ + /n/', audioUrl: `${D01_AUDIO}/w-pin.mp3` },
        { id: 'b-map', word: 'map', parts: ['m', 'a', 'p'], ipa: '/m/ + /æ/ + /p/', audioUrl: `${D01_AUDIO}/w-map.mp3` },
        { id: 'b-tin', word: 'tin', parts: ['t', 'i', 'n'], ipa: '/t/ + /ɪ/ + /n/', audioUrl: `${D01_AUDIO}/w-tin.mp3` },
        { id: 'b-nap', word: 'nap', parts: ['n', 'a', 'p'], ipa: '/n/ + /æ/ + /p/', audioUrl: `${D01_AUDIO}/w-nap.mp3` }
      ],
      wordList: ['sat', 'sit', 'pin', 'tip', 'tap', 'nap', 'map', 'mat', 'mad', 'sad', 'dip', 'tin'],
      wordAudioMap: {
        sat: `${D01_AUDIO}/w-sat.mp3`,
        sit: `${D01_AUDIO}/w-sit.mp3`,
        pin: `${D01_AUDIO}/w-pin.mp3`,
        tip: `${D01_AUDIO}/w-tip.mp3`,
        tap: `${D01_AUDIO}/w-tap.mp3`,
        nap: `${D01_AUDIO}/w-nap.mp3`,
        map: `${D01_AUDIO}/w-map.mp3`,
        mat: `${D01_AUDIO}/w-mat.mp3`,
        mad: `${D01_AUDIO}/w-mad.mp3`,
        sad: `${D01_AUDIO}/w-sad.mp3`,
        dip: `${D01_AUDIO}/w-dip.mp3`,
        tin: `${D01_AUDIO}/w-tin.mp3`
      }
    },
    {
      id: 'd01-unseen',
      type: 'unseen_decoder',
      sectionTag: 'PAPER SEC C · UNSEEN TRANSFER (10 ITEMS)',
      title: 'Pseudoword Decoding Check',
      instruction: 'Read each pseudoword on paper FIRST without guessing a real-word meaning. Then tap Listen (IPA-exact /æ/ & /ɪ/) to check and record your 10-item read-through below.',
      recordPrompt: '按顺序从 tas* 读到 tis*（共 10 个假词），重点听短 a /æ/（tas*, das*, dat*）有没有滑成 /ɑː/。',
      items: [
        { id: 'u-01', text: 'tas*', pattern: 'CVC (short a)', ipa: '/t/ /æ/ /s/', speak: 'tass', audioUrl: `${D01_AUDIO}/u-01.mp3` },
        { id: 'u-02', text: 'pam*', pattern: 'CVC (short a)', ipa: '/p/ /æ/ /m/', speak: 'pam', audioUrl: `${D01_AUDIO}/u-02.mp3` },
        { id: 'u-03', text: 'nat*', pattern: 'CVC (short a)', ipa: '/n/ /æ/ /t/', speak: 'nat', audioUrl: `${D01_AUDIO}/u-03.mp3` },
        { id: 'u-04', text: 'mip*', pattern: 'CVC (short i)', ipa: '/m/ /ɪ/ /p/', speak: 'mip', audioUrl: `${D01_AUDIO}/u-04.mp3` },
        { id: 'u-05', text: 'pis*', pattern: 'CVC (short i)', ipa: '/p/ /ɪ/ /s/', speak: 'piss', audioUrl: `${D01_AUDIO}/u-05.mp3` },
        { id: 'u-06', text: 'tam*', pattern: 'CVC (short a)', ipa: '/t/ /æ/ /m/', speak: 'tam', audioUrl: `${D01_AUDIO}/u-06.mp3` },
        { id: 'u-07', text: 'nim*', pattern: 'CVC (short i)', ipa: '/n/ /ɪ/ /m/', speak: 'nim', audioUrl: `${D01_AUDIO}/u-07.mp3` },
        { id: 'u-08', text: 'das*', pattern: 'CVC (short a)', ipa: '/d/ /æ/ /s/', speak: 'dass', audioUrl: `${D01_AUDIO}/u-08.mp3` },
        { id: 'u-09', text: 'dat*', pattern: 'CVC (short a)', ipa: '/d/ /æ/ /t/', speak: 'dat', audioUrl: `${D01_AUDIO}/u-09.mp3` },
        { id: 'u-10', text: 'tis*', pattern: 'CVC (short i)', ipa: '/t/ /ɪ/ /s/', speak: 'tiss', audioUrl: `${D01_AUDIO}/u-10.mp3` }
      ]
    },
    {
      id: 'd01-dictation',
      type: 'blind_dictation',
      sectionTag: 'PAPER SEC F · BLIND AUDIO DICTATION (5 WORDS)',
      title: 'Blind Listening & Spelling Test',
      instruction: 'Words stay hidden until you reveal them. Tap Play, write your answer on Paper Section F (or type below), then reveal to check.',
      words: [
        { id: 'dict-1', word: 'sat', hint: 'CVC · short a /æ/', audioUrl: `${D01_AUDIO}/w-sat.mp3` },
        { id: 'dict-2', word: 'pin', hint: 'CVC · short i /ɪ/', audioUrl: `${D01_AUDIO}/w-pin.mp3` },
        { id: 'dict-3', word: 'mat', hint: 'CVC · short a /æ/', audioUrl: `${D01_AUDIO}/w-mat.mp3` },
        { id: 'dict-4', word: 'dip', hint: 'CVC · short i /ɪ/', audioUrl: `${D01_AUDIO}/w-dip.mp3` },
        { id: 'dict-5', word: 'nap', hint: 'CVC · short a /æ/', audioUrl: `${D01_AUDIO}/w-nap.mp3` }
      ]
    },
    {
      id: 'd01-reading',
      type: 'reading_companion',
      sectionTag: 'PAPER SEC E · CONTROLLED READING',
      title: 'Sam and the Map',
      instruction: 'Tap any sentence to hear clean Kokoro pronunciation. Record your full passage read-aloud below for feedback.',
      recordPrompt: '整段朗读《Sam and the Map》，注意 Sam / Pam / map / mat / sat 的短 a /æ/ 与清脆尾音。',
      fullAudioUrl: `${D01_AUDIO}/r-full.mp3`,
      sentenceAudioUrls: [
        `${D01_AUDIO}/r-01.mp3`,
        `${D01_AUDIO}/r-02.mp3`,
        `${D01_AUDIO}/r-03.mp3`,
        `${D01_AUDIO}/r-04.mp3`,
        `${D01_AUDIO}/r-05.mp3`,
        `${D01_AUDIO}/r-06.mp3`,
        `${D01_AUDIO}/r-07.mp3`,
        `${D01_AUDIO}/r-08.mp3`,
        `${D01_AUDIO}/r-09.mp3`
      ],
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
      instruction: 'Rehearse with <=3 short English instructions. Record your 1-min micro-demo or P01 practicum below so I can critique pacing, clarity, and correction phrases.',
      recordPrompt: '录下你的 1 分钟 TPR 微试讲或 6:30 P01 完整演练，导出战报 ZIP 发我，我会逐条给教学与发音反馈。',
      teacherVoice: 'Point to M. Say /m/. Blend /m/ + /a/ + /p/. Now try a different target without my model.',
      teacherVoiceAudioUrl: `${D01_AUDIO}/tpr-voice.mp3`,
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
  ],
  reviewSuite: {
    gpcFlash: {
      title: '双向快闪 · Visual + Auditory Drill',
      tip: 'UFLI 每日热身标准：先看字秒读纯音（绝不拖 /uh/ 尾音），再盲听写拼立刻核对。',
      visualCards: [
        { id: 'vf-a', grapheme: 'a', ipa: '/æ/', anchor: 'sat · map', audioUrl: `${D01_AUDIO}/s-a.mp3`, caution: '压扁嘴角短促发 /æ/，别滑成“啊” /ɑː/' },
        { id: 'vf-i', grapheme: 'i', ipa: '/ɪ/', anchor: 'sit · pin', audioUrl: `${D01_AUDIO}/s-i.mp3`, caution: '短促放松 /ɪ/，别拉成长音 /iː/' },
        { id: 'vf-s', grapheme: 's', ipa: '/s/', anchor: 'sat · sad', audioUrl: `${D01_AUDIO}/s-s.mp3`, caution: '清辅音轻嘶，声带不震动' },
        { id: 'vf-t', grapheme: 't', ipa: '/t/', anchor: 'tip · tap', audioUrl: `${D01_AUDIO}/s-t.mp3`, caution: '干脆爆破，不要拖成 /tuh/' },
        { id: 'vf-p', grapheme: 'p', ipa: '/p/', anchor: 'pin · pat', audioUrl: `${D01_AUDIO}/s-p.mp3`, caution: '轻吐气流，不要拖成 /puh/' },
        { id: 'vf-n', grapheme: 'n', ipa: '/n/', anchor: 'nap · nip', audioUrl: `${D01_AUDIO}/s-n.mp3`, caution: '舌尖抵上齿龈鼻腔出声' },
        { id: 'vf-m', grapheme: 'm', ipa: '/m/', anchor: 'map · mat', audioUrl: `${D01_AUDIO}/s-m.mp3`, caution: '双唇紧闭轻哼，不张嘴' },
        { id: 'vf-d', grapheme: 'd', ipa: '/d/', anchor: 'dip · mad', audioUrl: `${D01_AUDIO}/s-d.mp3`, caution: '浊音干脆收尾，别拖 /duh/' }
      ],
      auditoryCards: [
        { id: 'af-1', answer: 'sat', ipa: '/sæt/', audioUrl: `${D01_AUDIO}/w-sat.mp3` },
        { id: 'af-2', answer: 'sit', ipa: '/sɪt/', audioUrl: `${D01_AUDIO}/w-sit.mp3` },
        { id: 'af-3', answer: 'pin', ipa: '/pɪn/', audioUrl: `${D01_AUDIO}/w-pin.mp3` },
        { id: 'af-4', answer: 'pan', ipa: '/pæn/', audioUrl: `${D01_AUDIO}/w-pan.mp3` },
        { id: 'af-5', answer: 'dip', ipa: '/dɪp/', audioUrl: `${D01_AUDIO}/w-dip.mp3` },
        { id: 'af-6', answer: 'mat', ipa: '/mæt/', audioUrl: `${D01_AUDIO}/w-mat.mp3` }
      ]
    },
    wordChains: {
      title: '词链变音 · Single-Sound Word Chains',
      tip: '每次只替换 1 个字母/音素，先看变化位再张口连读，强化跨规则拼合自动化。',
      chains: [
        {
          id: 'chain-1',
          name: 'Chain A · 短 a /æ/ 与短 i /ɪ/ 交替',
          steps: [
            { id: 'wc-1', word: 'sat', changedIdx: -1, note: '起点 CVC (/æ/)', audioUrl: `${D01_AUDIO}/w-sat.mp3` },
            { id: 'wc-2', word: 'sit', changedIdx: 1, note: 'a → i (/æ/ → /ɪ/)', audioUrl: `${D01_AUDIO}/w-sit.mp3` },
            { id: 'wc-3', word: 'sip', changedIdx: 2, note: 't → p (尾音切换)', audioUrl: `${D01_AUDIO}/w-sip.mp3` },
            { id: 'wc-4', word: 'tip', changedIdx: 0, note: 's → t (首音切换)', audioUrl: `${D01_AUDIO}/w-tip.mp3` },
            { id: 'wc-5', word: 'tap', changedIdx: 1, note: 'i → a (/ɪ/ → /æ/)', audioUrl: `${D01_AUDIO}/w-tap.mp3` },
            { id: 'wc-6', word: 'tan', changedIdx: 2, note: 'p → n (尾音切换)', audioUrl: `${D01_AUDIO}/w-tan.mp3` }
          ]
        },
        {
          id: 'chain-2',
          name: 'Chain B · 鼻音与塞音快速切换',
          steps: [
            { id: 'wc-7', word: 'tin', changedIdx: -1, note: '起点 CVC (/ɪ/)', audioUrl: `${D01_AUDIO}/w-tin.mp3` },
            { id: 'wc-8', word: 'pin', changedIdx: 0, note: 't → p', audioUrl: `${D01_AUDIO}/w-pin.mp3` },
            { id: 'wc-9', word: 'pit', changedIdx: 2, note: 'n → t', audioUrl: `${D01_AUDIO}/w-pit.mp3` },
            { id: 'wc-10', word: 'pat', changedIdx: 1, note: 'i → a (/ɪ/ → /æ/)', audioUrl: `${D01_AUDIO}/w-pat.mp3` },
            { id: 'wc-11', word: 'mat', changedIdx: 0, note: 'p → m', audioUrl: `${D01_AUDIO}/w-mat.mp3` },
            { id: 'wc-12', word: 'map', changedIdx: 2, note: 't → p', audioUrl: `${D01_AUDIO}/w-map.mp3` }
          ]
        }
      ]
    },
    hvptTrials: {
      title: '多音色混音辨音 · 4-Talker HVPT',
      articulatoryCue: '听前口型锚点：/æ/ 嘴角向两侧拉开压扁（sat/pan/tap/map）；/ɪ/ 短促放松（sit/pin/tip）；/ɑː/ 嘴巴竖着张大（sot/top/mop/pot）。',
      trials: [
        { id: 'hv-01', talker: '女声 A (Heart)', target: 'sat', targetIpa: '/sæt/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-01.mp3`, options: [{ word: 'sat', ipa: '/æ/' }, { word: 'sit', ipa: '/ɪ/' }, { word: 'sot', ipa: '/ɑː/' }] },
        { id: 'hv-02', talker: '男声 B (Puck)', target: 'sot', targetIpa: '/sɑt/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-02.mp3`, options: [{ word: 'sat', ipa: '/æ/' }, { word: 'sit', ipa: '/ɪ/' }, { word: 'sot', ipa: '/ɑː/' }] },
        { id: 'hv-03', talker: '女声 C (Nova)', target: 'sit', targetIpa: '/sɪt/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-03.mp3`, options: [{ word: 'sat', ipa: '/æ/' }, { word: 'sit', ipa: '/ɪ/' }, { word: 'sot', ipa: '/ɑː/' }] },
        { id: 'hv-04', talker: '女声 D (Jessica)', target: 'pan', targetIpa: '/pæn/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-04.mp3`, options: [{ word: 'pan', ipa: '/æ/' }, { word: 'pin', ipa: '/ɪ/' }] },
        { id: 'hv-05', talker: '男声 B (Puck)', target: 'pin', targetIpa: '/pɪn/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-05.mp3`, options: [{ word: 'pan', ipa: '/æ/' }, { word: 'pin', ipa: '/ɪ/' }] },
        { id: 'hv-06', talker: '女声 A (Heart)', target: 'tap', targetIpa: '/tæp/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-06.mp3`, options: [{ word: 'tap', ipa: '/æ/' }, { word: 'tip', ipa: '/ɪ/' }, { word: 'top', ipa: '/ɑː/' }] },
        { id: 'hv-07', talker: '女声 C (Nova)', target: 'top', targetIpa: '/tɑp/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-07.mp3`, options: [{ word: 'tap', ipa: '/æ/' }, { word: 'tip', ipa: '/ɪ/' }, { word: 'top', ipa: '/ɑː/' }] },
        { id: 'hv-08', talker: '男声 B (Puck)', target: 'tip', targetIpa: '/tɪp/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-08.mp3`, options: [{ word: 'tap', ipa: '/æ/' }, { word: 'tip', ipa: '/ɪ/' }, { word: 'top', ipa: '/ɑː/' }] },
        { id: 'hv-09', talker: '女声 D (Jessica)', target: 'map', targetIpa: '/mæp/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-09.mp3`, options: [{ word: 'map', ipa: '/æ/' }, { word: 'mop', ipa: '/ɑː/' }] },
        { id: 'hv-10', talker: '女声 A (Heart)', target: 'mop', targetIpa: '/mɑp/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-10.mp3`, options: [{ word: 'map', ipa: '/æ/' }, { word: 'mop', ipa: '/ɑː/' }] },
        { id: 'hv-11', talker: '男声 B (Puck)', target: 'pat', targetIpa: '/pæt/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-11.mp3`, options: [{ word: 'pat', ipa: '/æ/' }, { word: 'pit', ipa: '/ɪ/' }, { word: 'pot', ipa: '/ɑː/' }] },
        { id: 'hv-12', talker: '女声 C (Nova)', target: 'pot', targetIpa: '/pɑt/', audioUrl: `${D01_AUDIO}/hvpt/hvpt-12.mp3`, options: [{ word: 'pat', ipa: '/æ/' }, { word: 'pit', ipa: '/ɪ/' }, { word: 'pot', ipa: '/ɑː/' }] }
      ]
    },
    connectedCheck: {
      title: '错题池清零 + 控词短句抽查',
      tip: '所有练错/标不稳的项自动进错题池，需连续 2 次读准/拼对才清零；下方附 3 句控词短句检验真实句子迁移。',
      sentences: [
        { text: 'Sam has a map.', audioUrl: `${D01_AUDIO}/r-01.mp3` },
        { text: 'Pam sat on a mat.', audioUrl: `${D01_AUDIO}/r-02.mp3` },
        { text: 'Tim sits and pats the mat.', audioUrl: `${D01_AUDIO}/r-06.mp3` }
      ]
    },
    microDemos: {
      title: '脱稿 60 秒微试讲抽签 + A/B 录音对照',
      tip: '不看稿随机抽 1 个教学点录 60 秒，回听只抓 1 个毛病重录，再点「连起来听」做 A/B 对比。',
      correctionProtocol: '不羞辱纠错反射：先停顿提示自修（"Listen to the middle sound, try again."）→ 不行再轻声示范目标词 → 让学生重读整词/整句。',
      prompts: [
        { id: 'md-1', title: '区分字母名 A vs. 短元音 /æ/', goal: '用 ≤3 句短指令示范：不读字母名 "ey"，直接发 /æ/ 并带出手势，最后用 1 个新词（如 nap）验收。' },
        { id: 'md-2', title: '纠正塞音拖“额”音（/puh/ → /p/）', goal: '演示如何让初学者干脆发 /p/ 和 /t/，拼合 pin / tip 时不出现多余元音，并示范一次不羞辱纠错。' },
        { id: 'md-3', title: '短 a /æ/ 与短 i /ɪ/ 最小对立带练', goal: '用 sat / sit 或 pan / pin 做听辨→跟读→手势切换，60 秒内完成“示范 + 1 次独立迁移检验”。' },
        { id: 'md-4', title: '假词迁移检验（tas* / mip*）', goal: '说明为什么用假词防背诵，带练 1 个假词拆音拼合，并做一次先提示自修、再轻声示范的纠错演练。' }
      ]
    }
  }
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
    blocks,
    reviewSuite: raw.reviewSuite && typeof raw.reviewSuite === 'object' ? raw.reviewSuite : null
  };
}

/**
 * Collect all available companion modules:
 * 1) Built-in modules (website-native, zero-ZIP updates)
 * 2) Daily pack embedded companion_lab / adaptive_companion (if present)
 * 3) User-imported custom modules in data.companionState.customModules
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
 * Upsert a missed item into a module's cross-day Error Bank (resets consecutive pass streak to 0).
 */
export function upsertCompanionErrorBank(prog, item) {
  if (!prog || typeof prog !== 'object' || !item?.id) return null;
  if (!prog.errorBank || typeof prog.errorBank !== 'object') prog.errorBank = {};
  const key = String(item.id);
  const prev = prog.errorBank[key] || { id: key, misses: 0, streak: 0, cleared: false };
  prog.errorBank[key] = {
    id: key,
    label: String(item.label || prev.label || key),
    ipa: String(item.ipa || prev.ipa || ''),
    audioUrl: String(item.audioUrl || prev.audioUrl || ''),
    source: String(item.source || prev.source || 'review'),
    misses: Number(prev.misses || 0) + 1,
    streak: 0,
    cleared: false,
    updatedAt: new Date().toISOString()
  };
  return prog.errorBank[key];
}

/**
 * Record a clean pass on an Error Bank item (clears once streak >= 2, following Star Words rule).
 */
export function recordCompanionErrorPass(prog, key, requiredStreak = 2) {
  if (!prog?.errorBank?.[key]) return null;
  const entry = prog.errorBank[key];
  entry.streak = Number(entry.streak || 0) + 1;
  entry.cleared = entry.streak >= requiredStreak;
  entry.updatedAt = new Date().toISOString();
  return entry;
}

/**
 * List active (uncleared) and cleared Error Bank items for a module progress object.
 */
export function collectCompanionErrorBank(prog) {
  const bank = prog?.errorBank && typeof prog.errorBank === 'object' ? Object.values(prog.errorBank) : [];
  return {
    open: bank.filter(x => x && !x.cleared),
    cleared: bank.filter(x => x && x.cleared)
  };
}

/**
 * Summarize companion progress (Study + all 5 Review Modes) for UI badge & unified Battle Report export.
 */
export function summarizeCompanionEvidence(data = {}) {
  const st = data?.companionState && typeof data.companionState === 'object' ? data.companionState : {};
  const active = resolveActiveCompanionModule(data);
  const progressMap = st.progress && typeof st.progress === 'object' ? st.progress : {};
  const modulesSummary = Object.entries(progressMap).map(([modId, p]) => {
    const doneIds = Array.isArray(p?.doneIds) ? [...new Set(p.doneIds)] : [];
    const unseen = p?.unseenMarks && typeof p.unseenMarks === 'object' ? p.unseenMarks : {};
    const dict = p?.dictationResults && typeof p.dictationResults === 'object' ? p.dictationResults : {};
    const recMap = p?.recordingIds && typeof p.recordingIds === 'object' ? p.recordingIds : {};
    const recCount = Object.values(recMap).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    const hvpt = p?.hvptResults && typeof p.hvptResults === 'object' ? Object.values(p.hvptResults) : [];
    const flashDone = Array.isArray(p?.flashDoneIds) ? [...new Set(p.flashDoneIds)].length : 0;
    const chainDone = Array.isArray(p?.chainDoneIds) ? [...new Set(p.chainDoneIds)].length : 0;
    const microDemoDone = Array.isArray(p?.microDemoDoneIds) ? [...new Set(p.microDemoDoneIds)].length : 0;
    const bank = collectCompanionErrorBank(p);
    return {
      module_id: modId,
      done_items: doneIds.length,
      unseen_clean: Object.values(unseen).filter(v => v === 'clean').length,
      unseen_review: Object.values(unseen).filter(v => v === 'review').length,
      dictation_checked: Object.values(dict).filter(v => v && v.revealed).length,
      dictation_correct: Object.values(dict).filter(v => v && v.correct === true).length,
      hvpt_total: hvpt.length,
      hvpt_correct: hvpt.filter(x => x && x.correct === true).length,
      flash_done: flashDone,
      chain_done: chainDone,
      micro_demo_done: microDemoDone,
      error_bank_open: bank.open.length,
      error_bank_cleared: bank.cleared.length,
      recording_count: recCount,
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

/**
 * Determine safe file extension from recording MIME type.
 */
export function companionRecordingExt(mimeType = '') {
  const m = String(mimeType || '').toLowerCase();
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a';
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'bin';
}

/**
 * Build structured Companion Battle Report payload for ZIP export (with audio recordings & all 5 review modes).
 */
export function buildCompanionBattleReport({
  module = PHONICS_DAY_01_MODULE,
  progress = {},
  recordings = [],
  appVersion = '20.5.0',
  exportedAt = new Date().toISOString()
} = {}) {
  const doneIds = Array.isArray(progress?.doneIds) ? [...new Set(progress.doneIds)] : [];
  const unseenMarks = progress?.unseenMarks && typeof progress.unseenMarks === 'object' ? { ...progress.unseenMarks } : {};
  const dictationResults = progress?.dictationResults && typeof progress.dictationResults === 'object' ? { ...progress.dictationResults } : {};
  const checklistIds = Array.isArray(progress?.checklistIds) ? [...new Set(progress.checklistIds)] : [];
  const hvptResults = progress?.hvptResults && typeof progress.hvptResults === 'object' ? { ...progress.hvptResults } : {};
  const flashDoneIds = Array.isArray(progress?.flashDoneIds) ? [...new Set(progress.flashDoneIds)] : [];
  const chainDoneIds = Array.isArray(progress?.chainDoneIds) ? [...new Set(progress.chainDoneIds)] : [];
  const microDemoDoneIds = Array.isArray(progress?.microDemoDoneIds) ? [...new Set(progress.microDemoDoneIds)] : [];
  const bank = collectCompanionErrorBank(progress);

  const unseenClean = Object.values(unseenMarks).filter(v => v === 'clean').length;
  const unseenReview = Object.values(unseenMarks).filter(v => v === 'review').length;
  const dictChecked = Object.values(dictationResults).filter(v => v && v.revealed).length;
  const dictCorrect = Object.values(dictationResults).filter(v => v && v.correct === true).length;
  const hvptArr = Object.values(hvptResults);

  const blockTitleById = new Map((module?.blocks || []).map(b => [b.id, b.title || b.id]));
  blockTitleById.set('review-connected', '复习·控词短句朗读');
  blockTitleById.set('review-micro-demo', '复习·60秒脱稿微试讲');

  const recList = (Array.isArray(recordings) ? recordings : []).map(r => {
    const ext = companionRecordingExt(r.mimeType || r.mime_type || '');
    const safeBlock = String(r.taskId || r.block_id || 'block').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeId = String(r.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const file = r.file || `recordings/${safeBlock}_${safeId}.${ext}`;
    return {
      id: String(r.id || ''),
      block_id: String(r.taskId || r.block_id || ''),
      block_title: blockTitleById.get(r.taskId || r.block_id) || String(r.taskId || r.block_id || ''),
      role: String(r.role || 'original'),
      file,
      mime_type: String(r.mimeType || r.mime_type || 'application/octet-stream'),
      duration_ms: Number(r.durationMs ?? r.duration_ms ?? 0),
      bytes: Number(r.bytes?.length ?? r.byteLength ?? r.size ?? 0),
      sha256: String(r.sha256 || ''),
      created_at: String(r.createdAt || r.created_at || '')
    };
  });

  return {
    schema: 'yandao-companion-battle-report-v1',
    app_version: String(appVersion || '20.5.0'),
    exported_at: String(exportedAt),
    module_id: String(module?.id || ''),
    module_title: String(module?.title || ''),
    paper_ref: String(module?.paperRef || ''),
    last_studied_at: String(progress?.lastStudiedAt || ''),
    summary: {
      done_items: doneIds.length,
      unseen_clean: unseenClean,
      unseen_review: unseenReview,
      dictation_checked: dictChecked,
      dictation_correct: dictCorrect,
      checklist_done: checklistIds.length,
      hvpt_total: hvptArr.length,
      hvpt_correct: hvptArr.filter(x => x && x.correct === true).length,
      flash_done: flashDoneIds.length,
      chain_done: chainDoneIds.length,
      micro_demo_done: microDemoDoneIds.length,
      error_bank_open: bank.open.length,
      error_bank_cleared: bank.cleared.length,
      recording_count: recList.length
    },
    done_ids: doneIds,
    unseen_marks: unseenMarks,
    dictation_results: dictationResults,
    checklist_ids: checklistIds,
    hvpt_results: hvptResults,
    error_bank_open: bank.open,
    error_bank_cleared: bank.cleared,
    recordings: recList
  };
}

/**
 * Render human-readable Markdown battle report for Caleb & Gemini review.
 */
export function companionBattleReportMarkdown(report) {
  const s = report?.summary || {};
  const lines = [
    `# 纸质伴学与复习战报 · ${report?.module_title || report?.module_id || 'Companion'}`,
    '',
    `- 导出时间：${report?.exported_at || ''}`,
    `- 应用版本：v${report?.app_version || ''}`,
    report?.paper_ref ? `- 配套打印：${report.paper_ref}` : null,
    `- 新学已点练/标稳：${s.done_items ?? 0} 项`,
    `- 假词解码：读准 ${s.unseen_clean ?? 0} · 需复练 ${s.unseen_review ?? 0}`,
    `- 盲听听写：已核对 ${s.dictation_checked ?? 0} · 拼对 ${s.dictation_correct ?? 0}`,
    `- 多音色 HVPT 辨音：${s.hvpt_correct ?? 0} / ${s.hvpt_total ?? 0}`,
    `- 双向快闪完成：${s.flash_done ?? 0} · 词链变音完成：${s.chain_done ?? 0} · 60秒试讲：${s.micro_demo_done ?? 0}`,
    `- 错题池状态：待清零 ${s.error_bank_open ?? 0} · 已清零 ${s.error_bank_cleared ?? 0}`,
    `- 随包录音文件：${s.recording_count ?? 0} 条`,
    '',
    '## 录音清单（供发音与教学点评）'
  ].filter(Boolean);

  if (Array.isArray(report?.recordings) && report.recordings.length) {
    for (const r of report.recordings) {
      const sec = ((Number(r.duration_ms) || 0) / 1000).toFixed(1);
      lines.push(`- \`${r.file}\` · ${r.block_title}（${r.role === 'retry' ? '重录' : '初录'}，${sec}s，${r.mime_type}）`);
    }
  } else {
    lines.push('- 本次未包含录音文件（可在各关卡点击「开始录音」后再导出）。');
  }

  if (Array.isArray(report?.error_bank_open) && report.error_bank_open.length) {
    lines.push('', '## 待清零错题池（下轮优先回炉）');
    for (const e of report.error_bank_open) {
      lines.push(`- ${e.label} ${e.ipa || ''}（来源：${e.source}，失误 ${e.misses} 次，当前连对 ${e.streak}/2）`);
    }
  }

  const unseenEntries = Object.entries(report?.unseen_marks || {});
  if (unseenEntries.length) {
    lines.push('', '## 假词解码自检明细');
    for (const [k, v] of unseenEntries) {
      lines.push(`- ${k}: ${v === 'clean' ? '✓ 读准' : '? 需复练'}`);
    }
  }

  const dictEntries = Object.entries(report?.dictation_results || {});
  if (dictEntries.length) {
    lines.push('', '## 盲听听写明细');
    for (const [k, v] of dictEntries) {
      const status = v?.correct === true ? '✓ 拼对' : v?.correct === false ? '✗ 拼错' : '已揭晓';
      lines.push(`- ${k}: ${status}${v?.typed ? `（输入：${v.typed}）` : ''}`);
    }
  }

  return lines.join('\n') + '\n';
}
