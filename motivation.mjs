/**
 * Adversity, Grit & Cultivation Aesthetics Engine (14.0.0)
 * Transforms difficulty, errors, and long-term repetition into calm,
 * dignified momentum grounded in Growth Mindset psychology.
 *
 * CRITICAL INTEGRITY RULE:
 * Realms and grit badges are derived strictly from authentic local records
 * (independent K recalls, real active minutes, real micro-rehearsal recoveries).
 * They NEVER represent official IELTS bands, CEFR levels, or fabricated streaks.
 */

export const CULTIVATION_REALMS = Object.freeze([
  { id: 1, name: '初闻言道', en: 'Awakening', minScore: 0, motto: '万里长途，始于今日第一次开口与落笔。' },
  { id: 2, name: '破雾见明', en: 'Clearing the Mist', minScore: 25, motto: '看不懂、想不起不是退步，正是迷雾散开的起点。' },
  { id: 3, name: '砥砺锋芒', en: 'Tempering the Edge', minScore: 80, motto: '真正的语感，是在一次次卡壳与纠正中磨出来的。' },
  { id: 4, name: '逆风破局', en: 'Breaking Through', minScore: 180, motto: '越是让你皱眉的难词与长句，越藏着你跃迁的钥匙。' },
  { id: 5, name: '百炼成钢', en: 'Forged in Fire', minScore: 360, motto: '重复不是枯燥，是把陌生表达刻进肌肉记忆的必经之路。' },
  { id: 6, name: '贯通文脉', en: 'Weaving Discourse', minScore: 650, motto: '从孤立单词走向逻辑连贯，你的表达开始拥有骨架与力量。' },
  { id: 7, name: '登峰造极', en: 'Ascending the Peak', minScore: 1100, motto: '山高路陡，但你身后已经铺满了真实汗水与记录。' },
  { id: 8, name: '言出法随', en: 'Effortless Mastery', minScore: 1800, motto: '厚积薄发，日拱一卒，终成大器。' }
]);

export const ADVERSITY_QUOTES = Object.freeze({
  home: [
    { zh: '困难从不是拦路虎，而是帮你筛出真正短板的试金石。', en: 'The impediment to action advances action. What stands in the way becomes the way.' },
    { zh: '哪怕今天状态不佳，只要打开完成一题，就已经赢过昨天想放弃的自己。', en: 'Fall seven times, stand up eight. Consistency outlasts intensity.' },
    { zh: '不必等到状态满分才开始，行动本身就会把专注召唤回来。', en: 'Action precedes motivation. Start small, stay steady, finish strong.' }
  ],
  error: [
    { zh: '这一题选错了——太好了！大脑刚在真实语境里抓到一个隐藏盲区，现在正是重塑记忆的黄金瞬间。', en: 'Every error with immediate contrast is a neural pathway being rebuilt stronger.' },
    { zh: '别怕答错：在练习场暴露一百次，胜过在考场和面试里卡壳一次。', en: 'Struggle during retrieval is not failure; it is the exact mechanism of durable memory.' },
    { zh: '把干扰项和目标词摆在一起看清边界，这个词从今天起就真正属于你了。', en: 'Distinguishing near-misses turns fragile recognition into lasting precision.' }
  ],
  rehearsal: [
    { zh: '迎难而上：这几个词刚才绊了你一下，现在趁热打铁，把它们彻底收入囊中！', en: 'Reclaim the words that tripped you up—this 30-second round locks them in.' },
    { zh: '高手与普通人的分水岭，就在于愿不愿意回头再啃一遍刚做错的题。', en: 'Mastery lives in the deliberate second look at what felt hardest.' }
  ],
  difficult: [
    { zh: '专挑最硬的骨头啃！每攻克一个顽固难词，你的表达上限就往上抬一寸。', en: 'Smooth seas never made a skilled sailor. Face the stubborn words head-on.' },
    { zh: '感到吃力时，恰恰说明你正处在真实成长区，而不是在舒适区原地踏步。', en: 'Desirable difficulty is the unmistakable signal that real learning is happening.' }
  ],
  transfer: [
    { zh: '从“看懂”到“自己写出来/说出来”是最难的一跃，勇敢写下你的第一版初稿！', en: 'Imperfect original output beats passive reading every single time.' },
    { zh: '不必追求一句完美，先把想法用英文立起来，再对照参考词块精雕细琢。', en: 'First build the thought in English, then sharpen its lexical edge.' }
  ],
  complete: [
    { zh: '又完成一次真实修炼！每一次克制浮躁、坚持收官，都在为你未来的自由铺路。', en: 'Another brick laid in your fortress of fluency. Well fought today.' },
    { zh: '道阻且长，行则将至。今天的每一秒专注与每一条战报，都是你最硬核的底气。', en: 'Discipline is choosing between what you want now and what you want most.' }
  ]
});

