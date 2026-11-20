import {captureStableViewport,restoreStableViewport} from './scroll-stability.mjs';
import {VERSION,APP_VERSION,revealedReadingRecall,composeReadingRetellingSubmission,recordsFromCSV,sentencesFromText,recordsFromLearningPack,mergeItems,wordPrompt,sentenceCloze,sentenceClozeParts,dateKeyInTimeZone,addActiveInterval,summarizeSessionTime,readingQuestionProgress,transferTaskProgressState,compareAnswer,compareWordAnswer,scheduleReview,nextDue,isDue,buildQueue,migrateBackupPayload,buildBattleReport,battleReportMarkdown,makeCSV,normalized,homeSummary,persistState,mergeBackupState,readingSelectionContext,readingCardId,readingMarkId,mergeReadingMarks,collectSavedReadingWords,readingVocabularyHandoff,centralLearningHandoff,buildCentralLearningFeedback,mergeDailyPackItems,isFullBackup,safeSourceUrl,safeAudioUrl,isValidAudioLoop,clampSpeechSeek,normalizeSourceMeta,makeWeakness,mergeWeaknesses,mergeTransferAttempts,normalizeTransferAttempt,buildTransferAnalytics,transferEvidenceStatus,buildMasteryAnalytics,resolveTaskInputMode,compareReadingChoice,compareSpellingAnswer,buildSpellingSummary,findExistingSpellingAttempt,createSpellingFirstAttempt,spellingPassed} from './core.mjs';
import {recordingCapability,recordingMetadata,putRecording,listRecordings,getRecording} from './recordings.mjs';
import {englishDefinitionFor,englishSpellingCue,maskSpellingTarget,englishWordHint} from './english-first.mjs';
import {VISUAL_ASSETS,VISUAL_ASSET_NOTICE,visualAsset} from './visuals.mjs';
import {unpackSpeechZip,importSpeechClips,createClipPlayer,splitSpeechSegments,getSpeechClip,speechTextHash} from './speech-clips.mjs';
import {splitStudioSegments,isExtendedListening} from './studio.mjs';
import {zipStore,handoverEntries,readZipStore,sha256Hex} from './handover.mjs';
import {evaluateVocabularyChoice,summarizeVocabularyPractice,buildIntraSessionRehearsalQueue,VOCAB_TYPE_LABELS} from './vocab.mjs';
import {buildCdtlCard,buildInterferenceRadar} from './cdtl.mjs';
import {analyzeDiscourseAndChunks,analyzeReadingPassageMetrics} from './discourse.mjs';
import {registerMediaSession,createAbLoopState,setAbLoopPoint,shouldLoopBack,dictationCapability,createDictationController} from './immersion.mjs';
import {buildCultivationHeatmap,buildFsrsForecast,lookupOfflineLexicon,buildCommuteSprintQueue,evaluateBackupFreshness} from './mastery-os.mjs';
import {RADIO_CHANNELS,RADIO_SPEED_PRESETS,computeShadowPauseMs,computeSegmentWatchdogMs,buildRadioPlaylist,buildRadioPodcastEpisodes,summarizeRadioExposure} from './radio.mjs';
import {CULTIVATION_REALMS,computeCultivationRealm,getAdversityQuote,computeGritBadges} from './motivation.mjs';
import {AI_PROVIDERS,GEMINI_TTS_VOICES,GEMINI_TTS_DEFAULT_MODEL,GEMINI_TTS_FALLBACK_MODEL,SILICONFLOW_TTS_VOICES,SILICONFLOW_TTS_DEFAULT_VOICE,loadAiConfig,saveAiConfig,clearAiConfig,isAiTutorReady,isGeminiTtsReady,isSiliconFlowTtsReady,isCloudTtsReady,synthesizeGeminiSpeech,synthesizeCloudSpeech,makeTtsCacheKey,readPersistentTtsAudio,writePersistentTtsAudio,hasPersistentTtsAudio,countPersistentTtsAudio,clearPersistentTtsAudio,saveAudioBookmark,loadAudioBookmark,clearAudioBookmark,recordTtsApiCall,getDailyTtsUsage,askAiCritiqueOutput,askAiExplainSentence,askAiContrastWords,askAiDictionary,askAiFreeTutor,askAiCheckGrammar,askAiSpeakingDemoCoach,testAiTutorConnection} from './ai-tutor.mjs';
import {replayFsrsShadowHistory} from './core.mjs';

const STORE='central-english-mastery.v2';
const LEGACY_STORE='english-mastery-v1';
const DEMO=[
{id:'w:demo-address',kind:'word',target:'address',example:'We need to address the underlying problem.',cue:'处理（问题）',group:'Words in context',source:'Demo'},
{id:'w:demo-account',kind:'word',target:'account for',example:'Several factors account for the difference.',cue:'解释原因',group:'Phrasal verbs',source:'Demo'},
{id:'w:demo-evidence',kind:'word',target:'evidence',example:'The evidence does not support that conclusion.',cue:'证据',group:'Academic English',source:'Demo'},
{id:'s:demo-practice',kind:'sentence',text:'Consistent practice matters more than occasional bursts of motivation.',group:'Everyday English',source:'Demo'},
{id:'s:demo-reading',kind:'sentence',text:'A good reader questions the evidence before accepting a claim.',group:'Academic English',source:'Demo'}
].map(x=>({...x,status:'UNTESTED',learningStage:'new',attempts:0,lastAt:null,dueAt:null,createdAt:new Date().toISOString()}));
const el=(tag,text='',cls='')=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==null)node.textContent=text;return node;};
const app=document.getElementById('app');let page='home';let draft=null;let filter='all';let searchTerm='';let showHint=false;let lastSessionSummary=null;let toastTimer;let lastPersistedRaw=null;
let readingVocabSearchTerm='';let readingVocabStatusFilter='all';let activeAudio=null;let speechObjectUrl=null;let activeLocalAudio=null;let naturalSpeechPlayer=null;
let spellingTouchMode=false;
function renderGritQuoteBanner(context = "home", seed = 0) {
  const q = getAdversityQuote(context, seed);
  const box = div(`grit-quote-banner is-${context}`);
  box.append(
    p(`「${q.zh}」`, "grit-quote-zh"),
    p(q.en, "grit-quote-en")
  );
  return box;
}
function renderRealmHeroBadge() {
  const realm = computeCultivationRealm({ items: data.items, sessions: data.sessions, attempts: data.attempts });
  const wrap = div("realm-hero-badge");
  const top = div("realm-hero-top");
  top.append(
    el("span", `第 ${realm.realmIndex} 境 · ${realm.realmName} · ${realm.realmEn}`, "realm-pill"),
    el("span", realm.nextRealmName ? `距「${realm.nextRealmName}」还差 ${realm.pointsToNext} 真实修炼值` : "已达巅峰境 · 言出法随", "realm-next-hint")
  );
  const track = div("realm-bar-track");
  const fill = div("realm-bar-fill");
  fill.style.width = `${Math.max(4, realm.progressPct)}%`;
  track.append(fill);
  const daySeed = new Date().getDate() + (data.sessions?.length || 0);
  const dailyQuote = getAdversityQuote("home", daySeed);
  wrap.append(
    top,
    track,
    p(`「${dailyQuote.zh}」`, "realm-motto-zh"),
    p(dailyQuote.en, "realm-motto-en")
  );
  return wrap;
}
function renderRealmAndGritPanel() {
  const realm = computeCultivationRealm({ items: data.items, sessions: data.sessions, attempts: data.attempts });
  const badges = computeGritBadges({ items: data.items, sessions: data.sessions, vocabularyAttempts: data.vocabularyAttempts || [], transferAttempts: data.transferAttempts || [] });
  const unlockedCount = badges.filter(b => b.unlocked).length;
  const box = section("panel realm-progress-card");
  box.append(
    el("div", "问道破境 · CULTIVATION REALM", "eyebrow"),
    h("h2", `第 ${realm.realmIndex} 境 · ${realm.realmName}`),
    p(`已掌握 ${realm.kCount} 项 · 累计 ${realm.totalMinutes} 分钟 · 已点亮 ${unlockedCount}/${badges.length} 枚徽章`, "tiny")
  );
  const track = div("realm-bar-track is-light");
  const fill = div("realm-bar-fill");
  fill.style.width = `${Math.max(4, realm.progressPct)}%`;
  track.append(fill);
  box.append(track);
  const badgeGrid = div("grit-badge-strip");
  badges.forEach(b => {
    const pill = div(`grit-badge-pill${b.unlocked ? " is-unlocked" : ""}`);
    pill.title = b.desc;
    pill.append(
      el("span", b.icon, "grit-pill-icon"),
      el("span", b.title, "grit-pill-title")
    );
    badgeGrid.append(pill);
  });
  box.append(badgeGrid);
  return box;
}

function renderFormattedAiText(rawText) {
  const box = div("ai-tutor-text");
  const appendInline = (parent, text) => {
    const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
    parts.forEach(part => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        parent.append(strong);
      } else if (part) {
        parent.append(document.createTextNode(part));
      }
    });
  };
  String(rawText || "").replace(/\r/g, "").split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || /^-{3,}$/.test(trimmed)) return;
    if (/^#{1,4}\s+/.test(trimmed)) {
      const heading = el("div", "", "ai-tutor-heading");
      appendInline(heading, trimmed.replace(/^#{1,4}\s+/, ""));
      box.append(heading);
    } else if (/^[-*•]\s+/.test(trimmed)) {
      const bullet = el("div", "", "ai-tutor-bullet");
      bullet.append(document.createTextNode("• "));
      appendInline(bullet, trimmed.replace(/^[-*•]\s+/, ""));
      box.append(bullet);
    } else {
      const para = el("div", "", "ai-tutor-para");
      appendInline(para, trimmed);
      box.append(para);
    }
  });
  return box;
}

function renderAiReplyWidget(buttonLabel, runner, onReply = null, initialReply = "") {
  const wrap = div("ai-tutor-widget");
  const out = div("ai-tutor-output");
  out.hidden = !initialReply;
  const closeOut = () => {
    out.hidden = true;
    out.replaceChildren();
  };
  const showReply = (reply) => {
    const headRow = div("ai-tutor-head-row");
    headRow.append(
      el("div", "🤖 随身 AI 导师辅导 · BYOK COACHING", "eyebrow"),
      btn("收起 ✕", closeOut, "btn ghost small-btn")
    );
    const footRow = lines(
      btn("🔊 Gemini 朗读解析", () => speakWithGeminiOrFallback(String(reply || "").replace(/[#*`_-]+/g, " ")), "btn ghost small-btn"),
      btn("收起解析 ✕", closeOut, "btn secondary small-btn")
    );
    out.hidden = false;
    out.replaceChildren(headRow, renderFormattedAiText(reply), footRow);
  };
  if (initialReply) showReply(initialReply);
  const trigger = btn(buttonLabel, async () => {
    if (!isAiTutorReady()) {
      out.hidden = false;
      out.replaceChildren(
        lines(
          p("尚未配置随身 AI 导师 API Key。请前往「我的 → 随身 AI 导师」粘贴你的 Key（仅保存在本机）。", "tiny"),
          btn("关闭 ✕", closeOut, "btn ghost small-btn")
        ),
        btn("去设置配置 Key →", () => setPage("settings"), "btn secondary small-btn")
      );
      return;
    }
    trigger.disabled = true;
    const orig = trigger.textContent;
    trigger.textContent = "🤖 AI 导师思考中……";
    out.hidden = false;
    out.replaceChildren(
      lines(
        p("正在连线你的随身 AI 导师，请稍候 2–5 秒……", "tiny"),
        btn("取消 ✕", closeOut, "btn ghost small-btn")
      )
    );
    try {
      const reply = await runner();
      if (typeof onReply === 'function') { try { onReply(reply); } catch {} }
      showReply(reply);
    } catch (err) {
      out.replaceChildren(
        p(`AI 导师暂时无法响应：${String(err?.message || err)}`, "error tiny"),
        btn("关闭 ✕", closeOut, "btn ghost small-btn")
      );
    } finally {
      trigger.disabled = false;
      trigger.textContent = orig;
    }
  }, "btn secondary small-btn");
  wrap.append(trigger, out);
  return wrap;
}

function aiTutorSettingsPanel() {
  const cfg = loadAiConfig();
  const box = section("settings-card ai-tutor-settings");
  box.append(
    el("div", "随身 AI 导师 · BYOK FREE API (15.0)", "eyebrow"),
    h("h2", "配置你自己的免费 AI 导师 Key"),
    p("Key 仅存本机浏览器，不上传，不填也可离线学习。", "subtle")
  );
  const provSel = el("select", "", "select");
  Object.values(AI_PROVIDERS).forEach(pr => {
    const opt = el("option", pr.label);
    opt.value = pr.id;
    provSel.append(opt);
  });
  provSel.value = cfg.provider;
  const keyInput = textInput(cfg.apiKey, AI_PROVIDERS[cfg.provider]?.keyHint || "粘贴 API Key");
  keyInput.type = "password";
  keyInput.autocomplete = "off";
  const modelInput = textInput(cfg.model, "模型名称，如 openrouter/free");
  const endpointInput = textInput(cfg.customEndpoint, "仅自定义接口需要填写完整 /v1/chat/completions 地址");
  const endpointWrap = field("自定义接口地址（仅自定义兼容模式需填写）", endpointInput);
  endpointWrap.hidden = cfg.provider !== "openai_compatible";

  provSel.addEventListener("change", () => {
    const nextProv = AI_PROVIDERS[provSel.value];
    if (nextProv) {
      modelInput.value = nextProv.defaultModel;
      keyInput.placeholder = nextProv.keyHint;
    }
    endpointWrap.hidden = provSel.value !== "openai_compatible";
  });

  const statusLine = p(isAiTutorReady(cfg) ? "状态：✓ 已在本机配置 API Key，可在做题/阅读/写作中随时呼出 AI 导师。" : "状态：未配置（当前为纯离线模式）。", "tiny");
  const saveBtn = btn("保存配置到本机", () => {
    const next = { provider: provSel.value, apiKey: keyInput.value.trim(), model: modelInput.value.trim(), customEndpoint: endpointInput.value.trim() };
    if (saveAiConfig(next)) {
      statusLine.textContent = isAiTutorReady(next) ? "状态：✓ 已保存至本机安全存储！" : "状态：API Key 过短或为空，当前仍为纯离线模式。";
      notify("随身 AI 导师配置已保存至本机。");
    }
  }, "btn primary");
  const testBtn = btn("测试连通性", async () => {
    const next = { provider: provSel.value, apiKey: keyInput.value.trim(), model: modelInput.value.trim(), customEndpoint: endpointInput.value.trim() };
    saveAiConfig(next);
    statusLine.textContent = "正在测试 AI 导师连通性……";
    try {
      const reply = await testAiTutorConnection(next);
      statusLine.textContent = `✓ 连通成功！AI 回复：${reply.slice(0, 100)}`;
      notify("随身 AI 导师连通成功！");
    } catch (err) {
      statusLine.textContent = `✗ 连通失败：${String(err?.message || err)}`;
    }
  }, "btn secondary");
  const clearBtn = btn("清除本机 Key", () => {
    clearAiConfig();
    keyInput.value = "";
    statusLine.textContent = "状态：已清除本机 Key，恢复纯离线模式。";
    notify("已清除本机 AI Key。");
  }, "btn ghost");

  box.append(
    field("AI 服务商（推荐 OpenRouter 免费路由，免绑卡）", provSel),
    field("你的 API Key（仅存本机）", keyInput),
    field("模型 ID", modelInput),
    endpointWrap,
    lines(saveBtn, testBtn, clearBtn),
    statusLine
  );
  return box;
}

let radioOpen = false;
let radioChannel = "youtube_speeches";
let radioScope = "all";
let radioVoiceMode = "gemini";
let radioPlayMode = "podcast";
let radioPaused = false;
let radioEpisodes = [];
let radioEpisodeIndex = 0;
let radioAudioStatus = "";
let readingAudioStatus = "";
let radioRate = 0.9;
let radioStopAfterRound = true;
let radioShuffle = false;
let radioPlaying = false;
let radioIndex = 0;
let radioShadowPause = false;
let radioSleepMinutes = 0;
let radioSleepDeadline = 0;
let radioTimer = null;
let radioTracks = [];
let radioSessionLog = { clipsPlayed: 0, activeMs: 0, lastChannel: "" };
let radioPlayStartAt = 0;
let radioAudioEl = null;
let radioAudioUnlocked = false;
let radioActiveEngine = "";
const SILENT_WAV_DATA_URI = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
let _silentWavBlobUrl = null;
function getSilentWavBlobUrl() {
  if (_silentWavBlobUrl) return _silentWavBlobUrl;
  try {
    const b64 = SILENT_WAV_DATA_URI.split(",")[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    _silentWavBlobUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    return _silentWavBlobUrl;
  } catch {
    return SILENT_WAV_DATA_URI;
  }
}

function ensureRadioAudioElement() {
  if (typeof Audio === "undefined") return null;
  if (!radioAudioEl) {
    radioAudioEl = new Audio();
    radioAudioEl.preload = "auto";
    radioAudioEl.playsInline = true;
  }
  return radioAudioEl;
}

function unlockRadioAudio() {
  try {
    if (typeof navigator !== "undefined" && navigator.audioSession) {
      navigator.audioSession.type = "playback";
    }
  } catch {}
  const elAudio = ensureRadioAudioElement();
  if (!elAudio || radioAudioUnlocked) return;
  try {
    elAudio.onended = null;
    elAudio.onerror = null;
    elAudio.muted = false;
    elAudio.src = getSilentWavBlobUrl();
    const p = elAudio.play();
    if (p && typeof p.then === "function") {
      p.then(() => { radioAudioUnlocked = true; }).catch(() => {});
    } else {
      radioAudioUnlocked = true;
    }
  } catch {}
}

function stopRadioAudioElement() {
  if (!radioAudioEl) return;
  try {
    radioAudioEl.onended = null;
    radioAudioEl.onerror = null;
    radioAudioEl.pause();
  } catch {}
}

function fmtAudioClock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function pausePocketRadio() {
  if (radioPlayMode === "podcast" && radioAudioEl && radioAudioEl.src && !radioAudioEl.ended) {
    const curEp = radioEpisodes[radioEpisodeIndex];
    if (curEp?.id && Number.isFinite(radioAudioEl.currentTime)) {
      saveAudioBookmark(curEp.id, radioAudioEl.currentTime, radioAudioEl.duration);
    }
    try { radioAudioEl.pause(); } catch {}
    if (radioPlaying && radioPlayStartAt) {
      radioSessionLog.activeMs += Math.max(0, Date.now() - radioPlayStartAt);
      radioPlayStartAt = 0;
    }
    radioPaused = true;
    render();
    return;
  }
  stopPocketRadio(true);
}

function resumePocketRadio() {
  if (radioPlayMode === "podcast" && radioPaused && radioAudioEl && radioAudioEl.src && !radioAudioEl.ended) {
    radioPaused = false;
    if (!radioPlayStartAt) radioPlayStartAt = Date.now();
    radioAudioEl.play().then(() => render()).catch(() => {
      radioPaused = false;
      playRadioPodcastAt(radioEpisodeIndex);
    });
    render();
    return;
  }
  if (radioPlayMode === "podcast") playRadioPodcastAt(radioEpisodeIndex);
  else playRadioTrackAt(radioIndex);
}

function seekPocketRadio(deltaSeconds) {
  if (!radioAudioEl || !Number.isFinite(radioAudioEl.duration) || radioAudioEl.duration <= 0) {
    notify("请先点击开始播放音频，再使用 5 秒快进/后退。");
    return;
  }
  seekAudioElement(radioAudioEl, deltaSeconds);
  if (radioPlayMode === "podcast") {
    const ep = radioEpisodes[radioEpisodeIndex];
    if (ep) saveAudioBookmark(ep.id, radioAudioEl.currentTime, radioAudioEl.duration);
  }
  notify(deltaSeconds < 0 ? `⏪ 已后退 ${Math.abs(deltaSeconds)} 秒` : `⏩ 已前进 ${deltaSeconds} 秒`);
}

function seekAudioElement(audioEl, deltaSeconds) {
  if (!audioEl || !Number.isFinite(audioEl.duration) || audioEl.duration <= 0) return;
  const next = Math.max(0, Math.min(audioEl.duration - 0.2, (audioEl.currentTime || 0) + deltaSeconds));
  try { audioEl.currentTime = next; } catch {}
  syncAudioScrubbers();
}

function syncAudioScrubbers() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.audio-scrubber-bar').forEach(bar => {
    const kind = bar.dataset.scrubberKind;
    const elA = kind === 'radio' ? radioAudioEl : geminiAudioEl;
    const curEl = bar.querySelector('.scrubber-cur');
    const durEl = bar.querySelector('.scrubber-dur');
    const range = bar.querySelector('.audio-scrubber-range');
    if (!elA || !Number.isFinite(elA.duration) || elA.duration <= 0) return;
    if (curEl) curEl.textContent = fmtAudioClock(elA.currentTime);
    if (durEl) durEl.textContent = fmtAudioClock(elA.duration);
    if (range && document.activeElement !== range) {
      range.max = String(Math.floor(elA.duration));
      range.value = String(Math.floor(elA.currentTime));
    }
  });
}

function buildAudioScrubberBar(kind, audioEl, statusText = '') {
  const bar = div('audio-scrubber-bar');
  bar.dataset.scrubberKind = kind;
  const cur = Number.isFinite(audioEl?.currentTime) ? audioEl.currentTime : 0;
  const dur = Number.isFinite(audioEl?.duration) && audioEl.duration > 0 ? audioEl.duration : 0;
  const topRow = div('audio-scrubber-meta');
  const curSpan = el('span', fmtAudioClock(cur), 'tiny scrubber-cur');
  const statusSpan = el('span', statusText || (dur ? '🎧 长音频就绪' : '⏳ 音频加载中'), 'tts-status-pill');
  const durSpan = el('span', dur ? fmtAudioClock(dur) : '--:--', 'tiny scrubber-dur');
  topRow.append(curSpan, statusSpan, durSpan);

  const controlsRow = div('audio-scrubber-row');
  const skipStep = kind === 'radio' ? 5 : 15;
  const backBtn = btn(`-${skipStep}s`, () => kind === 'radio' ? seekPocketRadio(-5) : seekAudioElement(audioEl, -15), 'btn ghost audio-skip-btn');
  const range = el('input', '', 'audio-scrubber-range');
  range.type = 'range';
  range.min = '0';
  range.max = String(dur ? Math.floor(dur) : 100);
  range.value = String(dur ? Math.floor(cur) : 0);
  range.setAttribute('aria-label', '音频播放进度');
  range.addEventListener('input', () => {
    if (audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      try { audioEl.currentTime = Number(range.value) || 0; } catch {}
      curSpan.textContent = fmtAudioClock(audioEl.currentTime);
    }
  });
  const fwdBtn = btn(`+${skipStep}s`, () => kind === 'radio' ? seekPocketRadio(5) : seekAudioElement(audioEl, 15), 'btn ghost audio-skip-btn');
  controlsRow.append(backBtn, range, fwdBtn);
  bar.append(topRow, controlsRow);
  return bar;
}

function stopPocketRadio(keepOpen = true) {
  if (radioTimer) { clearTimeout(radioTimer); radioTimer = null; }
  if (radioPlaying && radioPlayStartAt) {
    radioSessionLog.activeMs += Math.max(0, Date.now() - radioPlayStartAt);
    radioPlayStartAt = 0;
  }
  radioPlaying = false;
  radioPaused = false;
  radioActiveEngine = "";
  stopRadioAudioElement();
  stopSpeech();
  stopActiveAudio();
  stopLocalAudio();
  if (!keepOpen) radioOpen = false;
  render();
}

function refreshRadioTracks(forceShuffle = false) {
  radioTracks = buildRadioPlaylist({
    channel: radioChannel,
    scope: radioScope,
    activePackId: data.dailyPack?.packId || "",
    shuffle: forceShuffle || radioShuffle,
    items: data.items || [],
    vocabularyPractice: data.dailyPack?.vocabularyPractice || [],
    vocabularyAttempts: [...(data.vocabularyAttempts || []), ...(data.dailyJourney?.vocabularyAttempts || [])],
    speeches: data.speeches || []
  });
  radioEpisodes = buildRadioPodcastEpisodes(radioTracks, { channel: radioChannel, maxChars: 3600 });
  if (radioIndex >= radioTracks.length) radioIndex = 0;
  if (radioEpisodeIndex >= radioEpisodes.length) radioEpisodeIndex = 0;
}

function prefetchNextRadioTrack(nextIdx) {
  // v16.2.0 quota guard: never burn unrequested background API calls in podcast mode or free-tier playback.
  if (radioPlayMode === "podcast") return;
  if (radioVoiceMode !== "gemini" || !radioTracks.length) return;
  const cfg = loadAiConfig();
  if (!isCloudTtsReady(cfg)) return;
  if (radioStopAfterRound && nextIdx >= radioTracks.length) return;
  const wrapped = ((nextIdx % radioTracks.length) + radioTracks.length) % radioTracks.length;
  const nextTrack = radioTracks[wrapped];
  const firstSeg = Array.isArray(nextTrack?.segments) && nextTrack.segments.length ? nextTrack.segments[0] : nextTrack?.text;
  if (firstSeg) {
    const pKey = makeTtsCacheKey(firstSeg, activeTtsVoiceForKey(cfg));
    hasPersistentTtsAudio(pKey).then(cached => {
      if (cached) fetchGeminiAudioUrl(firstSeg, cfg).catch(() => {});
    }).catch(() => {});
  }
}

async function playRadioPodcastAt(epIdx) {
  unlockRadioAudio();
  if (!radioEpisodes.length) refreshRadioTracks();
  if (!radioEpisodes.length) {
    notify("当前频道暂无可播放条目，请切换到「YouTube 励志演讲」或「Notebook 口语与对话」。");
    stopPocketRadio(true);
    return;
  }
  if (radioStopAfterRound && epIdx >= radioEpisodes.length) {
    notify("✓ 本轮整集播客已全部播完并自动停播。");
    stopPocketRadio(true);
    return;
  }
  if (radioSleepDeadline && Date.now() >= radioSleepDeadline) {
    notify("🌙 睡眠定时时间已到，随身电台已自动停止播放。");
    radioSleepDeadline = 0;
    radioSleepMinutes = 0;
    stopPocketRadio(true);
    return;
  }
  radioEpisodeIndex = ((epIdx % radioEpisodes.length) + radioEpisodes.length) % radioEpisodes.length;
  const episode = radioEpisodes[radioEpisodeIndex];
  const myPlayToken = Date.now() + Math.random();
  radioPlaying = myPlayToken;
  radioPaused = false;
  if (!radioPlayStartAt) radioPlayStartAt = Date.now();
  radioSessionLog.clipsPlayed += Math.max(1, episode.trackCount || 1);
  radioSessionLog.lastChannel = `${radioChannel}:podcast`;

  const cfg = loadAiConfig();
  if (radioVoiceMode !== "gemini" || !isCloudTtsReady(cfg)) {
    notify("当前未启用 Gemini 语音，已自动切回逐条离线朗读。");
    radioPlayMode = "single";
    playRadioTrackAt(0);
    return;
  }

  const cacheKey = makeTtsCacheKey(episode.text, activeTtsVoiceForKey(cfg));
  const alreadyCached = geminiAudioCache.has(cacheKey) || await hasPersistentTtsAudio(cacheKey);
  if (radioPlaying !== myPlayToken) return;
  radioAudioStatus = alreadyCached ? "💾 本地已缓存 · 0消耗" : "⏳ 首次合成整集约需 6–15 秒，完成后永久缓存…";
  if (!alreadyCached) notify("⏳ 正在一次性合成整集播客（约 6–15 秒），合成后将永久缓存在本机，以后 0 消耗秒开。");
  render();

  try {
    const entry = await fetchGeminiAudioEntry(episode.text, cfg);
    if (radioPlaying !== myPlayToken) return;
    const usage = getDailyTtsUsage();
    radioAudioStatus = entry.fromCache
      ? "💾 本地永久缓存 · 本次 0 消耗"
      : `✨ 已永久缓存 · 今日已请求 ${usage.count} 次`;
    const audio = ensureRadioAudioElement();
    let lastBmSave = 0;
    const savedPos = loadAudioBookmark(episode.id);
    audio.ontimeupdate = () => {
      syncAudioScrubbers();
      if (Date.now() - lastBmSave > 3000) {
        lastBmSave = Date.now();
        saveAudioBookmark(episode.id, audio.currentTime, audio.duration);
      }
    };
    audio.onloadedmetadata = () => {
      if (savedPos > 3 && Number.isFinite(audio.duration) && savedPos < audio.duration - 5) {
        try { audio.currentTime = savedPos; } catch {}
        notify(`🎧 已自动续播至 ${fmtAudioClock(savedPos)}`);
      }
      syncAudioScrubbers();
    };
    registerMediaSession({
      title: episode.title,
      artist: "言道修炼殿 18.0 整集播客",
      album: data.dailyPack?.title || "English Cultivation",
      onPlay: () => resumePocketRadio(),
      onPause: () => pausePocketRadio(),
      onPrev: () => playRadioPodcastAt(radioEpisodeIndex - 1),
      onNext: () => playRadioPodcastAt(radioEpisodeIndex + 1)
    });
    try {
      if (typeof navigator !== "undefined" && navigator.mediaSession?.setActionHandler) {
        navigator.mediaSession.setActionHandler("seekbackward", () => seekAudioElement(audio, -15));
        navigator.mediaSession.setActionHandler("seekforward", () => seekAudioElement(audio, 15));
      }
    } catch {}
    render();
    const watchdogMs = computeSegmentWatchdogMs(episode.text, radioRate);
    const ok = await playUrlOnRadioAudio(entry.url, radioRate, watchdogMs, myPlayToken, false);
    if (radioPlaying !== myPlayToken) return;
    if (ok) {
      clearAudioBookmark(episode.id);
      if (radioStopAfterRound && radioEpisodeIndex + 1 >= radioEpisodes.length) {
        notify("✓ 本集播客已播完。");
        stopPocketRadio(true);
      } else {
        radioTimer = setTimeout(() => {
          if (radioPlaying === myPlayToken) playRadioPodcastAt(radioEpisodeIndex + 1);
        }, 1200);
      }
    }
  } catch (err) {
    if (radioPlaying !== myPlayToken) return;
    radioAudioStatus = "";
    notify(`Gemini 整集合成暂不可用，已切换本地逐条朗读：${String(err?.message || err).slice(0, 55)}`);
    radioPlayMode = "single";
    playRadioTrackAt(0);
  }
}

function playUrlOnRadioAudio(url, rate, watchdogMs, myPlayToken, revokeAfter = false) {
  return new Promise(resolve => {
    const audio = ensureRadioAudioElement();
    if (!audio || radioPlaying !== myPlayToken) {
      if (revokeAfter) try { URL.revokeObjectURL(url); } catch {}
      resolve(false);
      return;
    }
    let settled = false;
    let wd = null;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (wd) { clearTimeout(wd); wd = null; }
      try { audio.onended = null; audio.onerror = null; } catch {}
      if (revokeAfter) try { URL.revokeObjectURL(url); } catch {}
      resolve(ok);
    };
    const armWatchdog = (ms) => {
      if (wd) clearTimeout(wd);
      wd = setTimeout(() => {
        if (settled) return;
        if (radioPaused && radioPlaying === myPlayToken) {
          armWatchdog(Math.max(15000, Math.min(watchdogMs, 60000)));
          return;
        }
        try { audio.pause(); } catch {}
        finish(true);
      }, ms);
    };
    armWatchdog(watchdogMs);
    const startOn = (elA, allowFresh) => {
      try { elA.onended = null; elA.onerror = null; } catch {}
      elA.muted = false;
      elA.src = url;
      elA.playbackRate = Math.max(0.7, Math.min(1.3, Number(rate) || 0.9));
      activeLocalAudio = elA;
      elA.onended = () => finish(true);
      elA.onerror = () => {
        if (allowFresh && radioPlaying === myPlayToken) {
          const fresh = new Audio();
          fresh.preload = "auto";
          fresh.playsInline = true;
          startOn(fresh, false);
        } else {
          finish(false);
        }
      };
      const playPromise = elA.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          if (allowFresh && radioPlaying === myPlayToken) {
            const fresh = new Audio();
            fresh.preload = "auto";
            fresh.playsInline = true;
            startOn(fresh, false);
          } else {
            finish(false);
          }
        });
      }
    };
    startOn(audio, true);
  });
}

async function playRadioSegment(segText, rate, myPlayToken) {
  if (radioPlaying !== myPlayToken || !segText) return;
  const watchdogMs = computeSegmentWatchdogMs(segText, rate);

  // 1. Gemini TTS priority (with single unlocked <audio> channel + cache)
  if (radioVoiceMode === "gemini") {
    const cfg = loadAiConfig();
    if (isCloudTtsReady(cfg)) {
      try {
        radioActiveEngine = cfg.ttsEngine === "siliconflow" && isSiliconFlowTtsReady(cfg)
          ? `硅基流动 CosyVoice2 (${cfg.siliconflowVoice || SILICONFLOW_TTS_DEFAULT_VOICE})`
          : `Gemini 语音 (${cfg.ttsVoice || "Kore"})`;
        const url = await fetchGeminiAudioUrl(segText, cfg);
        if (radioPlaying !== myPlayToken) return;
        const ok = await playUrlOnRadioAudio(url, rate, watchdogMs, myPlayToken, false);
        if (ok) return;
      } catch (err) { console.warn("Radio Gemini TTS fallback:", err); }
    }
  }
  if (radioPlaying !== myPlayToken) return;

  // 2. Offline Kokoro af_heart clip (also routed through the single unlocked <audio> element)
  try {
    if (typeof getSpeechClip === "function" && typeof indexedDB !== "undefined") {
      const blob = await getSpeechClip(segText, "af_heart");
      if (radioPlaying !== myPlayToken) return;
      if (blob && blob.size > 0) {
        radioActiveEngine = "Kokoro 离线美音";
        const url = URL.createObjectURL(blob);
        const ok = await playUrlOnRadioAudio(url, rate, watchdogMs, myPlayToken, true);
        if (ok) return;
      }
    }
  } catch {}
  if (radioPlaying !== myPlayToken) return;

  // 3. Watchdog-protected Web Speech fallback (prevents iOS Safari silent hang on track 3)
  if (typeof window !== "undefined" && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
    radioActiveEngine = "系统朗读兜底";
    await new Promise(resolve => {
      let settled = false;
      let wd = null;
      const done = () => {
        if (settled) return;
        settled = true;
        if (wd) { clearTimeout(wd); wd = null; }
        resolve();
      };
      wd = setTimeout(() => {
        try { window.speechSynthesis.cancel(); } catch {}
        done();
      }, watchdogMs);
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(segText);
        const voice = selectedSpeechVoice();
        if (voice) utter.voice = voice;
        utter.lang = voice?.lang || "en-US";
        utter.rate = rate;
        utter.onend = done;
        utter.onerror = done;
        window.speechSynthesis.speak(utter);
      } catch { done(); }
    });
  }
}

async function playRadioTrackAt(idx) {
  unlockRadioAudio();
  if (!radioTracks.length) refreshRadioTracks();
  if (!radioTracks.length) {
    notify("当前频道暂无可播放条目，请切换到「YouTube 励志演讲」或「Notebook 口语与对话」。");
    stopPocketRadio(true);
    return;
  }
  if (radioStopAfterRound && idx >= radioTracks.length) {
    notify("✓ 本轮磨耳朵已全部播完并自动停播（防重复模式）。");
    stopPocketRadio(true);
    return;
  }
  if (radioSleepDeadline && Date.now() >= radioSleepDeadline) {
    notify("🌙 睡眠定时时间已到，随身电台已自动停止播放。");
    radioSleepDeadline = 0;
    radioSleepMinutes = 0;
    stopPocketRadio(true);
    return;
  }
  radioIndex = ((idx % radioTracks.length) + radioTracks.length) % radioTracks.length;
  const track = radioTracks[radioIndex];
  const myPlayToken = Date.now() + Math.random();
  radioPlaying = myPlayToken;
  if (!radioPlayStartAt) radioPlayStartAt = Date.now();
  radioSessionLog.clipsPlayed++;
  radioSessionLog.lastChannel = `${radioChannel}:${radioScope}`;

  registerMediaSession({
    title: `${track.badge} · ${track.title}`,
    artist: "言道修炼殿 18.1 随身听 (云端真人语音优先)",
    album: data.dailyPack?.title || "English Cultivation",
    onPlay: () => playRadioTrackAt(radioIndex),
    onPause: () => stopPocketRadio(true),
    onPrev: () => playRadioTrackAt(radioIndex - 1),
    onNext: () => playRadioTrackAt(radioIndex + 1)
  });

  render();
  prefetchNextRadioTrack(radioIndex + 1);

  const segs = Array.isArray(track.segments) && track.segments.length ? track.segments : [track.text];
  for (let i = 0; i < segs.length; i++) {
    if (radioPlaying !== myPlayToken) return;
    await playRadioSegment(segs[i], radioRate, myPlayToken);
    if (radioPlaying !== myPlayToken) return;
    if (i < segs.length - 1) {
      await new Promise(r => { radioTimer = setTimeout(r, 450); });
    }
  }
  if (radioPlaying !== myPlayToken) return;
  const pauseMs = computeShadowPauseMs(track.text, { enabled: radioShadowPause });
  radioTimer = setTimeout(() => {
    if (radioPlaying === myPlayToken) playRadioTrackAt(radioIndex + 1);
  }, pauseMs);
}

function renderPocketRadioDrawer() {
  if (!radioOpen) return el("span", "");
  refreshRadioTracks();
  const isPodcast = radioPlayMode === "podcast";
  const episode = radioEpisodes[radioEpisodeIndex] || null;
  const track = radioTracks[radioIndex] || null;
  const speedPreset = RADIO_SPEED_PRESETS.find(p => Math.abs(p.rate - radioRate) < 0.01) || RADIO_SPEED_PRESETS[1];
  const overlay = div("lexicon-drawer-backdrop");
  const panel = section("lexicon-drawer-panel pocket-radio-panel");
  const head = div("journey-flow-top");
  head.append(
    el("span", "🎧 随身电台 · POCKET RADIO", "eyebrow"),
    btn("✕", () => stopPocketRadio(false), "btn secondary icon-circle-btn")
  );
  head.lastChild.setAttribute("aria-label", "关闭随身电台");
  panel.append(head);

  const chRow = div("radio-channel-grid");
  RADIO_CHANNELS.forEach(ch => {
    const b = btn(ch.label, () => {
      radioChannel = ch.id;
      radioIndex = 0;
      radioEpisodeIndex = 0;
      radioAudioStatus = "";
      refreshRadioTracks();
      if (radioPlaying) {
        if (radioPlayMode === "podcast") playRadioPodcastAt(0);
        else playRadioTrackAt(0);
      } else {
        render();
      }
    }, radioChannel === ch.id ? "btn primary small-btn" : "btn secondary small-btn");
    chRow.append(b);
  });
  panel.append(chRow);

  const nowCard = section("radio-now-playing");
  if (isPodcast && episode) {
    const badgeRow = div("radio-card-meta");
    badgeRow.append(
      el("span", `${episode.badge} · ${radioEpisodeIndex + 1} / ${radioEpisodes.length}`, "chip tiny"),
      el("span", `约 ${episode.estimatedMinutes} 分钟 · 含 ${episode.trackCount} 条`, "tiny")
    );
    const previewText = episode.tracksIncluded.slice(0, 2).map(t => t.title).join(" · ");
    const cachePill = el("span", "⏳ 检测本机缓存…", "tts-status-pill");
    const cfgNow = loadAiConfig();
    const epCacheKey = makeTtsCacheKey(episode.text, activeTtsVoiceForKey(cfgNow));
    const savedEpPos = loadAudioBookmark(episode.id);
    if (geminiAudioCache.has(epCacheKey)) {
      cachePill.textContent = savedEpPos > 3 ? `💾 本地已缓存 · 可从 ${fmtAudioClock(savedEpPos)} 续播` : "💾 本地已缓存 · 离线 0 消耗秒播";
    } else {
      hasPersistentTtsAudio(epCacheKey).then(hit => {
        if (!cachePill.isConnected) return;
        cachePill.textContent = hit
          ? (savedEpPos > 3 ? `💾 本地已缓存 · 可从 ${fmtAudioClock(savedEpPos)} 续播` : "💾 本地已缓存 · 离线 0 消耗秒播")
          : "☁️ 首次播放需 1 次额度，之后永久缓存";
      }).catch(() => {});
    }
    nowCard.append(
      badgeRow,
      h("h3", episode.title),
      cachePill,
      p(`本集连播：${previewText}${episode.trackCount > 2 ? ` 等 ${episode.trackCount} 段内容` : ""}`, "subtle")
    );
    if (radioPlaying || radioPaused || radioAudioStatus) {
      nowCard.append(buildAudioScrubberBar("radio", radioAudioEl, radioAudioStatus));
    }
    const scriptDetails = el("details", "", "radio-episode-script");
    scriptDetails.append(el("summary", `📖 展开查看本集全部英文原文（共 ${episode.trackCount} 条）`));
    const scriptBody = div("radio-script-list");
    episode.tracksIncluded.forEach((item, idx) => {
      const row = div("radio-script-item");
      row.append(
        el("strong", `${idx + 1}. ${item.title}`, "tiny"),
        p(item.text, "tiny"),
        item.subtext ? p(item.subtext, "tiny subtle") : el("span", "")
      );
      scriptBody.append(row);
    });
    scriptDetails.append(scriptBody);
    nowCard.append(scriptDetails);
  } else if (track) {
    const badgeRow = div("radio-card-meta");
    badgeRow.append(
      el("span", `${track.badge} · ${radioIndex + 1} / ${radioTracks.length}`, "chip tiny"),
      el("span", `已听 ${radioSessionLog.clipsPlayed} 条`, "tiny")
    );
    nowCard.append(
      badgeRow,
      h("h3", track.title),
      p(track.text, "vocab-prompt-text"),
      track.subtext ? p(track.subtext, "tiny") : el("span", "")
    );
    if (track.sourceUrl) {
      const srcLink = el("a", "↗ 原视频出处", "tiny");
      srcLink.href = track.sourceUrl;
      srcLink.target = "_blank";
      srcLink.rel = "noopener noreferrer";
      nowCard.append(srcLink);
    }
  } else {
    nowCard.append(p("当前频道暂无可播放条目，可切换「YouTube 励志演讲」或「Notebook 口语与对话」。", "subtle"));
  }
  panel.append(nowCard);

  const controls = div("radio-transport-row");
  const prevBtn = btn("⏮", () => {
    if (isPodcast) playRadioPodcastAt(radioEpisodeIndex - 1);
    else playRadioTrackAt(radioIndex - 1);
  }, "btn secondary radio-icon-btn");
  prevBtn.setAttribute("aria-label", isPodcast ? "上一集" : "上一条");
  const isActivelyPlaying = Boolean(radioPlaying && !radioPaused);
  const playLabel = isActivelyPlaying ? "⏸ 暂停" : (radioPaused ? "▶ 继续" : "▶ 开始");
  const playBtn = btn(playLabel, () => {
    if (isActivelyPlaying) pausePocketRadio();
    else resumePocketRadio();
  }, "btn primary radio-play-btn");
  const rewind5Btn = btn("⏪ 5秒", () => seekPocketRadio(-5), "btn secondary radio-seek-btn");
  rewind5Btn.setAttribute("aria-label", "后退 5 秒");
  const forward5Btn = btn("5秒 ⏩", () => seekPocketRadio(5), "btn secondary radio-seek-btn");
  forward5Btn.setAttribute("aria-label", "前进 5 秒");
  const nextBtn = btn("⏭", () => {
    if (isPodcast) playRadioPodcastAt(radioEpisodeIndex + 1);
    else playRadioTrackAt(radioIndex + 1);
  }, "btn secondary radio-icon-btn");
  nextBtn.setAttribute("aria-label", isPodcast ? "下一集" : "下一条");
  controls.append(prevBtn, rewind5Btn, playBtn, forward5Btn, nextBtn);
  panel.append(controls);

  const quickBar = div("radio-quick-bar");
  quickBar.append(
    btn(isPodcast ? "🎙️ 整集省额" : "🎵 逐条跟读", () => {
      stopPocketRadio(true);
      radioPlayMode = isPodcast ? "single" : "podcast";
      radioAudioStatus = "";
      notify(radioPlayMode === "podcast" ? "已切换为「整集播客·省额模式」（1 次请求连播整频道）。" : "已切换为「逐条跟读模式」。");
      render();
    }, isPodcast ? "btn primary small-btn" : "btn secondary small-btn"),
    btn(`⚡ ${speedPreset.rate}×`, () => {
      const idx = RADIO_SPEED_PRESETS.findIndex(p => Math.abs(p.rate - radioRate) < 0.01);
      const next = RADIO_SPEED_PRESETS[(idx + 1) % RADIO_SPEED_PRESETS.length];
      radioRate = next.rate;
      if (radioAudioEl) try { radioAudioEl.playbackRate = radioRate; } catch {}
      notify(`语速已切换为 ${next.rate}×`);
      render();
    }, "btn secondary small-btn"),
    btn(radioSleepMinutes ? `🌙 ${radioSleepMinutes}分` : "🌙 定时", () => {
      const cycle = [0, 10, 20, 30];
      const nextMin = cycle[(cycle.indexOf(radioSleepMinutes) + 1) % cycle.length];
      radioSleepMinutes = nextMin;
      radioSleepDeadline = nextMin ? Date.now() + nextMin * 60000 : 0;
      notify(nextMin ? `已开启 ${nextMin} 分钟睡眠定时。` : "已关闭睡眠定时。");
      render();
    }, radioSleepMinutes ? "btn primary small-btn" : "btn secondary small-btn")
  );
  panel.append(quickBar);

  const moreDetails = el("details", "", "radio-more-details");
  const usageNow = getDailyTtsUsage();
  moreDetails.append(el("summary", `更多播放选项 · 今日语音请求 ${usageNow.count} 次`));
  const moreOpts = div("radio-quick-bar");
  moreOpts.append(
    btn(radioShuffle ? "🔀 随机:开" : "🔀 顺序", () => {
      radioShuffle = !radioShuffle;
      radioIndex = 0;
      radioEpisodeIndex = 0;
      refreshRadioTracks(radioShuffle);
      render();
    }, radioShuffle ? "btn primary small-btn" : "btn secondary small-btn"),
    btn(radioStopAfterRound ? "⏹ 播完停播" : "🔁 单轮循环", () => {
      radioStopAfterRound = !radioStopAfterRound;
      render();
    }, "btn ghost small-btn"),
    btn(radioVoiceMode === "gemini" ? "切换离线语音" : "切回 Gemini 语音", () => {
      radioVoiceMode = radioVoiceMode === "gemini" ? "local" : "gemini";
      notify(radioVoiceMode === "gemini" ? "已恢复 Gemini 语音连播。" : "已切换为仅本地离线语音。");
      if (radioPlaying) {
        if (radioPlayMode === "podcast" && radioVoiceMode === "gemini") playRadioPodcastAt(radioEpisodeIndex);
        else playRadioTrackAt(radioIndex);
      } else render();
    }, "btn ghost small-btn"),
    btn("🗑 清空语音缓存", async () => {
      await clearPersistentTtsAudio();
      geminiAudioCache.clear();
      radioAudioStatus = "";
      notify("已清空本机语音缓存（不影响任何学习记录与录音）。");
      render();
    }, "btn ghost small-btn")
  );
  if (radioChannel === "weak_sniper" || radioChannel === "sentences_listening") {
    moreOpts.append(
      btn(radioScope === "today" ? "📦 今日" : "📚 全部", () => {
        radioScope = radioScope === "today" ? "all" : "today";
        radioIndex = 0;
        radioEpisodeIndex = 0;
        refreshRadioTracks();
        if (radioPlaying) {
          if (radioPlayMode === "podcast") playRadioPodcastAt(0);
          else playRadioTrackAt(0);
        } else render();
      }, "btn secondary small-btn")
    );
  }
  moreDetails.append(moreOpts);
  panel.append(moreDetails);

  overlay.append(panel);
  overlay.addEventListener("click", e => { if (e.target === overlay) stopPocketRadio(false); });
  return overlay;
}

let zenFocusMode = false;
let readingBlurMode = false;
let retellingRefVisible = {};
let lexiconDrawerOpen = false;
let lexiconQuery = "";
let swWaitingWorker = null;

function toggleZenFocusMode() {
  zenFocusMode = !zenFocusMode;
  if (typeof document !== "undefined") document.body.classList.toggle("zen-focus-mode", zenFocusMode);
  render();
}

function renderPwaUpdateBanner() {
  if (!swWaitingWorker) return el("span", "");
  const banner = section("pwa-update-banner");
  banner.append(
    el("span", "✨ 发现言道修炼殿新版本，点击即可无损更新（不删除任何学习记录与录音）", "tiny"),
    btn("立即无损更新", () => {
      try { swWaitingWorker.postMessage({ type: "SKIP_WAITING" }); } catch {}
      setTimeout(() => window.location.reload(), 350);
    }, "btn primary small-btn")
  );
  return banner;
}

let aiDictReplyText = "";
let aiDictLoading = false;
let aiDictAutoRunQuery = "";
let lastGlobalSelectionText = "";
let lastGlobalSelectionAt = 0;

if (typeof document !== "undefined") {
  document.addEventListener("selectionchange", () => {
    try {
      const picked = String(window.getSelection?.()?.toString() || "").trim();
      if (picked && picked.length <= 200) {
        lastGlobalSelectionText = picked;
        lastGlobalSelectionAt = Date.now();
      }
    } catch {}
  });
}

function captureCurrentSelectionText() {
  try {
    const live = String(window.getSelection?.()?.toString() || "").trim();
    if (live && live.length <= 200) {
      lastGlobalSelectionText = live;
      lastGlobalSelectionAt = Date.now();
      return live;
    }
  } catch {}
  if (lastGlobalSelectionText && Date.now() - lastGlobalSelectionAt < 30000) return lastGlobalSelectionText;
  return "";
}

function openAiLexiconDrawer(explicitText = "") {
  const picked = String(explicitText || captureCurrentSelectionText() || selectedText || "").trim();
  if (picked) {
    if (picked !== lexiconQuery) aiDictReplyText = "";
    lexiconQuery = picked;
    aiDictAutoRunQuery = picked;
  }
  lexiconDrawerOpen = true;
  render();
}

function makeAiLookupTriggerButton(className = "btn ghost small-btn") {
  const b = btn("🔍 AI 查词", () => openAiLexiconDrawer(), className);
  const snap = () => captureCurrentSelectionText();
  b.addEventListener("pointerdown", snap);
  b.addEventListener("touchstart", snap, { passive: true });
  return b;
}

function renderOfflineLexiconDrawer() {
  if (!lexiconDrawerOpen) return el("span", "");
  const overlay = div("lexicon-drawer-backdrop");
  const panel = section("lexicon-drawer-panel");
  const head = div("journey-flow-top");
  head.append(
    el("span", "🔍 AI 全英文词典与自由教练 · AI COACH (18.1.0)", "eyebrow"),
    btn("关闭 ✕", () => { lexiconDrawerOpen = false; render(); }, "btn secondary small-btn")
  );
  const input = textInput(lexiconQuery, "长按选中页面单词后点「AI 查词」，或直接输入英文词/短语……");
  input.setAttribute("aria-label", "AI 全英文词典输入框");
  const aiOut = div("ai-tutor-output");
  aiOut.hidden = !aiDictReplyText && !aiDictLoading;
  const renderAiOut = () => {
    aiOut.hidden = !aiDictReplyText && !aiDictLoading;
    if (aiDictLoading) {
      aiOut.replaceChildren(p("🤖 正在连线你的 Google AI 导师生成纯英文词典精讲……", "tiny"));
    } else if (aiDictReplyText) {
      const headRow = div("ai-tutor-head-row");
      headRow.append(
        el("div", "🤖 AI 全英文释义与搭配 · ENGLISH-TO-ENGLISH", "eyebrow"),
        btn("收起 ✕", () => { aiDictReplyText = ""; renderAiOut(); }, "btn ghost small-btn")
      );
      aiOut.replaceChildren(
        headRow,
        renderFormattedAiText(aiDictReplyText),
        btn("🔊 Gemini 朗读释义", () => speakWithGeminiOrFallback(String(aiDictReplyText || "").replace(/[#*`_-]+/g, " ").slice(0, 650)), "btn ghost small-btn")
      );
    }
  };
  renderAiOut();

  const runAiLookup = async () => {
    const q = input.value.trim();
    lexiconQuery = q;
    if (!q) { notify("请先输入要查的英文单词或问题。"); return; }
    if (!isAiTutorReady()) {
      aiDictReplyText = "尚未配置 Google AI API Key。请点击下方按钮前往「设置 → 随身 AI 导师」粘贴你的 Key。";
      renderAiOut();
      aiOut.append(btn("去设置粘贴 Google AI Key →", () => { lexiconDrawerOpen = false; setPage("settings"); }, "btn primary small-btn"));
      return;
    }
    aiDictLoading = true;
    renderAiOut();
    try {
      const mode = window.__yandaoAiDrawerMode || 'auto';
      if (mode === 'grammar') {
        aiDictReplyText = await askAiCheckGrammar({ prompt: 'Quick Grammar / Your Turn Check', userAnswer: q });
      } else if (mode === 'writing') {
        aiDictReplyText = await askAiCritiqueOutput({ prompt: 'Quick Micro-Writing / Sentence Imitation', userAnswer: q });
      } else if (mode === 'speaking') {
        aiDictReplyText = await askAiSpeakingDemoCoach({ prompt: 'IELTS Speaking / Kids English Demo Practice', userTranscript: q });
      } else {
        const isSentenceQ = q.split(/\s+/).length >= 5;
        aiDictReplyText = isSentenceQ
          ? await askAiFreeTutor({ question: q, pageContext: data.dailyPack?.title || "" })
          : await askAiDictionary({ query: q, context: selectedParagraphText || "" });
      }
    } catch (err) {
      aiDictReplyText = `AI 查询失败：${String(err?.message || err)}`;
    } finally {
      aiDictLoading = false;
      renderAiOut();
    }
  };

  const modeBar = lines(
    ...[['auto','🔍 查词/问答'],['grammar','📐 语法批改'],['writing','✍️ 微写作精批'],['speaking','🎤 口语/试讲点评']].map(([m, label]) => {
      const active = (window.__yandaoAiDrawerMode || 'auto') === m;
      return btn(label, () => { window.__yandaoAiDrawerMode = m; render(); }, active ? "btn secondary small-btn" : "btn ghost small-btn");
    })
  );
  const actionRow = lines(
    modeBar,
    btn("🤖 AI 纯英文精查 / 批改", runAiLookup, "btn primary small-btn"),
    btn("🔊 Gemini 朗读查询词", () => { if (input.value.trim()) speakWithGeminiOrFallback(input.value.trim()); }, "btn ghost small-btn")
  );
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); runAiLookup(); } });
  if (aiDictAutoRunQuery && aiDictAutoRunQuery === lexiconQuery && !aiDictLoading) {
    aiDictAutoRunQuery = "";
    setTimeout(() => runAiLookup(), 0);
  }

  const listBox = div("lexicon-results-list");
  const updateList = q => {
    lexiconQuery = q;
    listBox.replaceChildren();
    const hits = lookupOfflineLexicon(q, {
      items: data.items || [],
      vocabularyPractice: data.dailyPack?.vocabularyPractice || [],
      originalWordArchive: data.dailyPack?.originalWordArchive || []
    });
    if (!hits.length) {
      if (q.trim().length >= 2) listBox.append(p("本机词包暂无该词条，直接点上方「🤖 AI 纯英文精查」获取权威英文释义与例句。", "tiny"));
      return;
    }
    hits.forEach(entry => {
      const card = div("lexicon-hit-card");
      const titleRow = div("journey-flow-top");
      titleRow.append(h("strong", entry.headword), btn("🔊 朗读", () => speakEnglish(entry.headword), "btn ghost small-btn"));
      card.append(titleRow);
      if (entry.senseEn) card.append(p(entry.senseEn, "tiny"));
      if (entry.example) card.append(p(`Example: ${entry.example}`, "hint"));
      const foot = div("journey-flow-top");
      foot.append(el("span", `${entry.source} · ${entry.status}`, "chip tiny"));
      const matchedItem = (data.items || []).find(i => i.kind === "word" && normalized(i.target) === normalized(entry.headword));
      if (matchedItem && matchedItem.status !== "N") {
        foot.append(btn("标为待复习", () => {
          matchedItem.status = "V";
          matchedItem.dueAt = new Date().toISOString();
          data.manualReviewMarks = [...(data.manualReviewMarks || []).filter(m => m.word !== matchedItem.target), { word: matchedItem.target, itemId: matchedItem.id, markedAt: new Date().toISOString(), packId: data.dailyPack?.packId || null, source: "ai_lexicon_lookup" }];
          if (save()) { notify(`已将「${matchedItem.target}」加入待复习并同步至战报。`); updateList(lexiconQuery); }
        }, "btn ghost small-btn"));
      }
      card.append(foot);
      listBox.append(card);
    });
  };
  input.addEventListener("input", () => updateList(input.value));
  panel.append(head, input, actionRow, aiOut, listBox);
  updateList(lexiconQuery);
  overlay.append(panel);
  return overlay;
}

function renderDictationAssistButton(targetInput, onUpdated = null) {
  const cap = dictationCapability();
  if (!cap.supported) return el("span", "");
  let ctrl = null;
  let active = false;
  const b = btn("🎙️ 语音转英文草稿", () => {
    if (active && ctrl) {
      ctrl.stop();
      active = false;
      b.textContent = "🎙️ 语音转英文草稿";
      return;
    }
    ctrl = createDictationController({
      lang: "en-US",
      onTranscript: combined => {
        targetInput.value = combined;
        if (typeof onUpdated === "function") onUpdated(combined);
      },
      onEnd: () => {
        active = false;
        b.textContent = "🎙️ 语音转英文草稿";
      },
      onError: () => {
        active = false;
        b.textContent = "🎙️ 语音转英文草稿";
        notify("浏览器语音转写暂时不可用，请继续使用文字或录音。");
      }
    });
    if (ctrl.start(targetInput.value)) {
      active = true;
      b.textContent = "⏹ 停止语音转写";
      notify("正在转写英文草稿（仅作输入辅助，不代表发音评分）。");
    }
  }, "btn ghost small-btn");
  return b;
}

function renderCultivationHeatmapSvg() {
  const hm = buildCultivationHeatmap(data.sessions || [], { days: 90, now: new Date() });
  const box = section("panel soft v12-heatmap-panel");
  box.append(
    el("div", "90 天真实修炼热力图 · CULTIVATION PULSE (12.0)", "eyebrow"),
    h("h2", `近 90 天累计活跃 ${hm.activeDays} 天 · 真实训练 ${hm.totalMinutes} 分钟${hm.currentStreak ? ` · 当前连修 ${hm.currentStreak} 天` : ""}`),
    p("每一格均来自本机真实前台计时记录，绝不虚构任何打卡天数。", "tiny")
  );
  const cols = 15, cellSize = 14, gap = 4;
  const rows = Math.ceil(hm.cells.length / cols);
  const width = cols * (cellSize + gap) + 8;
  const height = rows * (cellSize + gap) + 8;
  const fills = ["#e7e5e4", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"];
  const rects = hm.cells.map((cell, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 4 + col * (cellSize + gap);
    const y = 4 + row * (cellSize + gap);
    const fill = fills[cell.level] || fills[0];
    return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fill}"><title>${cell.date}: ${cell.minutes} 分钟</title></rect>`;
  }).join("");
  const wrap = div("svg-viz-wrap");
  wrap.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="90天真实学习热力图">${rects}</svg>`;
  box.append(wrap);
  return box;
}

function renderFsrsForecastPanel() {
  const fc = buildFsrsForecast(data.attempts || [], data.items || [], { horizonDays: 7, now: new Date() });
  const box = section("panel soft v12-forecast-panel");
  box.append(
    el("div", "FSRS 6.3.2 未来 7 天记忆遗忘预测 · RETENTION RADAR (12.0)", "eyebrow"),
    h("h2", `已追踪 ${fc.trackedCards} 张独立回忆卡 · 平均记忆稳定度 ${fc.avgStabilityDays} 天`),
    p("只统计真实独立回忆（已剔除触控选择与提示作答）；柱越高代表当天到期复习卡片越多。", "tiny")
  );
  const maxVal = Math.max(1, ...fc.dailyBuckets.map(b => b.dueCount));
  const w = 420, hSvg = 140, barW = 36, padL = 24, padB = 28;
  const bars = fc.dailyBuckets.map((b, i) => {
    const x = padL + i * 54;
    const barH = Math.max(4, Math.round((b.dueCount / maxVal) * 84));
    const y = hSvg - padB - barH;
    const fill = i === 0 && b.dueCount > 0 ? "#d97706" : "#1e3a5f";
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" fill="${fill}"/><text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="currentColor">${b.dueCount}</text><text x="${x + barW / 2}" y="${hSvg - 8}" text-anchor="middle" font-size="10" fill="currentColor">${b.label}</text>`;
  }).join("");
  const wrap = div("svg-viz-wrap");
  wrap.innerHTML = `<svg viewBox="0 0 ${w} ${hSvg}" width="100%" role="img" aria-label="未来7天FSRS复习负载预测">${bars}</svg>`;
  box.append(wrap);
  if (fc.topRiskCards.length) {
    const riskList = div("risk-card-chips");
    fc.topRiskCards.slice(0, 8).forEach(rc => {
      riskList.append(el("span", `${rc.target}（稳定度 ${rc.stabilityDays}天）`, "chip tiny"));
    });
    box.append(p("高危遗忘预警 Top 词卡：", "tiny"), riskList, btn("一键急救高危词", () => startSession("words", { scope: "difficult" }), "btn secondary small-btn"));
  }
  return box;
}

async function pruneHistoricalSpeechCache() {
  if (typeof indexedDB === "undefined") { notify("当前环境不支持 IndexedDB 清理。"); return; }
  try {
    const activePackId = data.dailyPack?.packId || "";
    const req = indexedDB.open("english-cultivation-audio-v1", 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("clips")) { notify("本机暂无历史语音缓存需要清理。"); return; }
      const tx = db.transaction("clips", "readwrite");
      const store = tx.objectStore("clips");
      const getAll = store.getAll();
      getAll.onsuccess = () => {
        const rows = Array.isArray(getAll.result) ? getAll.result : [];
        let deleted = 0;
        for (const row of rows) {
          if (activePackId && row.packId === activePackId) continue;
          if (!activePackId) continue;
          store.delete(row.key || row.sha256 || row.id);
          deleted++;
        }
        notify(deleted ? `已安全清理 ${deleted} 条非当前学习包的历史旧音频缓存（当前包音频、口语录音与 K/V/N 记录均完好保留）。` : "未发现可清理的非当前学习包旧音频缓存。");
      };
    };
    req.onerror = () => notify("读取语音缓存库失败，未修改任何数据。");
  } catch {
    notify("历史语音清理暂不可用，未影响学习数据。");
  }
}

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration?.().then(reg => {
    if (!reg) return;
    if (reg.waiting) { swWaitingWorker = reg.waiting; render(); }
    reg.addEventListener("updatefound", () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          swWaitingWorker = installing;
          render();
        }
      });
    });
  }).catch(() => {});
}

let lastAutoPlayedKey = "";
function triggerAutoPlayIfEnabled(key, text, audioUrl = "") {
  if (!data?.settings?.autoPlayAudio || !key || lastAutoPlayedKey === key) return;
  lastAutoPlayedKey = key;
  registerMediaSession({ title: `${data.dailyPack?.title || '言道修炼殿'} · ${key}`, artist: 'Kokoro af_heart Offline Audio', onPlay: () => audioUrl ? playReferenceAudio(audioUrl, text) : speakEnglish(text), onPause: () => { stopSpeech(); stopActiveAudio(); } });
  setTimeout(() => {
    if (audioUrl) playReferenceAudio(audioUrl, text);
    else if (text) speakEnglish(text);
  }, 60);
}
function renderJourneyFlowRibbon(activeStage = "") {
  const j = data?.dailyJourney;
  if (!j || j.finishedAt || !Array.isArray(j.steps) || !j.steps.length) return el("span", "");
  const bar = section("journey-flow-ribbon");
  const topRow = div("journey-flow-top");
  const titleSpan = el("span", "今日唯一学习流 · ONE-FLOW JOURNEY", "eyebrow");
  const autoPlayBtn = btn(
    data.settings?.autoPlayAudio ? "🎧 切题自动播音：已开启" : "🎧 切题自动播音：关闭",
    () => {
      data.settings.autoPlayAudio = !data.settings.autoPlayAudio;
      lastAutoPlayedKey = "";
      if (save()) render();
    },
    data.settings?.autoPlayAudio ? "btn secondary small-btn" : "btn ghost small-btn"
  );
  const saveBadge = el("span", "🔒 每步自动存盘", "chip tiny");
  topRow.append(titleSpan, div("journey-flow-controls"));
  const lexBtn = makeAiLookupTriggerButton('btn ghost small-btn');
  const zenBtn = btn(zenFocusMode ? '🧘 退出专注' : '🧘 专注', toggleZenFocusMode, 'btn ghost small-btn');
  topRow.lastChild.append(autoPlayBtn, lexBtn, zenBtn, saveBadge);
  const pills = div("journey-flow-pills");
  j.steps.forEach((step, idx) => {
    const isDone = (j.completed || []).some(c => c.stage === step && c.status === "completed") || idx < j.index;
    const isCurrent = step === activeStage || idx === j.index;
    const pill = el("span", `${isDone ? "✓ " : `${idx + 1}. `}${JOURNEY_LABELS[step] || step}`, `journey-flow-pill${isCurrent ? " is-active" : isDone ? " is-done" : ""}`);
    pills.append(pill);
  });
  bar.append(topRow, pills);
  return bar;
}
function renderDiscourseDiagnosticCard(userText, { referenceText = "", targetPhrases = [] } = {}) {
  const cleaned = String(userText || "").trim();
  if (!cleaned) return el("span", "");
  const packTargets = [
    ...(data.dailyPack?.vocabularyPractice || []).map(t => t.target).filter(Boolean),
    ...todayPackItems().filter(i => i.kind === "word").map(i => i.target).filter(Boolean)
  ];
  const diag = analyzeDiscourseAndChunks(cleaned, { referenceText, targetPhrases, packTargets });
  const card = section("discourse-xray-card");
  card.append(
    el("div", "零幻觉表达体检 · EXPRESSION X-RAY (11.0)", "eyebrow"),
    h("h4", `客观统计：${diag.wordCount} 词 · ${diag.sentenceCount} 句 · 均句长 ${diag.avgSentenceWords} 词 · 词汇多样性 ${Math.round(diag.lexicalDiversity * 100)}%`),
    p(diag.integrityNotice, "tiny")
  );
  const grid = div("cdtl-compare-grid");
  const hitCol = div("cdtl-col cdtl-correct");
  hitCol.append(
    el("div", "已命中目标词块与衔接词", "eyebrow"),
    p(diag.targetHits.length ? `题目目标词块命中：${diag.targetHits.join(" · ")}` : "题目指定词块：暂未检出直接命中", "tiny"),
    p(diag.packHits.length ? `今日词包主动复用：${diag.packHits.join(" · ")}` : "今日词包复用：可尝试融入今日新词", "tiny"),
    p(diag.cohesionUsed.length ? `逻辑衔接词（${diag.cohesionCategoryCount} 类）：${diag.cohesionUsed.join(" · ")}` : "逻辑衔接词：未检出显式转折/因果/举例连接词", "tiny")
  );
  grid.append(hitCol);
  const upCol = div("cdtl-col cdtl-distractor");
  upCol.append(
    el("div", "可吸收的参考升级锚点", "eyebrow"),
    p(diag.targetMissed.length ? `未用目标表达：${diag.targetMissed.join(" · ")}` : "目标表达已全部覆盖！", "tiny"),
    p(diag.upgradeSuggestions.length ? `参考高阶词块建议：${diag.upgradeSuggestions.map(s => s.expression).join(" · ")}` : "参考答案核心词块已充分覆盖", "tiny")
  );
  grid.append(upCol);
  card.append(grid);
  return card;
}
let migrationNotice='';let selectedReadingId=null;let selectedSpeechId=null;let selectedText='';let selectedParagraphText='';let selectedParagraphIndex=0;let availableVoices=[];let speechVoicesBound=false;let speechQueue=[];let speechQueueIndex=0;let speechPaused=false;
let data=load();
applyTheme();
// Curate real, neutral US female voices; never expose Apple's novelty character/effect voices.
// This is a display filter, not a claim that the system voices are neural or premium.
function refreshSpeechVoices(){if(!('speechSynthesis'in window))return [];const voices=window.speechSynthesis.getVoices().filter(voice=>voice&&/^en[-_]\w+/i.test(voice.lang||''));availableVoices=voices.sort((a,b)=>{const aUS=/^en[-_]US(?:[-_]|$)/i.test(a.lang||''),bUS=/^en[-_]US(?:[-_]|$)/i.test(b.lang||'');return Number(bUS)-Number(aUS);});return availableVoices;}
function refreshSpeechVoiceUi(){refreshSpeechVoices();}
function initSpeechVoices(){if(!('speechSynthesis'in window))return;refreshSpeechVoices();if(!speechVoicesBound){speechVoicesBound=true;window.speechSynthesis.addEventListener?.('voiceschanged',refreshSpeechVoiceUi);}}
window.addEventListener('pageshow',()=>{initSpeechVoices();refreshSpeechVoiceUi();});
function selectedSpeechVoice(){initSpeechVoices();const saved=data.settings?.speechVoiceURI;if(saved){const exact=availableVoices.find(voice=>speechVoiceKey(voice)===saved);if(exact)return exact;}return availableVoices.find(voice=>/^en[-_]US(?:[-_]|$)/i.test(voice.lang||'')&&voice.localService)||availableVoices.find(voice=>voice.localService)||availableVoices[0]||null;}
function speechVoiceKey(voice){return String(voice.voiceURI||`${voice.name}|${voice.lang}`);}
function speechVoiceLabel(voice){return `${voice.name} (${voice.lang})`;}
function speechChunks(text){const sentences=String(text||'').replace(/\s+/g,' ').trim().match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[];const chunks=[];let current='';for(const sentence of sentences){const next=current?`${current} ${sentence.trim()}`:sentence.trim();if(current&&next.length>280){chunks.push(current);current=sentence.trim();}else current=next;}if(current)chunks.push(current);return chunks.length?chunks:[String(text||'').trim()];}
function playSpeechChunk(){if(!('speechSynthesis'in window)||speechPaused)return;if(speechQueueIndex>=speechQueue.length){speechQueue=[];speechQueueIndex=0;speechPaused=false;syncReadingPlayButtons();return;}const value=speechQueue[speechQueueIndex];const utter=new SpeechSynthesisUtterance(value);const voice=selectedSpeechVoice();utter.lang=voice?.lang||'en-US';if(voice)utter.voice=voice;utter.rate=Math.max(.5,Math.min(1.5,Number(data.settings.speechRate)||.9));utter.onstart=()=>syncReadingPlayButtons();utter.onend=()=>{speechQueueIndex++;playSpeechChunk();};utter.onerror=()=>{speechQueue=[];speechQueueIndex=0;speechPaused=false;syncReadingPlayButtons();notify('朗读失败，仍可继续文字学习。');};window.speechSynthesis.speak(utter);syncReadingPlayButtons();}
function speakDevice(text){const value=String(text||'').trim();if(!value)return false;if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){notify('当前文字没有自然配音，且此浏览器不支持设备朗读。');return false;}stopSpeech();initSpeechVoices();speechQueue=speechChunks(value);speechQueueIndex=0;speechPaused=false;playSpeechChunk();return true;}
async function speakNaturalOrDevice(text,segments=null,{silentMissing=false}={}){const values=Array.isArray(segments)&&segments.length?segments.filter(Boolean):[String(text||'').trim()];if(!values.some(Boolean))return false;stopSpeech();try{naturalSpeechPlayer??=createClipPlayer({onStatus:message=>notify(message)});const result=await naturalSpeechPlayer.speakSegments(values,'af_heart');if(result==='playing'||result==='ready'||result==='paused')return true;if(result==='cancelled')return false;if(result==='missing'&&!silentMissing)notify('这段内容尚未准备自然语音，已切换设备朗读。');}catch(error){if(!silentMissing)notify(`自然语音播放失败，已切换设备朗读：${error.message}`);}return speakDevice(values.join(' '));}
let geminiAudioEl=null;let readingGeminiAudioEl=null;let readingAudioUnlocked=false;let geminiPlaybackToken=0;let activeReadingBookmarkId='';const geminiAudioCache=new Map();
function ensureReadingGeminiAudio(){if(!readingGeminiAudioEl){readingGeminiAudioEl=new Audio();readingGeminiAudioEl.preload='auto';readingGeminiAudioEl.playsInline=true;readingGeminiAudioEl.setAttribute('playsinline','');readingGeminiAudioEl.setAttribute('webkit-playsinline','');}return readingGeminiAudioEl;}
function unlockReadingGeminiAudio(){try{if(typeof navigator!=='undefined'&&navigator.audioSession&&'type'in navigator.audioSession)navigator.audioSession.type='playback';}catch{}const a=ensureReadingGeminiAudio();if(!readingAudioUnlocked){try{a.src=getSilentWavBlobUrl();const p=a.play();if(p&&typeof p.then==='function')p.then(()=>{readingAudioUnlocked=true;}).catch(()=>{});}catch{}}}
function geminiSpeechChunks(text){const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return [];if(clean.length<=3800)return [clean];const sentences=clean.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[clean];const chunks=[];let current='';for(const sentence of sentences){const s=sentence.trim();if(!s)continue;const next=current?`${current} ${s}`:s;if(current&&next.length>3800){chunks.push(current);current=s;}else current=next;}if(current)chunks.push(current);return chunks;}
function isSpeechCurrentlyPlaying(){return Boolean((geminiAudioEl&&!geminiAudioEl.paused&&!geminiAudioEl.ended)||(speechQueue.length>0&&!speechPaused&&typeof window!=="undefined"&&"speechSynthesis"in window&&window.speechSynthesis.speaking));}
function isSpeechCurrentlyPaused(){return Boolean((geminiAudioEl&&geminiAudioEl.paused&&!geminiAudioEl.ended)||(speechQueue.length>0&&speechPaused));}
function syncReadingPlayButtons(){if(typeof document==="undefined")return;const playing=isSpeechCurrentlyPlaying();document.querySelectorAll(".reading-play-toggle").forEach(b=>{b.textContent=playing?"⏸":"▶";b.setAttribute("aria-pressed",playing?"true":"false");b.title=playing?"暂停朗读":"朗读英文文章";});}
function stopGeminiAudio(){geminiPlaybackToken++;readingAudioStatus='';activeReadingBookmarkId='';if(geminiAudioEl){try{geminiAudioEl.onplay=null;geminiAudioEl.onpause=null;geminiAudioEl.onended=null;geminiAudioEl.onerror=null;geminiAudioEl.ontimeupdate=null;geminiAudioEl.onloadedmetadata=null;geminiAudioEl.pause();geminiAudioEl.currentTime=0;}catch{}geminiAudioEl=null;}syncReadingPlayButtons();syncAudioScrubbers();}
function activeTtsVoiceForKey(cfg){return cfg?.ttsEngine==='siliconflow'&&isSiliconFlowTtsReady(cfg)?`sf:${cfg.siliconflowVoice||SILICONFLOW_TTS_DEFAULT_VOICE}`:(cfg?.ttsVoice||'Kore');}
async function fetchGeminiAudioEntry(chunkText,cfg){const voiceTag=activeTtsVoiceForKey(cfg);const cacheKey=makeTtsCacheKey(chunkText,voiceTag);if(geminiAudioCache.has(cacheKey))return {url:geminiAudioCache.get(cacheKey),fromCache:true,modelUsed:'memory'};const persisted=await readPersistentTtsAudio(cacheKey);if(persisted?.blob){const url=URL.createObjectURL(persisted.blob);geminiAudioCache.set(cacheKey,url);return {url,fromCache:true,modelUsed:persisted.modelUsed||'indexeddb'};}const result=await synthesizeCloudSpeech(chunkText,cfg);recordTtsApiCall(result.modelUsed);const blob=new Blob([result.bytes],{type:result.mimeType||'audio/wav'});writePersistentTtsAudio(cacheKey,{blob,mimeType:result.mimeType||'audio/wav',modelUsed:result.modelUsed||''}).catch(()=>{});const url=URL.createObjectURL(blob);if(geminiAudioCache.size>=60){const oldestKey=geminiAudioCache.keys().next().value;const oldestUrl=geminiAudioCache.get(oldestKey);if(oldestUrl)try{URL.revokeObjectURL(oldestUrl);}catch{}geminiAudioCache.delete(oldestKey);}geminiAudioCache.set(cacheKey,url);return {url,fromCache:false,modelUsed:result.modelUsed||''};}
async function fetchGeminiAudioUrl(chunkText,cfg){const entry=await fetchGeminiAudioEntry(chunkText,cfg);return entry.url;}
async function speakWithGeminiOrFallback(text,{segments=null,silentFallback=false}={}){const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return false;const cfg=loadAiConfig();if(!isCloudTtsReady(cfg)){if(!silentFallback)notify('尚未配置云端语音 API Key，已使用本地朗读。');return speakNaturalOrDevice(clean,segments);}stopSpeech();unlockReadingGeminiAudio();const token=++geminiPlaybackToken;const chunks=geminiSpeechChunks(clean);if(!chunks.length)return false;try{const firstKey=makeTtsCacheKey(chunks[0],activeTtsVoiceForKey(cfg));const firstCached=geminiAudioCache.has(firstKey)||await hasPersistentTtsAudio(firstKey);readingAudioStatus=firstCached?'💾 本地永久缓存 · 0消耗':'⏳ 首次合成整篇约需 5–12 秒，完成后永久缓存…';notify(firstCached?'🔊 秒开本机缓存的 Gemini 语音…':'⏳ 正在一次性合成整篇语音（约 5–12 秒），完成后将永久缓存在本机。');if(page==='reading')render();let nextPromise=fetchGeminiAudioEntry(chunks[0],cfg);const audio=ensureReadingGeminiAudio();for(let i=0;i<chunks.length;i++){if(token!==geminiPlaybackToken)return false;const entry=await nextPromise;if(token!==geminiPlaybackToken||!entry?.url)return false;const usage=getDailyTtsUsage();readingAudioStatus=entry.fromCache?'💾 本地永久缓存 · 本次 0 消耗':`✨ 已永久缓存 · 今日已请求 ${usage.count} 次`;if(i+1<chunks.length)nextPromise=fetchGeminiAudioEntry(chunks[i+1],cfg).catch(()=>null);await new Promise((resolve,reject)=>{const rate=Math.max(0.75,Math.min(1.25,Number(data.settings.speechRate)||1));const startOn=(elA,allowFresh)=>{elA.onplay=null;elA.onpause=null;elA.onended=null;elA.onerror=null;let lastReadBm=0;const readBmId='reading:'+(selectedReadingId||firstKey);if(i===0)activeReadingBookmarkId=readBmId;const readSavedPos=i===0?loadAudioBookmark(readBmId):0;elA.ontimeupdate=()=>{syncAudioScrubbers();if(i===0&&Date.now()-lastReadBm>3000){lastReadBm=Date.now();saveAudioBookmark(readBmId,elA.currentTime,elA.duration);}};elA.onloadedmetadata=()=>{if(readSavedPos>3&&Number.isFinite(elA.duration)&&readSavedPos<elA.duration-5){try{elA.currentTime=readSavedPos;}catch{}notify(`🎧 已从 ${fmtAudioClock(readSavedPos)} 续播`);}syncAudioScrubbers();};elA.src=entry.url;elA.playbackRate=rate;geminiAudioEl=elA;registerMediaSession({title:'阅读文章朗读',artist:'言道修炼殿 18.0 云端语音',album:data.dailyPack?.title||'Reading Chamber',onPlay:()=>resumeSpeech(),onPause:()=>pauseSpeech()});try{if(typeof navigator!=='undefined'&&navigator.mediaSession?.setActionHandler){navigator.mediaSession.setActionHandler('seekbackward',()=>seekAudioElement(elA,-15));navigator.mediaSession.setActionHandler('seekforward',()=>seekAudioElement(elA,15));}}catch{}elA.onplay=()=>{syncReadingPlayButtons();if(page==='reading')render();};elA.onpause=()=>{syncReadingPlayButtons();syncAudioScrubbers();};elA.onended=()=>{if(i===0)clearAudioBookmark(readBmId);if(geminiAudioEl===elA){geminiAudioEl=null;activeReadingBookmarkId='';}syncReadingPlayButtons();resolve();};elA.onerror=()=>{if(allowFresh){startOn(new Audio(),false);}else reject(Error('音频解码或播放失败'));};elA.play().catch(err=>{if(allowFresh){startOn(new Audio(),false);}else reject(err);});};startOn(audio,true);});}return true;}catch(error){if(token!==geminiPlaybackToken)return false;readingAudioStatus='';stopGeminiAudio();if(!silentFallback)notify(`Gemini 语音暂不可用，已切换本地朗读：${String(error?.message||error).slice(0,55)}`);return speakNaturalOrDevice(clean,segments,{silentMissing:true});}}
function speakEnglish(text,voiceOverride=null,segments=null){return void speakNaturalOrDevice(text,segments);}
function pauseSpeech(){if(geminiAudioEl&&!geminiAudioEl.paused){if(activeReadingBookmarkId&&Number.isFinite(geminiAudioEl.currentTime))saveAudioBookmark(activeReadingBookmarkId,geminiAudioEl.currentTime,geminiAudioEl.duration);try{geminiAudioEl.pause();}catch{}}naturalSpeechPlayer?.pause();if('speechSynthesis'in window){speechPaused=true;window.speechSynthesis.pause();}syncReadingPlayButtons();}
function resumeSpeech(){if(geminiAudioEl&&geminiAudioEl.paused){geminiAudioEl.play().then(()=>syncReadingPlayButtons()).catch(()=>{});return;}naturalSpeechPlayer?.resume();if('speechSynthesis'in window){speechPaused=false;window.speechSynthesis.resume();if(!window.speechSynthesis.speaking&&speechQueueIndex<speechQueue.length)playSpeechChunk();}syncReadingPlayButtons();}
function emptyData(){return {version:VERSION,items:[],attempts:[],sessions:[],reports:[],readings:[],speeches:[],speechAttempts:[],speechProgress:{},speechTransferAttempts:[],speechTransferHints:{},readingMarks:[],readingChecks:[],readingRetellingAttempts:[],weaknesses:[],transferAttempts:[],listeningDiagnosticAttempts:[],vocabularyAttempts:[],dailyPack:null,dailyJourney:null,paperStoryPractice:null,packHistory:[],activeSession:null,settings:{duration:40,speechRate:0.9,theme:'system',chineseHints:false,onboardingSeen:false,retryAfterError:true,newLimit:10,reviewLimit:20}};}
function load(){
  try{
    const raw=localStorage.getItem(STORE);
    if(raw){
      const obj=JSON.parse(raw);const safe=migrateBackupPayload(obj);
      if(obj.activeSession && typeof obj.activeSession==='object' && Array.isArray(obj.activeSession.queue)) safe.activeSession={...obj.activeSession,running:false,lastTick:null};
      safe.settings={retryAfterError:true,newLimit:10,reviewLimit:20,...safe.settings};safe.readings=safe.readings||[];safe.speeches=safe.speeches||[];safe.speechAttempts=safe.speechAttempts||[];safe.speechProgress=safe.speechProgress||{};safe.speechTransferAttempts=safe.speechTransferAttempts||[];safe.speechTransferHints=safe.speechTransferHints||{};safe.readingMarks=mergeReadingMarks(safe.readingMarks||[]);safe.readingChecks=safe.readingChecks||[];safe.weaknesses=mergeWeaknesses(safe.weaknesses||[],[]);safe.transferAttempts=mergeTransferAttempts(safe.transferAttempts||[],[]);safe.packHistory=safe.packHistory||[];safe.dailyJourney=safe.dailyJourney||null;safe.paperStoryPractice=safe.paperStoryPractice||null;lastPersistedRaw=JSON.stringify(safe);
      return safe;
    }
  }catch(err){console.warn('Saved V2 data unavailable:',err);}
  try{
    const legacyRaw=localStorage.getItem(LEGACY_STORE);
    if(legacyRaw){
      const migrated=migrateBackupPayload(JSON.parse(legacyRaw));
      migrated.settings={retryAfterError:true,newLimit:10,reviewLimit:20,...migrated.settings};migrated.readings=migrated.readings||[];migrated.readingMarks=mergeReadingMarks(migrated.readingMarks||[]);migrated.weaknesses=mergeWeaknesses(migrated.weaknesses||[],[]);migrated.transferAttempts=mergeTransferAttempts(migrated.transferAttempts||[],[]);migrated.packHistory=migrated.packHistory||[];migrated.dailyJourney=migrated.dailyJourney||null;migrated.paperStoryPractice=migrated.paperStoryPractice||null;
      migrationNotice=`已迁移 ${migrated.items.length} 张卡片和 ${migrated.attempts.length} 条旧版记录。`;
      lastPersistedRaw=JSON.stringify(migrated);localStorage.setItem(STORE,lastPersistedRaw);
      return migrated;
    }
  }catch(err){console.warn('Legacy data migration unavailable:',err);}
  return emptyData();
}
let draftSaveTimer=null;
function flushDraftSave(){if(draftSaveTimer){clearTimeout(draftSaveTimer);draftSaveTimer=null;save();}}
function scheduleDraftSave(delayMs=450){clearTimeout(draftSaveTimer);draftSaveTimer=setTimeout(()=>{draftSaveTimer=null;save();},delayMs);}
function save(){if(draftSaveTimer){clearTimeout(draftSaveTimer);draftSaveTimer=null;}const result=persistState(localStorage,STORE,{...data,version:VERSION},lastPersistedRaw);if(result.ok){lastPersistedRaw=result.serialized;return true;}if(lastPersistedRaw){try{data=migrateBackupPayload(JSON.parse(lastPersistedRaw));}catch{}}notify(`保存失败：${result.error||'本地存储不可用'}。当前记录已回退到上一次成功保存的状态，请先导出备份。`);return false;}
function notify(message){const n=document.getElementById('notice');n.textContent=message;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,3800);}
function applyTheme(){const choice=data?.settings?.theme||'system';const night=choice==='night'||(choice==='system'&&window.matchMedia?.('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=night?'night':'day';const metaTheme=document.querySelector('meta[name="theme-color"]');if(metaTheme)metaTheme.setAttribute('content',night?'#07080b':'#f5f5f7');}
function setTheme(theme){const previous=data.settings.theme;data.settings.theme=theme;if(!save()){data.settings.theme=previous;return;}applyTheme();render();}
function node(tag,cls='',text=''){return el(tag,text,cls)}
function p(text,cls=''){return el('p',text,cls)}
function h(tag,text,cls=''){return el(tag,text,cls)}
function btn(label,fn,cls='btn',disabled=false){const b=el('button',label,cls);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);return b;}
function div(cls=''){return node('div',cls)}
function section(cls='panel'){const x=div(cls);return x;}
function lines(...nodes){const x=div('actions');x.append(...nodes);return x;}
function field(label,control){const wrap=div('field');const lab=el('label',label);if(!control.id)control.id=`input-${Math.random().toString(36).slice(2)}`;lab.htmlFor=control.id;wrap.append(lab,control);return wrap;}
function optionalImage(asset,alt='',className=''){const image=el('img');image.src=asset.file;image.alt=alt||asset.title;image.className=className;image.loading=asset.id==='09'?'eager':'lazy';image.decoding='async';image.addEventListener('error',()=>{image.remove();});return image;}
function visualPlaceholder(asset){const box=div('visual-placeholder');box.append(el('span','水墨画卷','visual-placeholder-title'),p(`${asset.title} · ${asset.caption}`,'tiny'));return box;}
function visualFrame(asset,{button=false}={}){const frame=button?el('button','','visual-frame visual-frame-button'):div('visual-frame');if(button)frame.type='button';frame.dataset.visualId=asset.id;const image=optionalImage(asset,asset.title);const markLoaded=()=>frame.classList.add('has-image');image.addEventListener('load',markLoaded);frame.append(image,visualPlaceholder(asset));if(image.complete&&image.naturalWidth>0)markLoaded();return frame;}
function showVisualDialog(asset){document.getElementById('visual-dialog')?.remove();const backdrop=div('switch-backdrop');backdrop.id='visual-dialog';const card=section('switch-dialog visual-dialog');card.append(el('div','修炼画卷 · VISUAL SCROLL','eyebrow'),h('h2',asset.title),p(asset.caption,'subtle'));const frame=visualFrame(asset);frame.classList.add('visual-dialog-frame');card.append(frame,lines(btn('关闭',()=>backdrop.remove(),'btn primary')));backdrop.append(card);document.body.append(backdrop);}
function stats(){const active=activeItems(),words=active.filter(x=>x.kind==='word'),sentences=active.filter(x=>x.kind==='sentence');const todayMinutes=homeSummary(data,new Date()).todayMinutes;return {words:words.length,sentences:sentences.length,due:active.filter(x=>isDue(x)).length,weak:active.filter(x=>x.status==='N'||x.status==='V').length,newItems:active.filter(x=>x.status==='UNTESTED').length,reviewed:active.filter(x=>x.attempts>0).length,todayMinutes};}
function statistic(label,value){const box=div('stat');box.append(h('strong',String(value)),el('span',label));return box;}
function navActive(){const navPage=page==='readingVocabulary'?'more':(page==='speech'||page==='vocabulary')?'home':page;document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.page===navPage);b.setAttribute('aria-current',b.dataset.page===navPage?'page':'false');});}
function setPage(which){if(radioTimer){clearTimeout(radioTimer);radioTimer=null;}if(radioPlaying){if(radioPlayStartAt){radioSessionLog.activeMs+=Math.max(0,Date.now()-radioPlayStartAt);radioPlayStartAt=0;}radioPlaying=false;}radioPaused=false;radioAudioStatus='';readingAudioStatus='';activeReadingBookmarkId='';if(page==='reading'&&which!=='reading'&&window.__ydReadScroll){window.removeEventListener('scroll',window.__ydReadScroll);window.__ydReadScroll=null;}if(page==='vocabulary'&&which!=='vocabulary')pauseJourneyVocabulary();if(page==='reading'&&which!=='reading')pauseJourneyReading();if(page==='speech'&&which!=='speech')pauseJourneySpeech();if(data.activeSession&&which!=='practice'&&page==='practice') pauseSession();stopSpeech();stopActiveAudio();stopLocalAudio();page=which;render();window.scrollTo({top:0,behavior:'instant'});}
function renderError(error){
  console.error('English Cultivation render failed:',error);
  const box=section('panel error-state');
  box.append(el('div','当前学习状态需要恢复 · RECOVERABLE ERROR','eyebrow'),h('h1','当前题目暂时无法显示'),p('你的学习记录没有被清除。可以返回学习总览，或恢复当前学习包的迁移题目。','subtle'));
  box.append(lines(btn('返回学习总览',()=>{page='home';render();},'btn primary'),btn('恢复当前学习',recoverCurrentJourney,'btn secondary')));
  app.append(box);
}
let previouslyRenderedPage=null;
let lastInteractionTarget=null;
// Capture the action before its button is removed by a same-page re-render.
document.addEventListener('click',event=>{if(app.contains(event.target))lastInteractionTarget=event.target;},true);
function render(){
  if(page==='training')page='home';
  const samePage=previouslyRenderedPage===page;
  const target=app.contains(lastInteractionTarget)?lastInteractionTarget:document.activeElement;
  const viewport=samePage?captureStableViewport(app,target,window):null;
  const previousMinHeight=app.style.minHeight;
  const prevRadioPanel=app.querySelector('.pocket-radio-panel');
  const prevRadioScroll=prevRadioPanel?prevRadioPanel.scrollTop:0;
  const prevRadioMoreOpen=Boolean(prevRadioPanel?.querySelector('.radio-more-details')?.open);
  // Avoid shrinking the document to zero while replaceChildren removes the old view.
  if(viewport)app.style.minHeight=String(Math.ceil(app.getBoundingClientRect().height))+'px';
  app.replaceChildren();
  const pwaBanner = renderPwaUpdateBanner(); if (pwaBanner && pwaBanner.tagName !== 'SPAN') app.append(pwaBanner);
  navActive();
  try{
    if(page==='home')return renderHome();
    if(page==='training')return renderTrainingHub();
    if(page==='more')return renderMore();
    if(page==='settings')return renderSettings();
    if(page==='practice')return renderPractice();
    if(page==='library')return renderLibrary();
    if(page==='reading')return renderReading();
    if(page==='speech')return renderSpeechChamber();
    if(page==='readingVocabulary')return renderReadingVocabulary();
    if(page==='storyPractice')return renderPaperStoryPractice();
    if(page==='vocabulary')return renderVocabularyStage();
    if(page==='spelling')return renderSpellingForge();
    if(page==='transfer')return renderTransferChallenge();
    if(page==='transferHub')return renderTransferHub();
    if(page==='transferPractice')return renderTransferPractice();
    if(page==='progress')return renderProgress();
    if(page==='reports')return renderReports();
    if(page==='summary')return renderSummary();
  }catch(error){renderError(error);}
  finally{
    if(lexiconDrawerOpen){const d=renderOfflineLexiconDrawer();if(d&&d.tagName!=='SPAN')app.append(d);}
    if(radioOpen){const r=renderPocketRadioDrawer();if(r&&r.tagName!=='SPAN'){app.append(r);const np=r.querySelector('.pocket-radio-panel');if(np){const md=np.querySelector('.radio-more-details');if(md&&prevRadioMoreOpen)md.open=true;if(prevRadioScroll)np.scrollTop=prevRadioScroll;}}}
    previouslyRenderedPage=page;
    if(viewport)restoreStableViewport(app,viewport,window);
    app.style.minHeight=previousMinHeight;
    lastInteractionTarget=null;
  }
}
function modeLabel(mode){return mode==='words'?'单词与词块':mode==='sentences'?'句子训练':mode==='reading'?'英文阅读':mode==='journey'?'今日综合学习':'混合训练';}
function showGuide(){document.getElementById('guide-dialog')?.remove();const backdrop=div('switch-backdrop');backdrop.id='guide-dialog';const card=section('switch-dialog guide-dialog');card.append(el('div','使用帮助 · QUICK GUIDE','eyebrow'),h('h2','第一次训练这样做'),p('1. 选择“炼词”只练单词与词块；选择“炼句”只练句子；“混合训练”才会混合两种题目。','subtle'),p('2. 词汇和句子填空只填写缺少的英文单词或词块；整句回忆才需要写完整句子。','subtle'),p('3. 查看答案后，K｜会用、V｜模糊、N｜不会会决定下一次复习时间。','subtle'),p('4. 训练结束后打开“修炼战报”，可以复制给中央仙窍、分享或下载。','subtle'),lines(btn('知道了',()=>backdrop.remove(),'btn primary')));backdrop.append(card);document.body.append(backdrop);}

function scopeLabel(scope){return scope==='journey'?'今日综合学习':scope==='today'?'今日学习':scope==='due'?'历史到期复习':'全部资料';}
function todayPackItems(){const ids=new Set(data.dailyPack?.itemIds||[]);return ids.size?data.items.filter(item=>ids.has(item.id)):data.items.filter(item=>item.packId&&item.packId===data.dailyPack?.packId);}
function paperStorySections(){return (data.dailyPack?.storyPractice?.stories||[]).flatMap(story=>story.sections.map(section=>({...section,storyTitle:story.title,storySource:story.source,storyId:story.id})));}
function paperStoryTasks(section){if(!section)return[];const groups=[['vocabulary','vocabulary'],['cloze','cloze'],['grammar','grammar'],['comprehension','comprehension'],['spokenPhrases','spoken_phrase'],['goldenSentences','golden_sentence'],['retelling','retelling'],['speakingQuestions','speaking'],['writing','writing']];const tasks=[];for(const [key,type] of groups){const rawValues=Array.isArray(section[key])?section[key]:section[key]?[section[key]]:[];const values=type==='spoken_phrase'?rawValues.filter(task=>task.practiceEligible!==false):rawValues;for(const task of values)tasks.push({...task,type});}return tasks;}
function storyTaskLabel(type){return ({vocabulary:'Vocabulary recall',cloze:'Cloze',grammar:'Grammar',comprehension:'Comprehension',spoken_phrase:'Spoken phrase',golden_sentence:'Golden sentence',retelling:'Story retelling',speaking:'IELTS Speaking Part 3',writing:'Writing'}[type]||'Story practice');}
function currentPaperStorySection(){const session=data.paperStoryPractice;if(!session)return null;return paperStorySections().find(section=>section.id===session.sectionId&&section.storyId===session.storyId)||null;}
function startPaperStoryPractice(storyId,sectionId){
  if(data.activeSession){notify('请先完成或暂停当前训练；纸上故事练习不会覆盖已有训练。');return;}
  const section=paperStorySections().find(row=>row.storyId===storyId&&row.id===sectionId);if(!section){notify('找不到这个故事 Section，未修改已有记录。');return;}
  const prior=data.paperStoryPractice;if(prior&&!prior.finishedAt&&prior.storyId===storyId&&prior.sectionId===sectionId){prior.running=true;prior.lastTick=Date.now();if(save()){page='storyPractice';render();}return;}
  if(prior&&!prior.finishedAt){notify('已有未完成的纸上故事练习。请先完成或返回继续，避免覆盖原始回答。');page='storyPractice';render();return;}
  const tasks=paperStoryTasks(section);if(!tasks.length){notify('这个 Section 暂无可练习题目。');return;}
  data.paperStoryPractice={id:`paper-story:${data.dailyPack.packId}:${storyId}:${sectionId}:${Date.now()}`,packId:data.dailyPack.packId,storyId,sectionId,startedAt:new Date().toISOString(),activeMs:0,lastTick:Date.now(),running:true,index:0,tasks,attempts:[],paperReadAcknowledged:false,finishedAt:null,recordingIds:{},hintEvents:[]};
  if(save()){page='storyPractice';render();}
}
function accruePaperStory(){const session=data.paperStoryPractice;if(!session||session.finishedAt||!session.running)return;const now=Date.now();if(!document.hidden)session.activeMs=Math.max(0,Number(session.activeMs)||0)+Math.max(0,Math.min(1800,now-(session.lastTick||now)));session.lastTick=now;}
function storyCurrentTask(){const session=data.paperStoryPractice;return session?.tasks?.[Number(session.index)||0]||null;}
function storyAnswerCheck(task,answer){if(task.type==='vocabulary')return compareWordAnswer(answer,{target:task.target,acceptedAnswers:task.acceptedAnswers,definitionEn:task.definitionEn},{confidence:task.definitionEn?'high':'medium'});if(task.acceptedAnswers?.length||task.target)return compareAnswer(answer,task.referenceAnswer||task.target,{accepted:task.acceptedAnswers||[]});return {status:'unassessed',message:'This response is open-ended and has not been automatically scored.'};}
function recordStoryHint(type){const session=data.paperStoryPractice;if(!session)return;const task=storyCurrentTask();session.hintEvents=[...(session.hintEvents||[]),{taskId:task?.id||null,type,at:new Date().toISOString()}];}
function submitPaperStoryTask(task,answer=''){const session=data.paperStoryPractice;if(!session||session.finishedAt||session.referenceVisible)return;accruePaperStory();const value=String(answer||'').trim();const check=storyAnswerCheck(task,value);const recordingIds=session.recordingIds?.[task.id]||[];const at=new Date().toISOString();session.attempts.push({id:`paper-story-attempt:${session.id}:${task.id}`,sessionId:session.id,packId:session.packId,storyId:session.storyId,sectionId:session.sectionId,taskId:task.id,taskType:task.type,firstAnswer:value,firstSubmittedAt:at,initialCheck:check,hintUsed:Boolean((session.hintEvents||[]).some(row=>row.taskId===task.id)),hintEvents:(session.hintEvents||[]).filter(row=>row.taskId===task.id),referenceViewed:false,referenceViewedAfterSubmit:true,recordingIds,recordingOnly:['retelling','speaking','spoken_phrase'].includes(task.type),rating:null,evidenceType:(session.hintEvents||[]).some(row=>row.taskId===task.id)?'prompted':'independent',sourceReference:task.sourceReference||null,storyBeats:task.storyBeats||[],at});session.referenceVisible=true;session.currentTaskId=task.id;if(save())render();}
function ratePaperStory(rating){const session=data.paperStoryPractice,task=storyCurrentTask();if(!session||!task||!session.referenceVisible)return;accruePaperStory();const row=session.attempts.find(item=>item.taskId===task.id&&item.id===session.attempts.at(-1)?.id)||session.attempts.at(-1);if(!row||row.rating)return;row.rating=rating;row.selfRatedAt=new Date().toISOString();row.evidenceType=row.hintUsed?'prompted':row.evidenceType||'independent';session.index++;session.referenceVisible=false;session.currentTaskId=null;session.hintEvents=(session.hintEvents||[]).filter(item=>item.taskId!==task.id);session.lastTick=Date.now();if(session.index>=session.tasks.length)finishPaperStoryPractice();else if(save())render();}
function finishPaperStoryPractice(){const session=data.paperStoryPractice;if(!session||session.finishedAt)return;accruePaperStory();const section=currentPaperStorySection();const endedAt=new Date().toISOString();const attempts=session.attempts||[];const report={schema_version:1,report_id:`report:${session.id}`,session_id:session.id,created_at:endedAt,started_at:session.startedAt,ended_at:endedAt,active_seconds:Math.round(Number(session.activeMs||0)/1000),mode:'paper_story',pack_id:session.packId,story_id:session.storyId,section_id:session.sectionId,story_title:section?.storyTitle||null,section_title:section?.title||null,paper_read_acknowledged:Boolean(session.paperReadAcknowledged),paper_reading_time_measured:false,source_app:'English Cultivation',app_version:APP_VERSION,sync_status:'NOT_SUBMITTED',mode_breakdown:{words:attempts.filter(x=>x.taskType==='vocabulary').length,sentences:attempts.filter(x=>['cloze','grammar','golden_sentence'].includes(x.taskType)).length,listening:0},total_rated_attempts:attempts.filter(x=>['K','V','N'].includes(x.rating)).length,unrated_attempts:attempts.filter(x=>!['K','V','N'].includes(x.rating)).length,ratings_summary:{K:attempts.filter(x=>x.rating==='K').length,V:attempts.filter(x=>x.rating==='V').length,N:attempts.filter(x=>x.rating==='N').length},attempts,story_practice:{paper_first:true,reading_not_repeated:true,spoken_phrase_limit:10,deferred_spoken_phrases:Math.max(0,(section?.spokenPhrases||[]).filter(x=>!x.practiceEligible).length),recording_ids:[...new Set(attempts.flatMap(x=>x.recordingIds||[]))],unassessed_open_responses:attempts.filter(x=>x.initialCheck?.status==='unassessed').map(x=>x.taskId)},data_quality:{paper_reading_self_reported:Boolean(session.paperReadAcknowledged),paper_reading_seconds_not_measured:true,no_automatic_ielts_or_pronunciation_score:true,original_answers_immutable:true}};data.reports=[...(data.reports||[]).filter(item=>item.report_id!==report.report_id),report];const weak=attempts.filter(row=>['V','N'].includes(row.rating)).map(row=>{const task=session.tasks.find(item=>item.id===row.taskId)||{};return makeWeakness({id:`weakness:paper-story:${session.storyId}:${session.sectionId}:${row.taskId}`,sourceType:'paper_story',sourceId:session.storyId,sourceItemId:row.taskId,sourceName:section?.storyTitle||'Paper story',targetExpression:task.target||task.prompt||row.taskId,skillType:row.taskType,evidenceType:'real_error',retrievalStatus:row.rating==='N'?'LEARNING':'PROMPTED',contexts:[{id:row.taskId,prompt:row.firstAnswer||'Revisit this story expression in a new context.',referenceAnswer:task.referenceAnswer||task.target||'',hints:row.hintEvents||[],source:section}]});});data.weaknesses=mergeWeaknesses(data.weaknesses||[],weak);session.finishedAt=endedAt;session.running=false;session.lastTick=null;if(!save())return;lastSessionSummary=report;setPage('summary');}
function storyReference(task){return task.referenceAnswer||task.target||task.example||'Reference response is not supplied.';}
function storyPromptPanel(box,task,session){
  if(task.type==='vocabulary'){const definition=task.definitionEn||'English definition was not supplied; use the context and self-rate honestly.';box.append(p(`Meaning: ${maskSpellingTarget(definition,task.target)||definition}`,'story-meaning'));if(task.partOfSpeech)box.append(p(`Part of speech: ${task.partOfSpeech}`,'tiny'));if(task.example)box.append(p(`Context: ${maskSpellingTarget(task.example,task.target)||task.example}`,'story-context'));}
  else box.append(h('h3',task.prompt||'Use the story context to respond in English.'));
  if(task.type==='audio_segment'&&task.prompt)box.append(speechButton(task.prompt));
  if(task.type==='retelling'||task.type==='speaking'||task.type==='spoken_phrase'){
    const weakness=makeWeakness({id:`paper-story:${session.id}:${task.id}`,sourceType:'paper_story',sourceId:session.storyId,sourceItemId:task.id,targetExpression:task.target||'',skillType:task.type,taskType:task.type,contexts:[{id:task.id,prompt:task.prompt||task.referenceAnswer||'',referenceAnswer:task.referenceAnswer||''}]});
    box.append(renderRecordingControls({weaknessId:weakness.id,taskId:task.id,attemptId:session.id,role:'original',onSaved:row=>{session.recordingIds={...(session.recordingIds||{}),[task.id]:[...new Set([...(session.recordingIds?.[task.id]||[]),row.id]) ]};save();}}));
  }
  if(task.type==='writing')box.append(p('Practice data only; this is not an authentic IELTS past paper.','hint'));
}
function renderPaperStoryEntry(){
  const sections=paperStorySections();if(!sections.length)return null;const box=section('paper-story-entry');box.append(el('div','纸上故事练习 · PAPER-FIRST STORY PRACTICE','eyebrow'),h('h2','读纸上故事，直接练习'),p('故事正文不在网页重复显示；纸上阅读只可自我确认，不计入浏览器阅读时长。','subtle'));
  const select=el('select','','select');sections.forEach(section=>{const option=el('option',`${section.storyTitle} · ${section.title}`);option.value=`${section.storyId}|${section.id}`;select.append(option);});const current=sections[0];select.value=`${current.storyId}|${current.id}`;const details=p('','tiny');const deferred=p('','tiny');const acknowledge=el('input');acknowledge.type='checkbox';const label=el('label');label.append(acknowledge,el('span','我已在纸上阅读这一 Section（自我报告，不计时）'));const start=btn('Practice this Section',()=>{const [storyId,sectionId]=select.value.split('|');const found=sections.find(row=>row.storyId===storyId&&row.id===sectionId);if(found){startPaperStoryPractice(storyId,sectionId);if(data.paperStoryPractice&&!data.paperStoryPractice.finishedAt){data.paperStoryPractice.paperReadAcknowledged=acknowledge.checked;save();render();}}} ,'btn primary');const update=()=>{const selected=sections.find(row=>`${row.storyId}|${row.id}`===select.value)||sections[0];details.textContent=`可用练习：词汇 ${selected.availability.vocabulary} · Cloze ${selected.availability.cloze} · Grammar ${selected.availability.grammar} · 理解 ${selected.availability.comprehension} · 口语短语 ${selected.availability.spokenPhrases}/10 · 延后短语 ${selected.availability.deferredPhrases}`;const deferredRows=(selected.spokenPhrases||[]).filter(row=>!row.practiceEligible);deferred.textContent=deferredRows.length?`ARCHIVED / NOT STUDIED：${deferredRows.map(row=>row.prompt||row.referenceAnswer||row.id).join(' · ')}`:'没有延后的口语短语。';};select.addEventListener('change',update);update();box.append(field('Story / Section',select),details,deferred,label,lines(start));return box;
}
function renderPaperStoryPractice(){
  const session=data.paperStoryPractice;if(!session){setPage('home');return;}
  const readingSection=currentPaperStorySection(),task=storyCurrentTask();
  if(!readingSection||!task){if(session.finishedAt){app.append(el('div','纸上故事练习 · COMPLETED','eyebrow'),h('h1','本次故事练习已完成'),p('Battle Report 已保留原始答案、录音和 K/V/N。','subtle'),btn('返回首页',()=>setPage('home'),'btn primary'));return;}notify('故事 Section 状态无法恢复；已有数据未清除。');setPage('home');return;}
  const box=section('paper-story-practice');
  box.append(el('div','纸上故事练习 · PAPER-FIRST','eyebrow'),h('h1',`${readingSection.storyTitle} · ${readingSection.title}`),p('纸上阅读已经完成后，直接进行练习。网页不重复显示故事正文，也不记录纸上阅读时长。','subtle'));
  const paper=el('input');paper.type='checkbox';paper.checked=Boolean(session.paperReadAcknowledged);paper.addEventListener('change',()=>{session.paperReadAcknowledged=paper.checked;save();});const paperLabel=el('label');paperLabel.append(paper,el('span','我已在纸上阅读本 Section（自我报告）'));box.append(paperLabel,p(`第 ${session.index+1} / ${session.tasks.length} 项 · ${storyTaskLabel(task.type)}`,'tiny'));
  if(readingSection.storyText){
    const storyReader=el('details','','secondary-modes-drawer story-inline-reader');
    storyReader.append(el('summary','📖 站内展开本节故事正文（点击加粗目标词可查词 · 支持 Gemini 朗读）'));
    const bodyWrap=div('reading-article');
    readingParagraphs(readingSection.storyText).forEach(para=>bodyWrap.append(renderMarkedParagraph(para,[])));
    storyReader.append(bodyWrap,speechControls(readingSection.storyText,splitSpeechSegments(readingSection.storyText),{useGemini:true}));
    box.append(storyReader);
  }
  const prompt=section('panel');storyPromptPanel(prompt,task,session);
  if(session.referenceVisible){
    const row=session.attempts.at(-1);
    prompt.append(p(`Your first response: ${row?.firstAnswer||'（audio response saved locally）'}`,'small-block'),p(`Reference: ${storyReference(task)}`,'story-reference'));
    if(task.storyBeats?.length)prompt.append(p(`Story beats: ${task.storyBeats.join(' · ')}`,'hint'));
    if(task.type==='writing')prompt.append(p(`Original word count: ${(row?.firstAnswer||'').trim().split(/\s+/).filter(Boolean).length}`,'tiny'));
    if(row?.firstAnswer){
      const isGram=task.type==='grammar';
      const isSpk=['speaking','retelling','spoken_phrase'].includes(task.type);
      prompt.append(renderAiReplyWidget(
        isGram?'🤖 AI 语法专项批改（规则 + 平行例句）':isSpk?'🤖 AI 口语 / 复述教练点评':'🤖 AI 导师逐句精批与升级',
        ()=>isGram?askAiCheckGrammar({prompt:task.prompt,userAnswer:row.firstAnswer,referenceAnswer:storyReference(task)}):isSpk?askAiSpeakingDemoCoach({prompt:task.prompt,userTranscript:row.firstAnswer}):askAiCritiqueOutput({prompt:task.prompt,userAnswer:row.firstAnswer,referenceAnswer:storyReference(task)}),
        reply=>{row.aiCritique=reply;save();},
        row.aiCritique||''
      ));
    }
    prompt.append(h('h3','请根据真实回忆自评'),lines(...[['K','本次掌握','k'],['V','模糊','v'],['N','不会','n']].map(([rating,label,cls])=>btn(`${rating} · ${label}`,()=>ratePaperStory(rating),`btn ${cls}`))));
  }
  else{
    const hint=btn('显示一条额外提示',()=>{recordStoryHint('hint');if(save())render();},'btn ghost');prompt.append(hint);
    if(session.hintEvents?.some(row=>row.taskId===task.id))prompt.append(p(task.hints?.[0]||task.definitionEn||'Try a different person, place or purpose.','hint'));
    if(['retelling','speaking','spoken_phrase'].includes(task.type))prompt.append(btn('提交初答并查看 Story Beats',()=>submitPaperStoryTask(task,''),'btn primary'));
    else if(task.type==='writing'){const input=textarea('','Write your independent response in English…');input.classList.add('answer-input');const count=p('Word count: 0','tiny');input.addEventListener('input',()=>count.textContent=`Word count: ${input.value.trim().split(/\s+/).filter(Boolean).length}`);prompt.append(field('Original independent draft',input),count,btn('提交原始稿并查看参考',()=>submitPaperStoryTask(task,input.value),'btn primary'));}
    else {const input=task.type==='comprehension'&&task.acceptedAnswers?.length?textInput('','Type your answer in English…'):textarea('','Type your independent English answer…');input.classList.add('answer-input');prompt.append(field(task.type==='vocabulary'?'Your target expression':'Your independent answer',input),btn('提交答案并查看参考',()=>submitPaperStoryTask(task,input.value),'btn primary'));}
  }
  box.append(prompt,lines(btn('暂停并返回首页',()=>{accruePaperStory();session.running=false;if(save())setPage('home');},'btn ghost'),btn('放弃当前 Section（保留已有证据）',()=>{accruePaperStory();session.running=false;if(save())setPage('home');},'btn danger')));app.append(box);
}
function renderMicroLessonsCard(){
  const lessons=data.dailyPack?.microLessons||[];if(!lessons.length)return null;
  data.microLessonProgress=data.microLessonProgress||{};
  const box=section('daily-pack-panel micro-lessons-card');
  const doneCount=lessons.filter(l=>data.microLessonProgress[l.id]?.completedAt).length;
  box.append(el('div','站内微课 · MICRO LESSONS','eyebrow'),h('h2',`发音与词根微课（${doneCount}/${lessons.length} 已完成）`),p('已把 YouTube / NotebookLM 精华直接装进网站，点击即可听示范发音并做小测。','subtle'));
  for(const lesson of lessons){
    const prog=data.microLessonProgress[lesson.id]||{quizAnswers:{},completedAt:null};
    const det=el('details','','secondary-modes-drawer');
    det.append(el('summary',`${prog.completedAt?'✓ ':''}${lesson.title} · ${lesson.category}`));
    const body=div('small-block');
    body.append(p(lesson.ruleSummary,'subtle'));
    if(lesson.examples?.length){
      const exList=div('micro-example-list');
      for(const ex of lesson.examples){
        const row=div('micro-example-row');
        row.append(btn(`🔊 ${ex.word}`,()=>speakWithGeminiOrFallback(ex.word),'btn ghost small-btn'),el('span',[ex.contrast,ex.note].filter(Boolean).join(' · '),'tiny'));
        exList.append(row);
      }
      body.append(exList);
    }
    if(lesson.miniQuiz?.length){
      for(const q of lesson.miniQuiz){
        const qBox=div('micro-quiz-box');
        const ans=prog.quizAnswers?.[q.id]||null;
        qBox.append(p(`小测：${q.prompt}`,'tiny'));
        if(q.options?.length){
          const opts=lines(...q.options.map(opt=>{
            const isChosen=ans&&ans.chosen===opt;
            const cls=isChosen?(ans.correct?'btn primary small-btn':'btn danger small-btn'):'btn ghost small-btn';
            return btn(isChosen?(ans.correct?`✓ ${opt}`:`✗ ${opt}`):opt,()=>{
              const ok=normalized(opt)===normalized(q.answer);
              const nextProg={quizAnswers:{...(data.microLessonProgress[lesson.id]?.quizAnswers||{}),[q.id]:{chosen:opt,correct:ok,at:new Date().toISOString()}},completedAt:data.microLessonProgress[lesson.id]?.completedAt||null};
              if(lesson.miniQuiz.every(mq=>nextProg.quizAnswers[mq.id]?.correct))nextProg.completedAt=nextProg.completedAt||new Date().toISOString();
              data.microLessonProgress[lesson.id]=nextProg;
              save();
              notify(ok?`✓ 正确！${q.explanation||''}`:`再试试看！${q.explanation||''}`);
              render();
            },cls);
          }));
          qBox.append(opts);
          if(ans)qBox.append(p(ans.correct?`✓ 已答对：${q.explanation||'很稳！'}`:`提示：${q.explanation||'再对照上方规则试一次。'}`,ans.correct?'success tiny':'hint tiny'));
        }
        body.append(qBox);
      }
    } else if (!prog.completedAt) {
      body.append(btn('✓ 标记本节微课已学完',()=>{data.microLessonProgress[lesson.id]={quizAnswers:{},completedAt:new Date().toISOString()};save();render();},'btn secondary small-btn'));
    }
    det.append(body);
    box.append(det);
  }
  return box;
}
function renderHome(){
  const s=homeSummary(data,new Date());
  const hero=section('hero home-hero');
  const heroAsset=visualAsset('09');const heroVisual=div('home-hero-visual');heroVisual.append(visualFrame(heroAsset));heroVisual.append(el('span','山水仙鹤 · QUIET CULTIVATION','visual-caption'));
  const heroCopy=div('home-hero-copy');
  heroCopy.append(el('div','问道破境 · DAILY CULTIVATION','eyebrow'),h('h1','直面生涩，把今天的难关练成底气。'),renderRealmHeroBadge());
  const summary=div('today-summary');
  summary.append(statistic('待复习',s.due),statistic('新内容',s.newItems),statistic('实际训练',`${s.todayMinutes} 分钟`));
  const heroActions=lines(btn(data.dailyPack?'开始／继续今日完整学习':'开始今日修炼',()=>{if(data.dailyPack)startDailyJourney();else if(s.due)startSession('mixed',{scope:'due'});else if(s.newItems)startSession('mixed',{scope:'new'});else startSession('mixed');},'btn primary home-primary'),btn('🎧 随身电台磨耳朵',()=>{radioOpen=true;refreshRadioTracks();render();},'btn secondary radio-launch-btn'),btn('⚡ 5 分钟通勤微冲刺',()=>{const q=buildCommuteSprintQueue(data.items||[]);if(!q.length){notify('当前没有可冲刺的词句卡片，请先导入学习包。');return;}startSession('mixed',{scope:'commute',queue:q,dueGoal:5});},'btn secondary radio-launch-btn'),data.packItems?btn('管理学习包',()=>setPage('library'),'btn ghost'):btn('导入今日总学习包',()=>setPage('library'),'btn ghost'));
  heroActions.classList.add('home-hero-actions');
  if(s.unallocatedActiveMs>0)summary.append(p('历史跨日累计时间中有每日分配未知的部分；不会计入今天。','tiny'));
  const weekStrip=div('home-week-strip');
  const todayBase=new Date();
  let activeDays7=0;
  for(let d=6;d>=0;d--){
    const dt=new Date(todayBase.getTime()-d*86400000);
    const dk=dateKeyInTimeZone(dt);
    const mins=Math.round(summarizeSessionTime(data.sessions||[],dk,dk).knownMs/60000);
    if(mins>0)activeDays7++;
    const cell=div('week-dot-cell');
    const dot=el('span','',mins>0?'week-dot is-active':'week-dot');
    dot.title=`${dk}：${mins} 分钟`;
    cell.append(dot,el('span',d===0?'今':dk.slice(8),'tiny'));
    weekStrip.append(cell);
  }
  const weekWrap=div('home-week-wrap');
  weekWrap.append(el('span',`近 7 天真实打卡 ${activeDays7}/7 天`,'tiny'),weekStrip);
  hero.append(heroVisual,heroCopy,summary,weekWrap,heroActions);
  app.append(hero);if(data.dailyPack){app.append(journeyPanel());const overview=renderDailyOverview();if(overview)app.append(overview);}
  if(data.activeSession){const resume=section('resume-card');resume.append(el('div','继续上次训练','eyebrow'),h('h2',`${modeLabel(data.activeSession.mode)} · ${scopeLabel(data.activeSession.scope)}`),p('未完成的训练已保留，计时会在继续后恢复。','subtle'),lines(btn('继续训练',()=>{page='practice';render();},'btn primary'),btn('结束并保存',()=>finishSession(),'btn ghost')));app.append(resume);}
  const modeDrawer=el('details','','secondary-modes-drawer');
  const modeSummary=el('summary','自由单项加练与更多入口');
  modeDrawer.append(modeSummary);
  const head=div('section-head');head.append(h('h2','选择学习方式'),el('span','英语内容保持英文','tiny'));modeDrawer.append(head);
  const modes=div('feature-grid');
  for(const [name,english,description,mode,icon] of [['炼词','Words & Phrases','词汇、词块和主动回忆。','words','Aa'],['炼句','Sentences','句子填空或整句回忆。','sentences','“ ”'],['阅读','Reading','阅读英文材料，保存有价值的表达。','reading','文'],['听力','Listening','先听再写，使用浏览器朗读。','sentences','◖'],['演讲','Speech Chamber','整篇听读、影子跟读、隐藏原稿。','speech','🎙']]){
    const b=el('button','','mode-card feature-card');b.append(el('div',icon,'mode-icon'),h('strong',name),el('span',english,'mode-english'),el('span',description));b.addEventListener('click',()=>mode==='speech'?setPage('speech'):mode==='reading'?setPage('reading'):startSession(mode==='sentences'?'sentences':'words',name==='听力'?{scope:'listening',sentenceStyle:'listening'}:{sentenceStyle:'cloze'}));modes.append(b);
  }
  const commute=el('button','','mode-card feature-card');commute.append(el('div','⚡','mode-icon'),h('strong','5分钟通勤微冲刺'),el('span','Commute Sprint','mode-english'),el('span','碎片时间速刷 5 个最紧迫词 + 2 句，完整写入战报。'));commute.addEventListener('click',()=>{const q=buildCommuteSprintQueue(data.items||[]);if(!q.length){notify('当前没有可冲刺的词句卡片。');return;}startSession('mixed',{scope:'commute',queue:q,dueGoal:5});});modes.append(commute);
  const difficult=el('button','','mode-card feature-card');difficult.append(el('div','!','mode-icon'),h('strong','困难词专项'),el('span','Weak Items','mode-english'),el('span','集中处理多次模糊或答错的卡片。'));difficult.addEventListener('click',()=>startSession('words',{scope:'difficult'}));modes.append(difficult);modeDrawer.append(modes);app.append(modeDrawer);
  const backupCheck=evaluateBackupFreshness(data.settings||{},(data.items||[]).length,(data.attempts||[]).length,new Date());if(backupCheck.needsReminder){const bk=section('backup-freshness-strip');bk.append(el('span',`🛡️ ${backupCheck.message}`,'tiny'),btn('立即导出备份',exportBackup,'btn secondary small-btn'));app.append(bk);}
  const progress=section('progress-strip');progress.append(h('h3','最近进度'),p(s.due?`有 ${s.due} 张卡片到期，建议先完成复习。`:s.newItems?`还有 ${s.newItems} 张新卡片等待学习。`:'今天暂时没有到期任务。','subtle'),lines(btn('查看详细进度',()=>setPage('progress'),'btn ghost'),btn('打开战报',()=>setPage('reports'),'btn ghost')));app.append(progress);
  if(data.dailyPack){const pack=todayPackItems();const panel=section('daily-pack-panel compact-pack');panel.append(el('div','今日学习包','eyebrow'),h('h2',data.dailyPack.title||'今日学习包'),p(`${pack.filter(x=>x.kind==='word').length} 个词汇 · ${pack.filter(x=>x.kind==='sentence'&&x.module!=='listening').length} 个句子 · ${data.dailyPack.source||'中央仙窍英语资料库'}`,'subtle'),lines(btn('单独练习词句卡片',()=>startSession('mixed',{scope:'today'}),'btn secondary'),btn('管理学习包',()=>setPage('library'),'btn ghost')));app.append(panel);}
  if(data.dailyPack?.storyPractice){const storyEntry=renderPaperStoryEntry();if(storyEntry)app.append(storyEntry);}
  const microCard=renderMicroLessonsCard();if(microCard)app.append(microCard);
  if(!data.items.length&&!data.readings?.length){const empty=section('empty home-empty');empty.append(h('h2','还没有学习材料'),p('你可以先加载演示材料，或从 iPhone 的“文件”App 导入中央仙窍学习包。','subtle'),lines(btn('加载演示材料',()=>{const added=mergeItems(data.items,DEMO);data.items=added.items;if(save()){notify(`已添加 ${added.added} 张演示卡片。`);render();}},'btn primary'),btn('打开资料库',()=>setPage('library'),'btn secondary')));app.append(empty);}
  if(!data.settings.onboardingSeen){const guide=section('guide-card');guide.append(el('div','第一次使用','eyebrow'),h('h2','三步开始今天的训练'),p('① 先学习新内容。② 在真正的输入框填写英文答案。③ 用 K｜会用、V｜模糊、N｜不会记录真实感觉。','subtle'),lines(btn('我知道了',()=>{data.settings.onboardingSeen=true;if(save())render();},'btn primary'),btn('打开帮助',showGuide,'btn')));app.append(guide);}
}
function renderTrainingHub(){
  const s=homeSummary(data,new Date());
  const trainingVisual=div('training-visual-strip');trainingVisual.append(visualFrame(visualAsset('02')));app.append(trainingVisual,el('div','学习训练 · TRAINING','eyebrow'),h('h1','选择今天的训练'),p('先处理到期内容，再学习新卡片。你也可以只练指定学习包。','lead'));
  if(data.dailyPack){const overview=renderDailyOverview();if(overview)app.append(overview);app.append(journeyPanel());}
  const queue=section('training-queue');queue.append(h('h2','今日队列'),p(`到期 ${s.due} · 新内容 ${s.newItems} · 薄弱 ${s.weak} · 实际训练 ${s.todayMinutes} 分钟`,'subtle'),lines(btn('开始今日修炼',()=>{if(s.due)startSession('mixed',{scope:'due'});else if(s.newItems)startSession('mixed',{scope:'new'});else startSession('mixed');},'btn primary'),btn('只复习到期内容',()=>startSession('mixed',{scope:'due'}),'btn secondary',!s.due)));app.append(queue);
  const grid=div('feature-grid training-grid');for(const [title,desc,mode,scope,cls] of [['学习新内容','首次接触的新卡片会先进入学习阶段。','mixed','new','primary'],['复习已学内容','只练已经到期的历史项目。','mixed','due','secondary'],['自由炼词','单词、词块和搭配。','words',undefined,''],['自由炼句','句子填空或整句回忆。','sentences',undefined,''],['困难词专项','集中处理薄弱项目。','words','difficult','']]){const b=el('button','','mode-card feature-card '+cls);b.append(el('div',title==='自由炼词'?'Aa':title==='自由炼句'?'“ ”':title==='困难词专项'?'!':'✦','mode-icon'),h('strong',title),el('span',desc));b.addEventListener('click',()=>startSession(mode,scope?{scope}:{}));grid.append(b);}const retrieval=el('button','','mode-card feature-card secondary');retrieval.append(el('div','↻','mode-icon'),h('strong','Quick Retrieval'),el('span','只呈现一题真实弱项；先独立回答，再选择提示。'));retrieval.addEventListener('click',()=>setPage('transferHub'));grid.append(retrieval);app.append(grid);
  if(data.dailyPack){const pack=todayPackItems();const panel=section('daily-pack-panel');panel.append(el('div','今日学习包','eyebrow'),h('h2',data.dailyPack.title||'今日学习包'),p(`${pack.length} 项 · ${data.dailyPack.source||'中央仙窍英语资料库'}`,'subtle'),lines(btn('只练今日单词',()=>startSession('words',{scope:'today'}),'btn'),btn('只练今日句子',()=>startSession('sentences',{scope:'today'}),'btn'),btn('混合练习今日材料',()=>startSession('mixed',{scope:'today'}),'btn primary')));app.append(panel);}
}
function sourceHref(meta){const safe=safeSourceUrl(meta?.sourceUrl);if(meta?.youtubeVideoId){const base=safe||`https://www.youtube.com/watch?v=${encodeURIComponent(meta.youtubeVideoId)}`;try{const url=new URL(base);if(meta.youtubeStartSeconds!==null&&meta.youtubeStartSeconds!==undefined)url.searchParams.set('t',String(Math.max(0,Math.floor(Number(meta.youtubeStartSeconds)||0))));return url.toString();}catch{return null;}}return safe;}
function sourcePanel(raw,label='查看原始来源'){
  const meta=normalizeSourceMeta(raw||{});if(!meta.sourceName&&!meta.sourceId&&!meta.sourceUrl&&!meta.sourceLocator&&!meta.learningGoal)return null;
  const box=div('source-trace');box.append(el('span','来源回链 · SOURCE TRACE','eyebrow'));
  const name=meta.sourceName||meta.sourceType||'本地材料';const details=[name,meta.sourceId,meta.sourceLocator,meta.sourceDate].filter(Boolean).join(' · ');box.append(p(details,'tiny'));
  if(meta.learningGoal)box.append(p(`学习目标：${meta.learningGoal}`,'tiny'));
  const rawUrl=raw?.sourceUrl||raw?.source_url||'';const href=(!rawUrl||safeSourceUrl(rawUrl))?sourceHref(meta):null;if(href){const link=el('a',label,'source-link');link.href=href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}else if(rawUrl)box.append(p('链接未通过安全校验，仅显示来源文字。','tiny'));
  return box;
}
function inferredWeaknesses(){
  const rows=[...(data.weaknesses||[])];
  for(const item of data.items){const history=data.attempts.filter(attempt=>attempt.itemId===item.id);const hasError=item.status==='N'||item.status==='V'||history.some(attempt=>attempt.status==='N');if(!hasError)continue;const target=item.target||item.text||'';rows.push(makeWeakness({id:`weakness:item:${item.id}`,sourceType:item.sourceType||'practice',sourceId:item.sourceId||item.packId||item.id,sourceItemId:item.id,sourceName:item.source||'网站训练',sourceUrl:item.sourceUrl,sourceLocator:item.sourceLocator,targetExpression:target,skillType:item.skillType||'Unclassified',evidenceType:'real_error',retrievalStatus:item.status==='N'?'LEARNING':'PROMPTED',contexts:[{id:`item:${item.id}:transfer`,prompt:`Create a new English sentence using “${target}” in a different situation.`,referenceAnswer:item.example||item.text,hints:['Change the person, place or purpose.'],source:item}]}));}
  for(const task of transferTasks()){const source=normalizeSourceMeta(task);rows.push(makeWeakness({id:`weakness:transfer:${task.id}`,...source,targetExpression:task.targetExpression||task.target_expression||'',skillType:task.skillType||task.skill_type||'Transfer / Application',evidenceType:'pack_transfer',retrievalStatus:'UNTESTED',taskType:task.taskType||task.task_type||'general_transfer',contexts:task.contexts?.length?task.contexts:[{id:`${task.id}:context-1`,prompt:task.prompt,referenceAnswer:task.referenceAnswer,hints:task.hints,source:task}]}));}
  return mergeWeaknesses([],rows);
}
function transferGroups(){const rows=inferredWeaknesses(),attempts=data.transferAttempts||[],now=Date.now();return {errors:rows.filter(row=>row.evidenceType==='real_error'||row.retrievalStatus==='LEARNING'),pending:rows.filter(row=>row.retrievalStatus==='UNTESTED'&&!row.nextReviewAt),due:rows.filter(row=>row.nextReviewAt&&new Date(row.nextReviewAt).getTime()<=now||row.retrievalStatus==='REVIEW_DUE'),all:rows,attempts};}
function renderTransferHub(){
  const groups=transferGroups();
  app.append(el('div','训练 · TRANSFER & MASTERY','eyebrow'),h('h1','综合输出训练舱'),p('把真实错误、待验证知识和到期迁移分开处理。先独立输出，再按需提示、纠错和换情境复测。','lead'));
  const intro=section('transfer-room-card');
  intro.append(h('h2','Transfer & Mastery'),p('这里不会把读过的材料自动算成掌握，也不会把参考答案当成独立成功。录音只保存在本机 IndexedDB，文字证据仍留在学习记录中。','subtle'),lines(btn('返回训练',()=>setPage('training'),'btn ghost')));
  app.append(intro);
  for(const [key,title,desc] of [['errors','真实错误','来自实际 N/V、答错或用户确认的弱项。'],['pending','待验证知识','已经有来源或练习材料，但尚未完成独立迁移。'],['due','到期迁移','之前测试过，现在按现有复习节奏再次换情境。']]){
    const box=section('transfer-group');
    box.append(h('h2',title),p(`${desc} · ${groups[key].length} 项`,'subtle'));
    if(!groups[key].length) box.append(p('目前没有可显示的项目。','empty'));
    else {
      const list=el('ul','','list');
      groups[key].slice(0,30).forEach(row=>{
        const li=el('li');const info=div();
        info.append(el('div',row.targetExpression||'开放式表达','item-title'),el('div',`${row.skillType} · ${row.sourceName||row.sourceType||'未知来源'} · ${row.retrievalStatus}`,'item-sub'));
        const side=div('head-actions');side.append(btn('开始迁移',()=>startWeaknessTransfer(row),'btn primary'));li.append(info,side);list.append(li);
      });
      box.append(list);
    }
    app.append(box);
  }
}
function startWeaknessTransfer(weakness){const contextIndex=0;data.activeTransfer={id:`transfer-session:${Date.now()}`,weaknessId:weakness.id,contextIndex,state:'input',draft:'',hintLevel:0,hintEvents:[],startedAt:new Date().toISOString(),attemptId:null};if(save()){page='transferPractice';render();}}
function activeWeaknessTransfer(){const state=data.activeTransfer;if(!state)return null;const weakness=inferredWeaknesses().find(row=>row.id===state.weaknessId);const context=weakness?.contexts?.[Number(state.contextIndex)||0];return weakness&&context?{state,weakness,context}:null;}
function transferHintText(context,weakness,level){const hints=context.hints||[];if(level<=0)return '';if(level<=hints.length)return hints[level-1];if(level===hints.length+1&&weakness.targetExpression)return `目标表达：${weakness.targetExpression}`;return '改变人物、时间或目的，用自己的英文重新组织。';}
let recordingController=null;
function stopLocalAudio(){if(activeLocalAudio){activeLocalAudio.pause();activeLocalAudio.onended=null;activeLocalAudio=null;}}
function playReferenceAudio(url,text=''){const safe=safeAudioUrl(url);if(!safe){speakEnglish(text);return;}stopSpeech();stopActiveAudio();stopLocalAudio();const audio=new Audio(safe);activeLocalAudio=audio;audio.onended=()=>{if(activeLocalAudio===audio)activeLocalAudio=null;};audio.onerror=()=>{if(activeLocalAudio===audio)activeLocalAudio=null;notify('参考音频加载失败；可以使用设备朗读继续练习。');};audio.play().catch(()=>notify('参考音频需要点击播放后才能开始。'));}
function recordingPanelKey(meta){return JSON.stringify([meta.weaknessId||'',meta.taskId||'',meta.attemptId||'',meta.role||'']);}
function activeRecordingPanel(meta){const key=recordingPanelKey(meta);return Array.from(app.querySelectorAll('.recording-panel')).find(panel=>panel.dataset.recordingKey===key)||null;}
function refreshRecordingPanel(meta){const panel=activeRecordingPanel(meta);if(panel)panel.replaceWith(renderRecordingControls(meta));}
function renderRecordingControls(meta){const panel=section('recording-panel');panel.dataset.recordingKey=recordingPanelKey(meta);panel.append(h('h3',meta.followAlong?'跟读录音 · SHADOWING':'口语录音 · SPEAKING','question-label'),p(meta.followAlong?'先听参考，再录下自己的版本。录音只保存在本机，不提供发音分数。':'录音只在你点击开始后请求麦克风权限；不提供发音分数。文字答案始终可用。','subtle'));const capability=recordingCapability();if(!capability.supported){panel.append(p(`${capability.reason} iPhone 可在设置 → Safari → 麦克风中重新允许；你也可以继续使用文字输入。`,'hint'));return panel;}if(meta.followAlong)panel.append(lines(btn(meta.audioUrl?'听参考音频':'听设备参考朗读',()=>meta.audioUrl?playReferenceAudio(meta.audioUrl,meta.text):speakEnglish(meta.text),'btn secondary'),btn('停止播放',()=>{stopSpeech();stopActiveAudio();stopLocalAudio();},'btn ghost')));const row=lines();const active=recordingController?.meta?.weaknessId===meta.weaknessId&&recordingController?.meta?.attemptId===meta.attemptId&&recordingController?.meta?.role===meta.role;if(active){const status=el('span','录音中 · 00:00','tiny');const timer=setInterval(()=>{if(!status.isConnected||!recordingController||recordingController.meta.attemptId!==meta.attemptId){clearInterval(timer);return;}status.textContent=`录音中 · ${fmtTime(Date.now()-recordingController.startedAt)}`;},250);row.append(btn('停止录音',stopActiveRecording,'btn danger'),status);}else row.append(btn(meta.role==='retry'?'重录当前答案':meta.followAlong?'开始跟读录音':'开始录音',()=>startActiveRecording(meta),'btn secondary'),el('span',`${meta.role==='retry'?'重答录音':'初答录音'} · ${capability.mimeType}`,'tiny'));panel.append(row);const list=div('recording-list');panel.append(list);listRecordings({weaknessId:meta.weaknessId,taskId:meta.taskId}).then(rows=>{rows.filter(item=>item.role===meta.role).forEach(item=>{const line=div('recording-row');const short=item.durationMs>0&&item.durationMs<5000?' · 可能不完整':'';line.append(el('span',`${item.role==='retry'?'重答':'初答'} · ${fmtTime(item.durationMs||0)}${short}`,'tiny'),btn(meta.followAlong?(item.role==='retry'?'听我的重答':'听我的初答'):'播放',()=>playLocalRecording(item.id),'btn ghost'),btn('导出',()=>exportLocalRecording(item.id),'btn ghost'));list.append(line);});}).catch(()=>{list.append(p('录音记录暂时不可读取，文字训练不受影响。','tiny'));});return panel;}
async function startActiveRecording(meta){const capability=recordingCapability();if(!capability.supported)return notify('当前浏览器不支持录音，已保留文字训练。');stopSpeech();stopActiveAudio();stopLocalAudio();try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!activeRecordingPanel(meta)){stream.getTracks().forEach(track=>track.stop());return;}const recorder=new MediaRecorder(stream,{mimeType:capability.mimeType});const chunks=[];const controller={recorder,stream,chunks,meta:{...meta,mimeType:capability.mimeType},startedAt:Date.now(),renderAfterStop:true};recordingController=controller;recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data);};recorder.onstop=async()=>{try{const blob=new Blob(chunks,{type:recorder.mimeType||capability.mimeType});const saved=await putRecording({...meta,mimeType:recorder.mimeType||capability.mimeType,durationMs:Date.now()-controller.startedAt},blob);meta.onSaved?.(saved);notify('录音已保存在本机。');}catch(error){notify(`录音保存失败：${error.message}；文字答案仍然保留。`);}finally{stream.getTracks().forEach(track=>track.stop());if(recordingController===controller)recordingController=null;if(controller.renderAfterStop)refreshRecordingPanel(meta);}};recorder.start();refreshRecordingPanel(meta);}catch(error){notify(error?.name==='NotAllowedError'?'麦克风权限被拒绝，已切换为文字训练。':'录音不可用，已切换为文字训练。');}}
function stopActiveRecording({renderAfter=true}={}){const controller=recordingController;if(!controller?.recorder||controller.recorder.state!=='recording')return false;controller.renderAfterStop=renderAfter;controller.recorder.stop();return true;}
async function playLocalRecording(id){try{const row=await getRecording(id);if(!row?.blob)return notify('找不到本地录音。');stopSpeech();stopActiveAudio();stopLocalAudio();const url=URL.createObjectURL(row.blob);const audio=new Audio(url);activeLocalAudio=audio;audio.onended=()=>{URL.revokeObjectURL(url);if(activeLocalAudio===audio)activeLocalAudio=null;};await audio.play();}catch(error){notify(`无法播放录音：${error.message}`);}}
async function exportLocalRecording(id){try{const row=await getRecording(id);if(!row?.blob)return notify('找不到本地录音。');const url=URL.createObjectURL(row.blob);const link=el('a','');link.href=url;link.download=`english-cultivation-${row.role}-${row.createdAt.replaceAll(':','-')}.${row.mimeType.includes('mp4')?'m4a':'webm'}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}catch(error){notify(`无法导出录音：${error.message}`);}}
function renderTransferPractice(){
  const active=activeWeaknessTransfer();if(!active){setPage('transferHub');return;}
  const {state,weakness,context}=active;const taskType=weakness.taskType||'general_transfer';const box=section('transfer-practice');
  const title=taskType==='writing'?'Writing Practice':taskType==='grammar'?'Grammar Transformation':taskType==='speaking'||taskType==='reading_to_speaking'?'IELTS Speaking Practice':'独立表达，再换情境';
  box.append(el('div',`综合输出 · ${taskType.toUpperCase()}`,'eyebrow'),h('h1',title),p(`状态：${weakness.retrievalStatus} · ${weakness.skillType}`,'tiny'));
  const source=sourcePanel(weakness);if(source)box.append(source);
  const prompt=section('panel');prompt.append(h('h2',context.prompt));
  if(state.state==='input'){
    const hintText=transferHintText(context,weakness,state.hintLevel);if(hintText)prompt.append(p(hintText,'hint'));
    const input=textarea(state.draft,taskType==='writing'?'写作初稿（可选 80–100 词）……':taskType==='grammar'?'请先独立改写句子……':'请先用英文独立回答……');input.classList.add('answer-input');focusForMobile(input);input.addEventListener('input',()=>{state.draft=input.value;scheduleDraftSave();});
    if(taskType==='writing'){const counter=el('div',`当前字数：${state.draft.trim()?state.draft.trim().split(/\s+/).length:0} · 建议 80–100 词`,'tiny');input.addEventListener('input',()=>{counter.textContent=`当前字数：${input.value.trim()?input.value.trim().split(/\s+/).length:0} · 建议 80–100 词`;});prompt.append(counter);}
    prompt.append(field(taskType==='writing'?'写作初稿':taskType==='grammar'?'独立改写':'你的独立回答',input));
    const speaking=taskType==='speaking'||taskType==='reading_to_speaking';if(speaking)prompt.append(renderRecordingControls({weaknessId:weakness.id,taskId:context.id,attemptId:state.attemptId||state.id,role:'original'}));
    const actions=[btn(state.hintLevel?'再次查看分层提示':'需要提示',()=>{state.hintLevel=Math.min(state.hintLevel+1,(context.hints||[]).length+2);state.hintEvents=[...(state.hintEvents||[]),{level:state.hintLevel,at:new Date().toISOString()}];save();render();},'btn ghost')];if(speaking)actions.push(btn('仅保存录音并提交初答',()=>submitWeaknessRecordingOnly(active),'btn secondary'));actions.push(btn(taskType==='writing'?'提交初稿':'提交独立初答',()=>submitWeaknessTransfer(active,input.value),'btn primary'));prompt.append(lines(...actions));
  }else{
    const row=(data.transferAttempts||[]).find(item=>item.id===state.attemptId)||data.transferAttempts?.at(-1);
    prompt.append(p(`第一次回答：${row?.firstAnswer||'（录音初答，未转写）'}`,'small-block'),p(`参考表达：${context.referenceAnswer||'未提供'}`,'small-block'));
    if(row?.recordingOnly)prompt.append(p('录音已保存；语言质量尚未评估。','hint'));
    if(row?.rating)prompt.append(p(`本次证据：${row.evidenceType||transferEvidenceStatus(row)} · 下一次复测：${weakness.nextReviewAt?new Date(weakness.nextReviewAt).toLocaleDateString('zh-CN'):'未安排'}`,'success'));else{prompt.append(h('h3','根据真实回忆自评'));const ratings=lines(...[['K','独立使用','k'],['V','仍然模糊','v'],['N','需要重新学习','n']].map(([rating,label,cls])=>{const b=el('button','','self-btn '+cls);b.append(h('strong',rating),el('small',label));b.addEventListener('click',()=>rateWeaknessTransfer(active,rating));return b;}));prompt.append(ratings);}
    if(row?.rating&&weakness.contexts.length>Number(state.contextIndex)+1)prompt.append(btn('下一情境复测',()=>{state.contextIndex++;state.state='input';state.draft='';state.hintLevel=0;state.hintEvents=[];state.attemptId=null;save();render();},'btn primary'));else if(row?.rating)prompt.append(btn('返回弱项列表',()=>{data.activeTransfer=null;save();setPage('transferHub');},'btn primary'));
  }
  box.append(prompt,lines(btn('暂停并返回弱项列表',()=>{save();setPage('transferHub');},'btn ghost')));app.append(box);
}
function submitWeaknessRecordingOnly(active){const {state,weakness,context}=active;const row=normalizeTransferAttempt({id:`transfer-attempt:${Date.now()}`,weaknessId:weakness.id,contextId:context.id,firstAnswer:'',hintUsed:state.hintLevel>0,hintEvents:state.hintEvents,referenceViewed:true,referenceDisplayedAutomatically:true,referenceViewedAt:new Date().toISOString(),retryAnswer:'',rating:null,evidenceType:'voice_recording',at:new Date().toISOString(),recordingOnly:true,sourceSnapshot:normalizeSourceMeta(weakness)});data.transferAttempts=mergeTransferAttempts(data.transferAttempts||[],[row]);state.attemptId=row.id;state.state='revealed';if(save())render();}
function submitWeaknessTransfer(active,answer){const {state,weakness,context}=active;const row=normalizeTransferAttempt({id:`transfer-attempt:${Date.now()}`,weaknessId:weakness.id,contextId:context.id,firstAnswer:String(answer||''),hintUsed:state.hintLevel>0,hintEvents:state.hintEvents,referenceViewed:true,referenceDisplayedAutomatically:true,referenceViewedAt:new Date().toISOString(),evidenceType:state.hintLevel>0?'prompted':'independent_recall',at:new Date().toISOString(),sourceSnapshot:normalizeSourceMeta(weakness)});data.transferAttempts=mergeTransferAttempts(data.transferAttempts||[],[row]);state.attemptId=row.id;state.state='revealed';if(save())render();}
function rateWeaknessTransfer(active,rating){const {state,weakness}=active;const row=(data.transferAttempts||[]).find(item=>item.id===state.attemptId);if(!row)return;row.rating=rating;row.delayed=Boolean(weakness.lastTransferAt&&Date.now()-new Date(weakness.lastTransferAt).getTime()>86400000);row.evidenceType=transferEvidenceStatus(row);const schedule=scheduleReview(rating,{intervalDays:weakness.intervalDays||0,learningStage:'review'},new Date());weakness.nextReviewAt=schedule.dueAt;weakness.lastTransferAt=new Date().toISOString();weakness.retrievalStatus=row.evidenceType;weakness.intervalDays=schedule.intervalDays;if(save())render();}

/** Explicit clipboard action only; nothing here transmits private learning material. */
function latestCentralHandoff(){
  const report=data.reports?.at(-1)||null;
  const words=collectSavedReadingWords(data.items,data.readingMarks,data.readings);
  if(!report&&!words.length)return '';
  return centralLearningHandoff({report,readingWords:words,generatedAt:new Date().toISOString()});
}
function showHandoffCopyFallback(value){
  document.getElementById('handoff-copy-dialog')?.remove();
  const overlay=div('switch-backdrop');overlay.id='handoff-copy-dialog';
  const card=section('switch-dialog');
  const input=textarea(value,'手动复制学习交接文本');input.readOnly=true;input.rows=9;
  card.append(h('h2','手动复制英语交接文本'),p('Safari 没有开放自动复制。请长按文本选择“拷贝”，再粘贴给中央仙窍。','subtle'),field('包含最新战报与阅读生词',input),lines(btn('全选文本',()=>{input.focus();input.select();},'btn secondary'),btn('关闭',()=>overlay.remove(),'btn ghost')));
  overlay.append(card);document.body.append(overlay);input.focus();input.select();
}
async function copyCentralLearningHandoff(){
  const value=latestCentralHandoff();
  if(!value){notify('还没有战报或阅读生词。先完成学习再进行交接。');return;}
  try{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard unsupported');
    await navigator.clipboard.writeText(value);
    notify('已复制：最近一份战报＋阅读生词。返回 ChatGPT 粘贴即可。');
  }catch{showHandoffCopyFallback(value);}
}
function exportCentralLearningHandoff(){
  const value=latestCentralHandoff();
  if(!value){notify('还没有可导出的学习交接材料。');return;}
  download('central-english-handoff-'+new Date().toISOString().slice(0,10)+'.md',value,'text/markdown;charset=utf-8');
  notify('已发起下载。请在 iPhone“文件”中确认文件实际保存。');
}
function latestCentralFeedback(){return buildCentralLearningFeedback({report:data.reports?.at(-1)||null,generatedAt:new Date().toISOString()});}
function centralFeedbackJSON(){return JSON.stringify(latestCentralFeedback(),null,2);}
async function copyCentralFeedback(){const value=centralFeedbackJSON();try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unsupported');await navigator.clipboard.writeText(value);notify('已复制“生成下次学习依据”反馈 JSON；不会自动同步到外部服务。');}catch{showHandoffCopyFallback(value);}}
function exportCentralFeedback(){const value=centralFeedbackJSON();const stamp=new Date().toISOString().slice(0,10);download(`central-english-feedback-${stamp}.json`,value,'application/json');notify('已导出结构化反馈 JSON；请在 iPhone“文件”中确认保存。');}
function downloadBytes(name,bytes,mime='application/octet-stream'){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function sourcePackForHandover(report){
  const stored=data.dailyPack?.sourcePack;
  if(!stored?.raw)return {unavailableReason:data.dailyPack?.sourcePackUnavailableReason||'原始学习包未在本次导入中保存；旧 Journey 无法安全重建原始 JSON。'};
  try{
    const bytes=new TextEncoder().encode(stored.raw),parsed=JSON.parse(stored.raw);
    if(parsed?.schema_version!=='2.0'||!parsed?.pack_id)throw Error('原始学习包缺少 schema_version 2.0 或 pack_id。');
    if(report?.pack_id&&report.pack_id!==parsed.pack_id)throw Error('战报 pack_id 与原始学习包不一致。');
    if(data.dailyPack?.packId&&data.dailyPack.packId!==parsed.pack_id)throw Error('当前学习包 ID 与原始学习包不一致。');
    return {...stored,bytes,packId:parsed.pack_id,schemaVersion:parsed.schema_version,provenance:stored.provenance||{type:'imported_daily_pack',source:'local file'}};
  }catch(error){return {unavailableReason:`原始学习包不可安全导出：${error.message}`};}
}
function reportRecordingIds(report){const ids=new Set();for(const row of (report?.attempts||[])){for(const id of (row.recording_ids||[]))ids.add(id);}for(const row of (report?.transfer_attempts||[])){for(const id of (row.recordingIds||row.recording_ids||[]))ids.add(id);}for(const row of (report?.reading_analysis?.retelling_attempts||[])){for(const id of (row.recordingIds||row.recording_ids||[]))ids.add(id);}return [...ids];}

async function exportCentralHandover(includeRecordings=false){const report=reportFor();if(!report)return notify('请先完成一次训练，再导出中央交接包。');if(includeRecordings&&!confirm('录音会写入本地 ZIP 文件，不会上传。确认继续？'))return;const ids=includeRecordings?reportRecordingIds(report):[];const recordings=[];try{for(const id of ids){const row=await getRecording(id);if(!row?.blob)continue;const bytes=new Uint8Array(await row.blob.arrayBuffer());recordings.push({...row,bytes,sha256:await sha256Hex(bytes)});}const sourcePack=sourcePackForHandover(report);if(sourcePack.bytes)sourcePack.sha256=await sha256Hex(sourcePack.bytes);const feedback=JSON.parse(centralFeedbackJSON());const packageData=handoverEntries({report,feedback,pack:data.dailyPack,sourcePack,recordings});const zip=zipStore(packageData.entries);const reread=readZipStore(zip.bytes);const manifestEntry=reread.find(entry=>entry.name==='manifest.json');if(!manifestEntry)throw Error('导出后回读失败：缺少 manifest.json。');const checked=JSON.parse(new TextDecoder().decode(manifestEntry.bytes));if(Number(checked.actual_packaged_count??0)!==recordings.filter(row=>row.bytes.length>0).length)throw Error('导出后回读失败：录音数量不一致。');if(checked.source_pack_included){const packEntry=reread.find(entry=>entry.name==='learning-pack.json');if(!packEntry)throw Error('导出后回读失败：缺少 learning-pack.json。');if(checked.source_pack_sha256!==await sha256Hex(packEntry.bytes))throw Error('导出后回读失败：原始学习包 SHA-256 不一致。');}downloadBytes(`english-cultivation-central-handover-${report.session_id||Date.now()}.zip`,zip.bytes,'application/zip');notify(`中央交接包已生成并完成隔离回读：${packageData.entries.length} 个文件${recordings.length?`，包含 ${recordings.length} 条录音`:''}。不会自动同步外部服务。`);}catch(error){notify(`交接包生成失败或回读失败：${error.message}；原始录音和学习记录未改变。`);}}


function renderMore(){
  app.append(el('div','我的 · MORE','eyebrow'),h('h1','资料与设置'),p('管理资料、战报与偏好设置。','lead'));
  const grid=div('feature-grid more-grid');for(const [title,desc,pageName,icon] of [['资料库','导入学习包、CSV、TXT 和 Markdown。','library','▤'],['阅读生词本','查看并复制从文章保存的单词与原句。','readingVocabulary','Aa'],['修炼战报','查看、复制和下载真实训练记录。','reports','▥'],['学习进度','查看真实分钟、趋势和 K/V/N。','progress','↗']]){const b=el('button','','mode-card feature-card');b.append(el('div',icon,'mode-icon'),h('strong',title),el('span',desc));b.addEventListener('click',()=>setPage(pageName));grid.append(b);}app.append(grid);
  const handoff=section('settings-card');
  const handoffActions=div('handoff-actions-grid');
  handoffActions.append(btn('复制最新学习证据',copyCentralLearningHandoff,'btn primary'),btn('下载 Markdown',exportCentralLearningHandoff,'btn secondary'),btn('复制反馈依据',copyCentralFeedback,'btn secondary'),btn('导出反馈 JSON',exportCentralFeedback,'btn ghost'));
  handoff.append(h('h2','交接给中央仙窍'),p('整理最新战报与生词（本地复制，不会上传资料）。','subtle'),handoffActions);
  app.append(handoff);
  const settings=section('settings-card');settings.append(h('h2','数据安全与学习设置'),p('主题、朗读、提示、备份和本机录音检查。','subtle'),lines(btn('打开设置与数据安全',()=>setPage('settings'),'btn primary'),btn('使用帮助',showGuide,'btn secondary')));app.append(settings);
}


const JOURNEY_LABELS={vocabulary:'触控词汇｜SMART VOCAB',words:'炼词',spelling:'炼字｜SPELLING FORGE',sentences:'炼句',reading:'阅读',listening:'听力',speech:'演讲跟读',transfer:'综合输出'};
function moduleForItem(item){return item.module==='listening'?'listening':item.kind==='word'?'words':'sentences';}
function journeyVocabularyTasks(){return Array.isArray(data.dailyPack?.vocabularyPractice)?data.dailyPack.vocabularyPractice:[];}
function journeyStages(){
  const ids=new Set(data.dailyPack?.itemIds||[]);
  const relevant=activeItems().filter(item=>ids.has(item.id));
  const readingIds=new Set(data.dailyPack?.readingIds||[]);
  const hasReading=(data.readings||[]).some(reading=>readingIds.has(reading.id));
  const hasVocab=journeyVocabularyTasks().length>0;
  const stages=[...(hasVocab?['vocabulary']:[]),'words',...(data.dailyPack?.spellingTasks?.length?['spelling']:[]),'sentences','reading','listening'].filter(stage=>stage==='vocabulary'?hasVocab:stage==='reading'?hasReading:stage==='spelling'?true:relevant.some(item=>moduleForItem(item)===stage));
  if(journeySpeeches().length)stages.push('speech');
  if((data.dailyPack?.transferTasks||[]).length)stages.push('transfer');
  return stages;
}
function journeyReadings(){const ids=new Set(data.dailyPack?.readingIds||[]);return (data.readings||[]).filter(item=>ids.has(item.id));}
function journeySpeeches(){const ids=new Set(data.dailyPack?.speechIds||[]);return (data.speeches||[]).filter(item=>ids.has(item.id));}
function journeyStage(){const journey=data.dailyJourney;return journey&&!journey.finishedAt?journey.steps[journey.index]||null:null;}
function journeyElapsedMs(){
  const j=data.dailyJourney;if(!j)return 0;
  const ids=new Set(j.sessionIds||[]);
  const completed=(data.sessions||[]).filter(s=>ids.has(s.id)).reduce((sum,s)=>sum+Number(s.activeMs||0),0);
  return completed+Number(j.vocabularyMs||0)+Number(j.readingMs||0)+Number(j.speechMs||0)+Number(j.transferMs||0)+(data.activeSession?.journeyId===j.id?Number(data.activeSession.activeMs||0):0);
}
function ensureVocabularyInActiveJourney(){
  const j=data.dailyJourney,pack=data.dailyPack;
  if(!j||j.finishedAt||!pack||j.packId!==pack.packId)return;
  if(journeyVocabularyTasks().length>0&&!j.steps.includes('vocabulary')&&!(j.completed||[]).some(c=>c.stage==='vocabulary')){
    const insertAt=Math.min(j.index||0,j.steps.length);
    j.steps.splice(insertAt,0,'vocabulary');
    j.vocabularyIndex=Number(j.vocabularyIndex)||0;
    j.vocabularyAttempts=Array.isArray(j.vocabularyAttempts)?j.vocabularyAttempts:[];
    j.vocabularyMs=Number(j.vocabularyMs)||0;
  }
}
function startDailyJourney(){
  const pack=data.dailyPack;if(!pack)return setPage('library');
  if(data.activeSession&&(data.activeSession.journeyId!==data.dailyJourney?.id||data.dailyJourney?.packId!==pack.packId)){notify('请先完成或结束上一个训练，再开始新的今日综合学习。');setPage('practice');return;}
  const old=data.dailyJourney;
  if(old?.packId===pack.packId&&!old.finishedAt){ensureVocabularyInActiveJourney();save();return beginJourneyStage();}
  if(old&&!old.finishedAt&&old.packId!==pack.packId&&!confirm('上一个综合学习尚未完成。切换新学习包？已有练习记录仍保留。'))return;
  if(old?.packId===pack.packId&&old.finishedAt&&!confirm('这份学习包已经完成。确定重新开始一次综合学习？'))return;
  const steps=journeyStages();
  if(!steps.length){if(pack.storyPractice){notify('已导入纸上故事练习；请选择一个 Story / Section 开始。');return setPage('home');}notify('此学习包没有可用模块，请检查导入内容。');return setPage('library');}
  const id=`journey:${pack.packId}:${Date.now()}`;
  data.dailyJourney={id,packId:pack.packId,startedAt:new Date().toISOString(),steps,index:0,completed:[],sessionIds:[],vocabularyMs:0,vocabularyRunning:false,vocabularyLastTick:null,vocabularyIndex:0,vocabularyAttempts:[],readingMs:0,speechMs:0,speechRunning:false,speechLastTick:null,speechDoneIds:[],speechAttempts:[],readingRunning:false,readingLastTick:null,readingDoneIds:[],readingPartialIds:[],readingRecallQueue:[],readingRecallIndex:0,readingRecallAttempts:[],readingRecallStep:null,readingRecallDraft:'',spellingIndex:0,spellingAttempts:[],transferIndex:0,transferAttempts:[],transferRecordingIds:{},transferSkippedTaskIds:[],transferMs:0,transferRunning:false,transferLastTick:null,targetMinutes:Number(pack.recommendedMinutes||data.settings.duration)||40,finishedAt:null};
  if(!save())return;
  beginJourneyStage();
}
function accrueJourneyVocabulary(){
  const j=data.dailyJourney;if(!j||journeyStage()!=='vocabulary'||!j.vocabularyRunning)return;
  const now=Date.now();if(!document.hidden&&page==='vocabulary'){const from=j.vocabularyLastTick||now;j.vocabularyMs=(Number(j.vocabularyMs)||0)+Math.max(0,Math.min(1800,now-from));j.vocabularyActiveByDay=addActiveInterval(j.vocabularyActiveByDay,from,now);}
  j.vocabularyLastTick=now;
}
function pauseJourneyVocabulary(){
  const j=data.dailyJourney;if(!j||!j.vocabularyRunning)return;
  accrueJourneyVocabulary();j.vocabularyRunning=false;j.vocabularyLastTick=null;save();
}
function beginJourneyStage(){
  const j=data.dailyJourney;if(!j||j.finishedAt)return;
  const stage=journeyStage();if(!stage)return finishDailyJourney();
  if(stage==='vocabulary'){
    const tasks=journeyVocabularyTasks();
    if(!tasks.length){j.completed.push({stage:'vocabulary',status:'skipped',count:0});j.index++;if(save())beginJourneyStage();return;}
    j.vocabularyRunning=true;j.vocabularyLastTick=Date.now();
    if(save())setPage('vocabulary');
    return;
  }
  if(stage==='spelling'){if(save())setPage('spelling');return;}
  if(stage==='speech'){
    const pending=journeySpeeches().filter(row=>!(j.speechDoneIds||[]).includes(row.id));
    if(!pending.length){j.completed.push({stage,status:'completed',count:j.speechDoneIds.length});j.index++;if(save())beginJourneyStage();return;}
    selectedSpeechId=pending[0].id;if(save())setPage('speech');return;
  }
  if(stage==='transfer'){j.transferRunning=true;j.transferLastTick=Date.now();if(save())setPage('transfer');return;}
  if(stage==='reading'){
    const pending=journeyReadings().filter(article=>!j.readingDoneIds.includes(article.id));
    if(!pending.length){j.completed.push({stage,status:'completed',count:j.readingDoneIds.length});j.index++;if(save())beginJourneyStage();return;}
    selectedReadingId=pending[0].id;
    j.readingRunning=true;j.readingLastTick=Date.now();
    if(save())setPage('reading');
    return;
  }
  if(data.activeSession){
    if(data.activeSession.journeyId===j.id){page='practice';render();return;}
    notify('请先结束其他训练，再继续今日综合学习。');setPage('practice');return;
  }
  const mode=stage==='words'?'words':'sentences',opts={scope:'journey',journeyId:j.id,journeyStage:stage,packId:j.packId,sentenceStyle:stage==='listening'?'listening':'cloze',duration:j.targetMinutes};
  const items=itemsForScope(opts);
  if(!items.length){j.completed.push({stage,status:'skipped',count:0});j.index++;if(save())beginJourneyStage();return;}
  data.activeSession=newSession(mode,opts);
  if(!save())return;
  setPage('practice');
}
function accrueJourneyReading(){
  const j=data.dailyJourney;if(!j||journeyStage()!=='reading'||!j.readingRunning)return;
  const now=Date.now();if(!document.hidden&&page==='reading'){const from=j.readingLastTick||now;j.readingMs+=Math.max(0,Math.min(1800,now-from));j.readingActiveByDay=addActiveInterval(j.readingActiveByDay,from,now);}
  j.readingLastTick=now;
}
function pauseJourneyReading(){
  const j=data.dailyJourney;if(!j||!j.readingRunning)return;
  accrueJourneyReading();j.readingRunning=false;j.readingLastTick=null;save();
}
function resumeJourneyReading(){
  const j=data.dailyJourney;if(!j||journeyStage()!=='reading')return;
  j.readingRunning=true;j.readingLastTick=Date.now();if(save())render();
}
function readingRecallQueueFor(article){
  const attempted=new Set((data.dailyJourney?.readingRecallAttempts||[]).map(row=>row.markId));const seen=new Set();const rows=[];
  for(const mark of (data.readingMarks||[]).filter(row=>row.readingId===article.id)){
    const markId=String(mark.id||'');const word=String(mark.wordText||mark.normalizedWord||'').trim();if(!markId||!word||attempted.has(markId)||seen.has(markId))continue;seen.add(markId);
    const source=String(mark.originalSentence||'').trim();const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const prompt=source?source.replace(new RegExp(escaped,'i'),'_____'):'';
    rows.push({markId,readingId:article.id,word,prompt:prompt||`Use the marked word “${word}” in the original sentence.`,originalSentence:source,sourceTitle:article.title||mark.sourceTitle||'',packId:mark.packId||article.packId||null});
  }
  return rows.slice(0,5);
}
function finishReadingArticle(j,article){
  if(!j.readingDoneIds.includes(article.id))j.readingDoneIds.push(article.id);const questions=readingQuestionsFor(article),check=readingCheckState(article);if(questions.length&&check?.status!=='completed'){j.readingPartialIds=[...(j.readingPartialIds||[]).filter(id=>id!==article.id),article.id];}
  j.readingRecallQueue=[];j.readingRecallIndex=0;j.readingRecallStep=null;j.readingRecallDraft='';
  if(!save())return;
  if(readingQuestionsFor(article).length&&!readingCheckState(article))notify(`文章已完成；阅读理解还有 ${readingQuestionsFor(article).length} 题待完成，可在阅读目录继续。`);
  const pending=journeyReadings().filter(x=>!j.readingDoneIds.includes(x.id));
  if(pending.length){selectedReadingId=pending[0].id;resumeJourneyReading();return;}
  const partial=(j.readingPartialIds||[]).length>0;j.completed.push({stage:'reading',status:partial?'partial':'completed',count:j.readingDoneIds.length,partial_count:(j.readingPartialIds||[]).length});j.index++;
  if(save())beginJourneyStage();
}
function renderReadingRecall(j,article){
  const row=j.readingRecallQueue?.[Number(j.readingRecallIndex)||0];if(!row)return null;const box=section('reading-recall-panel');box.append(el('div','阅读标记即时回忆 · READING RECALL','question-label'),h('h2',`回忆：${row.sourceTitle||article.title}`),p(`第 ${(Number(j.readingRecallIndex)||0)+1} / ${j.readingRecallQueue.length} · 原文：${row.prompt}`,'question'));
  if(j.readingRecallStep!=='revealed'){const input=textInput(j.readingRecallDraft,'请回忆英文单词或短语');input.classList.add('answer-input');focusForMobile(input);input.addEventListener('input',()=>{j.readingRecallDraft=input.value;scheduleDraftSave();});box.append(field('你的回忆',input),btn('提交即时回忆',()=>{j.readingRecallDraft=input.value.trim();j.readingRecallStep='revealed';if(save())render();},'btn primary'));}
  else{
    const revealed=revealedReadingRecall(row);
    box.append(
      p(`你的回答：${j.readingRecallDraft||'（空）'}`,'small-block'),
      p(`原句补全：${revealed.sentence}`,'question'),
      p(`参考答案：${revealed.word}`,'small-block'),
      p('参考答案已显示；请根据实际回忆自评。标记本身不等于 N。','hint'),
      h('h3','根据真实回忆自评'),
      lines(...[['K','会用','k'],['V','模糊','v'],['N','不会','n']].map(([rating,label,cls])=>btn(`${rating} · ${label}`,()=>{j.readingRecallAttempts=[...(j.readingRecallAttempts||[]),{id:`reading-recall:${row.markId}:${Date.now()}`,markId:row.markId,readingId:row.readingId,word:row.word,originalSentence:row.originalSentence,sourceTitle:row.sourceTitle,packId:row.packId,userAnswer:j.readingRecallDraft,rating,at:new Date().toISOString(),independent:true}];j.readingRecallIndex++;j.readingRecallDraft='';j.readingRecallStep=null;if(j.readingRecallIndex>=j.readingRecallQueue.length)finishReadingArticle(j,article);else if(save())render();},`btn ${cls}`)))
    );
  }
  return box;
}
function completeJourneyReading(){
  const j=data.dailyJourney;if(!j||journeyStage()!=='reading')return;
  const article=journeyReadings().find(x=>!j.readingDoneIds.includes(x.id));if(!article)return;
  if(!confirm('确认已经认真阅读这篇文章？此操作只记录阅读完成，不代表理解测试已经通过。'))return;
  if(j.readingRecallQueue?.length)return;
  pauseJourneyReading();const queue=readingRecallQueueFor(article);if(queue.length){j.readingRecallQueue=queue;j.readingRecallIndex=0;j.readingRecallStep='input';j.readingRecallDraft='';if(save())render();return;}
  finishReadingArticle(j,article);
}
function finishDailyJourney(){
  const j=data.dailyJourney;if(!j||j.finishedAt)return;
  const sessions=(data.sessions||[]).filter(session=>j.sessionIds.includes(session.id));
  const ids=[...new Set(j.sessionIds)];
  const attempts=data.attempts.filter(attempt=>ids.includes(attempt.sessionId));
  const activeMs=sessions.reduce((sum,item)=>sum+Number(item.activeMs||0),0)+Number(j.vocabularyMs||0)+Number(j.readingMs||0)+Number(j.speechMs||0)+Number(j.transferMs||0);
  const endedAt=new Date().toISOString();
  const session={id:j.id,startedAt:j.startedAt,endedAt,activeMs,mode:'journey',scope:'today',packId:j.packId};
  const readingIds=new Set(journeyReadings().map(reading=>reading.id));
  const journeyTransferAttempts=journeyTransferAttemptsForReport(j);
  const report=buildBattleReport({session,attempts,items:data.items,allowedSessionIds:ids,readingMarks:journeyReadingMarksForReport(j,readingIds),readings:journeyReadings(),readingChecks:(data.readingChecks||[]).filter(check=>readingIds.has(check.readingId)),readingRetellingAttempts:(data.readingRetellingAttempts||[]).filter(row=>readingIds.has(row.readingId)),weaknesses:inferredWeaknesses(),transferAttempts:journeyTransferAttempts,readingRecallAttempts:j.readingRecallAttempts||[],readingCompletedIds:j.readingDoneIds||[],spellingAttempts:j.spellingAttempts||[],listeningDiagnostics:data.listeningDiagnosticAttempts||[],vocabularyTasks:journeyVocabularyTasks(),vocabularyAttempts:j.vocabularyAttempts||[],originalWordArchive:data.dailyPack?.originalWordArchive||[],radioLog:radioSessionLog,manualReviewMarks:data.manualReviewMarks||[],timezone:'Asia/Shanghai',appVersion:APP_VERSION});
  report.module_coverage=j.completed.map(x=>({...x,label:JOURNEY_LABELS[x.stage]||x.stage}));
  report.reading_completed=j.readingDoneIds.filter(id=>!(j.readingPartialIds||[]).includes(id)).length;
  report.reading_partial=j.readingPartialIds||[];
  report.reading_seconds=Math.round(j.readingMs/1000);
  report.speech_practice={source:'speech_chamber',audio_active_seconds:Math.round((j.speechMs||0)/1000),attempts:(j.speechAttempts||[]).map(row=>({...row,assessment:'USER_SELF_REPORT_NOT_PRONUNCIATION_SCORE'})),transfer_attempts:(data.speechTransferAttempts||[]).filter(row=>row.packId===j.packId)};
  report.active_time_by_day={};for(const row of [...sessions,{activeByDay:j.vocabularyActiveByDay},{activeByDay:j.readingActiveByDay},{activeByDay:j.speechActiveByDay},{activeByDay:j.transferActiveByDay}])for(const [day,ms] of Object.entries(row.activeByDay||{}))report.active_time_by_day[day]=(report.active_time_by_day[day]||0)+Number(ms||0);report.unallocated_active_ms=Math.max(0,activeMs-Object.values(report.active_time_by_day).reduce((a,b)=>a+b,0));
  report.target_minutes=j.targetMinutes;
  report.modules_completed=j.completed.filter(x=>x.status==='completed').length;
  report.modules_planned=j.steps.length;
  report.data_quality={...report.data_quality,reading_completion_self_reported:true,goal_not_a_completion_rule:true};
  report.transfer_attempts=journeyTransferAttempts;report.transfer_summary={attempted:report.transfer_evidence?.counts.total||0,independent:report.transfer_evidence?.counts.independent||0,prompted:report.transfer_evidence?.counts.prompted||0,self_corrected:journeyTransferAttempts.filter(x=>x.retryAnswer).length,unassessed:journeyTransferAttempts.filter(x=>!x.rating).length};
  if(j.vocabularyMs>0){data.sessions.push({id:`${j.id}:vocabulary`,startedAt:j.startedAt,endedAt,activeMs:j.vocabularyMs,activeByDay:j.vocabularyActiveByDay,mode:'vocabulary',scope:'today',packId:j.packId,count:(j.vocabularyAttempts||[]).length,words:(j.vocabularyAttempts||[]).length,sentences:0,K:0,V:0,N:0});}
  if(j.speechMs>0){data.sessions.push({id:`${j.id}:speech`,startedAt:j.startedAt,endedAt,activeMs:j.speechMs,activeByDay:j.speechActiveByDay,mode:'speech',scope:'today',packId:j.packId,count:0,words:0,sentences:0,K:0,V:0,N:0});}
  if(j.readingMs>0){data.sessions.push({id:`${j.id}:reading`,startedAt:j.startedAt,endedAt,activeMs:j.readingMs,activeByDay:j.readingActiveByDay,mode:'reading',scope:'today',packId:j.packId,count:0,words:0,sentences:0,K:0,V:0,N:0});}
  if(j.transferMs>0){data.sessions.push({id:`${j.id}:transfer`,startedAt:j.startedAt,endedAt,activeMs:j.transferMs,activeByDay:j.transferActiveByDay,mode:'transfer',scope:'today',packId:j.packId,count:0,words:0,sentences:0,K:0,V:0,N:0});}
  data.reports.push(report);
  j.finishedAt=endedAt;j.speechRunning=false;j.speechLastTick=null;j.readingRunning=false;j.readingLastTick=null;j.transferRunning=false;j.transferLastTick=null;
  if(!save())return;
  lastSessionSummary=report;setPage('summary');
}
function rebuildJourneyReport(){
  const j=data.dailyJourney;if(!j||!j.finishedAt){notify('没有可重建的已结束综合学习。');return null;}
  const ids=[...new Set(j.sessionIds||[])];
  if(!ids.length){notify('本机没有保存综合学习的阶段 session ID，无法无损重建。');return null;}
  const sessions=(data.sessions||[]).filter(session=>ids.includes(session.id));
  const readingIds=new Set(journeyReadings().map(reading=>reading.id));
  const journeyTransferAttempts=journeyTransferAttemptsForReport(j);
  const session={id:j.id,startedAt:j.startedAt,endedAt:j.finishedAt,activeMs:sessions.reduce((sum,item)=>sum+Number(item.activeMs||0),0)+Number(j.readingMs||0)+Number(j.speechMs||0)+Number(j.transferMs||0),mode:'journey',scope:'today',packId:j.packId};
  const report=buildBattleReport({session,attempts:data.attempts,items:data.items,allowedSessionIds:ids,readingMarks:journeyReadingMarksForReport(j,readingIds),readings:journeyReadings(),readingChecks:(data.readingChecks||[]).filter(check=>readingIds.has(check.readingId)),readingRetellingAttempts:(data.readingRetellingAttempts||[]).filter(row=>readingIds.has(row.readingId)),weaknesses:inferredWeaknesses(),transferAttempts:journeyTransferAttempts,readingRecallAttempts:j.readingRecallAttempts||[],readingCompletedIds:j.readingDoneIds||[],listeningDiagnostics:data.listeningDiagnosticAttempts||[],timezone:'Asia/Shanghai',appVersion:APP_VERSION});
  report.report_id=`report:${j.id}:recovered`;report.recovered_from_report_id=`report:${j.id}`;report.recovery={source:'local raw attempts and stage sessions',verified:true};
  report.module_coverage=(j.completed||[]).map(x=>({...x,label:JOURNEY_LABELS[x.stage]||x.stage}));report.reading_completed=(j.readingDoneIds||[]).filter(id=>!(j.readingPartialIds||[]).includes(id)).length;report.reading_partial=j.readingPartialIds||[];report.reading_seconds=Math.round(Number(j.readingMs||0)/1000);report.active_time_by_day={};for(const row of [...sessions,{activeByDay:j.vocabularyActiveByDay},{activeByDay:j.readingActiveByDay},{activeByDay:j.speechActiveByDay},{activeByDay:j.transferActiveByDay}])for(const [day,ms] of Object.entries(row.activeByDay||{}))report.active_time_by_day[day]=(report.active_time_by_day[day]||0)+Number(ms||0);report.unallocated_active_ms=Math.max(0,Number(session.activeMs||0)-Object.values(report.active_time_by_day).reduce((a,b)=>a+b,0));report.speech_practice={source:'speech_chamber',audio_active_seconds:Math.round(Number(j.speechMs||0)/1000),attempts:(j.speechAttempts||[]).map(x=>({...x,assessment:'USER_SELF_REPORT_NOT_PRONUNCIATION_SCORE'}))};report.target_minutes=j.targetMinutes;report.modules_completed=(j.completed||[]).filter(x=>x.status==='completed').length;report.modules_planned=j.steps?.length||0;report.data_quality={...report.data_quality,recovered_without_overwriting_original:true,reading_completion_self_reported:true,goal_not_a_completion_rule:true};
  report.transfer_attempts=journeyTransferAttempts;report.transfer_summary={attempted:report.transfer_evidence?.counts.total||0,independent:report.transfer_evidence?.counts.independent||0,prompted:report.transfer_evidence?.counts.prompted||0,self_corrected:journeyTransferAttempts.filter(x=>x.retryAnswer).length,unassessed:journeyTransferAttempts.filter(x=>!x.rating).length};
  data.reports=[...(data.reports||[]).filter(item=>item.report_id!==report.report_id),report];if(!save())return null;lastSessionSummary=report;notify(`已根据本机原始记录重建战报：${report.total_rated_attempts} 条评级作答。`);return report;
}
function transferTaskLabel(type){return ({speaking:'口语训练',writing:'写作训练',grammar:'语法练习',reading_to_speaking:'阅读复述',exit_ticket:'Exit Ticket｜课末独立验收',general_transfer:'综合输出'})[type]||'综合输出';}
function dailyTaskProgress(task){return transferTaskProgressState({...task,packId:data.dailyPack?.packId},[...(data.transferAttempts||[]),...(data.dailyJourney?.transferAttempts||[])]);}
function renderDailyOverview(){if(!data.dailyPack)return null;const pack=data.dailyPack,items=todayPackItems(),readings=journeyReadings(),questionProgress=readingQuestionProgress(readings,data.readingChecks||[]),questions=questionProgress.total,tasks=Array.isArray(pack.transferTasks)?pack.transferTasks:[];const vocabTasks=journeyVocabularyTasks();const vocabAttempts=[...(data.vocabularyAttempts||[]),...(data.dailyJourney?.vocabularyAttempts||[])].filter(r=>!r.packId||r.packId===pack.packId);const vocabSummary=summarizeVocabularyPractice(vocabTasks,vocabAttempts);const modules=[...(vocabTasks.length?[{key:'vocabulary',label:'触控词汇（110题）',count:vocabTasks.length,done:vocabSummary.answered,skipped:vocabSummary.skipped,unassessed:0,action:()=>startDailyJourney()}]:[]),{key:'words',label:'词汇训练',count:items.filter(item=>item.kind==='word').length,done:items.filter(item=>item.kind==='word'&&data.attempts.some(attempt=>attempt.itemId===item.id)).length,action:()=>startSession('words',{scope:'today'})},{key:'sentences',label:'语法与句子',count:items.filter(item=>item.kind==='sentence'&&item.module!=='listening').length,done:items.filter(item=>item.kind==='sentence'&&item.module!=='listening'&&data.attempts.some(attempt=>attempt.itemId===item.id)).length,action:()=>startSession('sentences',{scope:'today'})},{key:'reading',label:'阅读',count:readings.length,done:data.dailyJourney?.readingDoneIds?.length||0,action:()=>setPage('reading')},{key:'comprehension',label:'阅读理解',count:questions,done:questionProgress.answered,skipped:questionProgress.skipped,unassessed:questionProgress.unassessed,action:()=>setPage('reading')},{key:'listening',label:'听力听写',count:items.filter(item=>item.module==='listening').length,done:items.filter(item=>item.module==='listening'&&data.attempts.some(attempt=>attempt.itemId===item.id)).length,action:()=>startSession('sentences',{scope:'today-listening',sentenceStyle:'listening'})}];for(const type of ['speaking','writing','grammar','exit_ticket','general_transfer']){const selected=type==='speaking'?tasks.filter(task=>task.taskType==='speaking'||task.taskType==='reading_to_speaking'):tasks.filter(task=>task.taskType===type);if(selected.length)modules.push({key:type,label:transferTaskLabel(type),count:selected.length,done:selected.filter(task=>['COMPLETED','UNASSESSED'].includes(dailyTaskProgress(task))).length,skipped:selected.filter(task=>dailyTaskProgress(task)==='SKIPPED').length,unassessed:selected.filter(task=>dailyTaskProgress(task)==='UNASSESSED').length,action:()=>startDailyTransferTask(selected[0])});}if(journeySpeeches().length)modules.push({key:'speech',label:'英语演讲跟读',count:journeySpeeches().length,done:data.dailyJourney?.speechDoneIds?.length||0,action:()=>setPage('speech')});const activeModules=modules.filter(m=>m.count>0);const totalDone=activeModules.reduce((a,m)=>a+Math.min(m.done,m.count),0);const totalAll=activeModules.reduce((a,m)=>a+m.count,0);const box=section('daily-overview');const head=div('daily-overview-head');head.append(el('div','今日学习目录 · DAILY OVERVIEW','eyebrow'),h('h2',pack.title||'今日学习包'));const list=div('daily-module-list');activeModules.forEach(module=>{const row=el('button','','daily-module-row');const pct=Math.min(100,Math.round((module.done/Math.max(1,module.count))*100));const isDone=module.done>=module.count;const left=div('daily-module-left');const bar=div('daily-module-bar');const barFill=div('daily-module-bar-fill');barFill.style.width=`${pct}%`;bar.append(barFill);left.append(el('span',module.label,'daily-module-name'),bar);const right=div('daily-module-right');right.append(el('span',`${module.done}/${module.count}`,`daily-module-ratio${isDone?' is-done':''}`),el('span',isDone?'✓':'›','daily-module-chevron'));row.append(left,right);row.addEventListener('click',module.action);list.append(row);});const reviewCount=items.filter(item=>item.practiceRole==='review').length+tasks.filter(task=>task.practiceRole==='review').length;const newCount=items.filter(item=>item.practiceRole!=='review').length+tasks.filter(task=>task.practiceRole!=='review').length;box.append(head,list,p(`总进度 ${totalDone}/${totalAll} · 今日新学 ${newCount} · 回炉 ${reviewCount}`,'tiny'));return box;}
function startDailyTransferTask(task){const source=normalizeSourceMeta(task);const weakness=makeWeakness({id:`weakness:transfer:${task.id}`,...source,targetExpression:task.targetExpression||'',skillType:task.skillType||'Transfer / Application',taskType:task.taskType||'general_transfer',evidenceType:'pack_transfer',retrievalStatus:'UNTESTED',taskType:task.taskType||task.task_type||'general_transfer',contexts:task.contexts});startWeaknessTransfer(weakness);}

function journeyPanel(){
  const j=data.dailyJourney;if(!data.dailyPack)return null;
  const pack=data.dailyPack;
  const box=section('daily-journey-card');
  box.append(el('div','一份文件 · 四类学习','eyebrow'),h('h2',pack.title||'今日综合英语学习'));
  const stages=j?.packId===pack.packId?j.steps:journeyStages();
  const completed=j?.packId===pack.packId?(j.completed||[]):[];
  box.append(p(`学习模块：${stages.map(x=>JOURNEY_LABELS[x]).join(' → ')||'暂无可用模块'} · 建议 ${pack.recommendedMinutes||data.settings.duration||40} 分钟（不强制）`,'subtle'));
  const summary=div('journey-stages');
  for(const stage of [...new Set([...(j?.packId===pack.packId?j.steps:stages), ...(journeyVocabularyTasks().length?['vocabulary']:[]), 'words','sentences','reading','listening',...(journeySpeeches().length?['speech']:[])])]){
    const included=stages.includes(stage),done=completed.find(x=>x.stage===stage);
    summary.append(el('span',`${done?(done.status==='completed'?'✓ ':'◐ '):included?'○ ':'— '}${JOURNEY_LABELS[stage]}`,'chip'));
  }
  box.append(summary);
  if(j?.packId===pack.packId){
    box.append(p(`累计正向计时：${fmtTime(journeyElapsedMs())} · ${j.finishedAt?'本次已结束':`已完成 ${completed.length}/${j.steps.length} 个模块`}`,'tiny'));
  }
  box.append(lines(btn(j?.packId===pack.packId&&!j.finishedAt?'继续今日综合学习':j?.finishedAt?'重新训练这份学习包':'一键开始今日完整学习',startDailyJourney,'btn primary')));
  return box;
}

function activeItems(){return data.items.filter(item=>!item.archived&&!item.paused);}
function itemsForScope(options={}){const available=activeItems();if(options.scope==='journey'){const ids=new Set(data.dailyPack?.itemIds||[]);return available.filter(item=>ids.has(item.id)&&((options.journeyStage==='words'&&item.kind==='word')||(options.journeyStage==='sentences'&&item.kind==='sentence'&&item.module!=='listening')||(options.journeyStage==='listening'&&item.module==='listening')));}if(options.scope==='listening')return available.filter(item=>item.module==='listening');if(options.scope==='today-listening'){const ids=new Set(todayPackItems().map(item=>item.id));return available.filter(item=>ids.has(item.id)&&item.module==='listening');}if(options.scope==='today'){const ids=new Set(todayPackItems().map(item=>item.id));return available.filter(item=>ids.has(item.id));}if(options.scope==='due'){return available.filter(item=>isDue(item));}if(options.scope==='new'){return available.filter(item=>item.learningStage==='new'||item.status==='UNTESTED');}if(options.scope==='difficult'){return available.filter(item=>item.status==='N'||item.status==='V'||Number(item.errorCount||0)>=2);}return available;}
function limitedQueue(candidates,mode,scope){const ids=buildQueue(candidates,mode);if(scope==='journey')return ids;if(scope==='new')return ids.slice(0,Math.max(1,Number(data.settings.newLimit)||10));if(scope==='due'||scope==='difficult')return ids.slice(0,Math.max(1,Number(data.settings.reviewLimit)||20));const newIds=ids.filter(id=>{const item=data.items.find(x=>x.id===id);return item?.learningStage==='new'||item?.status==='UNTESTED';}).slice(0,Math.max(1,Number(data.settings.newLimit)||10));const reviewIds=ids.filter(id=>!newIds.includes(id)).slice(0,Math.max(1,Number(data.settings.reviewLimit)||20));return [...reviewIds,...newIds];}
function newSession(mode,options={}){const candidates=itemsForScope(options),queue=(Array.isArray(options.queue)&&options.queue.length)?options.queue.slice():limitedQueue(candidates,mode,options.scope||'all');return {id:`session-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,mode,scope:options.scope||'all',packId:options.packId||data.dailyPack?.packId||null,journeyId:options.journeyId||null,journeyStage:options.journeyStage||null,startedAt:new Date().toISOString(),activeMs:0,activeByDay:{},updatedAt:new Date().toISOString(),running:true,lastTick:Date.now(),queue,index:0,baseQueueLength:queue.length,correctionIds:[],correctionOf:{},completed:[],step:null,draft:'',referenceAnswer:null,hint:false,hintLevel:0,promptUsed:false,promptEvents:[],viewedChinese:false,skipped:false,retryCompleted:false,retryDraft:'',answerCheck:null,retryCheck:null,viewedAnswer:false,learningStageBefore:null,recordingIds:[],retryRecordingIds:[],sentenceStyle:options.sentenceStyle||'cloze',dueGoal:Number(options.dueGoal||options.duration||data.settings.duration)||40};}
function showModeSwitchDialog(mode,options={}){document.getElementById('mode-switch-dialog')?.remove();const backdrop=div('switch-backdrop');backdrop.id='mode-switch-dialog';const card=section('switch-dialog');card.append(el('div','切换训练','eyebrow'),h('h2',`你还有一场未结束的${modeLabel(data.activeSession.mode)}。`),p(`你选择了：${modeLabel(mode)}。请选择如何处理当前训练。`,'subtle'));const actions=lines(btn(`继续原来的${modeLabel(data.activeSession.mode)}`,()=>{backdrop.remove();page='practice';render();},'btn'),btn('结束并保存，然后进入新模式',()=>{backdrop.remove();finishSession({mode,options});},'btn primary'),btn('取消',()=>backdrop.remove(),'btn ghost'));card.append(actions);backdrop.append(card);document.body.append(backdrop);}
function startSession(mode,options={}){if(data.activeSession){const samePack=(options.scope!=='today'||data.activeSession.packId===data.dailyPack?.packId);if(data.activeSession.mode===mode&&(data.activeSession.scope||'all')===(options.scope||'all')&&samePack){page='practice';render();return;}showModeSwitchDialog(mode,options);return;}const q=(Array.isArray(options.queue)&&options.queue.length)?options.queue.slice():limitedQueue(itemsForScope(options),mode,options.scope||'all');if(!q.length){notify(options.scope==='today'?'今日学习包中没有这种类型的项目。':options.scope==='due'?'目前没有到期复习项目。':options.scope==='new'?'没有可学习的新内容。':options.scope==='difficult'?'目前没有困难卡片。':'请先导入材料或加载演示卡片。');setPage('library');return;}lastSessionSummary=null;data.activeSession=newSession(mode,options);if(!save())return;setPage('practice');}
function currentItem(){const session=data.activeSession;if(!session)return null;let id=session.queue[session.index];return data.items.find(x=>x.id===id)||null;}
function accrue(){const s=data.activeSession;if(!s||!s.running)return;const now=Date.now();if(!document.hidden){const from=s.lastTick||now;s.activeMs+=Math.max(0,Math.min(1800,now-from));s.activeByDay=addActiveInterval(s.activeByDay,from,now);}s.lastTick=now;}
function pauseSession(){accrue();const s=data.activeSession;if(s){s.running=false;s.lastTick=null;save();}}
function resumeSession(){const s=data.activeSession;if(s){s.running=true;s.lastTick=Date.now();if(save())render();}}
function fmtTime(ms){const min=Math.floor(ms/60000),sec=Math.floor(ms%60000/1000);return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
function practiceTop(s){const head=div('practice-top');const info=div();info.append(el('div',`当前模式：${modeLabel(s.mode)} · ${scopeLabel(s.scope)}`,'eyebrow'),h('h2','专注修炼'),el('span',`${s.completed.length} 已完成 · ${s.queue.length-s.index} 题剩余`,'tiny'));const t=div();if(s.journeyStage)info.append(p(`今日综合学习 · ${JOURNEY_LABELS[s.journeyStage]} · 正向累计 ${fmtTime(journeyElapsedMs())}`,'tiny'));const timer=h('div',fmtTime(s.journeyStage?journeyElapsedMs():s.activeMs),'timer');timer.id='timer';t.append(timer,el('div',`正向计时 · 参考 ${s.dueGoal} 分钟，不强制结束`,'time-goal'));head.append(info,t);return head;}
function renderPractice(){const s=data.activeSession;if(!s){setPage('home');return;}const item=currentItem();if(s.journeyStage==='listening'&&!s.sentenceStyle)s.sentenceStyle='listening';const outer=section();if(s.journeyStage)outer.append(renderJourneyFlowRibbon(s.journeyStage));if(item&&!s.step)triggerAutoPlayIfEnabled(`practice:${item.id}`,item.target||item.text,item.audioUrl);outer.append(practiceTop(s));const progress=div('bar-track');const fill=div('bar-fill');fill.id='timer-bar';fill.style.width=`${Math.min(100,(s.journeyStage?journeyElapsedMs():s.activeMs)/(s.dueGoal*60000)*100)}%`;progress.append(fill);outer.append(progress);
const lastJourneyStage=Boolean(s.journeyStage&&data.dailyJourney?.index===data.dailyJourney.steps.length-1);outer.append(lines(btn(s.running?'暂停':'继续',()=>{if(s.running){pauseSession();render();}else resumeSession();},'btn'),btn(s.journeyStage?'提前结束本模块':'结束训练',()=>{if(s.journeyStage&&s.index<s.queue.length&&!confirm('本模块还有未完成题目。提前结束会记录为部分完成并进入下一模块，确定吗？'))return;finishSession();},'btn danger'),btn('返回首页',()=>setPage('home'),'btn ghost')));
if(!s.running){outer.append(h('h3','训练已暂停'),p('计时已停止。准备好后点击“继续”。','subtle'));app.append(outer);return;}
if(!item){outer.append(h('h3','当前范围已完成'),p(s.journeyStage?(lastJourneyStage?'全部模块已完成，可以查看综合战报。':'本模块已完成，可以继续下一模块。'):'可以结束训练并查看战报，也可以导入更多材料。','subtle'),lines(btn(s.journeyStage?(lastJourneyStage?'完成并查看综合战报':'保存并继续下一模块'):'完成并查看战报',finishSession,'btn primary')));app.append(outer);return;}
if(s.journeyStage!=='listening'&&(item.learningStage==='new'||(!item.learningStage&&item.status==='UNTESTED'))){buildLearnCard(outer,item,s);app.append(outer);return;}
const content=div();content.append(el('span',item.kind==='word'?'单词与词块':'句子训练','question-label'));const trace=sourcePanel(item);if(trace)content.append(trace);
if(item.kind==='word')buildWordQuestion(content,item,s);else buildSentenceQuestion(content,item,s);
outer.append(content);app.append(outer);}
function isNewLearningItem(s,item){return (s.scope==='new'||s.scope==='today')&&item.learningStage==='new';}
function highlightTarget(example,target){const safe=String(target||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(!safe)return p(example);const re=new RegExp(`(^|[^\\p{L}\\p{N}])(${safe})(?=$|[^\\p{L}\\p{N}])`,'iu');const out=String(example||'').split(re);const box=div('learning-example');if(out.length===1){box.textContent=example;return box;}for(let i=0;i<out.length;i++){if(i%4===2){const mark=el('mark',out[i]);box.append(mark);}else box.append(document.createTextNode(out[i]));}return box;}
function buildLearnCard(container,item,s){const card=section('learn-card');card.append(el('div',item.practiceRole==='review'?`回炉复测 · ${item.previousDate||'历史证据待核验'}`:'学习新内容 · LEARN','question-label'));if(item.practiceRole==='review')card.append(p(`历史问题：${item.reviewInstruction||item.weaknessType||'历史证据待核验'} · 来源：${item.source||'未记录'}`,'hint'));const trace=sourcePanel(item);if(trace)card.append(trace);if(item.kind==='word'){card.append(h('h2',item.target),highlightTarget(item.example,item.target));if(item.meaningZh){card.append(btn(s.meaningShown?'隐藏中文释义':'显示中文释义',()=>{s.meaningShown=!s.meaningShown;if(s.meaningShown){s.promptUsed=true;s.viewedChinese=true;s.promptEvents=[...(s.promptEvents||[]),{type:'meaning_zh',at:new Date().toISOString()}];}if(save())render();},'btn ghost'));if(s.meaningShown)card.append(p(`中文释义：${item.meaningZh}`,'hint'));else card.append(p('中文释义已隐藏。需要时可以主动查看。','tiny'));}const englishMeaning=englishDefinitionFor(item,data.dailyPack?.packId);if(englishMeaning)card.append(p(`English definition: ${englishMeaning}`,'subtle'));else card.append(p('English definition not supplied in this learning pack.','tiny'));if(item.partOfSpeech)card.append(p(`词性：${item.partOfSpeech}`,'tiny'));if(item.collocations?.length)card.append(p(`常见搭配：${item.collocations.join(' / ')}`,'hint'));card.append(lines(speechButton(item.target),speechButton(item.example)));}else{card.append(h('h2','先阅读完整英文句子'),p(item.text,'question'));if(item.source)card.append(p(`来源：${item.source}`,'tiny'));card.append(speechButton(item.text));}card.append(p('首次阅读不计为记忆成功。准备好后再开始回忆。','subtle'),lines(btn('开始回忆',()=>{item.learningStage='learning';s.learningStageBefore='new';s.step='input';s.hintLevel=0;s.promptUsed=false;if(save())render();},'btn primary')));container.append(card);}
function firstLetterPrompt(prompt,target){const first=String(target||'').trim()[0]||'';return prompt.replace(/_{3,}/,`${first}${'_'.repeat(Math.max(3,String(target||'').trim().length-1))}`);}
function speechButton(text,segments=null){return btn('▶ 朗读英文',()=>speakEnglish(text,null,segments),'btn secondary');}
function speechControls(text,segments=null,{useGemini=false,iconOnly=false}={}){
  const runPlay=()=>{const sel=window.getSelection?.()?.toString().trim();const cleanTts=s=>String(s||'').replace(/\*\*([^*\n]{1,60})\*\*/g,'$1');if(useGemini)speakWithGeminiOrFallback(cleanTts(sel||text),{segments:sel?null:(Array.isArray(segments)?segments.map(cleanTts):segments)});else speakEnglish(text,null,segments);};
  if(iconOnly){
    const bar=div('reading-audio-icons');
    const bToggle=btn(isSpeechCurrentlyPlaying()?'⏸':'▶',()=>{
      const sel=window.getSelection?.()?.toString().trim();
      if(sel){runPlay();return;}
      if(isSpeechCurrentlyPlaying()){pauseSpeech();return;}
      if(isSpeechCurrentlyPaused()){resumeSpeech();return;}
      runPlay();
    },'btn primary reading-icon-btn reading-play-toggle');
    bToggle.setAttribute('aria-label','Gemini 朗读英文文章');
    bToggle.title='播放 / 暂停朗读';
    const bStop=btn('⏹',stopSpeech,'btn secondary reading-icon-btn');
    bStop.setAttribute('aria-label','停止朗读');
    bStop.title='停止并回到开头';
    bar.append(bToggle,bStop);
    return bar;
  }
  const playBtn=useGemini?btn('▶ Gemini 朗读文章',runPlay,'btn secondary'):speechButton(text,segments);
  return lines(playBtn,btn('暂停朗读',pauseSpeech,'btn ghost'),btn('继续朗读',resumeSpeech,'btn ghost'),btn('停止朗读',stopSpeech,'btn ghost'));
}
function renderListeningStudio(item,{compact=false,onSourceViewed=null}={}){
  const panel=section('listening-speaking-studio');const segments=splitStudioSegments(item.text);const text=el('div','', 'studio-source-text');text.hidden=true;text.textContent=item.text;
  const actions=lines(btn('显示原文',()=>{text.hidden=!text.hidden;if(!text.hidden)onSourceViewed?.();actions.querySelector('button').textContent=text.hidden?'显示原文':'隐藏原文';},'btn ghost'));
    const segmentBox=div('studio-segments');segments.forEach((segment,index)=>segmentBox.append(btn(`片段 ${index+1} · 朗读`,()=>{const row=(data.listeningDiagnosticAttempts||[]).find(x=>x.diagnosticId===item.listeningDiagnostic?.id&&x.itemId===item.id);if(row){row.replayCount=Number(row.replayCount||0)+1;save();}speakEnglish(segment);},'btn secondary')));
  panel.append(el('div','听说实战 · LISTENING & SPEAKING STUDIO','question-label'),p(compact?'按片段精听；听完选择真实理解程度即可。片段按钮采用设备朗读，并非真人原声；不必抄写整段或强制跟读。':'先盲听，再定位困难；录音只保存在本机，不进行未经验证的机器语音分析。','subtle'),segmentBox,actions,text);
  const diagnostic=item.listeningDiagnostic;
  if(diagnostic&&!compact){
    const attempt=(data.listeningDiagnosticAttempts||[]).find(row=>row.diagnosticId===diagnostic.id&&row.itemId===item.id)||{};
    const diag=section('listening-diagnostic');diag.append(h('h3','听力盲区定位 · BLIND-SPOT DIAGNOSTICS'),p('首次回答前不显示原文；困难类别是你的自我诊断，不是自动语音分析。','tiny'));
    const answer=textarea(attempt.firstAnswer||'','What did you understand?');answer.classList.add('answer-input');
    const options=div('setup-options');for(const value of diagnostic.difficultyOptions||[]){const label=el('label');const check=el('input');check.type='checkbox';check.value=value;check.checked=(attempt.difficulty||[]).includes(value);label.append(check,el('span',value));options.append(label);}
    const submit=btn('保存首次理解',()=>{const row={...attempt,id:attempt.id||`listening-diagnostic:${item.id}`,diagnosticId:diagnostic.id,itemId:item.id,packId:item.packId,firstAnswer:answer.value,firstSubmittedAt:new Date().toISOString(),difficulty:[...options.querySelectorAll('input:checked')].map(x=>x.value),referenceViewed:false,replayCount:Number(attempt.replayCount||0),retestAnswer:attempt.retestAnswer||'',status:'submitted'};data.listeningDiagnosticAttempts=[...(data.listeningDiagnosticAttempts||[]).filter(x=>x.id!==row.id),row];if(save())render();},'btn primary');
    diag.append(field('你的首次理解',answer),options,submit);
    if(attempt.firstSubmittedAt){diag.append(btn('显示原文',()=>{const row={...attempt,referenceViewed:true,referenceViewedAt:new Date().toISOString()};data.listeningDiagnosticAttempts=[...(data.listeningDiagnosticAttempts||[]).filter(x=>x.id!==row.id),row];if(save())render();},'btn ghost'));if(attempt.referenceViewed){const retest=textarea(attempt.retestAnswer||'','After replay, what did you understand?');const saveRetest=btn('保存再次理解',()=>{const row={...attempt,retestAnswer:retest.value,retestSubmittedAt:new Date().toISOString(),status:'retested'};data.listeningDiagnosticAttempts=[...(data.listeningDiagnosticAttempts||[]).filter(x=>x.id!==row.id),row];if(save())render();},'btn secondary');diag.append(p(item.text,'studio-source-text'),p(`回放次数：${attempt.replayCount||0}`,'tiny'),field('再次独立理解',retest),saveRetest);}}
    panel.append(diag);
  }
  return panel;
}
function stopSpeech(){stopGeminiAudio();speechQueue=[];speechQueueIndex=0;speechPaused=false;naturalSpeechPlayer?.stop();if('speechSynthesis'in window)window.speechSynthesis.cancel();syncReadingPlayButtons();}
function textarea(initial='',placeholder='Type your answer in English…'){const x=el('textarea','','textarea');x.value=initial;x.placeholder=placeholder;x.autocapitalize='sentences';x.spellcheck=false;x.enterKeyHint='done';x.rows=3;return x;}
function textInput(initial='',placeholder=''){const x=el('input','','input');x.type='text';x.value=initial;x.placeholder=placeholder;x.autocapitalize='none';x.autocomplete='off';x.spellcheck=false;x.enterKeyHint='done';return x;}
function revealAnswer(s, answer, reference, skipped=false, accepted=[], compareOptions={}){if(s.step==='revealed')return false;s.viewedAnswer=Boolean(skipped);s.referenceAnswer=reference;s.draft=String(answer||'').trim();s.skipped=skipped;s.answerCheck=compareOptions.wordItem?compareWordAnswer(s.draft,compareOptions.wordItem,{definitionEn:compareOptions.definitionEn,confidence:compareOptions.confidence}):compareAnswer(s.draft,reference,{accepted});s.retryDraft='';s.retryCheck=null;s.retryCompleted=false;s.step='revealed';if(!save())return false;render();return true;}
function retryNeeded(s){return Boolean(data.settings.retryAfterError!==false&&!s.skipped&&s.answerCheck&&['incorrect','minor_spelling'].includes(s.answerCheck.status)&&!s.retryCompleted);}
function answerFeedback(check){if(!check)return null;const labels={correct:'检查结果：正确',case_or_punctuation:'检查结果：内容一致（只有大小写或标点不同）',minor_spelling:'检查结果：可能有轻微拼写错误',incorrect:'检查结果：答案与参考表达不同，可能合理，请自行比较',unassessed:'检查结果：无法仅凭本题资料判断；请诚实自评，不自动记为 N',blank:'检查结果：没有填写答案'};return p(`检查结果：${check.message||labels[check.status]||'请与参考答案比较。'}`,`answer-feedback ${check.status}`);}
function retryBox(container,item,s,reference,accepted=[]){if(!retryNeeded(s))return;const box=section('retry-box');box.append(h('h3','再试一次'),p('第一次答案已保留。请重新输入正确表达，完成后再进入下一题。','subtle'));const input=textarea(s.retryDraft,'再次输入正确的英文表达……');input.classList.add('answer-input');focusForMobile(input);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();s.retryDraft=input.value.trim();s.retryCheck=compareAnswer(s.retryDraft,reference,{accepted});if(['correct','case_or_punctuation'].includes(s.retryCheck.status)){s.retryCompleted=true;if(save())render();}}});input.addEventListener('input',()=>{s.retryDraft=input.value;});box.append(field('重练答案',input),btn('提交重练',()=>{s.retryDraft=input.value.trim();s.retryCheck=compareAnswer(s.retryDraft,reference,{accepted});if(['correct','case_or_punctuation'].includes(s.retryCheck.status)){s.retryCompleted=true;if(save())render();}else if(save()){render();notify('重练答案仍需比较参考表达。');}},'btn primary'));container.append(box);}
function wordHintPanel(item,level){
  const box=div('hint-stack');
  const definition=englishDefinitionFor(item,data.dailyPack?.packId);
  if(level===1){
    const original=normalized(item.example||'');
    const candidates=(item.additionalContexts||[]).map(value=>maskSpellingTarget(value,item.target)).filter(value=>value&&normalized(value)!==original);
    const context=candidates[0]||'';
    if(context)box.append(p(`Extra context: ${context}`,'hint'));
    else if(!(item.collocations||[]).some(value=>normalized(value)!==original))box.append(p('No additional context was supplied for this pack. Use the meaning and original context, then compare honestly.','hint'));
    const collocations=(item.collocations||[]).map(value=>maskSpellingTarget(value,item.target)).filter(Boolean);
    if(collocations.length)box.append(p(`Useful collocation: ${collocations.join(' / ')}`,'hint'));
    if(!context&&!collocations.length)box.append(p(englishWordHint(item,data.dailyPack?.packId),'hint'));
  }else if(level===2){
    box.append(p(`Form hint: first letter “${String(item.target||'').trim()[0]||''}” · ${String(item.target||'').trim().split(/\s+/).filter(Boolean).length} word(s)`,'hint'));
    if(item.partOfSpeech)box.append(p(`Part of speech: ${item.partOfSpeech}`,'hint'));
  }
  return box;
}
function focusForMobile(input){input.addEventListener('focus',()=>{setTimeout(()=>{if(!input.isConnected||document.activeElement!==input)return;const viewport=window.visualViewport;const top=viewport?.offsetTop||0;const bottom=top+(viewport?.height||window.innerHeight);const rect=input.getBoundingClientRect();if(rect.top<top+12||rect.bottom>bottom-12)input.scrollIntoView({block:'nearest',behavior:'instant'});},120);});}
function recordWordPromptEvent(s,type){s.promptUsed=true;s.promptEvents=[...(s.promptEvents||[]),{type,at:new Date().toISOString()}];}
function buildWordQuestion(container,item,s){
  const definition=englishDefinitionFor(item,data.dailyPack?.packId);
  const prompt=wordPrompt(item,{definitionEn:definition});
  const question=div('question');question.classList.add('cloze-question');
  const clue=section('word-recall-clue');
  clue.append(el('div','明确目标 · TARGET','question-label'));
  if(definition)clue.append(p(`Meaning: ${maskSpellingTarget(definition,item.target)||definition}`,'word-meaning'));
  else if(prompt.meaningZh)clue.append(p(`Meaning source: imported pack · ${prompt.meaningZh}`,'word-meaning fallback-clue'));
  else clue.append(p('Meaning unavailable: use the context only, then compare your answer honestly.','word-meaning fallback-clue'));
  if(prompt.partOfSpeech)clue.append(p(`Part of speech: ${prompt.partOfSpeech}`,'word-part-of-speech'));
  const context=maskSpellingTarget(item.example,item.target);
  if(context)clue.append(p(`Context: ${context}`,'word-context'));
  if(prompt.answerConfidence!=='high')clue.append(p('This pack does not define an exhaustive answer set. A different reasonable expression will remain unassessed unless the pack accepts it.','tiny'));
  container.append(h('div',s.correctionOf?.[item.id]?'稍后再次回忆 · DELAYED RETRIEVAL':s.promptUsed?'引导练习 · GUIDED PRACTICE':'独立回忆 · INDEPENDENT RETRIEVAL','question-label'),clue);
  if(s.hintLevel)container.append(wordHintPanel(item,s.hintLevel));
  const hintLabel=s.hintLevel===0?'需要帮助？显示额外语境':s.hintLevel===1?'显示形式线索（首字母）':'查看参考答案';
  container.append(btn(hintLabel,()=>{
    if(s.hintLevel===0){s.hintLevel=1;recordWordPromptEvent(s,'semantic_hint');if(save())render();return;}
    if(s.hintLevel===1){s.hintLevel=2;recordWordPromptEvent(s,'form_hint');if(save())render();return;}
    recordWordPromptEvent(s,'reference_answer');revealAnswer(s,'',item.target,true,item.acceptedAnswers||[],{wordItem:item,definitionEn:definition,confidence:prompt.answerConfidence});
  },'btn ghost'));
  if(s.step!=='revealed'){
    const input=textInput(s.draft,'Type the target word or expression in English…');input.classList.add('answer-input','compact-answer-input');focusForMobile(input);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();revealAnswer(s,input.value,item.target,false,item.acceptedAnswers||[],{wordItem:item,definitionEn:definition,confidence:prompt.answerConfidence});}});
    input.addEventListener('input',()=>{s.draft=input.value;});
    container.append(p('First try to retrieve the target expression independently.','input-help'),field('Your answer',input));
    question.addEventListener('click',()=>input.focus(),{once:false});
    container.append(lines(btn('检查答案',()=>revealAnswer(s,input.value,item.target,false,item.acceptedAnswers||[],{wordItem:item,definitionEn:definition,confidence:prompt.answerConfidence}),'btn primary'),btn('跳过并揭晓',()=>revealAnswer(s,'',item.target,true,item.acceptedAnswers||[],{wordItem:item,definitionEn:definition,confidence:prompt.answerConfidence}),'btn')));
  }else {
    const card=section('answer-card');card.append(el('div','参考答案','eyebrow'),h('strong',item.target),p(item.example));
    if(item.acceptedAnswers?.length)card.append(p(`已验证可接受答案：${item.acceptedAnswers.join(' / ')}`,'hint'));
    if(s.draft.trim())card.append(p(`你的答案：${s.draft}`,'small-block'));else card.append(p('本题已跳过或直接查看了参考答案。','tiny'));
    if(answerFeedback(s.answerCheck))card.append(answerFeedback(s.answerCheck));
    container.append(card);retryBox(container,item,s,item.target,item.acceptedAnswers||[]);rateControls(container,item,s);
  }
}
function sentenceStyleOptions(s){const opts=div('setup-options');for(const [value,label,sub] of [['cloze','句子填空','只填缺少的词'],['recall','整句回忆','写出完整句子'],['listening','听力回忆','先听后写']]){const radio=el('input');radio.type='radio';radio.name='sentence-style';radio.value=value;radio.checked=s.sentenceStyle===value;radio.addEventListener('change',()=>{s.sentenceStyle=value;s.step=null;s.draft='';s.skipped=false;if(save())render();});const wrap=el('label');wrap.append(radio,el('span',`${label} · ${sub}`));opts.append(wrap);}return opts;}
function audioTime(seconds){return Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'--:--';}
function stopActiveAudio(){if(activeAudio){activeAudio.pause();activeAudio.removeAttribute('src');activeAudio.load();activeAudio=null;}if(speechObjectUrl){URL.revokeObjectURL(speechObjectUrl);speechObjectUrl=null;}}
function audioControls(url){
  const safeUrl=safeAudioUrl(url);if(!safeUrl)return p(url?'音频地址未通过 HTTPS 安全校验；普通朗读可继续使用设备语音。':'没有真实音频；普通朗读可继续使用设备语音，精确 AB 循环不可用。','tiny');
  stopActiveAudio();
  const box=section('audio-study-controls');const audio=el('audio');activeAudio=audio;audio.src=safeUrl;audio.preload='metadata';audio.controls=true;audio.setAttribute('aria-label','真实听力音频');
  const status=p('真实音频 · 正在加载元数据','tiny');let a=null,b=null,loop=false,loopJumping=false;const range=el('input','','input');range.type='range';range.min='0';range.max='1';range.step='0.01';range.value='0';range.disabled=true;range.setAttribute('aria-label','音频位置');
  const durationReady=()=>Number.isFinite(audio.duration)&&audio.duration>0;
  const update=()=>{if(durationReady()){range.max=String(audio.duration);range.disabled=false;}range.value=String(Math.min(audio.duration||0,audio.currentTime||0));status.textContent=`真实音频 · ${audioTime(audio.currentTime)} / ${audioTime(audio.duration)}${a!==null?` · A ${audioTime(a)}`:''}${b!==null?` · B ${audioTime(b)}`:''}${loop?' · 循环中':''}`;};
  const invalid=()=>{status.textContent='请先设置有效 A/B（0 ≤ A < B ≤ 音频时长，至少 0.1 秒）。';};
  audio.addEventListener('timeupdate',()=>{update();if(loop&&!loopJumping&&isValidAudioLoop(a,b,audio.duration)){if(audio.currentTime>=b-0.02){loopJumping=true;audio.currentTime=a;audio.play().catch(()=>{loop=false;toggle.textContent='开始 A—B 循环';status.textContent='音频播放被浏览器暂停；请点击播放后重试。';}).finally(()=>{loopJumping=false;});}}});
  audio.playbackRate=Number(data.settings?.speechRate)||1;audio.addEventListener('loadedmetadata',()=>{audio.playbackRate=Number(data.settings?.speechRate)||1;status.textContent='真实音频 · 已加载，可设置 A/B 与倍速';update();});audio.addEventListener('play',update);audio.addEventListener('pause',()=>{if(!loop)status.textContent=`真实音频 · 已暂停 · ${audioTime(audio.currentTime)} / ${audioTime(audio.duration)}`;});audio.addEventListener('error',()=>{loop=false;toggle.textContent='开始 A—B 循环';status.textContent='真实音频加载失败（URL、网络或文件格式不可用）；可使用设备语音继续训练。';});
  range.addEventListener('input',()=>{if(durationReady())audio.currentTime=Math.max(0,Math.min(audio.duration,Number(range.value)||0));});
  const rate=el('select','','select');for(const value of [.75,1,1.25]){const option=el('option',`${value}×`);option.value=String(value);rate.append(option);}rate.value='1';rate.addEventListener('change',()=>{audio.playbackRate=Number(rate.value);});
  const setA=btn('设为 A',()=>{if(!durationReady()){status.textContent='音频尚未加载完成，暂时不能设置 A。';return;}a=Math.max(0,Math.min(audio.duration,audio.currentTime));if(b!==null&&!isValidAudioLoop(a,b,audio.duration))b=null;loop=false;toggle.textContent='开始 A—B 循环';update();},'btn ghost');
  const setB=btn('设为 B',()=>{if(!durationReady()){status.textContent='音频尚未加载完成，暂时不能设置 B。';return;}const candidate=Math.max(0,Math.min(audio.duration,audio.currentTime));if(a===null||!isValidAudioLoop(a,candidate,audio.duration)){b=null;loop=false;toggle.textContent='开始 A—B 循环';invalid();return;}b=candidate;update();},'btn ghost');
  const toggle=btn('开始 A—B 循环',()=>{if(loop){loop=false;toggle.textContent='开始 A—B 循环';update();return;}if(!durationReady()){status.textContent='音频尚未加载完成，暂时不能开始 A—B 循环。';return;}if(!isValidAudioLoop(a,b,audio.duration)){invalid();return;}loop=true;toggle.textContent='取消 A—B 循环';audio.currentTime=a;audio.play().catch(()=>{loop=false;toggle.textContent='开始 A—B 循环';status.textContent='音频播放被浏览器暂停；请点击播放后重试。';});update();},'btn secondary');
  const clear=btn('清除 A/B',()=>{a=null;b=null;loop=false;toggle.textContent='开始 A—B 循环';update();},'btn ghost');
  box.append(el('div','真实音频精听 · AUDIO LISTENING','question-label'),audio,range,status,lines(setA,setB,toggle,clear,rate));return box;
}
function followAlongRecordingControls(item,s,role='original'){const idsKey=role==='retry'?'retryRecordingIds':'recordingIds';return renderRecordingControls({followAlong:true,audioUrl:item.audioUrl,text:item.text,weaknessId:`follow-along:${item.id}`,taskId:item.id,attemptId:s.id,role,onSaved:row=>{s[idsKey]=[...(s[idsKey]||[]),row.id].filter((id,index,array)=>array.indexOf(id)===index);save();}});}
/**
 * A multi-paragraph listening item needs a quick comprehension check, not
 * word-for-word transcription plus a second mandatory shadowing recording.
 * Keep it UNRATED: never schedule a long passage as a K/V/N sentence card.
 */
function finishExtendedListening(item,s,{skipped=false,level='',summary=''}={}){
  if(!data.activeSession||data.activeSession.id!==s.id)return;
  if(!skipped&&!['understood','partial','unclear'].includes(level))return notify('请选择实际理解程度；一句话概括可以不填写。');
  accrue();
  const at=new Date().toISOString();
  const answer=String(summary||'').trim();
  const diagnostic=item.listeningDiagnostic;
  if(diagnostic){
    const current=(data.listeningDiagnosticAttempts||[]).find(row=>row.diagnosticId===diagnostic.id&&row.itemId===item.id)||{};
    const updated={...current,id:current.id||`listening-diagnostic:${item.id}`,
      diagnosticId:diagnostic.id,itemId:item.id,packId:item.packId,
      firstAnswer:current.firstSubmittedAt?current.firstAnswer:answer,
      firstSubmittedAt:current.firstSubmittedAt||(skipped?null:at),
      comprehensionSelfReport:skipped?null:level,
      referenceViewed:Boolean(current.referenceViewed||s.viewedAnswer),
      status:skipped?'skipped':'brief_comprehension_self_report',
      updatedAt:at};
    data.listeningDiagnosticAttempts=[...(data.listeningDiagnosticAttempts||[]).filter(row=>row.id!==updated.id),updated];
  }
  const row={id:`a-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
    sessionId:s.id,itemId:item.id,kind:item.kind,status:null,
    answer:answer||'',referenceAnswer:item.text,
    promptType:'listening',listeningVariant:'brief_comprehension',
    comprehensionSelfReport:skipped?null:level,
    initial_check:{status:'unassessed',message:'用户自报理解程度；不进行逐字核对或自动口语评分。'},
    skipped:Boolean(skipped),prompt_used:Boolean(s.promptUsed),
    viewed_answer:Boolean(s.viewedAnswer),reference_viewed:Boolean(s.viewedAnswer),
    evidence_type:skipped?'skipped':'user_self_reported_comprehension',
    recording_ids:[],recording_status:'not_recorded',
    learning_stage_before:item.learningStage||'review',
    learning_stage_after:item.learningStage||'review',at};
  data.attempts.push(row);
  s.completed.push(row.id);s.index++;s.step=null;s.draft='';s.referenceAnswer=null;
  s.hint=false;s.hintLevel=0;s.skipped=false;s.retryCompleted=false;s.retryDraft='';
  s.answerCheck=null;s.retryCheck=null;s.recordingIds=[];s.retryRecordingIds=[];
  s.promptUsed=false;s.promptEvents=[];s.viewedChinese=false;s.meaningShown=false;
  s.viewedAnswer=false;s.lastTick=Date.now();s.updatedAt=at;
  if(save())render();
}
function renderExtendedListeningQuestion(container,item,s){
  // This call reuses existing three-section playback; deliberately no second
  // full-text dictation, duplicated native TTS or compulsory recording widget.
  if(safeAudioUrl(item.audioUrl))container.append(audioControls(item.audioUrl));
  container.append(renderListeningStudio(item,{
    compact:true,
    onSourceViewed:()=>{s.viewedAnswer=true;save();}
  }));
  const group=section('brief-listening-check');
  group.append(el('div','分段精听 · QUICK CHECK','question-label'),
    h('h2','听完后，只判断自己是否听懂。'),
    p('不需要把三段全部听写，也不要求整段跟读。需要训练口语时，可单独进入 Speech Chamber。','subtle'));
  const prior=(data.listeningDiagnosticAttempts||[]).find(row=>row.diagnosticId===item.listeningDiagnostic?.id&&row.itemId===item.id);
  const summary=textarea(s.draft||prior?.firstAnswer||'','可选：用一句英语或中文概括主要意思……');
  summary.rows=2;summary.classList.add('answer-input');
  summary.addEventListener('input',()=>{s.draft=summary.value;});
  const select=el('select','','select');
  for(const [value,label] of [['','请选择理解情况'],['understood','能概括主要意思'],['partial','只理解一部分'],['unclear','暂时没听懂']]){
    const option=el('option',label);option.value=value;select.append(option);
  }
  const submit=btn('记录理解并进入下一题',()=>finishExtendedListening(item,s,{level:select.value,summary:summary.value}),'btn primary');
  submit.disabled=true;
  select.addEventListener('change',()=>{submit.disabled=!select.value;});
  group.append(field('理解程度（本人自评）',select),field('一句话概括（可选）',summary),
    lines(submit,btn('跳过，进入下一题',()=>finishExtendedListening(item,s,{skipped:true,summary:summary.value}),'btn ghost')),
    p('这条记录不计K/V/N，也不产生FSRS到期或自动发音分数。','tiny'));
  container.append(group);
}
function buildSentenceQuestion(container,item,s){if(s.sentenceStyle==='listening'&&isExtendedListening(item.text)){renderExtendedListeningQuestion(container,item,s);return;}if(s.sentenceStyle==='listening'){const read=s.step===null||s.step==='read';const reveal=s.step==='revealed';if(read){container.append(audioControls(item.audioUrl),renderListeningStudio(item),followAlongRecordingControls(item,s,'original'),el('div','听力回忆 · LISTENING','question-label'),h('h2','先听英文，再写出你听到的内容。'),p('浏览器朗读不是真人录音，也不提供发音评分。','subtle'),lines(speechButton(item.text),btn('开始听写',()=>{s.step='recall';s.promptUsed=true;if(save())render();},'btn primary')));}else if(!reveal){container.append(audioControls(item.audioUrl),renderListeningStudio(item),followAlongRecordingControls(item,s,'original'),el('div','听力回忆 · LISTENING','question-label'),h('h2','请写出完整英文句子。'));const input=textarea(s.draft,'请输入你听到的英文句子……');input.rows=4;input.classList.add('answer-input');focusForMobile(input);input.addEventListener('input',()=>s.draft=input.value);container.append(field('听写答案',input),lines(speechButton(item.text),btn('查看原文并对照',()=>revealAnswer(s,input.value,item.text,false),'btn primary')));}else{const card=section('answer-card');card.append(el('div','原始英文句子','eyebrow'),p(item.text,'question'),p(s.draft?`你的听写：${s.draft}`:'本题已跳过。','small-block'),speechButton(item.text));if(answerFeedback(s.answerCheck))card.append(answerFeedback(s.answerCheck));container.append(card,renderListeningStudio(item),followAlongRecordingControls(item,s,'retry'));retryBox(container,item,s,item.text);rateControls(container,item,s);}return;}const parts=sentenceClozeParts(item.text,item.clozeTarget||item.clozeAnswer||item.target||'');if(s.sentenceStyle==='cloze'&&!parts)s.sentenceStyle='recall';const read=s.step===null||s.step==='read';const reveal=s.step==='revealed';const question=div('question');
if(s.sentenceStyle==='cloze'&&parts){container.append(el('div','句子填空 · Missing Words','question-label'),h('h2','只填写缺少的英文单词。'),sentenceStyleOptions(s));question.textContent=s.hintLevel===2?firstLetterPrompt(parts.question,parts.answer):parts.question;question.classList.add('cloze-question');container.append(question,p('不需要重新输入整句话。','subtle'));if(s.hintLevel&&s.hintLevel<3)container.append(btn(s.hintLevel===2?'取消首字母提示':'给我一点提示',()=>{s.hintLevel=s.hintLevel===2?3:2;s.promptUsed=true;if(save())render();},'btn ghost'));if(s.step!=='revealed'){const input=textInput(s.draft,'请输入缺少的英文单词……');input.classList.add('answer-input','compact-answer-input');focusForMobile(input);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();revealAnswer(s,input.value,parts.answer,false);}});input.addEventListener('input',()=>s.draft=input.value);container.append(field('缺少的英文单词',input));question.addEventListener('click',()=>input.focus());container.append(lines(btn('检查答案',()=>revealAnswer(s,input.value,parts.answer,false),'btn primary'),btn('跳过并揭晓',()=>revealAnswer(s,'',parts.answer,true),'btn')));}else{const card=section('answer-card');card.append(el('div','原句','eyebrow'),p(item.text,'question'),el('div','参考缺失词','eyebrow'),h('strong',parts.answer));if(s.draft.trim())card.append(p(`你的答案：${s.draft}`,'small-block'));else card.append(p('本题已跳过。','tiny'));if(answerFeedback(s.answerCheck))card.append(answerFeedback(s.answerCheck));container.append(card);retryBox(container,item,s,parts.answer);rateControls(container,item,s);}return;}
if(read){container.append(el('div','整句回忆 · Full Sentence Recall','question-label'),h('h2','先阅读完整句子，再隐藏并回忆。'),sentenceStyleOptions(s));question.textContent=item.text;container.append(question,lines(speechButton(item.text),btn('我已阅读，隐藏句子',()=>{s.step='recall';if(save())render();},'btn primary')));}else if(!reveal){container.append(el('div','整句回忆 · Full Sentence Recall','question-label'),h('h2','请写出完整英文句子。'),p('原句已隐藏，请根据记忆输入整句话。','subtle'));const input=textarea(s.draft,'请输入完整英文句子……');input.rows=4;focusForMobile(input);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.metaKey){e.preventDefault();revealAnswer(s,input.value,item.text,false);}});input.addEventListener('input',()=>s.draft=input.value);container.append(field('你的整句回忆',input));container.append(lines(btn('查看原句并对照',()=>revealAnswer(s,input.value,item.text,false),'btn primary'),btn('跳过并查看原句',()=>revealAnswer(s,'',item.text,true),'btn')));}else{const card=section('answer-card');card.append(el('div','原始句子','eyebrow'),p(item.text,'question'));if(s.draft.trim())card.append(el('div','你的回忆','eyebrow'),p(s.draft,'small-block'));else card.append(p('本题已跳过。','tiny'));if(answerFeedback(s.answerCheck))card.append(answerFeedback(s.answerCheck));card.append(speechButton(item.text));container.append(card);retryBox(container,item,s,item.text);rateControls(container,item,s);}}
function rateControls(container,item,s){container.append(h('h3','请根据真实回忆自评'));
const choices=div('actions');for(const [rating,label,cls] of [['K','会用','k'],['V','模糊','v'],['N','不会','n']]){const b=el('button','','self-btn '+cls);b.append(h('strong',rating),el('small',label));b.disabled=(retryNeeded(s))||(!s.draft.trim()&&rating==='K');b.addEventListener('click',()=>grade(item,rating));choices.append(b);}container.append(choices,p('这是自我评价，不是自动英语评分。','tiny'));}
function grade(item,status){const s=data.activeSession;if(!s||s.step!=='revealed')return;if(retryNeeded(s)){notify('请先完成错题重练，或在设置中关闭“答错后立即重练”。');return;}const date=new Date().toISOString();const definition=item.kind==='word'?englishDefinitionFor(item,data.dailyPack?.packId):'';const promptMeta=item.kind==='word'?wordPrompt(item,{definitionEn:definition}):null;const reference=s.referenceAnswer|| (item.kind==='word'?item.target:item.text);const initialCheck=s.answerCheck||(item.kind==='word'?compareWordAnswer(s.draft,item,{definitionEn:definition,confidence:promptMeta?.answerConfidence}):compareAnswer(s.draft,reference,{accepted:item.acceptedAnswers||[]}));const stageBefore=item.learningStage||'review';const schedule=scheduleReview(status,item,new Date(date));const eligibleCorrection=Boolean(s.journeyStage&&['words','sentences'].includes(s.journeyStage)&&!s.correctionOf?.[item.id]&&!s.promptUsed&&!s.viewedAnswer&&!s.skipped&&['incorrect','minor_spelling'].includes(initialCheck.status));const promptType=item.kind==='word'?'cloze':(s.sentenceStyle==='cloze'?'missing_words':(s.sentenceStyle==='listening'?'listening':'recall'));const recordingIds=[...(s.recordingIds||[]),...(s.retryRecordingIds||[])].filter((id,index,array)=>array.indexOf(id)===index);const row={id:`a-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,sessionId:s.id,itemId:item.id,kind:item.kind,status,answer:s.draft,correction_attempt:Boolean(s.correctionOf?.[item.id]),correction_of:s.correctionOf?.[item.id]||null,skipped:Boolean(s.skipped),promptType,referenceAnswer:reference,initial_check:initialCheck,answer_confidence:promptMeta?.answerConfidence||null,clue_source:promptMeta?.clueSource||null,retry_answer:s.retryDraft||'',retry_check:s.retryCheck||null,retried_after_error:Boolean(s.retryCompleted),recording_ids:recordingIds,recording_status:recordingIds.length?'saved_locally':'not_recorded',prompt_used:Boolean(s.promptUsed),prompt_events:s.promptEvents||[],viewed_chinese:Boolean(s.viewedChinese),viewed_answer:Boolean(s.viewedAnswer),reference_viewed:Boolean(s.viewedAnswer),evidence_type:s.viewedAnswer?'viewed_answer':s.promptUsed?'prompted':'independent_retrieval',learning_stage_before:stageBefore,at:date};data.attempts.push(row);if(eligibleCorrection){const max=Math.min(5,Math.max(1,Math.floor((s.baseQueueLength||s.queue.length)*.25)));if((s.correctionIds||[]).length<max){s.correctionIds=[...(s.correctionIds||[]),item.id];s.correctionOf={...(s.correctionOf||{}),[item.id]:row.id};s.queue.push(item.id);}}item.status=status;item.attempts=(item.attempts||0)+1;if(s.promptUsed)item.promptCount=(item.promptCount||0)+1;if(s.viewedAnswer)item.viewedAnswerCount=(item.viewedAnswerCount||0)+1;item.lastAt=date;item.dueAt=schedule.dueAt;item.intervalDays=schedule.intervalDays;item.successStreak=status==='K'?(item.successStreak||0)+1:0;item.errorCount=status==='N'?(item.errorCount||0)+1:(item.errorCount||0);item.learningStage=stageBefore==='new'||stageBefore==='learning'?(item.successStreak>=2?'long_term':'learning'):(item.successStreak>=2?'long_term':'review');row.learning_stage_after=item.learningStage;s.completed.push(row.id);s.index++;s.step=null;s.draft='';s.referenceAnswer=null;s.hint=false;s.hintLevel=0;s.skipped=false;s.retryCompleted=false;s.retryDraft='';s.answerCheck=null;s.retryCheck=null;s.recordingIds=[];s.retryRecordingIds=[];s.promptUsed=false;s.promptEvents=[];s.viewedChinese=false;s.meaningShown=false;s.viewedAnswer=false;s.lastTick=Date.now();s.updatedAt=date;if(!save())return;render();if(s.index>=s.queue.length)notify('当前卡片已完成。结束训练后会保存修炼战报。');}
function finishSession(next=null){accrue();stopSpeech();const s=data.activeSession;if(!s)return;const endedAt=new Date().toISOString();const attempts=data.attempts.filter(x=>x.sessionId===s.id);const sessionRecord={id:s.id,startedAt:s.startedAt,endedAt,activeMs:Math.round(s.activeMs),activeByDay:s.activeByDay||{},mode:s.mode,scope:s.scope||'all',packId:s.packId||null,count:attempts.length,words:attempts.filter(x=>x.kind==='word').length,sentences:attempts.filter(x=>x.kind==='sentence').length,K:attempts.filter(x=>x.status==='K').length,V:attempts.filter(x=>x.status==='V').length,N:attempts.filter(x=>x.status==='N').length};const report=buildBattleReport({session:sessionRecord,attempts,items:data.items,timezone:'Asia/Shanghai',appVersion:APP_VERSION});if(s.journeyStage)report.journey_stage=s.journeyStage;data.sessions.push(sessionRecord);if(!s.journeyStage){data.reports=(data.reports||[]).filter(x=>x.report_id!==report.report_id);data.reports.push(report);}data.activeSession=null;
const j=data.dailyJourney;
if(s.journeyStage&&j&&!j.finishedAt&&j.id===s.journeyId&&j.steps[j.index]===s.journeyStage){
  j.sessionIds.push(s.id);
  j.completed.push({stage:s.journeyStage,status:s.index>=s.queue.length?'completed':'partial',count:attempts.length,planned:s.queue.length});
  j.index++;
  if(!save())return;
  beginJourneyStage();return;
}
if(!save())return;lastSessionSummary=report;if(next){startSession(next.mode,next.options);return;}setPage('summary');}
function reportFor(report){return report||lastSessionSummary||data.reports?.at(-1)||null;}
function reportJSON(report){return JSON.stringify(reportFor(report),null,2);}
function exportReportJSON(report){const x=reportFor(report);if(!x)return notify('请先完成一次训练，再导出修炼战报。');download(`english-cultivation-report-${x.session_id}.json`,reportJSON(x),'application/json');markReportExported(x);}
function exportReportMarkdown(report){const x=reportFor(report);if(!x)return notify('请先完成一次训练，再导出修炼战报。');download(`english-cultivation-report-${x.session_id}.md`,battleReportMarkdown(x),'text/markdown;charset=utf-8');markReportExported(x);}
function markReportExported(report){const x=data.reports?.find(r=>r.report_id===report.report_id);if(x&&x.sync_status==='NOT_SUBMITTED'){x.sync_status='EXPORTED';save();}}
async function copyReport(report){const x=reportFor(report);if(!x)return notify('请先完成一次训练，再复制修炼战报。');const text=battleReportMarkdown(x);try{await navigator.clipboard.writeText(text);markReportExported(x);notify('战报已复制，可以打开 ChatGPT 粘贴。');}catch{const area=textarea(text,'');area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(ok){markReportExported(x);notify('战报已复制。');}else notify('复制不可用，请改用下载 Markdown。');}}
async function shareReport(report){const x=reportFor(report);if(!x)return notify('请先完成一次训练，再分享修炼战报。');const text=battleReportMarkdown(x);if(!navigator.share){notify('系统分享不可用，请使用复制战报或下载 Markdown。');return;}try{await navigator.share({title:'English Cultivation Battle Report',text});markReportExported(x);notify('分享菜单已打开；如果有 ChatGPT，请选择它。');}catch(err){if(err?.name!=='AbortError')notify('无法打开分享菜单，请使用复制战报。');}}
function renderSummary(){const x=reportFor();if(!x){setPage('home');return;}app.append(el('div','修炼战报 · BATTLE REPORT','eyebrow'),h('h1','本次修炼完成'),renderGritQuoteBanner('complete',(data.reports?.length||0)),p('基于本机真实训练记录生成。','lead'));const row=div('grid-3 report-summary');const vocabDone=x.vocabulary_practice_evidence?.summary?.answered||0;row.append(statistic('实际训练',fmtTime(x.active_seconds*1000)),statistic(vocabDone?'触控词汇识别':'单词完成',vocabDone||(x.mode_breakdown?.words||0)),statistic('句听与输出词数',x.discourse_summary?.totalOutputWords?`${x.discourse_summary.totalOutputWords} 词`:((x.mode_breakdown?.sentences||0)+(x.mode_breakdown?.listening||0))));app.append(row);
if(x.module_coverage){const overview=section('daily-journey-card');overview.append(h('h2','今日全流程完成情况（11.0 战报）'),p(`正向累计 ${fmtTime(x.active_seconds*1000)} · 参考目标 ${x.target_minutes||'未设置'} 分钟 · 阅读用时 ${Math.round((x.reading_seconds||0)/60)} 分钟`,'subtle'));for(const m of x.module_coverage)overview.append(p(`${m.status==='completed'?'✓':'◐'} ${m.label||m.stage}：${m.status==='completed'?'模块完成':m.status==='partial'?'部分完成':'未完成'}${m.count!==undefined?` · ${m.count} 项`:''}`,'tiny'));app.append(overview);}
const box=section();box.append(h('h2','K / V / N 自评'));const r=div('grid-3');r.append(statistic('K · 会用',x.ratings_summary?.K||0),statistic('V · 模糊',x.ratings_summary?.V||0),statistic('N · 不会',x.ratings_summary?.N||0));box.append(r,p(`评级作答：${x.total_rated_attempts||0} · 未评级：${x.unrated_attempts||0} · 词汇：${x.mode_breakdown?.words||0} · 句子：${x.mode_breakdown?.sentences||0} · 听力：${x.mode_breakdown?.listening||0}`,'tiny'),p(`新内容：${x.learning_breakdown?.new_items||0} · 学习中：${x.learning_breakdown?.learning_stage_items||0} · 复习：${x.learning_breakdown?.review_items||0}`,'tiny'),p(`独立初答：${x.prompt_stats?.first_attempt_independent||0} · 使用提示：${x.prompt_stats?.prompted||0} · 查看中文：${x.prompt_stats?.viewed_chinese||0} · 查看答案：${x.prompt_stats?.viewed_answer||0} · 错题重练：${x.prompt_stats?.retried_after_error||0}`,'tiny'),p(`导出状态：${x.sync_status==='NOT_SUBMITTED'?'本地已保存':'已导出'}（不代表外部系统已同步）`,'tiny'));
if(Array.isArray(x.attempts)){const details=document.createElement('details');details.className='report-details';details.append(el('summary','展开逐项学习记录'));const list=el('ul','','list');x.attempts.forEach(a=>{const li=el('li');li.append(el('div',`${a.target||a.item_id} · ${a.module||a.content_type} · ${a.rating||'未评级'}`,'item-title'),el('div',`你的回答：${a.user_answer||'（空）'} · 参考：${a.reference_answer||'—'}${a.prompt_used?' · 使用提示':''}${a.retried_after_error?' · 已重练':''}`,'item-sub'));list.append(li);});details.append(list);box.append(details);}
if(x.vocabulary_practice_evidence?.interferenceRadar?.pairs?.length){const radarBox=section('interference-radar-report');const radar=x.vocabulary_practice_evidence.interferenceRadar;radarBox.append(el('div','顽固易混词对雷达 · INTERFERENCE RADAR (11.0)','eyebrow'),h('h3',`本次识别发现 ${radar.totalConfusedPairs} 组易混词对（同轮微回炉已修正 ${x.vocabulary_practice_evidence.summary?.rehearsedCorrect||0} 词）`));radar.pairs.slice(0,8).forEach(pair=>{radarBox.append(p(`• ${pair.target} ↔ ${pair.distractor}｜${pair.contrastAnchor||pair.targetSense}`,'tiny'));});box.append(radarBox);}
if(x.discourse_summary?.analyzedResponses){
  const dx=x.discourse_summary;
  const dxBox=section('discourse-xray-card');
  dxBox.append(
    el('div','零幻觉客观表达体检汇总 · EXPRESSION X-RAY','eyebrow'),
    h('h3',`共分析 ${dx.analyzedResponses} 篇英文输出 · 总计 ${dx.totalOutputWords} 词 · 均句长 ${dx.avgSentenceWords} 词 · 词汇多样性 ${Math.round((dx.avgLexicalDiversity||0)*100)}%`),
    p(`目标词块命中：${dx.targetHits?.length?dx.targetHits.join(' · '):'暂无'} ｜ 待补词块：${dx.targetMissed?.length?dx.targetMissed.join(' · '):'无'}`,'tiny'),
    p(`今日词包主动复用：${dx.packWordsReused?.length?dx.packWordsReused.join(' · '):'暂无'} ｜ 逻辑衔接词：${dx.cohesionMarkersUsed?.length?dx.cohesionMarkersUsed.join(' · '):'暂无'}`,'tiny'),
    p(dx.integrityNotice,'tiny')
  );
  box.append(dxBox);
}
if(x.fsrs_shadow){
  const fsBox=section('panel soft fsrs-shadow-panel');
  fsBox.append(
    el('div','FSRS 6.3.2 记忆半衰期 · SHADOW SCHEDULER','eyebrow'),
    p(`合格独立回忆事件：${x.fsrs_shadow.qualifiedIndependentEvents||0} 次 · 已建档：${x.fsrs_shadow.trackedCards||0} 张 · 平均稳定度：${x.fsrs_shadow.avgStabilityDays||0} 天 · 高风险/到期：${x.fsrs_shadow.highRiskCount||0} 张（已排除触控选择/提示 ${x.fsrs_shadow.excludedNonIndependentOrUnrated||0} 次）`,'tiny')
  );
  box.append(fsBox);
}
if(x.reading_analysis?.marks?.length){const marks=section('reading-marks-report');marks.append(h('h3','本次阅读生词'));x.reading_analysis.marks.forEach(mark=>marks.append(p(`${mark.wordText||mark.normalizedWord} · ${mark.savedStatus==='SAVED'?'已保存':'未保存'} · ${mark.originalSentence||''}`,'tiny')));box.append(marks);}
const handoff=section('report-handoff');
handoff.append(h('h3','交接给中央仙窍'),
  p('下载一个 ZIP（战报、学习包、结构化反馈及本机可读取的录音）。下载后请发送给中央仙窍；网站不会自动上传。','subtle'));
const primary=lines(
  btn('下载完整交接包 ZIP',()=>exportCentralHandover(true),'btn primary'),
  btn('返回首页',()=>setPage('home'),'btn ghost'));
primary.classList.add('report-primary-actions');
handoff.append(primary);
const more=document.createElement('details');
more.className='report-details report-export-options';
more.append(el('summary','其他导出方式（备用）'),
  lines(
    btn('交接包 ZIP（不含录音）',()=>exportCentralHandover(false),'btn secondary'),
    btn('复制文字战报',()=>copyReport(x),'btn ghost'),
    btn('生成下次学习依据',copyCentralFeedback,'btn ghost'),
    btn('导出反馈 JSON',exportCentralFeedback,'btn ghost'),
    btn('分享文字战报',()=>shareReport(x),'btn ghost'),
    btn('下载 Markdown',()=>exportReportMarkdown(x),'btn ghost'),
    btn('下载 JSON',()=>exportReportJSON(x),'btn ghost')));
handoff.append(more);
box.append(handoff);
app.append(box);}
function renderReports(){app.append(el('div','修炼战报 · ARCHIVE','eyebrow'),h('h1','我的修炼战报'),p('本机修炼战报归档。','lead'));if(!data.reports?.length){const box=section();box.append(h('h2','还没有战报'),p('完成一次训练后，这里会生成结构化战报。','subtle'));app.append(box);return;}const list=el('ul','','list');data.reports.slice().reverse().forEach(report=>{const li=el('li');const info=div();info.append(el('div',new Date(report.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),'item-title'),el('div',`${modeLabel(report.mode)} · ${report.total_rated_attempts||0} 次评级作答 · ${report.unrated_attempts||0} 条未评级 · ${report.sync_status==='NOT_SUBMITTED'?'本地已保存':'已导出'}`,'item-sub'));const side=div('head-actions');side.append(btn('打开',()=>{lastSessionSummary=report;setPage('summary');},'btn ghost'),btn('JSON',()=>exportReportJSON(report),'btn ghost'));li.append(info,side);list.append(li);});const box=section();box.append(list,lines(btn('导出最新 Markdown',()=>exportReportMarkdown(data.reports.at(-1)),'btn primary'),btn('导出最新 JSON',()=>exportReportJSON(data.reports.at(-1)),'btn'),btn('导出完整中央交接包',()=>exportCentralHandover(false),'btn secondary'),btn('交接包（含录音）',()=>exportCentralHandover(true),'btn ghost'),btn('生成下次学习依据',copyCentralFeedback,'btn secondary'),btn('导出反馈 JSON',exportCentralFeedback,'btn ghost')));if(data.dailyJourney?.finishedAt)box.append(btn('重新导出修复后的 Battle Report（保留原报告）',rebuildJourneyReport,'btn secondary'));app.append(box);}
let importRaw='',importFilename='';
function preserveSourcePack(raw,parsed,filename){
  if(parsed?.schema_version!=='2.0'||!String(parsed?.pack_id||'').trim())return {unavailableReason:'原始 JSON 不是带 pack_id 的 schema_version 2.0 学习包。'};
  const bytes=new TextEncoder().encode(raw);
  if(bytes.length>5_000_000)return {unavailableReason:'原始学习包超过 5 MB，未写入本机 Journey 状态以避免存储压力。'};
  return {raw,packId:String(parsed.pack_id).trim(),schemaVersion:'2.0',provenance:{type:'imported_daily_pack',fileName:filename||'learning-pack.json',importedAt:new Date().toISOString()}};
}
function inputStudyZip(){const x=el('input','','input');x.type='file';x.accept='.zip,application/zip';x.addEventListener('change',async()=>{const file=x.files?.[0];if(!file)return;if(file.size>100*1024*1024){notify('配音学习包过大，请控制在 100 MB 以内。');return;}try{const files=await unpackSpeechZip(file),packFile=files.find(item=>item.name==='learning-pack.json')||files.find(item=>/\.json$/i.test(item.name)&&!/^speech-manifest|^manifest|^package-info$/i.test(item.name.replace(/\.json$/i,'')));if(!packFile)throw Error('ZIP中没有学习包 JSON。');const packRaw=await packFile.text();let pack;try{pack=JSON.parse(packRaw);}catch{throw Error('学习包 JSON 无法解析。');}const infoFile=files.find(item=>item.name==='package-info.json');const manifestFile=files.find(item=>item.name==='speech-manifest.json'||item.name==='manifest.json');if(infoFile){const info=JSON.parse(await infoFile.text());if(info.schema_version&&String(info.schema_version)!=='2.0')throw Error('ZIP学习包 schema_version 不受支持。');if(info.pack_id&&String(info.pack_id)!==String(pack.pack_id||''))throw Error('ZIP package-info 与学习包 pack_id 不一致。');if(info.manifest_sha256&&manifestFile){const manifestHash=await sha256Hex(new Uint8Array(await manifestFile.arrayBuffer()));if(manifestHash!==info.manifest_sha256)throw Error('ZIP speech-manifest SHA-256 校验失败。');}}let audioSummary=null;const hasManifest=Boolean(manifestFile);if(hasManifest)audioSummary=await importSpeechClips(files);await chooseImport(packRaw,packFile.name);if(draft&&draft.pack&&!draft.error){const confirmBtn=document.querySelector('#import-preview button.btn.primary');if(confirmBtn)confirmBtn.click();}if(audioSummary){const coverage=Object.entries(audioSummary.byCategory||{}).map(([key,row])=>`${key} ${row.imported}/${row.total}`).join(' · ');notify(`ZIP学习包已自动导入并开启今日完整学习；自然语音 ${audioSummary.imported}/${audioSummary.total} 段${coverage?`（${coverage}）`:''}${audioSummary.missing?`，缺失 ${audioSummary.missing} 段`:''}。`);}else notify('ZIP学习包已自动导入并开启今日完整学习；未包含自然语音清单，将使用设备朗读。');}catch(error){notify(`ZIP学习包读取失败：${error.message}`);}finally{x.value='';}});return x;}
function inputFile(accept,fn){const x=el('input','','input');x.type='file';x.accept=accept;x.addEventListener('change',async()=>{const file=x.files?.[0];if(!file)return;if(file.size>3_000_000){notify('文件过大，请选择小于 3 MB 的文件。');return;}try{await fn(await file.text(),file.name);}catch(e){notify(`读取文件失败：${e.message}`);}});return x;}
function showCardDialog(item){document.getElementById('card-dialog')?.remove();const backdrop=div('switch-backdrop');backdrop.id='card-dialog';const card=section('switch-dialog card-dialog');const history=data.attempts.filter(attempt=>attempt.itemId===item.id).slice(-8).reverse();card.append(el('div','卡片详情 · CARD DETAIL','eyebrow'),h('h2',item.kind==='word'?item.target:item.text),p(`${item.status==='UNTESTED'?'未测试':item.status} · ${item.paused?'已暂停复习':'正在复习'} · ${item.attempts||0} 次记录`,'subtle'));if(item.example)card.append(p(item.example,'small-block'));if(item.context)card.append(p(`原文上下文：${item.context}`,'hint'));if(item.meaningZh)card.append(p(`中文释义：${item.meaningZh}`,'hint'));const list=el('ul','','list');if(history.length)history.forEach(row=>{const li=el('li');li.append(el('span',`${row.status||'?'} · ${row.answer||'跳过'} · ${row.initial_check?.status||'未检查'}`,'item-sub'),el('span',new Date(row.at).toLocaleDateString('zh-CN'),'chip'));list.append(li);});else list.append(el('li','还没有真实练习记录。','item-sub'));card.append(h('h3','最近练习'),list,lines(btn('编辑卡片',()=>{backdrop.remove();showEditDialog(item);},'btn primary'),btn('关闭',()=>backdrop.remove(),'btn ghost')));backdrop.append(card);document.body.append(backdrop);}
function showEditDialog(item){document.getElementById('edit-dialog')?.remove();const backdrop=div('switch-backdrop');backdrop.id='edit-dialog';const card=section('switch-dialog card-dialog');const target=textInput(item.kind==='word'?item.target:item.text,'英文目标内容');const example=textarea(item.kind==='word'?item.example:item.context||item.text,'English example or original sentence');const meaning=textInput(item.meaningZh||'','可选中文释义');const tags=textInput((item.tags||[]).join('、'),'标签，用顿号分隔');card.append(el('div','编辑学习卡片','eyebrow'),p('修改资料不会清除历史 K/V/N、作答或复习日期。','subtle'),field(item.kind==='word'?'目标词或词块':'原句',target),field('英文例句或上下文',example),field('中文释义（可选）',meaning),field('标签（可选）',tags),lines(btn('保存修改',()=>{const nextTarget=target.value.trim(),nextExample=example.value.trim();if(!nextTarget||!nextExample){notify('英文目标和例句不能为空。');return;}if(item.kind==='word'){item.target=nextTarget;item.example=nextExample;}else{item.text=nextTarget;item.context=nextExample;}item.meaningZh=meaning.value.trim();item.tags=tags.value.split(/[、,;|]/).map(x=>x.trim()).filter(Boolean);if(!save())return;backdrop.remove();notify('卡片资料已更新，历史记录保留。');render();},'btn primary'),btn('取消',()=>backdrop.remove(),'btn ghost')));backdrop.append(card);document.body.append(backdrop);}
function chooseImport(raw,filename){importRaw=raw;importFilename=filename;draft=null;try{if(filename.toLowerCase().endsWith('.json')){const parsed=JSON.parse(raw);if(isFullBackup(parsed))throw Error('这是完整数据备份，请从“设置 → 恢复 JSON 备份”导入；学习包入口只接受 daily learning pack。');if(!Array.isArray(parsed.items)&&Array.isArray(parsed.weaknesses)){draft={items:[],readings:[],weaknesses:parsed.weaknesses,transferTasks:Array.isArray(parsed.transfer_tasks)?parsed.transfer_tasks:[],errors:[],sourceType:'weakness'};}else{draft=recordsFromLearningPack(parsed,{source:'中央仙窍英语资料库'});draft.sourcePack=preserveSourcePack(raw,parsed,filename);if(draft.sourcePack.unavailableReason)draft.sourcePackUnavailableReason=draft.sourcePack.unavailableReason;}}else draft=filename.toLowerCase().endsWith('.csv')?recordsFromCSV(raw,{includeExamples:true,source:filename}):sentencesFromText(raw,{source:filename});if(!draft.items.length&&!(draft.readings||[]).length&&!(draft.weaknesses||[]).length&&!draft.storyPractice&&!(draft.speeches||[]).length&&!(draft.vocabularyPractice||[]).length)throw Error('学习包没有可识别的英语材料。');if(!filename.toLowerCase().endsWith('.csv')&&!filename.toLowerCase().endsWith('.json'))draft.reading={id:`reading:${Date.now()}`,title:filename,source:filename,text:raw,createdAt:new Date().toISOString()};notify(`预览已准备：${draft.items.length} 张卡片${draft.storyPractice?'，含纸上故事练习':''}${draft.weaknesses?.length?`，${draft.weaknesses.length} 个弱项`:''}。`);}catch(e){draft={error:e.message};notify(`导入预览失败：${e.message}`);}render();}
function renderLibrary(){app.append(el('div','资料库 · LIBRARY','eyebrow'),h('h1','资料库'),p('支持每日学习包 ZIP / JSON、CSV 与文本导入。','lead'));
const panel=section();panel.append(h('h2','导入学习材料'),p('导入每日学习包后自动分配全部模块。','subtle'));
panel.append(lines(btn('打开英语阅读室',()=>setPage('reading'),'btn secondary')));panel.append(field('导入每日学习包 ZIP（JSON + speech-manifest.json + MP3）',inputStudyZip()),field('从 iPhone“文件”App 选择资料',inputFile('.json,.csv,.txt,.md,application/json,text/csv,text/plain',chooseImport)));
const text=textarea('',`Paste English sentences or a short story here…`);text.rows=5;panel.append(field('或粘贴英文材料',text),lines(btn('预览粘贴内容',()=>chooseImport(text.value,'Pasted English text'),'btn secondary')));
const opt=div('setup-options');const toggle=el('input');toggle.type='checkbox';toggle.id='examples';toggle.checked=true;const lab=el('label');lab.htmlFor=toggle.id;lab.append(toggle,el('span','同时从词汇例句生成句子卡'));opt.append(lab);panel.append(opt);
toggle.addEventListener('change',()=>{if(importFilename.toLowerCase().endsWith('.csv')&&importRaw){try{draft=recordsFromCSV(importRaw,{includeExamples:toggle.checked,source:importFilename});updatePreview();}catch(e){notify(e.message);}}});
function updatePreview(){const preview=document.getElementById('import-preview');if(preview)preview.replaceChildren(createPreview());}
function createPreview(){const wrap=div();if(!draft)return wrap;if(draft.error){wrap.append(p(draft.error,'error'));return wrap;}const vocabChoiceCount=(draft.vocabularyPractice||draft.pack?.vocabularyPractice||[]).length,words=draft.items.filter(x=>x.kind==='word').length+vocabChoiceCount,sentences=draft.items.filter(x=>x.kind==='sentence'&&x.module!=='listening').length,listening=draft.items.filter(x=>x.module==='listening').length,readings=(draft.readings||[]).length,weaknesses=(draft.weaknesses||[]).length;
  wrap.append(h('h3',draft.pack?`${draft.pack.title} · 总学习包预览`:weaknesses?`弱项资料预览 · ${weaknesses} 个弱项`:`导入预览 · ${words} 个词汇 / ${sentences} 个句子`));if(draft.pack)wrap.append(p(`自动识别：炼词 ${words} · 炼句 ${sentences} · 阅读 ${readings} · 听力 ${listening} · 综合输出 ${draft.pack.transferTasks?.length||0} · 英语演讲 ${draft.pack.speechIds?.length||0} · 纸上故事 Section ${draft.pack.storyPractice?.stories?.reduce((sum,story)=>sum+story.sections.length,0)||0} · 建议 ${draft.pack.recommendedMinutes||data.settings.duration||40} 分钟（不强制）`,'subtle'));if(draft.pack)wrap.append(p(`来源：${draft.pack.source} · 日期：${draft.pack.createdAt||'未提供'} · 共 ${draft.items.length} 项。`,'subtle'));if(weaknesses)wrap.append(p(`这些弱项会保留来源和独立测试状态，不会自动写成 N。`,'subtle'));if(draft.errors?.length)wrap.append(p(`${draft.errors.length} 项质量提示：${draft.errors.slice(0,3).join('；')}`,'error'));
const list=el('ul','','preview-list list');(draft.readings||[]).slice(0,4).forEach(x=>{const li=el('li');li.append(el('span',x.title,'item-title'),el('span','阅读','chip'));list.append(li);});draft.items.slice(0,8).forEach(x=>{const li=el('li');li.append(el('span',x.kind==='word'?x.target:x.text,'item-title'),el('span',x.kind,'chip'));list.append(li);});wrap.append(list);
wrap.append(lines(btn(draft.pack?'确认导入一份文件并开始综合学习':'确认导入这些项目',()=>{
  const isPack=Boolean(draft.pack),packMeta=draft.pack;
  if(isPack&&data.dailyJourney&&!data.dailyJourney.finishedAt&&data.dailyJourney.packId!==packMeta.packId){
    if(!confirm('上一个综合学习包还有未完成模块。确定切换到新学习包？旧作答和战报仍会保留。'))return;
  }
  const merged=isPack?mergeDailyPackItems(data.items,draft.items):mergeItems(data.items,draft.items);data.items=merged.items;data.weaknesses=mergeWeaknesses(data.weaknesses||[],draft.weaknesses||[]);
  const readingIds=[];
  const speechIds=[];
  data.speeches=data.speeches||[];
  for(const speech of (draft.speeches||[])){
    let found=data.speeches.find(x=>x.id===speech.id||x.scriptEn===speech.scriptEn);
    if(!found){data.speeches.push(speech);found=speech;}
    speechIds.push(found.id);
  }
  for(const article of (draft.readings||[])){
    let existing=data.readings.find(r=>r.id===article.id||r.text===article.text);
    if(!existing){data.readings.push(article);existing=article;}
    readingIds.push(existing.id);
  }
  if(draft.reading&&!data.readings.some(r=>r.text===draft.reading.text))data.readings.push(draft.reading);
  if(isPack){data.dailyPack={...packMeta,itemIds:merged.itemIds,readingIds,speechIds:[...new Set(speechIds)],transferTasks:packMeta.transferTasks||[],spellingTasks:packMeta.spellingTasks||[],vocabularyPractice:packMeta.vocabularyPractice||draft.vocabularyPractice||[],originalWordArchive:packMeta.originalWordArchive||draft.originalWordArchive||[],originalSpellingArchive:packMeta.originalSpellingArchive||draft.originalSpellingArchive||[],storyPractice:packMeta.storyPractice||null,microLessons:packMeta.microLessons||[],dialogueScenarios:packMeta.dialogueScenarios||[],listeningDiagnostics:packMeta.listeningDiagnostics||[],sourcePack:draft.sourcePack||null,sourcePackUnavailableReason:draft.sourcePackUnavailableReason||null};data.packHistory=[...(data.packHistory||[]).filter(x=>x.packId!==packMeta.packId),data.dailyPack];ensureVocabularyInActiveJourney();}
  if(!save())return;
  notify(`已识别并导入：词汇 ${words}、句子 ${sentences}、阅读 ${readings}、听力 ${listening}、演讲 ${(draft.speeches||[]).length}、弱项 ${weaknesses}。`);
  draft=null;importRaw='';if(isPack)startDailyJourney();else render();
},'btn primary'),btn('取消预览',()=>{draft=null;importRaw='';render();},'btn')));return wrap;}
const preview=div();preview.id='import-preview';preview.append(createPreview());panel.append(preview);app.append(panel);
const my=section();const header=div('row wrap');header.append(h('h2',`我的资料 · ${data.items.length} 张卡片`));const controls=div('head-actions');const search=el('input','','input');search.type='search';search.placeholder='搜索资料';search.value=searchTerm;search.style.maxWidth='220px';search.setAttribute('aria-label','搜索资料库');search.addEventListener('input',()=>{searchTerm=search.value;showList();});const select=el('select','','select');select.setAttribute('aria-label','筛选学习卡片');select.style.width='auto';const filterOptions=[['all','全部'],['word','单词'],['sentence','句子'],['content:Stories','故事'],['content:Reading Materials','阅读材料'],['content:IELTS','IELTS'],['content:Teaching Materials','教学材料'],['content:Other Sources','其他来源'],['due','到期'],['untested','未测试'],['status:K','K｜会用'],['status:V','V｜模糊'],['status:N','N｜不会'],['paused','已暂停'],['archived','已归档']];for(const [value,label] of filterOptions){const opt=el('option',label);opt.value=value;select.append(opt);}const tagSet=[...new Set(data.items.flatMap(x=>x.tags||[]))].filter(Boolean).slice(0,20);for(const tag of tagSet){const opt=el('option',`标签：${tag}`);opt.value=`tag:${tag}`;select.append(opt);}const sourceSet=[...new Set(data.items.map(x=>x.source).filter(Boolean))].slice(0,20);for(const source of sourceSet){const opt=el('option',`来源：${source}`);opt.value=`source:${source}`;select.append(opt);}select.value=filter;select.addEventListener('change',()=>{filter=select.value;showList();});controls.append(search,select);header.append(controls);my.append(header);
const listContainer=div();const showList=()=>{listContainer.replaceChildren();const q=normalized(searchTerm);const matches=data.items.filter(x=>(filter==='all'||x.kind===filter||(filter.startsWith('content:')&&x.contentType===filter.slice(8))||(filter.startsWith('status:')&&x.status===filter.slice(7))||(filter.startsWith('tag:')&&(x.tags||[]).includes(filter.slice(4)))||(filter.startsWith('source:')&&x.source===filter.slice(7))||(filter==='due'&&isDue(x))||(filter==='untested'&&x.status==='UNTESTED')||(filter==='paused'&&x.paused)||(filter==='archived'&&x.archived))&&(!q||normalized([x.target,x.example,x.text,x.source,x.group].join(' ')).includes(q)));const count=p(`${matches.length} 张匹配卡片`,'tiny');listContainer.append(count);if(!matches.length){listContainer.append(div('empty'));listContainer.lastChild.textContent='没有匹配的资料。';return;}const list=el('ul','','list');for(const x of matches.slice(0,50)){const li=el('li');const info=div();info.append(el('div',x.kind==='word'?x.target:x.text,'item-title'),el('div',`${x.contentType||x.group||x.kind} · ${x.source||'未知来源'}${x.tags?.length?` · ${x.tags.join('、')}`:''}`,'item-sub'));const side=div('head-actions');side.append(el('span',x.archived?'已归档':x.paused?'已暂停':x.status==='UNTESTED'?'未测试':x.status,'chip'));side.append(btn('详情',()=>showCardDialog(x),'btn ghost'),btn('编辑',()=>showEditDialog(x),'btn ghost'),btn(x.archived?'恢复':'归档',()=>{x.archived=!x.archived;if(save())render();},'btn ghost'),btn(x.paused?'恢复复习':'暂停复习',()=>{x.paused=!x.paused;if(save())render();},'btn ghost'),btn('重新学习',()=>{x.learningStage='new';x.status='UNTESTED';x.dueAt=null;x.successStreak=0;if(save())render();},'btn ghost'));li.append(info,side);list.append(li);}listContainer.append(list);if(matches.length>50)listContainer.append(p(`显示前 50 条，共 ${matches.length} 条。可以继续搜索缩小范围。`,'tiny'));};
my.append(listContainer);showList();app.append(my);}
function download(name,text,mime='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function exportBackup(){
  const time=new Date().toISOString();
  data.settings.lastBackupExportAttemptAt=time;
  if(!save())return;
  const snapshot=JSON.stringify({...data,activeSession:null,version:VERSION},null,2);
  download('english-mastery-backup-'+time.slice(0,10)+'.json',snapshot,'application/json');
  notify('已发起JSON下载，请在“文件”中确认保存；本备份不含录音，录音须单独导出。');
}
function exportHistory(){if(!data.attempts.length){notify('还没有可导出的练习历史。');return;}download(`english-mastery-history-${new Date().toISOString().slice(0,10)}.csv`,makeCSV(data.attempts,['at','kind','itemId','status','answer','sessionId']),'text/csv;charset=utf-8');}
function importBackup(raw){let restored;try{restored=migrateBackupPayload(JSON.parse(raw));}catch(e){notify(`备份未导入：${e.message}`);return;}if(!confirm(`这份备份包含 ${restored.items.length} 张卡片、${restored.attempts.length} 次作答、${restored.readings.length} 篇文章和 ${restored.reports.length} 份战报。要合并吗？已有卡片、进度和资料会保留。`))return;const merged=mergeItems(data.items,restored.items);data=mergeBackupState(data,restored);if(!save())return;notify(`备份已合并：新增 ${merged.added} 张卡片，重复 ${merged.skipped} 张；文章和历史记录已验证保留。`);render();}
function readingParagraphs(text){return String(text||'').split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean);}
function selectionOffsetInParagraph(paragraph,selection){try{if(!selection?.rangeCount)return 0;const range=selection.getRangeAt(0);const before=range.cloneRange();before.selectNodeContents(paragraph);before.setEnd(range.startContainer,range.startOffset);return Math.max(0,before.toString().length);}catch{return 0;}}
function currentReadingSelection(reading,paragraphs){const selection=window.getSelection?.();const text=(selectedText||selection?.toString()||'').trim();if(!text)return null;const paragraphIndex=selectedParagraphIndex;const paragraphText=selectedParagraphText||paragraphs[paragraphIndex]||'';const paragraph=document.querySelector(`.reading-paragraph[data-paragraph-index="${paragraphIndex}"]`);const position=selection&&paragraph?selectionOffsetInParagraph(paragraph,selection):Math.max(0,paragraphText.indexOf(text));const contextInfo=readingSelectionContext(paragraphText,text,{paragraphIndex,startHint:position});if(!contextInfo)return null;return {text,paragraphIndex,position,contextInfo};}
function appendStoryRichText(box,segment){const re=/\*\*([^*\n]{1,60})\*\*/g;let last=0,match;while((match=re.exec(segment))!==null){if(match.index>last)box.append(document.createTextNode(segment.slice(last,match.index)));const strong=el('strong',match[1],'story-target-word');strong.title='点击用 AI 词典查看并朗读';strong.addEventListener('click',e=>{e.stopPropagation();openAiLexiconDrawer(match[1]);});box.append(strong);last=match.index+match[0].length;}if(last<segment.length)box.append(document.createTextNode(segment.slice(last)));}
function renderMarkedParagraph(text,marks){const box=p('', 'reading-paragraph');let cursor=0;const ordered=(marks||[]).filter(mark=>Number.isFinite(Number(mark.position))&&Number(mark.position)>=0).sort((a,b)=>Number(a.position)-Number(b.position));for(const mark of ordered){const start=Number(mark.position),word=String(mark.wordText||'').trim();if(!word||start<cursor||text.slice(start,start+word.length).toLowerCase()!==word.toLowerCase())continue;appendStoryRichText(box,text.slice(cursor,start));const token=el('mark',word,'reading-mark');token.title='已标记生词；再次双击可取消';box.append(token);cursor=start+word.length;}appendStoryRichText(box,text.slice(cursor));return box;}
function toggleReadingMark(reading,paragraphs){const selected=currentReadingSelection(reading,paragraphs);if(!selected){notify('请先双击或长按选中一个英文词语，再点击标记。');return;}const isSentence=/[.!?]$/.test(selected.text)||selected.text.split(/\s+/).length>7;if(isSentence||selected.contextInfo.crossSentence){notify('生词标记请使用同一句中的英文单词或短语；整句仍可用“保存选中文本为卡片”。');return;}const mark={id:readingMarkId({readingId:reading.id,normalizedWord:normalized(selected.text),paragraphIndex:selected.paragraphIndex,position:selected.position}),readingId:reading.id,sourceTitle:reading.title,source:reading.source||'本机导入',paragraphIndex:selected.paragraphIndex,wordText:selected.text,normalizedWord:normalized(selected.text),originalSentence:selected.contextInfo.context,position:selected.position,markedAt:new Date().toISOString(),savedStatus:'UNSAVED',savedItemId:null,packId:reading.packId||data.dailyPack?.packId||null};const existing=(data.readingMarks||[]).find(item=>item.id===mark.id);data.readingMarks=existing?(data.readingMarks||[]).filter(item=>item.id!==mark.id):mergeReadingMarks(data.readingMarks||[],[mark]);if(save())render();}
function saveMarkedReadingWords(reading){const pending=(data.readingMarks||[]).filter(mark=>mark.readingId===reading.id&&mark.savedStatus!=='SAVED');if(!pending.length){notify('当前文章没有待保存的生词标记。');return;}const incoming=pending.map(mark=>({id:readingCardId({readingId:reading.id,kind:'word',target:mark.wordText,context:mark.originalSentence,source:reading.title}),kind:'word',contentType:'Words',target:mark.wordText,originalText:mark.wordText,example:mark.originalSentence,context:mark.originalSentence,readingId:reading.id,paragraphIndex:mark.paragraphIndex,source:reading.title,sourceTitle:reading.title,group:'Reading',tags:['Reading Materials'],learningStage:'new',createdAt:new Date().toISOString()}));const merged=mergeItems(data.items,incoming);data.items=merged.items;const byWord=new Map(incoming.map(item=>[item.id,item.id]));data.readingMarks=(data.readingMarks||[]).map(mark=>{const itemId=readingCardId({readingId:reading.id,kind:'word',target:mark.wordText,context:mark.originalSentence,source:reading.title});return mark.readingId===reading.id&&mark.savedStatus!=='SAVED'&&byWord.has(itemId)?{...mark,savedStatus:'SAVED',savedItemId:itemId}:mark;});if(!save())return;notify(`已保存 ${merged.added} 个新生词，${merged.skipped} 个已存在；原有 K/V/N 保持不变。`);render();}
function saveSelectedReadingText(reading,paragraphs){const selected=currentReadingSelection(reading,paragraphs);const text=(selected?.text||window.getSelection?.()?.toString()||'').trim();if(!text){notify('请先长按或拖动选中英文词语或句子。');return;}const contextInfo=selected?.contextInfo||readingSelectionContext(selectedParagraphText||paragraphs[selectedParagraphIndex]||'',text,{paragraphIndex:selectedParagraphIndex});if(!contextInfo){notify('无法定位所选文本的原句，请重新选择同一段中的英文内容。');return;}const isSentence=/[.!?]$/.test(text)||text.split(/\s+/).length>7;if(!isSentence&&contextInfo.crossSentence){notify('单词或词块不能跨句保存，请只选择一个句子中的表达。');return;}const kind=isSentence?'sentence':'word';const item=isSentence?{id:readingCardId({readingId:reading.id,kind,target:text,context:contextInfo.context,source:reading.title}),kind,contentType:'Reading Materials',text,originalText:text,context:contextInfo.context,readingId:reading.id,paragraphIndex:contextInfo.paragraphIndex,source:reading.title,group:'Reading',tags:['Reading Materials'],learningStage:'new',createdAt:new Date().toISOString()}:{id:readingCardId({readingId:reading.id,kind,target:text,context:contextInfo.context,source:reading.title}),kind,contentType:'Words',target:text,originalText:text,example:contextInfo.context,context:contextInfo.context,readingId:reading.id,paragraphIndex:contextInfo.paragraphIndex,source:reading.title,group:'Reading',tags:['Reading Materials'],learningStage:'new',createdAt:new Date().toISOString()};const merged=mergeItems(data.items,[item]);data.items=merged.items;if(!save())return;notify(merged.added?'已保存为新的复习卡片。':'这段内容已经存在，已关联到原卡片。');}
function touchSpellingInput(initial='',onSubmit){const wrap=section('spelling-touch-panel');let value=String(initial||'');const display=el('div',value||'（尚未输入）','spelling-touch-value');display.setAttribute('aria-live','polite');const update=()=>{display.textContent=value||'（尚未输入）';};const grid=div('spelling-letter-grid');for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){const b=btn(letter,()=>{value+=letter.toLowerCase();update();},'btn spelling-letter');b.setAttribute('aria-label',`添加字母 ${letter}`);grid.append(b);}wrap.append(field('触控拼写（不需要系统键盘）',display),grid,lines(btn('撤销最后一个字母',()=>{value=value.slice(0,-1);update();},'btn ghost'),btn('清空',()=>{value='';update();},'btn ghost'),btn('提交触控拼写',()=>onSubmit(value,'touch_assisted'),'btn primary')));return wrap;}
function renderVocabularyStage(){
  const j=data.dailyJourney,tasks=journeyVocabularyTasks();
  if(!j||journeyStage()!=='vocabulary'){setPage('home');return;}
  j.vocabularyIndex=Number.isInteger(j.vocabularyIndex)?j.vocabularyIndex:0;
  j.vocabularyAttempts=Array.isArray(j.vocabularyAttempts)?j.vocabularyAttempts:[];
  const allAttempts=[...(data.vocabularyAttempts||[]),...j.vocabularyAttempts];
  const findAttempt=taskId=>j.vocabularyAttempts.find(r=>r.taskId===taskId)||allAttempts.find(r=>r.taskId===taskId&&r.packId===j.packId)||null;

  if(j.vocabularyIndex>=tasks.length){
    const rehearsalQueue = !j.vocabularyRehearsalDone ? buildIntraSessionRehearsalQueue(tasks, j.vocabularyAttempts, { maxItems: 5 }) : [];
    if (rehearsalQueue.length > 0) {
      const item = rehearsalQueue[0];
      const box = section("vocab-touch-stage vocab-rehearsal-stage");
      box.append(
        renderJourneyFlowRibbon("vocabulary"),
        el("div", `同轮错词 30 秒微回炉 · INTRA-JOURNEY REHEARSAL（剩余 ${rehearsalQueue.length} 词）`, "eyebrow"),
        h("h1", `迎难而上 · 主动线索回想：${item.firstLetterCue || item.target}`), renderGritQuoteBanner("rehearsal", rehearsalQueue.length),
        p("错词快速回想，可随时跳过。", "subtle")
      );
      const cueCard = section("vocab-prompt-card");
      cueCard.append(
        p(`核心英义：${item.targetSense || "结合原句语境回想"}`, "vocab-prompt-text"),
        item.maskedExample ? p(`语境填空：${item.maskedExample}`, "hint") : el("span", ""),
        item.priorWrongChoice ? p(`首次误选干扰项：${item.priorWrongChoice}`, "tiny") : el("span", "")
      );
      box.append(cueCard);
      const grid = div("vocab-options-grid");
      for (const opt of (item.options || [])) {
        const b = el("button", "", "vocab-option-btn");
        b.type = "button";
        b.append(el("span", opt.id, "vocab-option-key"), el("span", opt.text, "vocab-option-text"));
        b.addEventListener("click", () => {
          const isRight = (item.correctOptionIds || []).includes(opt.id);
          const att = j.vocabularyAttempts.find(r => r.taskId === item.taskId);
          if (att) {
            att.rehearsalCompleted = true;
            att.rehearsalPassed = isRight;
            att.rehearsalAt = new Date().toISOString();
          }
          notify(isRight ? `✓ 微回炉修正成功：${item.target}` : `已记录微回炉，正确词条为：${item.target}`);
          if (save()) render();
        });
        grid.append(b);
      }
      box.append(
        grid,
        lines(
          btn("跳过微回炉，直接进入下一模块 →", () => {
            j.vocabularyRehearsalDone = true;
            if (save()) render();
          }, "btn secondary")
        )
      );
      app.append(box);
      return;
    }
    pauseJourneyVocabulary();
    const summary=summarizeVocabularyPractice(tasks,j.vocabularyAttempts);
    j.completed=(j.completed||[]).filter(x=>x.stage!=='vocabulary');
    j.completed.push({stage:'vocabulary',status:summary.skipped&&!summary.answered?'skipped':summary.remaining>0?'partial':'completed',count:summary.answered,planned:tasks.length,correctFirst:summary.correctFirst,rehearsedCorrect:summary.rehearsedCorrect||0,skipped:summary.skipped});
    j.index++;
    if(save())beginJourneyStage();
    return;
  }

  const task=tasks[j.vocabularyIndex];
  const prior=findAttempt(task.id);
  const box=section('vocab-touch-stage');
  box.append(renderJourneyFlowRibbon('vocabulary'));
  if(!prior)triggerAutoPlayIfEnabled(`vocab:${task.id}`,task.target||task.archivedExample||task.prompt,task.audioUrl);
  const progressPct=Math.round(((j.vocabularyIndex)/Math.max(1,tasks.length))*100);
  const topBar=div('vocab-stage-header');
  topBar.append(
    el('div',`今日完整学习 · 第一模块｜${task.typeLabel||VOCAB_TYPE_LABELS[task.type]||'触控词汇'}`,'eyebrow'),
    div('row wrap')
  );
  topBar.lastChild.append(
    h('h1',`触控词汇 ${j.vocabularyIndex+1} / ${tasks.length}`),
    el('span',`正向计时 ${fmtTime(journeyElapsedMs())}`,'chip')
  );
  const barTrack=div('bar-track');const barFill=div('bar-fill');barFill.style.width=`${progressPct}%`;barTrack.append(barFill);
  box.append(topBar,barTrack,p('轻触选项作答（仅计入识别练习）。','tiny'));

  const promptCard=section('vocab-prompt-card');
  if(task.target&&task.type!=='contextual_cloze'&&task.type!=='reverse_definition'){
    const wordHead=div('vocab-word-header');
    wordHead.append(h('h2',task.target,'vocab-target-word'),btn('🔊 朗读词条',()=>speakEnglish(task.target),'btn secondary small-btn'));
    promptCard.append(wordHead);
  }
  const promptText=p(task.prompt,'vocab-prompt-text');
  promptCard.append(promptText);
  if(task.archivedExample&&task.type!=='contextual_cloze'){
    promptCard.append(lines(btn('🔊 朗读原句语境',()=>speakEnglish(task.archivedExample),'btn ghost small-btn')));
  }
  box.append(promptCard);

  const optionsGrid=div('vocab-options-grid');
  const recordChoice=(optionId,skipped=false)=>{
    if(prior)return;
    const check=skipped?{status:'skipped',correct:false,selectedOptionId:'',selectedText:'',correctOptionIds:task.correctOptionIds,correctText:task.options.filter(o=>task.correctOptionIds.includes(o.id)).map(o=>`${o.id}. ${o.text}`).join(' / '),recognitionOnly:true,countsAsMasteryK:false}:evaluateVocabularyChoice(task,optionId);
    const attempt={
      id:`vocab-attempt:${j.id}:${task.id}`,
      taskId:task.id,
      sourceItemId:task.sourceItemId,
      packId:j.packId,
      journeyId:j.id,
      type:task.type,
      target:task.target||'',
      selectedOptionId:skipped?'':optionId,
      selectedText:check.selectedText,
      correct:Boolean(check.correct),
      skipped:Boolean(skipped),
      firstCheck:check,
      evidenceType:skipped?'skipped':'recognition_only',
      countsAsMasteryK:false,
      productionAnswer:'',
      at:new Date().toISOString()
    };
    j.vocabularyAttempts.push(attempt);
    data.vocabularyAttempts=[...(data.vocabularyAttempts||[]).filter(r=>r.id!==attempt.id),attempt];
    if(save())render();
  };

  for(const opt of (task.options||[])){
    const isSelected=prior&&prior.selectedOptionId===opt.id;
    const isCorrectOpt=task.correctOptionIds.includes(opt.id);
    let cls='vocab-option-btn';
    if(prior){
      if(isCorrectOpt)cls+=' is-correct';
      else if(isSelected&&!prior.correct)cls+=' is-wrong';
    }
    const b=el('button','',cls);
    b.type='button';
    b.disabled=Boolean(prior);
    b.append(el('span',opt.id,'vocab-option-key'),el('span',opt.text,'vocab-option-text'));
    if(prior&&isCorrectOpt)b.append(el('span','✓ 正确项','vocab-option-badge'));
    else if(prior&&isSelected&&!prior.correct)b.append(el('span','✗ 你的首答','vocab-option-badge'));
    b.addEventListener('click',()=>recordChoice(opt.id,false));
    optionsGrid.append(b);
  }
  box.append(optionsGrid);

  const advanceNext=()=>{
    j.vocabularyIndex++;
    if(save())render();
  };

  if(!prior){
    const footerActions=div('vocab-thumb-bar');
    footerActions.append(
      btn('不确定，跳过此题',()=>recordChoice('',true),'btn secondary'),
      btn('提前完成词汇进入下一模块',()=>{if(confirm('还有未答完的触控词汇题。确定保存已有进度并进入下一模块吗？')){j.vocabularyIndex=tasks.length;if(save())render();}},'btn ghost'),
      btn('暂停返回首页',()=>setPage('home'),'btn ghost')
    );
    box.append(footerActions);
  }else{
    const cdtl=buildCdtlCard(task,prior.selectedOptionId,data.dailyPack?.originalWordArchive||[]);
    const feedbackBox=section(`vocab-feedback-card ${prior.skipped?'is-skipped':prior.correct?'is-correct':'is-wrong'}`);
    if(!prior.correct&&!prior.skipped)feedbackBox.append(renderGritQuoteBanner('error',j.vocabularyIndex));
    feedbackBox.append(
      h('h3',prior.skipped?'已记录跳过（不计掌握）':prior.correct?'✓ 识别正确（Recognition Verified）':'🔥 发现盲区 · CDTL 语境破局辨析'),
      p(`正确答案：${prior.firstCheck?.correctText||task.correctOptionIds.join('/')}${prior.selectedText?` · 你的首次选择：${prior.selectedOptionId}. ${prior.selectedText}`:''}`,'subtle'),
      p(task.explanationEn,'small-block')
    );
    if(cdtl){
      const compareGrid=div('cdtl-compare-grid');
      const rightCol=div('cdtl-col cdtl-correct');
      rightCol.append(
        el('div','目标词条与地道语境','eyebrow'),
        h('h4',cdtl.correct.expression||task.target||'Target'),
        p(cdtl.correct.senseEn||'','tiny'),
        cdtl.correct.exampleEn?p(`例句：${cdtl.correct.exampleEn}`,'hint'):el('span','')
      );
      compareGrid.append(rightCol);
      if(cdtl.chosenDistractor){
        const wrongCol=div('cdtl-col cdtl-distractor');
        wrongCol.append(
          el('div','误选干扰项对比','eyebrow'),
          h('h4',cdtl.chosenDistractor.expression),
          p(cdtl.chosenDistractor.senseEn,'tiny'),
          cdtl.chosenDistractor.exampleEn?p(`对比语境：${cdtl.chosenDistractor.exampleEn}`,'hint'):el('span','')
        );
        compareGrid.append(wrongCol);
      }
      feedbackBox.append(compareGrid);
      if(cdtl.contrastAnchor)feedbackBox.append(p(cdtl.contrastAnchor,'cdtl-anchor-pill'));
      if(cdtl.chosenDistractor)feedbackBox.append(renderAiReplyWidget('🤖 追问 AI 怎么区分这两个词',()=>askAiContrastWords({target:cdtl.correct.expression,distractor:cdtl.chosenDistractor.expression,context:task.prompt})));
    }
    if(!prior.correct&&task.productionPrompt){
      const prodInput=textInput(prior.productionAnswer||'',task.productionPrompt);
      const saveProd=btn('保存造句复测并进入下一题',()=>{
        prior.productionAnswer=prodInput.value.trim();
        prior.productionAt=new Date().toISOString();
        advanceNext();
      },'btn secondary');
      feedbackBox.append(field('错词微产出复测（可选，不强制打字）',prodInput),lines(saveProd));
    }
    const nextBtn=btn(j.vocabularyIndex+1>=tasks.length?'完成触控词汇，自动进入下一模块 →':'继续下一题 →',advanceNext,'btn primary vocab-next-btn');
    feedbackBox.append(lines(nextBtn,btn('🔊 朗读英文例句与释义',async()=>{
      const ex=String(cdtl?.correct?.exampleEn||'').trim();
      const sense=String(cdtl?.correct?.senseEn||task.targetSense||'').trim();
      const targetWord=String(cdtl?.correct?.expression||task.target||'').trim();
      if(ex && typeof getSpeechClip==='function'){
        try{
          const blob=await getSpeechClip(ex,'af_heart');
          if(blob && blob.size>0){
            const url=URL.createObjectURL(blob);
            const audio=new Audio(url);
            activeLocalAudio=audio;
            audio.onended=()=>{try{URL.revokeObjectURL(url);}catch{}};
            await audio.play();
            return;
          }
        }catch{}
      }
      const line=[targetWord,sense,ex].filter(Boolean).join('. ')||task.explanationEn;
      speakEnglish(line);
    },'btn secondary')));
    box.append(feedbackBox);
  }
  app.append(box);
}
function renderSpellingForge(){
  const j=data.dailyJourney,tasks=Array.isArray(data.dailyPack?.spellingTasks)?data.dailyPack.spellingTasks:[];
  if(!j||journeyStage()!=='spelling')return;
  j.spellingIndex=Number.isInteger(j.spellingIndex)?j.spellingIndex:0;
  j.spellingAttempts=Array.isArray(j.spellingAttempts)?j.spellingAttempts:[];
  if(j.spellingIndex>=tasks.length){
    const testedIds=new Set(j.spellingAttempts.filter(r=>!r.skipped&&String(r.firstAnswer||'').trim()).map(r=>r.taskId));
    const skippedIds=new Set(j.spellingAttempts.filter(r=>r.skipped).map(r=>r.taskId));
    const tested=tasks.filter(task=>testedIds.has(task.id)).length;
    const skipped=tasks.filter(task=>!testedIds.has(task.id)&&skippedIds.has(task.id)).length;
    j.completed=(j.completed||[]).filter(x=>x.stage!=='spelling');
    j.completed.push({stage:'spelling',status:skipped?'partial':'completed',count:tested,planned:tasks.length,skipped});
    j.index++;
    if(save())beginJourneyStage();
    return;
  }
  const task=tasks[j.spellingIndex];
  // Legacy V9.0.1 stored firstAnswer and firstCheck, but forgot firstSubmittedAt.
  // Rehydrate that first submission instead of resetting the screen to blank.
  const prior=findExistingSpellingAttempt(j.spellingAttempts,task.id);
  const box=section('transfer-challenge');
  box.append(el('div','今日综合学习 · 炼字｜SPELLING FORGE','eyebrow'),
    h('h1','拼写强化'),p(`第 ${j.spellingIndex+1} / ${tasks.length} 题 · 首次独立拼写不会显示答案。`,'tiny'));
  const clue=englishSpellingCue(task);
  box.append(h('h2',clue.prompt));
  if(clue.audioText)box.append(btn(clue.audioLabel,()=>speakEnglish(clue.audioText),'btn secondary'));
  const advance=message=>{
    j.spellingIndex++;
    if(save()){render();if(message)notify(message);}
  };
  if(!prior){
    const input=textInput('','独立输入英文拼写');
    input.autocomplete='off';input.autocorrect='off';input.spellcheck=false;
    input.classList.add('answer-input');focusForMobile(input);
    const submit=(answer,inputMode='free_text')=>{
      const attempt=createSpellingFirstAttempt(task,answer,{packId:j.packId,sessionId:j.id,inputMode});
      if(!attempt){notify('请先输入拼写。');return;}
      j.spellingAttempts.push(attempt);
      const passed=spellingPassed(attempt.firstCheck);
      // Save answer and progress index atomically, preserving the real first response.
      if(passed)j.spellingIndex++;
      if(save()){
        render();
        notify(passed?'首次拼写已保存，进入下一题。':'首次答案已保存，请查看纠错并重试。');
      }
    };
    box.append(btn(spellingTouchMode?'切换键盘输入':'切换触控字母输入',
      ()=>{spellingTouchMode=!spellingTouchMode;render();},'btn ghost'));
    if(spellingTouchMode)box.append(touchSpellingInput('',submit));
    else box.append(field('你的首次拼写',input),btn('提交首次拼写',()=>submit(input.value),'btn primary'));
    box.append(btn('跳过本题（保留未测试证据）',()=>{
      j.spellingAttempts.push({id:`spelling:skip:${task.id}:${Date.now()}`,taskId:task.id,
        packId:j.packId,sessionId:j.id,target:task.target,promptMode:task.promptMode,
        firstAnswer:'',firstCheck:{status:'unassessed'},inputMode:'free_text',
        skipped:true,completedAt:new Date().toISOString()});
      advance('本题已跳过，没有记为正确或错误。');
    },'btn ghost'));
  }else{
    box.append(p(`首次结果：${spellingPassed(prior.firstCheck)?'已记录':'需要纠错'} · ${prior.firstCheck?.errorType||''}`,'hint'),
      p(`你的首次拼写：${prior.firstAnswer}`,'small-block'),
      p(`参考答案：${task.target}`,'small-block'));
    if(!spellingPassed(prior.firstCheck)&&!prior.retrySubmittedAt){
      const input=textInput(prior.retryAnswer||'','不看答案再拼一次');
      input.autocomplete='off';input.autocorrect='off';input.spellcheck=false;
      input.classList.add('answer-input');focusForMobile(input);
      const submitRetry=(answer,inputMode='free_text')=>{
        const value=String(answer||'').trim();if(!value){notify('请先输入重练拼写。');return;}
        prior.retryAnswer=value;
        prior.retryCheck=compareSpellingAnswer(value,task.target);
        prior.retrySubmittedAt=new Date().toISOString();
        prior.inputModeRetry=inputMode;
        prior.completedAt=prior.retrySubmittedAt;
        advance(spellingPassed(prior.retryCheck)?'重练拼写已保存，进入下一题。':'重练结果已保留，后续仍需复习。');
      };
      box.append(btn(spellingTouchMode?'切换键盘输入':'切换触控字母输入',
        ()=>{spellingTouchMode=!spellingTouchMode;render();},'btn ghost'));
      if(spellingTouchMode)box.append(touchSpellingInput(prior.retryAnswer||'',submitRetry));
      else box.append(field('纠错后拼写',input),btn('保存纠错拼写',()=>submitRetry(input.value),'btn primary'));
      box.append(btn('暂不重练，进入下一题（保留首次错误）',
        ()=>{prior.reviewDeferred=true;advance('首次错误已保留，未记为跳过。');},'btn ghost'));
    }else{
      if(prior.retrySubmittedAt)box.append(p(`重练答案：${prior.retryAnswer||'未填写'} · ${prior.retryCheck?.status||'未评估'}`,'hint'));
      box.append(btn('进入下一题（首次作答已保存）',
        ()=>advance('已保留之前的首次作答。'),'btn primary'));
    }
  }
  app.append(box);
}
function transferTasks(){return Array.isArray(data.dailyPack?.transferTasks)?data.dailyPack.transferTasks:[];}
function transferIndexValue(j,tasks=transferTasks()){
  const raw=Number(j?.transferIndex);
  if(!Number.isInteger(raw)||raw<0)return 0;
  return Math.min(raw,tasks.length);
}
function transferTask(){const j=data.dailyJourney,tasks=transferTasks(),index=Number(j?.transferIndex);if(!Number.isInteger(index)||index<0||index>=tasks.length)return null;return tasks[index]||null;}
function journeyTransferAttemptsForReport(j){
  const tasks=transferTasks();
  const rows=mergeTransferAttempts(j?.transferAttempts||[],(data.transferAttempts||[]).filter(attempt=>inferredWeaknesses().some(weakness=>weakness.id===attempt.weaknessId&&(!weakness.sourceId||weakness.sourceId===j?.packId))));
  return rows.map(row=>{const task=tasks.find(item=>item.id===row.taskId);return normalizeTransferAttempt({...row,packId:row.packId||j?.packId,journeyId:row.journeyId||j?.id,taskType:row.taskType||task?.taskType,prompt:row.prompt||task?.prompt,referenceAnswer:row.referenceAnswer||task?.referenceAnswer,targetExpression:row.targetExpression||task?.targetExpression,examSource:row.examSource||task?.examSource,examType:row.examType||task?.examType,testNumber:row.testNumber||task?.testNumber,skill:row.skill||task?.skill,questionId:row.questionId||task?.questionId,questionNumbers:row.questionNumbers||task?.questionNumbers,questionType:row.questionType||task?.questionType,answerConstraints:row.answerConstraints||task?.answerConstraints,sourcePage:row.sourcePage||task?.sourcePage,isAuthenticIelts:row.isAuthenticIelts||task?.isAuthenticIelts});});
}
function journeyReadingMarksForReport(j,readingIds){
  const start=Date.parse(j?.startedAt||''); const end=Date.parse(j?.finishedAt||'');
  return (data.readingMarks||[]).filter(mark=>{
    if(!readingIds.has(mark.readingId))return false;
    const at=Date.parse(mark.markedAt||'');
    if(!Number.isFinite(at))return true;
    return (!Number.isFinite(start)||at>=start)&&(!Number.isFinite(end)||at<=end);
  });
}
function finishTransferStage(j,tasks,{status}={}){
  const skipped=new Set(Array.isArray(j.transferSkippedTaskIds)?j.transferSkippedTaskIds:[]);
  const attempts=Array.isArray(j.transferAttempts)?j.transferAttempts:[];
  const resolved=status||(!tasks.length?'skipped':skipped.size?'partial':'completed');
  j.completed=(j.completed||[]).filter(row=>row.stage!=='transfer');
  j.completed.push({stage:'transfer',status:resolved,count:attempts.length,planned:tasks.length,skipped:skipped.size});
  j.transferIndex=tasks.length;j.transferRunning=false;j.transferLastTick=null;j.index=Math.min(Number(j.index||0)+1,j.steps.length);
}
function advanceTransferTask({action='next',rating=null}={}){
  const j=data.dailyJourney,tasks=transferTasks();
  if(!j||journeyStage()!=='transfer'){notify('当前没有可推进的迁移模块。');return false;}
  if(!tasks.length){finishTransferStage(j,tasks,{status:'skipped'});if(!save())return false;beginJourneyStage();return true;}
  const index=transferIndexValue(j,tasks);j.transferIndex=index;
  if(index>=tasks.length){finishTransferStage(j,tasks);if(!save())return false;beginJourneyStage();return true;}
  if(recordingController?.recorder?.state==='recording'){
    if(typeof confirm==='function'&&!confirm('录音尚未保存。跳过本题会先停止并保存当前录音，是否继续？'))return false;
    stopActiveRecording({renderAfter:false});
  }
  if(action==='skip'){
    j.transferSkippedTaskIds=[...(j.transferSkippedTaskIds||[]),tasks[index].id].filter((id,pos,all)=>all.indexOf(id)===pos);
    j.transferAttempts=mergeTransferAttempts(j.transferAttempts||[],[normalizeTransferAttempt({id:`transfer-skip:${j.id}:${tasks[index].id}`,packId:j.packId,journeyId:j.id,taskId:tasks[index].id,taskType:tasks[index].taskType,prompt:tasks[index].prompt,skipped:true,status:'skipped',at:new Date().toISOString(),evidenceType:'skipped'})]);
  }else if(action==='rate'){
    const row=j.transferAttempts?.at(-1);if(row&&rating)row.rating=rating;
  }
  j.transferIndex=index+1;j.transferState=null;j.transferDraft='';j.transferPromptUsed=false;j.transferLastTick=null;
  if(j.transferIndex>=tasks.length){finishTransferStage(j,tasks);if(!save())return false;beginJourneyStage();return true;}
  j.transferRunning=true;j.transferLastTick=Date.now();if(!save())return false;render();return true;
}
function recoverCurrentJourney(){
  const j=data.dailyJourney;
  if(!j){page='home';render();return;}
  if(j.steps?.[j.index]==='transfer'){
    const tasks=transferTasks();j.transferIndex=transferIndexValue(j,tasks);j.transferDraft=String(j.transferDraft||'');j.transferState=null;j.transferPromptUsed=false;j.transferRunning=j.transferIndex<tasks.length;j.transferLastTick=j.transferRunning?Date.now():null;
    if(!save())return;
    page='transfer';render();return;
  }
  page='home';render();
}
function accrueTransfer(){const j=data.dailyJourney;if(!j||journeyStage()!=='transfer'||!j.transferRunning)return;const now=Date.now(),from=j.transferLastTick||now;if(!document.hidden){j.transferMs=Math.max(0,Number(j.transferMs)||0)+Math.max(0,Math.min(1800,now-from));j.transferActiveByDay=addActiveInterval(j.transferActiveByDay,from,now);}j.transferLastTick=now;}
function submitTransfer(answer){const j=data.dailyJourney,task=transferTask();if(!j||!task||j.transferState==='revealed')return;accrueTransfer();const submittedAt=new Date().toISOString();j.transferDraft=String(answer||'');j.transferState='revealed';const auto=task.acceptedAnswers?.length?compareAnswer(j.transferDraft,task.referenceAnswer,{accepted:task.acceptedAnswers}):{status:'unassessed',message:'开放式表达不进行自动语义评分，请与参考答案比较。'};const row=normalizeTransferAttempt({id:`transfer-attempt-${Date.now()}`,packId:j.packId,journeyId:j.id,taskId:task.id,taskType:task.taskType,prompt:task.prompt,targetExpression:task.targetExpression,examSource:task.examSource,examType:task.examType,testNumber:task.testNumber,skill:task.skill,questionId:task.questionId,questionNumbers:task.questionNumbers,questionType:task.questionType,answerConstraints:task.answerConstraints,sourcePage:task.sourcePage,isAuthenticIelts:task.isAuthenticIelts,practiceRole:task.practiceRole,reviewId:task.reviewId,reviewOf:task.reviewOf,previousReportId:task.previousReportId,previousAttemptId:task.previousAttemptId,previousDate:task.previousDate,previousStatus:task.previousStatus,weaknessType:task.weaknessType,reviewRound:task.reviewRound,reviewInstruction:task.reviewInstruction,referenceAnswer:task.referenceAnswer,firstAnswer:j.transferDraft,firstSubmittedAt:submittedAt,hintUsed:Boolean(j.transferPromptUsed),referenceViewed:true,referenceDisplayedAutomatically:true,referenceViewedAt:submittedAt,autoCheck:auto,recordingIds:j.transferRecordingIds?.[task.id]||[],at:submittedAt,rating:null,retryAnswer:'',evidenceType:j.transferPromptUsed?'prompted':'independent_recall'});j.transferAttempts=mergeTransferAttempts(j.transferAttempts||[],[row]);if(save())render();}
function showTransferAnswer(){const j=data.dailyJourney;if(!j||j.transferState!=='revealed')return;const row=j.transferAttempts.at(-1);if(!row)return;row.referenceViewed=true;row.referenceViewedAt=new Date().toISOString();row.referenceAnswer=row.referenceAnswer||transferTask()?.referenceAnswer||null;save();render();}
function selfCorrectTransfer(answer){const j=data.dailyJourney;if(!j||j.transferState!=='revealed')return;const row=j.transferAttempts.at(-1);if(!row)return;const value=String(answer||'');row.retryAnswer=value;row.retrySubmittedAt=value.trim()?new Date().toISOString():null;if(save())render();}
function rateTransfer(rating){const j=data.dailyJourney;if(!j||j.transferState!=='revealed')return;advanceTransferTask({action:'rate',rating});}
function readingQuestionsFor(reading){return Array.isArray(reading?.questions)?reading.questions:[];}
function readingCheckState(reading){return (data.readingChecks||[]).find(check=>check.readingId===reading.id)||null;}
function readingCheckNextIndex(state,questions){const attempted=new Set((state?.answers||[]).map(answer=>answer.questionId));const nextUnattempted=questions.findIndex(question=>!attempted.has(question.id));if(nextUnattempted>=0)return nextUnattempted;if(state?.status==='partial'){const skipped=(state?.answers||[]).find(answer=>answer.skipped);if(skipped){const index=questions.findIndex(question=>question.id===skipped.questionId);if(index>=0)return index;}}return -1;}
function startReadingCheck(reading){const prior=readingCheckState(reading);const questions=readingQuestionsFor(reading);const state=prior&&prior.status==='partial'?{...prior,status:'in_progress',index:Math.max(0,readingCheckNextIndex(prior,questions))}:{id:`reading-check:${reading.id}`,readingId:reading.id,status:'in_progress',index:0,answers:[],events:[],startedAt:new Date().toISOString()};data.readingChecks=[...(data.readingChecks||[]).filter(check=>check.readingId!==reading.id),state];if(save())render();}
function submitReadingCheck(reading,answer,{skipped=false}={}){const questions=readingQuestionsFor(reading),state=readingCheckState(reading);if(!state||state.status!=='in_progress')return;const question=questions[state.index];if(!question)return;const raw=String(answer||'').trim();if(!raw&&!skipped){notify('请填写答案，或明确点击跳过本题。');return;}const auto=skipped?{status:'unassessed',message:'本题已跳过。'}:question.type==='choice'&&question.answer?compareReadingChoice(raw,question.answer,question.options||[]):(question.type!=='open'&&question.answer?compareAnswer(raw,question.answer,{accepted:question.acceptedAnswers||[]}):{status:'unassessed'});const event={questionId:question.id,answer:raw,skipped,autoCheck:auto,at:new Date().toISOString(),questionType:question.questionType||question.type,answerConstraints:question.answerConstraints||null};state.events=[...(state.events||[]),event];const existing=state.answers.findIndex(item=>item.questionId===question.id);if(existing>=0)state.answers[existing]={...state.answers[existing],...event,original_skip:state.answers[existing].skipped||false};else state.answers.push(event);const unanswered=questions.filter(item=>!state.answers.some(answer=>answer.questionId===item.id&&!answer.skipped));const allAnswered=questions.every(item=>state.answers.some(answer=>answer.questionId===item.id));const next=readingCheckNextIndex(state,questions);if(next<0||(allAnswered&&skipped)){state.status=state.answers.some(item=>item.skipped)?'partial':'completed';state.completedAt=new Date().toISOString();state.index=questions.length;}else{state.status='in_progress';state.index=next;}if(state.status==='completed'&&data.dailyJourney?.readingPartialIds?.includes(reading.id)){const j=data.dailyJourney;j.readingPartialIds=j.readingPartialIds.filter(id=>id!==reading.id);const stage=(j.completed||[]).find(x=>x.stage==='reading');if(stage){stage.partial_count=j.readingPartialIds.length;if(!j.readingPartialIds.length)stage.status='completed';}}if(save())render();}
function renderReadingCheck(reading){const questions=readingQuestionsFor(reading);if(!questions.length)return null;const box=section('reading-check-panel');const state=readingCheckState(reading);box.append(el('div','阅读小测 · COMPREHENSION','question-label'),h('h2','阅读理解检查'),p('可选小测，提交或跳过均可。','subtle'));if(!state){box.append(btn('开始可选小测',()=>startReadingCheck(reading),'btn secondary'));return box;}if(state.status==='completed'){const correct=state.answers.filter(answer=>answer.autoCheck?.status==='correct').length;box.append(p(`小测已完成：${state.answers.length} 题，客观题自动正确 ${correct} 题；开放题保留为人工比较。`,'success'));return box;}if(state.status==='partial')box.append(p('本次小测部分完成；可以继续未提交题目。','hint'));const question=questions[state.index];if(!question){if(state.status==='partial')box.append(btn('继续补做未完成题目',()=>startReadingCheck(reading),'btn primary'));return box;}box.append(p(`第 ${state.index+1} / ${questions.length} 题 · ${question.questionType||question.type}`,'tiny'),h('h3',question.prompt));const radioType=['choice','true_false_not_given','yes_no_not_given','matching_headings','matching_information','matching_features'].includes(question.type);if(radioType){const options=question.options.length?question.options:(question.type==='true_false_not_given'?['True','False','Not Given']:question.type==='yes_no_not_given'?['Yes','No','Not Given']:[]);if(options.length){const choices=div('setup-options');options.forEach(option=>{const label=el('label');const radio=el('input');radio.type='radio';radio.name=`reading-${reading.id}`;radio.value=option;label.append(radio,el('span',option));choices.append(label);});box.append(choices,btn('提交答案',()=>{const selected=box.querySelector('input[type=radio]:checked');submitReadingCheck(reading,selected?.value||'');},'btn primary'));}else{const input=textInput('','输入匹配答案');box.append(field('你的答案',input),btn('提交答案',()=>submitReadingCheck(reading,input.value),'btn primary'));}}else{const input=textarea('','请用英文填写答案……');input.classList.add('answer-input');box.append(field('你的回答',input),btn(question.type==='open'?'提交开放题':'提交答案',()=>submitReadingCheck(reading,input.value),'btn primary'));}box.append(btn('跳过本题',()=>submitReadingCheck(reading,'',{skipped:true}),'btn ghost'));return box;}
function renderTransferRecovery(message){
  const box=section('panel error-state');
  box.append(el('div','迁移模块状态检查 · TRANSFER RECOVERY','eyebrow'),h('h1','当前题目暂时无法显示'),p(message,'subtle'),p('已有学习记录和录音不会被清除。','hint'));
  box.append(lines(btn('返回学习总览',()=>{page='home';render();},'btn primary'),btn('恢复当前学习',recoverCurrentJourney,'btn secondary')));app.append(box);
}
function renderTransferChallenge(){
  const j=data.dailyJourney,tasks=transferTasks(),task=transferTask();if(!j||journeyStage()!=='transfer')return;
  if(!task){if(transferIndexValue(j,tasks)>=tasks.length){advanceTransferTask({action:'boundary'});return;}return renderTransferRecovery('当前迁移题目不存在，未执行任何完成记录。');}
  j.transferDraft=String(j.transferDraft||'');const taskType=task.taskType||'general_transfer';const inputMode=resolveTaskInputMode(task);j.transferLastTick=j.transferLastTick||Date.now();const box=section('transfer-challenge');
  box.append(renderJourneyFlowRibbon('transfer'),renderGritQuoteBanner('transfer',Number(j.transferIndex)||0),el('div','今日综合学习 · 综合输出','eyebrow'),h('h1',taskType==='exit_ticket'?'Exit Ticket｜课末独立验收':taskType==='writing'?'Writing Practice':taskType==='grammar'?'Grammar Transformation':taskType==='speaking'||taskType==='reading_to_speaking'?'IELTS Speaking Practice':'把表达带到新情境'),p(`第 ${Number(j.transferIndex)+1} / ${transferTasks().length} 题 · 正向累计 ${fmtTime(journeyElapsedMs())}`,'tiny'));
  const trace=sourcePanel(task);if(trace)box.append(trace);const prompt=section('panel');if(task.dialogueScenarioId)prompt.append(p(`Scenario dialogue · Round ${task.dialogueRound||j.transferIndex+1}`,'question-label'));prompt.append(h('h2',task.prompt));if(task.audioUrl)prompt.append(audioControls(task.audioUrl));if(task.practiceRole==='review'){const evidence=task.previousDate||task.previousReportId||task.previousAttemptId?`历史日期：${task.previousDate||'未记录'} · 原题：${task.reviewOf||task.previousAttemptId||'未记录'} · 状态：${task.previousStatus||'历史证据待核验'}`:'历史证据待核验';prompt.append(p(`回炉复测｜${evidence}`,'hint'),p(`本次目标：${task.reviewInstruction||'在新情境中独立提取并保留真实证据。'}`,'subtle'));}
  if(j.transferState!=='revealed'){
    const input=textarea(j.transferDraft||'',taskType==='writing'?'写作初稿（可选 80–100 词）……':taskType==='grammar'?'请独立完成语法改写……':'请用英文回答（文字可选，口语题可直接录音）……');input.classList.add('answer-input');focusForMobile(input);input.addEventListener('input',()=>{j.transferDraft=input.value;scheduleDraftSave();});
    if(taskType==='writing'){const count=el('div',`当前字数：${j.transferDraft.trim()?j.transferDraft.trim().split(/\s+/).length:0} · 建议 80–100 词`,'tiny');input.addEventListener('input',()=>count.textContent=`当前字数：${input.value.trim()?input.value.trim().split(/\s+/).length:0} · 建议 80–100 词`);prompt.append(count);}
    const weakness=inferredWeaknesses().find(row=>row.id===`weakness:transfer:${task.id}`)||makeWeakness({id:`weakness:transfer:${task.id}`,...normalizeSourceMeta(task),taskType,targetExpression:task.targetExpression||'',contexts:task.contexts});if(inputMode==='speaking'||inputMode==='both')prompt.append(renderRecordingControls({weaknessId:weakness.id,taskId:task.id,attemptId:`journey:${j.id}:${task.id}`,role:'original',onSaved:row=>{j.transferRecordingIds={...(j.transferRecordingIds||{}),[task.id]:[...new Set([...(j.transferRecordingIds?.[task.id]||[]),row.id]) ]};save();}}));
    const actions=[btn(j.transferPromptUsed?'再次查看提示':'给我一点提示',()=>{j.transferPromptUsed=true;save();render();},'btn ghost')];if(inputMode==='speaking'||inputMode==='both')actions.push(btn('仅保存录音并提交初答',()=>submitTransferRecordingOnly(), 'btn secondary'));if(taskType==='writing')actions.push(btn('保存草稿',()=>{j.transferDraft=input.value;if(save())notify('写作草稿已保存。');},'btn secondary'));actions.unshift(renderDictationAssistButton(input,val=>{j.transferDraft=val;save();}));actions.push(btn('提交初答',()=>submitTransfer(input.value),'btn primary'),btn('跳过本题',()=>advanceTransferTask({action:'skip'}),'btn'));prompt.append(field(taskType==='writing'?'写作初稿':taskType==='grammar'?'语法改写':'文字辅助回答',input),lines(...actions));if(j.transferPromptUsed&&task.hints?.length)prompt.append(p(`提示：${task.hints[0]}`,'hint'));
  }else{const row=j.transferAttempts.at(-1);
    prompt.append(p(`你的初答：${row?.firstAnswer||'（录音初答，未转写）'}`,'small-block'),p(`参考表达：${row?.referenceAnswer||task.referenceAnswer||'未提供'}`,'small-block'),renderDiscourseDiagnosticCard(row?.firstAnswer,{referenceText:row?.referenceAnswer||task.referenceAnswer,targetPhrases:task.targetPhrases||[]}),row?.firstAnswer?renderAiReplyWidget(taskType==='grammar'?'🤖 AI 语法专项批改（规则 + 例句）':(taskType==='speaking'||taskType==='reading_to_speaking')?'🤖 AI 口语 / 试讲教练点评':'🤖 请 AI 导师逐句精批与升级',()=>taskType==='grammar'?askAiCheckGrammar({prompt:task.prompt,userAnswer:row.firstAnswer,referenceAnswer:row?.referenceAnswer||task.referenceAnswer}):(taskType==='speaking'||taskType==='reading_to_speaking')?askAiSpeakingDemoCoach({prompt:task.prompt,userTranscript:row.firstAnswer}):askAiCritiqueOutput({prompt:task.prompt,userAnswer:row.firstAnswer,referenceAnswer:row?.referenceAnswer||task.referenceAnswer}),reply=>{row.aiCritique=reply;save();},row?.aiCritique||''):el('span',''));
    if(row?.recordingOnly)prompt.append(p('录音已保存；语言质量尚未评估。','hint'));
    prompt.append(h('h3','请根据真实回忆自评'),lines(...[['K','本次自评掌握','k'],['V','模糊','v'],['N','不会','n']].map(([r,l,c])=>{const b=el('button','','self-btn '+c);b.append(h('strong',r),el('small',l));b.addEventListener('click',()=>rateTransfer(r));return b;})));
  }
  box.append(prompt,lines(btn('暂停',()=>{accrueTransfer();j.transferRunning=false;j.transferLastTick=null;if(save())render();},'btn ghost'),btn('结束今日综合学习',()=>{accrueTransfer();j.transferRunning=false;j.index=j.steps.length;if(save())finishDailyJourney();},'btn danger')));app.append(box);
}
function submitTransferRecordingOnly(){const j=data.dailyJourney,task=transferTask();if(!j||!task||j.transferState==='revealed')return;accrueTransfer();const submittedAt=new Date().toISOString();j.transferState='revealed';const ids=j.transferRecordingIds?.[task.id]||[];const row=normalizeTransferAttempt({id:`transfer-attempt-${Date.now()}`,packId:j.packId,journeyId:j.id,taskId:task.id,taskType:task.taskType,prompt:task.prompt,referenceAnswer:task.referenceAnswer,firstAnswer:'',firstSubmittedAt:submittedAt,hintUsed:Boolean(j.transferPromptUsed),referenceViewed:true,referenceDisplayedAutomatically:true,referenceViewedAt:submittedAt,autoCheck:{status:'unassessed',message:ids.length?'录音已保存；语言质量尚未评估。':'没有找到已保存录音。'},recordingOnly:true,recordingIds:ids,at:submittedAt,rating:null,retryAnswer:'',evidenceType:'voice_recording',status:'submitted_incomplete'});j.transferAttempts=mergeTransferAttempts(j.transferAttempts||[],[row]);if(save())render();}

/** A separate view over the existing reading-derived learning cards, not a second database. */
function renderReadingVocabulary(){
  const allWords=collectSavedReadingWords(data.items,data.readingMarks,data.readings);
  app.append(el('div','生词本 · VOCABULARY','eyebrow'),h('h1','阅读时保存的生词'),p('阅读时保存的生词与原句。','lead'));
  app.append(lines(btn('返回阅读',()=>setPage('reading'),'btn secondary'),btn('打开统一资料库',()=>setPage('library'),'btn ghost')));
  const panel=section('panel');
  const counter=p('','subtle');
  const controls=div('row wrap');
  const query=textInput(readingVocabSearchTerm,'搜索生词或文章来源');
  query.type='search';
  query.setAttribute('aria-label','搜索已保存阅读生词');
  const filter=el('select','','select');
  filter.setAttribute('aria-label','筛选阅读生词 K/V/N');
  for(const [value,label] of [['all','全部状态'],['UNTESTED','未测试'],['N','N · 不会'],['V','V · 模糊'],['K','K · 会用']]){
    const option=el('option',label);option.value=value;filter.append(option);
  }
  filter.value=readingVocabStatusFilter;
  controls.append(field('搜索',query),field('学习状态',filter));
  const list=el('ul','','list');
  const exportText=textarea('','可复制的阅读生词清单');
  exportText.id='reading-vocabulary-handoff';
  exportText.readOnly=true;exportText.rows=7;
  exportText.setAttribute('aria-label','可手动复制的阅读生词回传文本');
  const copyVisible=btn('复制筛选结果给中央仙窍',()=>copyWords(currentRows()),'btn primary');
  const copyAll=btn('复制全部生词',()=>copyWords(allWords),'btn secondary');
  const exportVisible=btn('下载筛选结果 TXT',()=>{const rows=currentRows();if(rows.length)download('reading-vocabulary-'+new Date().toISOString().slice(0,10)+'.txt',readingVocabularyHandoff(rows,{exportedAt:new Date().toISOString()}),'text/plain;charset=utf-8');},'btn');
  function currentRows(){
    const needle=normalized(readingVocabSearchTerm);
    return allWords.filter(row=>(readingVocabStatusFilter==='all'||row.status===readingVocabStatusFilter)&&(!needle||normalized([row.target,row.sourceTitle,row.originalSentence].join(' ')).includes(needle)));
  }
  async function copyWords(rows){
    if(!rows.length){notify('还没有符合条件的阅读生词。');return;}
    const value=readingVocabularyHandoff(rows,{exportedAt:new Date().toISOString()});
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard not available');
      await navigator.clipboard.writeText(value);
      notify('已复制 '+rows.length+' 条阅读生词。打开 ChatGPT 粘贴给中央仙窍即可。');
    }catch{
      exportText.value=value;
      exportText.focus();exportText.select();
      exportText.scrollIntoView({block:'center',behavior:'smooth'});
      notify('iPhone 自动复制未成功：已选中文本，请长按选择“拷贝”。');
    }
  }
  function updateList(){
    const rows=currentRows();
    counter.textContent='阅读生词 '+allWords.length+' 条 · 当前显示 '+rows.length+' 条；只展示已保存的卡片，不自动改变历史评分。';
    list.replaceChildren();
    if(!rows.length)list.append(el('li',allWords.length?'没有匹配的生词。调整搜索或筛选。':'还没有阅读生词。返回阅读室，标记单词并点击“保存已标记生词”。','item-sub'));
    for(const row of rows.slice(0,100)){
      const item=data.items.find(record=>record.id===row.id);
      const li=el('li');
      const details=div();
      details.append(el('div',row.target,'item-title'),el('div',(row.status==='UNTESTED'?'未测试':row.status)+' · '+(row.sourceTitle||'未记录阅读来源'),'item-sub'));
      if(row.originalSentence)details.append(p(row.originalSentence,'tiny'));
      if(item)li.append(details,btn('详情',()=>showCardDialog(item),'btn ghost'));else li.append(details);
      list.append(li);
    }
    if(rows.length>100)list.append(el('li','这里只显示前100条，可搜索定位；复制和下载仍包含当前筛选的全部 '+rows.length+' 条。','item-sub'));
    exportText.value=readingVocabularyHandoff(rows,{exportedAt:new Date().toISOString()});
    copyVisible.disabled=!rows.length;copyAll.disabled=!allWords.length;exportVisible.disabled=!rows.length;
  }
  query.addEventListener('input',()=>{readingVocabSearchTerm=query.value;updateList();});
  filter.addEventListener('change',()=>{readingVocabStatusFilter=filter.value;updateList();});
  panel.append(h('h2','生词清单'),counter,controls,list);
  const handoff=section('panel soft');
  handoff.append(h('h2','复制给中央仙窍'),p('包含生词、原句与状态（复制不等于外部同步）。','subtle'),lines(copyVisible,copyAll,exportVisible),field('可手动复制的原文',exportText));
  app.append(panel,handoff);
  updateList();
}

/** Speech practice uses the existing private Kokoro blob cache, never an invented stream. */
function currentSpeech(){const j=journeyStage()==='speech'?data.dailyJourney:null;const pool=j?journeySpeeches():(data.speeches||[]);return pool.find(s=>s.id===selectedSpeechId)||pool.find(s=>!j||!(j.speechDoneIds||[]).includes(s.id))||pool[0]||null;}
function speechProgressKey(speech){const j=journeyStage()==='speech'?data.dailyJourney:null;return `${j?.id||'standalone'}:${speech.id}`;}
function accrueJourneySpeech(){
 const j=data.dailyJourney;if(!j||journeyStage()!=='speech'||!j.speechRunning)return;
 const now=Date.now();
 if(!document.hidden&&page==='speech'){const from=j.speechLastTick||now;j.speechMs=Math.max(0,Number(j.speechMs||0))+Math.max(0,Math.min(1800,now-from));j.speechActiveByDay=addActiveInterval(j.speechActiveByDay,from,now);}
 j.speechLastTick=now;
}
function pauseJourneySpeech(){
 const j=data.dailyJourney;
 if(j&&j.speechRunning){accrueJourneySpeech();j.speechRunning=false;j.speechLastTick=null;save();}
 if(page==='speech'&&activeAudio&&!activeAudio.paused)activeAudio.pause();
}
function completeSpeech(speech,skipped=false){
 pauseJourneySpeech();stopActiveAudio();
 const key=speechProgressKey(speech),flags=data.speechProgress?.[key]||{};
 const status=skipped?'skipped':flags.shadowed||flags.delivered?'completed':'partial';
 const record={id:`speech-attempt:${Date.now()}:${speech.id}`,speechId:speech.id,sourceId:speech.sourceId,
  packId:speech.packId,title:speech.title,at:new Date().toISOString(),status,
  shadowed:Boolean(flags.shadowed),delivered:Boolean(flags.delivered),source:'USER_SELF_REPORT',pronunciationScore:null};
 const j=journeyStage()==='speech'?data.dailyJourney:null;
 if(j){
  j.speechAttempts=[...(j.speechAttempts||[]),record];
  j.speechDoneIds=[...new Set([...(j.speechDoneIds||[]),speech.id])];
  const next=journeySpeeches().find(x=>!j.speechDoneIds.includes(x.id));
  if(next){selectedSpeechId=next.id;if(save())render();return;}
  const outcomes=j.speechAttempts.filter(x=>j.speechDoneIds.includes(x.speechId));
  const allDone=outcomes.length&&outcomes.every(x=>x.status==='completed');
  const allSkipped=outcomes.length&&outcomes.every(x=>x.status==='skipped');
  j.completed.push({stage:'speech',status:allDone?'completed':allSkipped?'skipped':'partial',count:j.speechDoneIds.length});
  j.index++;if(save())beginJourneyStage();return;
 }
 data.speechAttempts=[...(data.speechAttempts||[]),record];
 if(save()){notify(skipped?'已记为跳过，未计入演讲能力。':'已保存本人自报的演讲练习，未进行发音自动评分。');render();}
}
function renderSpeechChamber(){
 stopActiveAudio();
 app.append(el('div','言道演讲 · SPEECH CHAMBER','eyebrow'),h('h1','英语演讲与影子跟读'),
   p('听读 → 影子跟读 → 隐藏文本脱稿。','lead'));
 const speech=currentSpeech();
 if(!speech){const empty=section();empty.append(h('h2','尚无演讲稿'),p('先从知识宝库导入含 speeches 的每日学习 ZIP；原有 R02 包无需替换。','subtle'),btn('打开学习包导入',()=>setPage('library'),'btn primary'));app.append(empty);return;}
 selectedSpeechId=speech.id;
 const j=journeyStage()==='speech'?data.dailyJourney:null;
 if(j){const card=section('daily-journey-card');card.append(h('h2','今日 Journey · 演讲阶段'),p(`已练习 ${(j.speechDoneIds||[]).length} / ${journeySpeeches().length} 篇 · 有证据的音频播放时长 ${fmtTime(j.speechMs||0)} · 不自动标记背会`,'subtle'));app.append(card);}
 const pool=j?journeySpeeches():(data.speeches||[]);
 const box=section('reading-page speech-chamber');
 if(pool.length>1){const select=el('select','','select');for(const item of pool){const opt=el('option',item.title);opt.value=item.id;select.append(opt);}select.value=speech.id;
 select.addEventListener('change',()=>{pauseJourneySpeech();selectedSpeechId=select.value;render();});box.append(field('选择演讲',select));}
 box.append(h('h2',speech.title),p(`来源：${speech.authorOrSpeaker||speech.sourceType||'用户稿件'} · ${speech.sourceId}`,'tiny'));
 const text=div('speech-script');text.textContent=speech.scriptEn;text.style.whiteSpace='pre-wrap';text.style.lineHeight='1.85';text.style.fontSize='1.05rem';
 const toggle=btn('隐藏演讲稿，尝试脱稿',()=>{text.hidden=!text.hidden;toggle.textContent=text.hidden?'显示演讲稿':'隐藏演讲稿，尝试脱稿';},'btn secondary');
 const playerPanel=section('audio-study-controls');playerPanel.append(el('div','真实整篇音频 · af_heart','eyebrow'));
 const status=p('正在检查本机的整篇音频……','tiny');
 const audio=el('audio');audio.preload='metadata';audio.controls=true;audio.setAttribute('aria-label','英语演讲完整音频');
 activeAudio=audio;
 const back=btn('后退 5 秒',()=>{const at=clampSpeechSeek(audio.currentTime,-5,audio.duration);if(at!==null)audio.currentTime=at;},'btn secondary',true);
 const play=btn('播放',()=>{if(audio.paused)audio.play().catch(()=>{status.textContent='请先点击音频播放器的播放键。';});else audio.pause();},'btn primary',true);
 const forward=btn('前进 5 秒',()=>{const at=clampSpeechSeek(audio.currentTime,5,audio.duration);if(at!==null)audio.currentTime=at;},'btn secondary',true);
 const seek=el('input','','input');seek.type='range';seek.min='0';seek.max='1';seek.step='.1';seek.value='0';seek.disabled=true;seek.setAttribute('aria-label','演讲音频进度');
 const time=p('0:00 / --:--','tiny');
 const rate=el('select','','select');for(const speed of [.75,1,1.25]){const option=el('option',speed+'×');option.value=String(speed);rate.append(option);}rate.value='1';rate.setAttribute('aria-label','演讲音频播放速度');rate.addEventListener('change',()=>{audio.playbackRate=Number(rate.value);});
 let a=null,b=null,loop=false;
 const btnA=btn('设 A',()=>{if(Number.isFinite(audio.duration)){a=audio.currentTime;loop=false;status.textContent='已设置循环起点 A';}},'btn ghost');
 const btnB=btn('设 B',()=>{if(isValidAudioLoop(a,audio.currentTime,audio.duration)){b=audio.currentTime;status.textContent='已设置循环终点 B';}else status.textContent='需要先设置A，再设置更晚的B。';},'btn ghost');
 const btnLoop=btn('A–B 循环',()=>{loop=!loop;if(!isValidAudioLoop(a,b,audio.duration)){loop=false;status.textContent='请先设置有效A/B。';return;}btnLoop.textContent=loop?'停止 A–B 循环':'A–B 循环';if(loop){audio.currentTime=a;audio.play().catch(()=>status.textContent='请点击播放键启动循环。');}},'btn ghost');
 const sync=()=>{const duration=audio.duration,ok=Number.isFinite(duration)&&duration>0;
  back.disabled=!ok;forward.disabled=!ok;seek.disabled=!ok;seek.max=String(ok?duration:1);seek.value=String(Math.min(ok?duration:0,audio.currentTime||0));
  time.textContent=`${audioTime(audio.currentTime)} / ${audioTime(duration)}`;play.textContent=audio.paused?'播放':'暂停';};
 audio.addEventListener('loadedmetadata',sync);
 audio.addEventListener('timeupdate',()=>{if(activeAudio!==audio)return;sync();accrueJourneySpeech();if(j?.speechRunning&&Date.now()-(window.__speechLastSaveAt||0)>15000){window.__speechLastSaveAt=Date.now();save();}
  if(loop&&isValidAudioLoop(a,b,audio.duration)&&audio.currentTime>=b-.02)audio.currentTime=a;});
 audio.addEventListener('play',()=>{if(j){j.speechRunning=true;j.speechLastTick=Date.now();}sync();});
 audio.addEventListener('pause',()=>{pauseJourneySpeech();sync();});
 audio.addEventListener('ended',()=>{pauseJourneySpeech();sync();status.textContent='播放结束。听完并不等于已完成跟读或背诵。';});
 audio.addEventListener('error',()=>{pauseJourneySpeech();status.textContent='音频解码或加载失败；请检查原 ZIP 与 MP3 完整性。';});
 seek.addEventListener('input',()=>{const at=clampSpeechSeek(Number(seek.value),0,audio.duration);if(at!==null)audio.currentTime=at;});
 playerPanel.append(audio,seek,time,lines(back,play,forward),lines(rate,btnA,btnB,btnLoop),status);
 box.append(playerPanel,lines(toggle),text);
 const progressKey=speechProgressKey(speech);
 const flags=data.speechProgress?.[progressKey]||{};
 const shadow=btn(flags.shadowed?'已自报跟读':'我已尝试影子跟读',()=>{data.speechProgress??={};data.speechProgress[progressKey]={...data.speechProgress[progressKey],shadowed:true};if(save())shadow.textContent='已自报跟读';},'btn secondary');
 const deliver=btn(flags.delivered?'已自报脱稿':'我已尝试脱稿演讲',()=>{data.speechProgress??={};data.speechProgress[progressKey]={...data.speechProgress[progressKey],delivered:true};if(save())deliver.textContent='已自报脱稿';},'btn secondary');
 const transfer=renderSpeechTransfer(speech);if(transfer)box.append(transfer);
 box.append(h('h3','练习反馈（由你确认）'),p('打勾是个人自报，不代表客观发音评分或独立测试结果。','tiny'),lines(shadow,deliver));
 box.append(lines(btn('完成本篇／继续',()=>completeSpeech(speech),'btn primary'),btn('跳过本篇',()=>completeSpeech(speech,true),'btn ghost')));
 app.append(box);
 // Only a verified cached speech Blob enables the seekable player; no fake audio.
 void (async()=>{try{
  const hash=await speechTextHash(speech.scriptEn);
  if(speech.scriptSha256&&speech.scriptSha256!==hash)throw Error('演讲稿 SHA-256 与规范化后的原稿不匹配');
  const blob=await getSpeechClip(speech.scriptEn,speech.audioVoice||'af_heart');
  if(!blob){status.textContent='本机没有该演讲的完整 MP3；请在下份私人 ZIP 中加入 speeches 音频。';return;}
  if(activeAudio!==audio||!audio.isConnected)return;
  speechObjectUrl=URL.createObjectURL(blob);audio.src=speechObjectUrl;audio.load();play.disabled=false;
  status.textContent='真实整篇音频已就绪；手动点击播放以兼容 iPhone Safari。';
 }catch(error){if(activeAudio===audio)status.textContent='演讲音频不可用：'+error.message;}})();
}
function renderSpeechTransfer(speech){
 const task=(data.dailyPack?.transferTasks||[]).find(row=>(row.taskRole==='speech_transfer'||row.task_role==='speech_transfer'||(row.tags||[]).some(tag=>String(tag).toLowerCase()==='speech_transfer'))&&(!row.sourceItemIds?.length||row.sourceItemIds.includes(speech.id)||row.source_item_ids?.includes(speech.id)));if(!task)return null;
 const prior=(data.speechTransferAttempts||[]).find(row=>row.taskId===task.id&&row.packId===data.dailyPack?.packId);const box=section('speech-transfer-panel');box.append(h('h3','演讲迁移 · SPEECH TRANSFER'),p('用自己的语言回答新情境问题；不要求背诵原文，也不自动评分。','subtle'),h('h4',task.prompt));const input=textarea(prior?.firstAnswer||'','Your independent answer in English…');input.classList.add('answer-input');
 const submit=()=>{if(!input.value.trim()){notify('请先提交文字回答，或使用录音保存一段独立回答。');return;}const row={id:prior?.id||`speech-transfer:${task.id}:${Date.now()}`,taskId:task.id,packId:data.dailyPack.packId,speechId:speech.id,firstAnswer:input.value.trim(),firstSubmittedAt:prior?.firstSubmittedAt||new Date().toISOString(),promptUsed:Boolean(data.speechTransferHints?.[task.id]),referenceViewed:false,evidenceType:'INDEPENDENT',recordingIds:prior?.recordingIds||[],status:'UNASSESSED'};data.speechTransferAttempts=[...(data.speechTransferAttempts||[]).filter(x=>x.id!==row.id),row];if(save())render();};
 box.append(field('Independent first response',input),btn('显示提示',()=>{data.speechTransferHints??={};data.speechTransferHints[task.id]=true;save();render();},'btn ghost'),btn('提交独立回答',submit,'btn primary'));if(data.speechTransferHints?.[task.id]&&task.hints?.length)box.append(p(`提示：${task.hints[0]}`,'hint'));
 if(!prior)box.append(renderRecordingControls({weaknessId:`speech-transfer:${task.id}`,taskId:task.id,attemptId:`speech-transfer:${task.id}`,role:'original',onSaved:row=>{const current=(data.speechTransferAttempts||[]).find(x=>x.taskId===task.id)||{id:`speech-transfer:${task.id}`,taskId:task.id,packId:data.dailyPack.packId,speechId:speech.id,firstAnswer:'',firstSubmittedAt:new Date().toISOString(),evidenceType:'INDEPENDENT',status:'UNASSESSED'};current.recordingIds=[...new Set([...(current.recordingIds||[]),row.id])];data.speechTransferAttempts=[...(data.speechTransferAttempts||[]).filter(x=>x.id!==current.id),current];save();}}));
 if(prior){box.append(p(`初答状态：${prior.evidenceType||'UNASSESSED'}${prior.recordingIds?.length?' · 已保存录音':''}`,'hint'),btn(prior.referenceViewed?'已显示参考表达':'显示参考表达',()=>{prior.referenceViewed=true;prior.evidenceType='PROMPTED';if(save())render();},'btn ghost'));if(prior.referenceViewed){box.append(p(`参考表达：${task.referenceAnswer||'未提供'}`,'small-block'));const retry=textarea(prior.retryAnswer||'','Answer again without looking at the reference…');box.append(field('Optional no-prompt retry',retry),btn('保存再次独立回答',()=>{prior.retryAnswer=retry.value;prior.retrySubmittedAt=new Date().toISOString();prior.evidenceType='REVISED';if(save())render();},'btn secondary'));}}
 return box;
}
function renderReadingRetelling(reading){
 const prior=(data.readingRetellingAttempts||[]).filter(x=>x.readingId===reading.id),last=prior.at(-1)||null;const box=section('reading-retelling-panel');box.append(el('div','英文复述 · INDEPENDENT RETELLING','question-label'),h('h3','用自己的话复述这篇文章'),p('用英文概括主旨与要点，支持文字或录音。','subtle'));
 const draft=el('textarea','','textarea');draft.placeholder='Describe the main idea, two key details, and one application in English…';draft.rows=5;draft.value=last?.firstAnswer||'';draft.classList.add('answer-input');
 const latestRetelling=()=>(data.readingRetellingAttempts||[]).filter(x=>x.readingId===reading.id).at(-1)||null;
 const submit=()=>{
   const at=composeReadingRetellingSubmission({reading,packId:data.dailyPack?.packId||null,current:latestRetelling(),answer:draft.value});
   if(!at){notify('请先输入复述，或开始并保存一段录音。');return;}
   data.readingRetellingAttempts=[...(data.readingRetellingAttempts||[]).filter(x=>x.id!==at.id),at];
   if(save())render();
 };
 box.append(field('Independent first response',draft),lines(renderDictationAssistButton(draft),btn('提交独立复述',submit,'btn primary'),btn(retellingRefVisible[reading.id]?'▲ 收起原文/提示':'显示原文/提示',()=>{
   const willOpen=!retellingRefVisible[reading.id];
   retellingRefVisible[reading.id]=willOpen;
   if(willOpen){
     const row=latestRetelling()||{id:`retelling:${reading.id}:${Date.now()}`,readingId:reading.id,packId:data.dailyPack?.packId||null,firstAnswer:draft.value,firstSubmittedAt:new Date().toISOString(),recordingIds:[]};
     row.referenceViewed=true;row.promptUsed=true;
     data.readingRetellingAttempts=[...(data.readingRetellingAttempts||[]).filter(x=>x.id!==row.id),row];
     save();
   }
   render();
 },'btn ghost')));
 const attempt=last||{id:`retelling:${reading.id}:draft`,readingId:reading.id,packId:data.dailyPack?.packId||null,recordingIds:[]};box.append(renderRecordingControls({weaknessId:`reading-retelling:${reading.id}`,taskId:reading.id,attemptId:attempt.id,role:'original',onSaved:row=>{const current=(data.readingRetellingAttempts||[]).find(x=>x.id===attempt.id)||attempt;current.recordingIds=[...new Set([...(current.recordingIds||[]),row.id])];data.readingRetellingAttempts=[...(data.readingRetellingAttempts||[]).filter(x=>x.id!==current.id),current];save();}}));
 if(last?.firstAnswer){box.append(renderDiscourseDiagnosticCard(last.firstAnswer,{referenceText:reading.text}));}
 if(last?.firstAnswer){box.append(renderAiReplyWidget('🤖 AI 导师纯英文点评复述',()=>askAiCritiqueOutput({prompt:`Retell the article: ${reading.title}`,userAnswer:last.firstAnswer,referenceAnswer:reading.text.slice(0,800)})));}
 if(last?.referenceViewed && retellingRefVisible[reading.id]){
   const refWrap=section('retelling-ref-box');
   refWrap.append(
     div('journey-flow-top'),
     p(`Original passage: ${reading.text}`,'hint')
   );
   refWrap.firstChild.append(el('span','参考原文 · ORIGINAL PASSAGE','eyebrow'),btn('▲ 收起原文',()=>{retellingRefVisible[reading.id]=false;render();},'btn ghost small-btn'));
   box.append(refWrap);
 }
 if(last?.referenceViewed){
   const retry=textarea(last.retryAnswer||'','After checking the reference, write a fresh retelling without looking at it…');
   const saveRetryBtn=btn(last.retryAnswer?'✓ 更新并保存复述重答':'保存复述重答',()=>{
     const val=String(retry.value||'').trim();
     if(!val){notify('请先输入你的英文复述重答内容。');return;}
     const cur=latestRetelling()||last;
     cur.retryAnswer=val;
     cur.retrySubmittedAt=new Date().toISOString();
     data.readingRetellingAttempts=[...(data.readingRetellingAttempts||[]).filter(x=>x.id!==cur.id),cur];
     if(save()){notify('✓ 复述重答已保存！');render();}
   },'btn primary');
   box.append(field('Optional no-prompt retry（无提示重答）',retry),lines(saveRetryBtn,last.retrySubmittedAt?el('span','✓ 已保存重答','chip tiny'):el('span','')));
 }
 return box;
}
function renderReading(){app.append(el('div','英语阅读 · READING','eyebrow'),h('h1','阅读英语材料'),p('双击或长按英文词即可标词或 AI 查词。','lead'),lines(btn('打开阅读生词本',()=>setPage('readingVocabulary'),'btn secondary')));
const readingJourney=journeyStage()==='reading'?data.dailyJourney:null;
if(readingJourney){app.append(renderJourneyFlowRibbon('reading'));const remaining=journeyReadings().filter(a=>!readingJourney.readingDoneIds.includes(a.id));if(remaining.length)selectedReadingId=remaining[0].id;const box=section('daily-journey-card');box.append(el('div','今日综合学习 · 第三模块','eyebrow'),h('h2','英文阅读'),p('正向计时，不强制结束；读完点击确认即可。','subtle'));const timer=el('div',fmtTime(journeyElapsedMs()),'timer');timer.id='journey-reading-timer';box.append(timer,p(`今日正向累计 · 阅读阶段 ${fmtTime(readingJourney.readingMs)} · 参考 ${readingJourney.targetMinutes} 分钟，不强制结束`,'tiny'));const recallActive=Boolean(readingJourney.readingRecallQueue?.length);box.append(lines(btn(readingJourney.readingRunning?'暂停阅读计时':'继续阅读计时',()=>{if(readingJourney.readingRunning){pauseJourneyReading();render();}else resumeJourneyReading();},'btn secondary'),btn(recallActive?'完成即时回忆后继续':remaining.length>1?'完成本篇，阅读下一篇':'完成阅读，进入下一模块',completeJourneyReading,'btn primary',!readingJourney.readingRunning||recallActive)));app.append(box);}
if(!data.readings?.length){const empty=section();empty.append(h('h2','还没有阅读材料'),p('从资料库导入 TXT 或 Markdown 后，文章会出现在这里。','subtle'),lines(btn('打开资料库',()=>setPage('library'),'btn primary')));app.append(empty);return;}const list=section('reading-page');const select=el('select','','select');for(const reading of data.readings){const option=el('option',reading.title);option.value=reading.id;select.append(option);}select.value=selectedReadingId||data.readings[0].id;selectedReadingId=select.value;select.addEventListener('change',()=>{stopSpeech();selectedReadingId=select.value;selectedText='';selectedParagraphText='';selectedParagraphIndex=0;render();});if(!readingJourney)list.append(field('选择文章',select));const reading=data.readings.find(x=>x.id===selectedReadingId)||data.readings[0];const paragraphs=readingParagraphs(reading.text);const rfSize=data.settings?.readingFontSize||'md';const article=div(`reading-article font-${rfSize}${readingBlurMode?' is-blind-blur':''}`);const scrollRibbon=div('reading-scroll-bar');const scrollFill=div('reading-scroll-fill');scrollRibbon.append(scrollFill);list.append(scrollRibbon);const syncReadScroll=()=>{if(!article.isConnected)return;const rect=article.getBoundingClientRect();const total=Math.max(1,article.offsetHeight-window.innerHeight*0.5);const pct=Math.max(0,Math.min(100,Math.round((-rect.top/total)*100)));scrollFill.style.width=`${pct}%`;};if(typeof window!=='undefined'){window.removeEventListener('scroll',window.__ydReadScroll);window.__ydReadScroll=syncReadScroll;window.addEventListener('scroll',syncReadScroll,{passive:true});}article.id='reading-article';const readingLabel=reading.sectionTitle?`${reading.storyTitle||reading.title} — ${reading.sectionTitle}`:reading.title;const rMetrics=analyzeReadingPassageMetrics(reading.text,readingJourney?.readingMs||0,[...(data.dailyPack?.vocabularyPractice||[]).map(t=>t.target),...todayPackItems().filter(i=>i.kind==='word').map(i=>i.target)]);article.append(h('h2',readingLabel),p(`来源：${reading.source||'本机导入'}${reading.sectionId?` · Section ${reading.sectionId}`:''} · 全文 ${rMetrics.wordCount} 词（预计 ${rMetrics.estimatedMinutesAt160Wpm} 分钟）${rMetrics.observedWpm?` · 实测配速 ~${rMetrics.observedWpm} WPM`:``}${rMetrics.matchedPackCount?` · 含今日核心词 ${rMetrics.matchedPackCount} 处（${rMetrics.matchedPackWords.slice(0,5).join(", ")}）`:``}`,'tiny'));const marks=(data.readingMarks||[]).filter(mark=>mark.readingId===reading.id);paragraphs.forEach((para,index)=>{const node=renderMarkedParagraph(para,marks.filter(mark=>Number(mark.paragraphIndex)===index));node.dataset.paragraphIndex=String(index);article.append(node);});article.addEventListener('dblclick',()=>setTimeout(()=>{const selection=window.getSelection?.();if(selection?.toString().trim())toggleReadingMark(reading,paragraphs);},0));const pending=marks.filter(mark=>mark.savedStatus!=='SAVED').length;const toolbar=div('reading-toolbar');
const primaryDock=div('reading-dock-primary');
const markBtn=btn(pending?`🔖 标词(${pending})`:'🔖 标词',()=>toggleReadingMark(reading,paragraphs),'btn secondary small-btn');
const aiBtn=makeAiLookupTriggerButton('btn secondary small-btn');aiBtn.textContent='🔍 AI查词';
primaryDock.append(speechControls(reading.text,splitSpeechSegments(reading.text),{useGemini:true,iconOnly:true}),aiBtn,markBtn);
const moreTools=el('details','','reading-more-tools');
moreTools.append(el('summary',pending?`更多工具 · 待存 ${pending} 词`:'更多阅读工具（盲听 / 拆解长难句 / 存卡片）'));
const moreGrid=div('reading-more-grid');
moreGrid.append(
  btn(readingBlurMode?'👁️ 恢复正文':'🙈 盲听模糊',()=>{readingBlurMode=!readingBlurMode;render();},'btn secondary small-btn'),
  btn(`🔤 字号：${rfSize==='sm'?'紧凑':rfSize==='lg'?'大字':'标准'}`,()=>{const order=['sm','md','lg'];data.settings.readingFontSize=order[(order.indexOf(rfSize)+1)%order.length];if(save())render();},'btn secondary small-btn'),
  btn(`💾 保存生词(${pending})`,()=>saveMarkedReadingWords(reading),'btn primary small-btn',pending===0),
  btn('🗂 存为卡片',()=>saveSelectedReadingText(reading,paragraphs),'btn secondary small-btn'),
  renderAiReplyWidget('🤖 AI 拆解长难句',()=>askAiExplainSentence({sentence:window.getSelection?.()?.toString().trim()||selectedText||reading.text.slice(0,260),context:selectedParagraphText||reading.text.slice(0,500)}))
);
moreTools.append(moreGrid);
if(geminiAudioEl||readingAudioStatus)toolbar.append(buildAudioScrubberBar('reading',geminiAudioEl,readingAudioStatus));toolbar.append(primaryDock,moreTools);list.append(article,toolbar);if(readingJourney&&readingJourney.readingRecallQueue?.length)list.append(renderReadingRecall(readingJourney,reading));const check=renderReadingCheck(reading);if(check)list.append(check);list.append(renderReadingRetelling(reading));app.append(list);}
function trendSummary(days){const endDay=dateKeyInTimeZone(new Date());const startDay=dateKeyInTimeZone(new Date(Date.now()-(Math.max(1,days)-1)*86400000));const sessions=data.sessions.filter(x=>{const day=dateKeyInTimeZone(x.endedAt);return day&&day>=startDay&&day<=endDay;});const time=summarizeSessionTime(data.sessions,startDay,endDay);return {minutes:Math.round(time.knownMs/60000),unallocatedMs:time.unknownMs,sessions:sessions.length,attempts:sessions.reduce((sum,x)=>sum+Number(x.count||0),0)};}
/** Non-destructive local audit: IndexedDB recording metadata and StorageManager are read only. */
function dataSafetyPanel(){
  const box=section('settings-card');
  const last=data.settings?.lastBackupExportAttemptAt;
  const backupAttempt=last&&!Number.isNaN(new Date(last).getTime())?new Date(last).toLocaleString('zh-CN'):'暂无记录';
  const count=p('录音检查中……','subtle');
  const list=div('recording-list');
  const disk=p('设备存储状态尚未检查。','tiny');
  box.append(h('h2','本机数据安全检查'),p('本机记录：'+data.items.length+' 张卡片 · '+(data.reports?.length||0)+' 份战报 · 最近一次主动发起JSON备份：'+backupAttempt,'subtle'),p('JSON备份只包含结构化学习数据，不包含 IndexedDB 录音文件。','tiny'),count,list);
  listRecordings().then(rows=>{
    const sorted=rows.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    count.textContent='本机找到 '+sorted.length+' 条录音。请将需要长期保留的录音单独导出到“文件”或私有Drive。';
    if(!sorted.length){list.append(p('暂无可导出的本地录音。','tiny'));return;}
    const entries=div();
    const renderEntries=(all=false)=>{
      entries.replaceChildren();
      for(const row of (all?sorted:sorted.slice(0,8))){
        const line=div('recording-row');
        const date=Number.isNaN(new Date(row.createdAt).getTime())?'时间未记录':new Date(row.createdAt).toLocaleString('zh-CN');
        line.append(el('span',(row.role==='retry'?'重答':'初答')+' · '+date+' · '+(row.taskId||'未记录题目ID'),'tiny'),btn('导出录音',()=>exportLocalRecording(row.id),'btn secondary'));
        entries.append(line);
      }
    };
    renderEntries();list.append(entries);
    if(sorted.length>8)list.append(btn('查看全部 '+sorted.length+' 条录音',()=>renderEntries(true),'btn ghost'));
  }).catch(error=>{count.textContent='录音数据库暂不可读取：'+String(error?.message||'未知原因')+'。并不代表录音数量是零。';});
  const check=btn('检查Safari本地存储状态',async()=>{
    if(!navigator.storage?.estimate){disk.textContent='当前浏览器未开放StorageManager信息；不能确认持久存储状态。';return;}
    try{
      const estimate=await navigator.storage.estimate();
      const persisted=typeof navigator.storage.persisted==='function'?await navigator.storage.persisted():null;
      const used=Number.isFinite(estimate.usage)?(estimate.usage/1024/1024).toFixed(1)+' MB':'未知';
      disk.textContent='网站估算占用：'+used+'；持久存储：'+(persisted===true?'已获浏览器确认':persisted===false?'未确认（可能被清理）':'浏览器不提供结果')+'。无论结果如何，都要自行保存备份。';
    }catch(error){disk.textContent='存储检查失败：'+String(error?.message||'浏览器拒绝访问')+'。学习记录不会因此删除。';}
  },'btn secondary');
  box.append(lines(check,btn('导出本机JSON备份',exportBackup,'btn primary'),btn('🧹 清理旧学习包音频缓存',pruneHistoricalSpeechCache,'btn ghost')),disk);
  return box;
}
function buildSettingsPanel(){const dataBox=section('settings-card');dataBox.append(h('h2','学习参数与备份'),p('数据仅存本机，建议定期导出备份。','subtle'),lines(btn('导出 JSON 备份',exportBackup,'btn primary'),btn('导出练习 CSV',exportHistory,'btn')));dataBox.append(field('恢复 JSON 备份（先预览，再合并）',inputFile('.json,application/json',importBackup)));const duration=el('input','','input');duration.type='number';duration.min='1';duration.max='180';duration.value=data.settings.duration||40;duration.addEventListener('change',()=>{data.settings.duration=Math.max(1,Math.min(180,Number(duration.value)||40));save();});dataBox.append(field('参考目标分钟（正向计时，不强制结束）',duration));
const presets=lines(...[30,40,60].map(minutes=>btn(`${minutes} 分钟`,()=>{data.settings.duration=minutes;if(save()){duration.value=String(minutes);notify(`参考目标调整为 ${minutes} 分钟，计时仍可继续。`);}},'btn ghost')));dataBox.append(presets);const speed=el('select','','select');for(const [rate,label] of [[.75,'较慢（0.75×）'],[.9,'温和（0.9×）'],[1,'正常（1.0×）'],[1.1,'稍快（1.10×）'],[1.25,'较快（1.25×）']]){const opt=el('option',label);opt.value=String(rate);speed.append(opt);}speed.value=String(data.settings.speechRate||.9);speed.addEventListener('change',()=>{data.settings.speechRate=Number(speed.value);save();});dataBox.append(field('英语朗读速度',speed));const theme=el('select','','select');for(const [value,label] of [['system','跟随系统'],['day','日间修炼'],['night','夜间修炼']]){const opt=el('option',label);opt.value=value;theme.append(opt);}theme.value=data.settings.theme||'system';theme.addEventListener('change',()=>setTheme(theme.value));dataBox.append(field('外观主题',theme));const hints=el('input');hints.type='checkbox';hints.checked=data.settings.chineseHints!==false;hints.addEventListener('change',()=>{data.settings.chineseHints=hints.checked;if(save())render();});const hintLabel=el('label');hintLabel.className='setup-options';hintLabel.append(hints,el('span','允许查看中文提示（每张新卡默认隐藏）'));dataBox.append(hintLabel);const retry=el('input');retry.type='checkbox';retry.checked=data.settings.retryAfterError!==false;retry.addEventListener('change',()=>{data.settings.retryAfterError=retry.checked;if(save())render();});const retryLabel=el('label');retryLabel.className='setup-options';retryLabel.append(retry,el('span','答错后立即重练'));dataBox.append(retryLabel);const newLimit=el('input','','input');newLimit.type='number';newLimit.min='1';newLimit.max='100';newLimit.value=data.settings.newLimit||10;newLimit.addEventListener('change',()=>{data.settings.newLimit=Math.max(1,Math.min(100,Number(newLimit.value)||10));save();});dataBox.append(field('每日新卡上限',newLimit));const reviewLimit=el('input','','input');reviewLimit.type='number';reviewLimit.min='1';reviewLimit.max='200';reviewLimit.value=data.settings.reviewLimit||20;reviewLimit.addEventListener('change',()=>{data.settings.reviewLimit=Math.max(1,Math.min(200,Number(reviewLimit.value)||20));save();});dataBox.append(field('每日复习上限',reviewLimit));return dataBox;}
function voiceSettingsPanel(){
  const cfg=loadAiConfig(); const box=section('voice-settings');
  box.append(el('div','云端语音 · CLOUD TTS (18.0)','eyebrow'),h('h2','语音朗读与缓存'),p('支持 Gemini 与硅基流动语音；合成后永久缓存在本机，复听 0 消耗。','subtle'));

  const engineSelect=el('select','','select');engineSelect.id='tts-engine-select';
  [['gemini','Google Gemini 语音（默认 · 429 双模型接力）'],['siliconflow','硅基流动 CosyVoice2（国内直连 · 免 VPN）']].forEach(([val,lab])=>{const opt=el('option',lab);opt.value=val;engineSelect.append(opt);});
  engineSelect.value=cfg.ttsEngine||'gemini';

  const voiceSelect=el('select','','select');voiceSelect.id='gemini-voice-select';
  GEMINI_TTS_VOICES.forEach(v=>{const opt=el('option',v.label);opt.value=v.id;voiceSelect.append(opt);});
  voiceSelect.value=cfg.ttsVoice||'Kore';
  const ttsModelInput=textInput(cfg.ttsModel||GEMINI_TTS_DEFAULT_MODEL,'gemini-3.8-flash-lite-tts');
  ttsModelInput.id='gemini-tts-model-input';

  const sfKeyInput=textInput(cfg.siliconflowApiKey||'','sk-...（前往 cloud.siliconflow.cn 获取）');
  sfKeyInput.type='password';sfKeyInput.id='siliconflow-key-input';
  const sfVoiceSelect=el('select','','select');sfVoiceSelect.id='siliconflow-voice-select';
  SILICONFLOW_TTS_VOICES.forEach(v=>{const opt=el('option',v.label);opt.value=v.id;sfVoiceSelect.append(opt);});
  sfVoiceSelect.value=cfg.siliconflowVoice||SILICONFLOW_TTS_DEFAULT_VOICE;

  const usage=getDailyTtsUsage();
  const quotaCard=div('tts-quota-card');
  const cacheCountText=el('span','正在统计本机永久缓存…','tiny');
  countPersistentTtsAudio().then(n=>{if(cacheCountText.isConnected)cacheCountText.textContent=`💾 本机已永久缓存 ${n} 段语音（复听 0 消耗）`;});
  quotaCard.append(
    el('strong',`📊 今日云端语音请求：${usage.count} 次（北京时间 16:00 重置）`,'tiny'),
    cacheCountText
  );

  const voiceStatus=p(isCloudTtsReady(cfg)?`当前引擎：${engineSelect.value==='siliconflow'?'硅基流动 CosyVoice2':'Google Gemini'} · 音色：${engineSelect.value==='siliconflow'?sfVoiceSelect.value:voiceSelect.value}（已就绪）`:'尚未配置云端语音 Key：当前将自动使用本地离线语音。','tiny');
  voiceStatus.id='gemini-voice-status';
  const persistTts=()=>{
    const nextEngine=engineSelect.value==='siliconflow'?'siliconflow':'gemini';
    const nextVoice=voiceSelect.value||'Kore';
    const nextModel=ttsModelInput.value.trim()||GEMINI_TTS_DEFAULT_MODEL;
    const nextSfKey=sfKeyInput.value.trim();
    const nextSfVoice=sfVoiceSelect.value||SILICONFLOW_TTS_DEFAULT_VOICE;
    if(saveAiConfig({ttsEngine:nextEngine,ttsVoice:nextVoice,ttsModel:nextModel,siliconflowApiKey:nextSfKey,siliconflowVoice:nextSfVoice})){
      voiceStatus.textContent=`已保存：${nextEngine==='siliconflow'?'硅基流动 CosyVoice2':'Google Gemini'} · 音色 ${nextEngine==='siliconflow'?nextSfVoice:nextVoice}`;
      notify('云端语音设置已保存。');
    }
  };
  voiceSelect.addEventListener('change',persistTts);[engineSelect,ttsModelInput,sfKeyInput,sfVoiceSelect].forEach(ctrl=>ctrl.addEventListener('change',persistTts));

  box.append(
    quotaCard,
    field('云端语音引擎',engineSelect),
    field('Gemini 英语音色',voiceSelect),
    field('Gemini 语音模型 ID（默认 gemini-3.8-flash-lite-tts）',ttsModelInput),
    field('硅基流动 API Key（可选，国内直连 CosyVoice2）',sfKeyInput),
    field('硅基流动 CosyVoice2 音色',sfVoiceSelect),
    voiceStatus,
    lines(
      btn('▶ 试听 Gemini 声音',()=>{persistTts();speakWithGeminiOrFallback("Hello! Let's practice English together.");},'btn secondary'),
      btn('停止朗读',stopSpeech,'btn ghost'),
      btn('🗑 清空语音缓存',async()=>{await clearPersistentTtsAudio();geminiAudioCache.clear();cacheCountText.textContent='💾 本机已永久缓存 0 段语音';notify('已清空语音缓存，不影响学习记录与录音。');},'btn ghost')
    ),
    p('断网或限流时自动切换本地离线朗读。','tiny')
  );
  return box;
}
function renderSettings(){app.append(el('div','设置 · SETTINGS','eyebrow'),h('h1','学习设置'),p('语音、主题、学习参数与本机备份。','lead'),aiTutorSettingsPanel(),voiceSettingsPanel(),buildSettingsPanel(),dataSafetyPanel());}
function renderMasteryAnalytics(){const analytics=buildMasteryAnalytics({items:data.items,attempts:data.attempts,sessions:data.sessions,transferAttempts:data.transferAttempts,now:new Date()});const box=section('mastery-evidence-panel');box.append(h('h2','真实掌握证据'),p('这些指标只来自本机真实作答、提示、重答和延迟复测；阅读、看答案和自评不会自动变成掌握。','subtle'));const grid=div('grid-3');const labels=[['UNTESTED','尚未测试'],['exposed','已接触并留下记录'],['independentCorrect','首次无提示答对'],['promptedCorrect','使用提示后答对'],['correctedAfterError','错误后完成修正'],['delayedReviewSuccess','延迟复测成功']];for(const [key,label] of labels)grid.append(statistic(label,analytics.evidence[key]||0));box.append(grid);const windows=section('panel soft');windows.append(h('h3','实际学习窗口'),p(`近 7 天：${analytics.windows.days7.activeSeconds} 秒 · ${analytics.windows.days7.tasks} 项任务 · ${analytics.windows.days7.rated} 项评级作答`,'tiny'),p(`近 30 天：${analytics.windows.days30.activeSeconds} 秒 · ${analytics.windows.days30.tasks} 项任务 · ${analytics.windows.days30.rated} 项评级作答`,'tiny'));if(analytics.errors.length)windows.append(h('h3','最常见的已记录问题'),p(analytics.errors.slice(0,5).map(row=>`${row.type} · ${row.count} 次`).join(' ｜ '),'tiny'));if(analytics.unmeasured.length)windows.append(p(`尚未获得可解释评级的卡片：${analytics.unmeasured.length} 张。`,'hint'));
  const shadow=replayFsrsShadowHistory(data.attempts||[],new Date());
  const shadowBox=section('panel soft fsrs-shadow-panel');
  shadowBox.append(
    el('div','FSRS 6.3.2 影子调度 · SHADOW SCHEDULER','eyebrow'),
    h('h3','独立回忆稳定度追踪（识别题不计入）'),
    p(`合格独立回忆事件：${shadow.qualifiedIndependentEvents} 次 · 已建档卡片：${shadow.trackedCards} 张 · 平均记忆半衰稳定度：${shadow.avgStabilityDays||0} 天 · 遗忘高风险/到期：${shadow.highRiskCount||0} 张（已排除触控选择/提示/看答案 ${shadow.excludedNonIndependentOrUnrated} 次）`,'tiny')
  );
  box.append(windows,shadowBox);return box;}
function renderProgress(){
  const s=stats();
  app.append(el('div','进度 · PROGRESS','eyebrow'),h('h1','学习进度'));
  const row=div('grid-3');
  const activeMinutes=Math.round((data.sessions||[]).reduce((sum,x)=>sum+Number(x.activeMs||0),0)/60000);
  row.append(statistic('已训练卡片',s.reviewed),statistic('实际分钟',activeMinutes),statistic('训练次数',data.sessions.length));
  app.append(row);

  const t7=trendSummary(7),t30=trendSummary(30);
  const trends=section('panel soft compact-trend-card');
  trends.append(
    el('div','真实趋势 · TRENDS','eyebrow'),
    p(`近 7 天：${t7.minutes} 分钟 · ${t7.sessions} 次训练 · ${t7.attempts} 次作答`,'subtle'),
    p(`近 30 天：${t30.minutes} 分钟 · ${t30.sessions} 次训练 · ${t30.attempts} 次作答`,'tiny')
  );
  app.append(renderRealmAndGritPanel(),trends);

  const kvnPanel=section('panel kvn-summary-card');
  kvnPanel.append(el('div','词句掌握 · K / V / N','eyebrow'));
  for(const [kind,label] of [['word','炼词'],['sentence','炼句']]){
    const group=data.items.filter(x=>x.kind===kind);
    const k=group.filter(x=>x.status==='K').length,v=group.filter(x=>x.status==='V').length,n=group.filter(x=>x.status==='N').length,untested=group.filter(x=>x.status==='UNTESTED').length;
    const r=div('kvn-row');
    r.append(
      el('strong',label,'kvn-label'),
      el('span',`K ${k}`,'chip tiny k-pill'),
      el('span',`V ${v}`,'chip tiny v-pill'),
      el('span',`N ${n}`,'chip tiny n-pill'),
      el('span',`未测 ${untested}/${group.length}`,'tiny')
    );
    kvnPanel.append(r);
  }
  app.append(kvnPanel);

  const reportsBox=section('panel soft');
  reportsBox.append(
    h('h2','修炼战报'),
    p(`本机已保存 ${data.reports?.length||0} 份结构化战报。`,'tiny'),
    lines(
      btn('打开修炼战报',()=>setPage('reports'),'btn primary'),
      btn('导出 Markdown',()=>exportReportMarkdown(data.reports?.at(-1)),'btn secondary',!data.reports?.length),
      btn('导出 JSON',()=>exportReportJSON(data.reports?.at(-1)),'btn ghost',!data.reports?.length)
    )
  );
  app.append(reportsBox);

  const accHeat=el('details','','progress-accordion');
  accHeat.append(el('summary','90 天修炼热力图与 FSRS 遗忘预测'),renderCultivationHeatmapSvg(),renderFsrsForecastPanel());
  const accEvidence=el('details','','progress-accordion');
  accEvidence.append(el('summary','真实掌握证据与 FSRS 影子调度详情'),renderMasteryAnalytics());
  const accRecent=el('details','','progress-accordion');
  accRecent.append(el('summary',`最近训练记录（${data.sessions.length} 条）`));
  if(!data.sessions.length){accRecent.append(p('还没有结束的训练记录。','subtle'));}
  else{
    const list=el('ul','','list');
    data.sessions.slice(-10).reverse().forEach(x=>{
      const li=el('li');const left=div();
      left.append(el('div',new Date(x.endedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),'item-title'),el('div',`${x.count} 次作答 · ${modeLabel(x.mode)} · K${x.K} / V${x.V} / N${x.N}`,'item-sub'));
      li.append(left,el('span',fmtTime(x.activeMs),'chip'));list.append(li);
    });
    accRecent.append(list);
  }
  app.append(accHeat,accEvidence,accRecent);
}
let tickCount=0;setInterval(()=>{
  if(data.dailyJourney?.vocabularyRunning){accrueJourneyVocabulary();if(++tickCount%20===0)save();}
  if(data.dailyJourney?.transferRunning){accrueTransfer();if(++tickCount%20===0)save();}
  if(data.dailyJourney?.readingRunning){
    accrueJourneyReading();const reader=document.getElementById('journey-reading-timer');if(reader)reader.textContent=fmtTime(journeyElapsedMs());
    if(++tickCount%20===0)save();
  }
  const s=data.activeSession;if(!s||!s.running)return;accrue();const timer=document.getElementById('timer'),bar=document.getElementById('timer-bar');if(timer)timer.textContent=fmtTime(s.journeyStage?journeyElapsedMs():s.activeMs);if(bar)bar.style.width=`${Math.min(100,(s.journeyStage?journeyElapsedMs():s.activeMs)/(s.dueGoal*60000)*100)}%`;if(++tickCount%20===0)save();if(s.journeyStage){
    const j=data.dailyJourney;
    if(j&&!j.goalNotified&&journeyElapsedMs()>=j.targetMinutes*60000){j.goalNotified=true;save();notify(`正向累计已达到参考 ${j.targetMinutes} 分钟。可以继续完成剩余模块。`);}
  }else if(s.activeMs>=s.dueGoal*60000 && !s.goalNotified){s.goalNotified=true;save();notify(`已达到参考 ${s.dueGoal} 分钟，可根据任务完成情况继续学习。`);}},1000);
document.addEventListener('selectionchange',()=>{const selection=window.getSelection();const text=selection?.toString().trim();const article=document.getElementById('reading-article');const anchor=selection?.anchorNode;const paragraph=anchor?.parentElement?.closest?.('.reading-paragraph');if(text&&article&&anchor&&article.contains(anchor)&&paragraph){selectedText=text;selectedParagraphText=paragraph.textContent||'';selectedParagraphIndex=Number(paragraph.dataset.paragraphIndex||0);}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){initSpeechVoices();refreshSpeechVoiceUi();}if(document.hidden&&data.dailyJourney?.vocabularyRunning)pauseJourneyVocabulary();if(document.hidden&&data.dailyJourney?.readingRunning)pauseJourneyReading();if(document.hidden&&data.dailyJourney?.speechRunning)pauseJourneySpeech();if(document.hidden&&data.dailyJourney?.transferRunning){accrueTransfer();data.dailyJourney.transferRunning=false;data.dailyJourney.transferLastTick=null;save();notify('页面离开时已暂停综合输出计时。');}if(document.hidden&&data.paperStoryPractice?.running){accruePaperStory();data.paperStoryPractice.running=false;data.paperStoryPractice.lastTick=null;save();notify('纸上故事练习已暂停，原始回答仍已保留。');}if(document.hidden&&data.activeSession?.running){pauseSession();notify('页面离开时已自动暂停计时。');}else if(!document.hidden&&data.activeSession&&!data.activeSession.running&&page==='practice'){render();}else if(!document.hidden&&data.paperStoryPractice&&!data.paperStoryPractice.running&&page==='storyPractice'&&!data.paperStoryPractice.finishedAt){render();}});
window.addEventListener('pagehide',()=>{flushDraftSave();if(data.dailyJourney?.readingRunning)pauseJourneyReading();if(data.dailyJourney?.speechRunning)pauseJourneySpeech();if(data.paperStoryPractice?.running){accruePaperStory();data.paperStoryPractice.running=false;data.paperStoryPractice.lastTick=null;save();}if(data.activeSession)pauseSession();stopActiveAudio();stopLocalAudio();stopActiveRecording({renderAfter:false});});
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
const themeToggle=document.getElementById('theme-toggle');if(themeToggle)themeToggle.addEventListener('click',()=>setTheme(data.settings.theme==='night'?'day':'night'));
const helpButton=document.getElementById('help-button');if(helpButton)helpButton.addEventListener('click',showGuide);
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
render();
if(migrationNotice){notify(migrationNotice);migrationNotice='';}


if (typeof window !== "undefined") {
  window.addEventListener("keydown", e => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (page === "vocabulary" && journeyStage() === "vocabulary") {
      const keyMap = { "1": "A", "2": "B", "3": "C", "4": "D", a: "A", b: "B", c: "C", d: "D" };
      const mapped = keyMap[String(e.key || "").toLowerCase()];
      if (mapped) {
        const btns = [...document.querySelectorAll(".vocab-option-btn:not([disabled])")];
        const targetBtn = btns.find(b => b.querySelector(".vocab-option-key")?.textContent?.trim() === mapped);
        if (targetBtn) { e.preventDefault(); targetBtn.click(); return; }
      }
      if (e.key === "Enter" || e.key === " ") {
        const nextBtn = document.querySelector(".vocab-next-btn");
        if (nextBtn) { e.preventDefault(); nextBtn.click(); }
      }
    }
  });
}
