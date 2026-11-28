/**
 * YanDao Cultivation Palace — Adaptive Paper-Companion Lab (v20.4.7)
 * Schema-driven companion engine that adapts its UI, IPA-exact Kokoro audio,
 * per-block recording, and ZIP battle report export to any printed study sheet.
 */

const D01_AUDIO = './assets/companion/phonics-d01';

export const PHONICS_DAY_01_MODULE = {
  id: 'phonics-day-01',
  homeLabel: '📄 伴学·拼读 Day 1',
  shortTitle: '自然拼读 Day 01',
  badge: 'PAPER COMPANION · PHONICS DAY 01',
  title: '自然拼读 Day 01 · 纸质伴学台',
  paperRef: '配套打印：04_Phonics_Day01-10_Expanded.docx · DAY 01 & PRACTICUM P01',
  subtitle: '功能随打印材料自适应切换。全套 42 条 Kokoro 精确音标原生音频（短 a /æ/ 绝不读成 /ɑː/），支持每关录音并一键打包伴学战报 ZIP。',
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
    const recMap = p?.recordingIds && typeof p.recordingIds === 'object' ? p.recordingIds : {};
    const recCount = Object.values(recMap).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
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
 * Build structured Companion Battle Report payload for ZIP export (with audio recordings).
 */
export function buildCompanionBattleReport({
  module = PHONICS_DAY_01_MODULE,
  progress = {},
  recordings = [],
  appVersion = '20.4.7',
  exportedAt = new Date().toISOString()
} = {}) {
  const doneIds = Array.isArray(progress?.doneIds) ? [...new Set(progress.doneIds)] : [];
  const unseenMarks = progress?.unseenMarks && typeof progress.unseenMarks === 'object' ? { ...progress.unseenMarks } : {};
  const dictationResults = progress?.dictationResults && typeof progress.dictationResults === 'object' ? { ...progress.dictationResults } : {};
  const checklistIds = Array.isArray(progress?.checklistIds) ? [...new Set(progress.checklistIds)] : [];
  const unseenClean = Object.values(unseenMarks).filter(v => v === 'clean').length;
  const unseenReview = Object.values(unseenMarks).filter(v => v === 'review').length;
  const dictChecked = Object.values(dictationResults).filter(v => v && v.revealed).length;
  const dictCorrect = Object.values(dictationResults).filter(v => v && v.correct === true).length;

  const blockTitleById = new Map((module?.blocks || []).map(b => [b.id, b.title || b.id]));
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
    app_version: String(appVersion || '20.4.7'),
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
      recording_count: recList.length
    },
    done_ids: doneIds,
    unseen_marks: unseenMarks,
    dictation_results: dictationResults,
    checklist_ids: checklistIds,
    recordings: recList
  };
}

/**
 * Render human-readable Markdown battle report for Caleb & Gemini review.
 */
export function companionBattleReportMarkdown(report) {
  const s = report?.summary || {};
  const lines = [
    `# 纸质伴学战报 · ${report?.module_title || report?.module_id || 'Companion'}`,
    '',
    `- 导出时间：${report?.exported_at || ''}`,
    `- 应用版本：v${report?.app_version || ''}`,
    report?.paper_ref ? `- 配套打印：${report.paper_ref}` : null,
    `- 已点练/标稳：${s.done_items ?? 0} 项`,
    `- 假词解码：读准 ${s.unseen_clean ?? 0} · 需复练 ${s.unseen_review ?? 0}`,
    `- 盲听听写：已核对 ${s.dictation_checked ?? 0} · 拼对 ${s.dictation_correct ?? 0}`,
    `- 试讲自检勾选：${s.checklist_done ?? 0} 项`,
    `- 随包录音文件：${s.recording_count ?? 0} 条`,
    '',
    '## 录音清单（供发音与教学点评）'
  ].filter(Boolean);

  if (Array.isArray(report?.recordings) && report.recordings.length) {
    for (const r of report.recordings) {
      const sec = ((Number(r.duration_ms) || 0) / 1000).toFixed(1);
      lines.push(`- \`${r.file}\` · ${r.block_title}（${sec}s，${r.mime_type}）`);
    }
  } else {
    lines.push('- 本次未包含录音文件（可在各关卡点击「开始录音」后再导出）。');
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