/**
 * Computes the learner's authentic cultivation realm from real local progress.
 * Score formula: (independent K items * 3) + (real active minutes * 1) + (completed sessions * 2).
 */
export function computeCultivationRealm({ items = [], sessions = [], attempts = [] } = {}) {
  const kCount = (Array.isArray(items) ? items : []).filter(i => i && i.status === 'K').length;
  const totalMinutes = Math.round(
    (Array.isArray(sessions) ? sessions : []).reduce((sum, s) => sum + Math.max(0, Number(s?.activeMs || 0)), 0) / 60000
  );
  const sessionCount = Array.isArray(sessions) ? sessions.length : 0;
  const effortScore = kCount * 3 + totalMinutes + sessionCount * 2;

  let current = CULTIVATION_REALMS[0];
  let next = CULTIVATION_REALMS[1] || null;
  for (let i = 0; i < CULTIVATION_REALMS.length; i++) {
    if (effortScore >= CULTIVATION_REALMS[i].minScore) {
      current = CULTIVATION_REALMS[i];
      next = CULTIVATION_REALMS[i + 1] || null;
    }
  }

  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((effortScore - current.minScore) / Math.max(1, next.minScore - current.minScore)) * 100)))
    : 100;

  return {
    realmIndex: current.id,
    realmName: current.name,
    realmEn: current.en,
    motto: current.motto,
    effortScore,
    kCount,
    totalMinutes,
    nextRealmName: next ? next.name : null,
    pointsToNext: next ? Math.max(0, next.minScore - effortScore) : 0,
    progressPct,
    isAuthenticMetric: true
  };
}

/**
 * Deterministically picks a fitting adversity/grit quote for the current moment.
 */
export function getAdversityQuote(context = 'home', seed = 0) {
  const pool = ADVERSITY_QUOTES[context] || ADVERSITY_QUOTES.home;
  const idx = Math.abs(Number(seed) || 0) % pool.length;
  return pool[idx];
}

/**
 * Computes authentic grit milestone badges strictly from verified local data.
 */
export function computeGritBadges({ items = [], sessions = [], vocabularyAttempts = [], transferAttempts = [] } = {}) {
  const totalMinutes = Math.round((Array.isArray(sessions) ? sessions : []).reduce((s, r) => s + Math.max(0, Number(r?.activeMs || 0)), 0) / 60000);
  const kCount = (Array.isArray(items) ? items : []).filter(i => i?.status === 'K').length;
  const recovered = (Array.isArray(vocabularyAttempts) ? vocabularyAttempts : []).filter(a => a?.rehearsalPassed).length;
  const writtenTransfers = (Array.isArray(transferAttempts) ? transferAttempts : []).filter(t => String(t?.firstAnswer || '').trim().length > 10).length;

  return [
    { id: 'first_step', icon: '🔥', title: '破冰启程', desc: '留下首次真实训练记录', unlocked: sessions.length > 0 || vocabularyAttempts.length > 0 },
    { id: 'adversity_bounce', icon: '🛡️', title: '逆风翻盘', desc: '在同轮错词微回炉中成功修正错词', unlocked: recovered >= 1 },
    { id: 'deep_focus', icon: '⛰️', title: '沉心砺剑', desc: '累计真实前台修炼达到 60 分钟', unlocked: totalMinutes >= 60 },
    { id: 'independent_k', icon: '⚔️', title: '独立破壁', desc: '真实独立掌握卡片（K）达到 20 张', unlocked: kCount >= 20 },
    { id: 'output_forge', icon: '✍️', title: '笔锋初现', desc: '完成至少 3 次独立英文迁移产出', unlocked: writtenTransfers >= 3 }
  ];
}
