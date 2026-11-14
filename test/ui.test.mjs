import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const core = fs.readFileSync(new URL('../core.mjs', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const visuals = fs.readFileSync(new URL('../visuals.mjs', import.meta.url), 'utf8');
const visualReadme = fs.readFileSync(new URL('../assets/visuals/README.md', import.meta.url), 'utf8');

test('VNext shell exposes four clear Chinese mobile destinations', () => {
  for (const label of ['首页', '阅读', '进度', '我的']) assert.match(index, new RegExp(`>${label}<`));
  assert.doesNotMatch(index, /data-page="training"/);
  assert.match(index, /class="mobile-nav"/);
  assert.match(app, /function renderTrainingHub/);
  assert.match(app, /function renderMore/);
});

test('four-item iPhone bottom navigation occupies four equal columns, not a stale fifth slot',()=>{
  assert.equal((index.match(/data-page="(?:home|reading|progress|more)"/g)||[]).length,4);
  assert.doesNotMatch(index,/data-page="training"/);
  assert.match(css,/\.mobile-nav\{position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css,/\.mobile-nav\{position:fixed;[^}]*grid-template-columns:repeat\(5,/);
});

test('V4.5 navigation uses a consistent inline SVG icon system',()=>{
  assert.equal((index.match(/class="nav-icon"/g)||[]).length,4);
  assert.equal((index.match(/<svg[^>]+viewBox="0 0 24 24"/g)||[]).length,4);
  assert.match(index,/aria-label="主导航"/);
});

test('V4.5 night theme protects helper contrast and desktop nav clearance',()=>{
  assert.match(css,/html\[data-theme=\"night\"\] \.mode-card span/);
  assert.match(css,/html\[data-theme=\"night\"\] \.question-label/);
  assert.match(css,/@media\(min-width:860px\)\{[^}]*\.site-wrap\{padding-bottom:calc\(128px/);
});

test('V4.1 design tokens include touch-safe mobile navigation and keyboard spacing', () => {
  assert.match(css, /--space-/);
  assert.match(css, /\.mobile-nav/);
  assert.match(css, /scroll-margin-bottom:.*env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test('legacy UNTESTED cards still enter the new-content learning stage',()=>{
  assert.match(app,/s\.journeyStage!=='listening'&&\(item\.learningStage==='new'\|\|\(!item\.learningStage&&item\.status==='UNTESTED'\)\)\)\{buildLearnCard/);
});

test('home listening entry passes its requested sentence style into the session',()=>{
  assert.match(app,/sentenceStyle:options\.sentenceStyle\|\|'cloze'/);
});

test('V4.2 migration and critical mutations use save-result guards',()=>{
  assert.match(app,/migrated\.settings=\{retryAfterError:true/);
  assert.doesNotMatch(app,/data\.settings=\{retryAfterError:true,newLimit:10,reviewLimit:20/);
  assert.match(app,/if\(!save\(\)\)return;setPage\('practice'\)/);
  assert.match(app,/if\(!save\(\)\)return false;render\(\);return true/);
});

test('V4.2 answer provenance and sentence-cloze references stay separate',()=>{
  assert.match(app,/s\.viewedAnswer=Boolean\(skipped\)/);
  assert.match(app,/const reference=s\.referenceAnswer\|\|/);
  assert.match(app,/if\(s\.promptUsed\)item\.promptCount/);
  assert.match(app,/sentenceStyle==='cloze'\?'missing_words'/);
});

test('V4.2 reading and card-management paths preserve context and history',()=>{
  assert.match(app,/readingSelectionContext\(selectedParagraphText/);
  assert.match(app,/readingCardId\(\{readingId:reading\.id/);
  assert.match(app,/context:contextInfo\.context/);
  assert.match(app,/function showCardDialog/);
  assert.match(app,/function showEditDialog/);
  assert.match(app,/x\.archived=!x\.archived/);
  assert.match(app,/setPage\('settings'\)/);
});

test('V4.2 compact answer controls use a real single-line input',()=>{
  assert.match(app,/function textInput\(/);
  assert.match(app,/const input=textInput\(s\.draft,'Type the target word or expression in English…'\)/);
  assert.match(app,/const input=textInput\(s\.draft,'请输入缺少的英文单词/);
});

test('V4.2 settings page owns duration, backup and theme controls',()=>{
  assert.match(app,/function renderSettings/);
  assert.match(app,/参考目标分钟（正向计时，不强制结束）/);
  assert.match(app,/恢复 JSON 备份（先预览，再合并）/);
  assert.match(app,/if\(page==='settings'\)return renderSettings/);
});

test('V5 PWA cache marker is versioned for safe resource refresh',()=>{
 assert.match(sw,/english-cultivation-static-v10\.3\.12/);
});

test('V5.2 native speech chooses real device voices and persists safe settings',()=>{
 assert.match(app,/speechSynthesis\.getVoices\(\)/);
 assert.match(app,/voiceschanged/);
 assert.match(app,/voiceURI/);
 assert.match(app,/voiceSettingsPanel/);
 assert.match(app,/speakEnglish/);
 assert.match(app,/utter\.voice=voice/);
 assert.match(app,/speechVoiceURI/);
 assert.match(app,/设备英语语音/);
 assert.match(app,/native-voice-select/);
 assert.match(app,/Hello! Let's practice English together/);
 assert.doesNotMatch(app,/Gemini云端|KOKORO_VOICES|neuralSpeech/);
 assert.match(app,/speechVoiceLabel/);
});

test('V4.3 one-file daily journey has all four stages and positive active time',()=>{
 assert.match(app,/function startDailyJourney/);
 assert.match(app,/function beginJourneyStage/);
 assert.match(app,/function completeJourneyReading/);
 assert.match(app,/function finishDailyJourney/);
 assert.match(app,/journeyElapsedMs/);
 assert.match(app,/recommendedMinutes/);
 assert.match(app,/今日综合学习 · 第三模块/);
 assert.match(app,/不强制结束/);
});

test('V4.3 keeps full backup restore separate from daily pack import',()=>{
 assert.match(app,/isFullBackup\(parsed\)/);
 assert.match(app,/完整数据备份，请从“设置 → 恢复 JSON 备份”导入/);
});

test('V4.3 marks the last journey module as the combined-report handoff',()=>{
 assert.match(app,/完成并查看综合战报/);
 assert.match(app,/if\(!s\.journeyStage\)\{data\.reports/);
});

test('real-user repair keeps journey attempts and listening evidence in the combined report',()=>{
 assert.match(app,/allowedSessionIds:ids/);
 assert.match(core,/session_id: attempt\.sessionId/);
 assert.match(core,/unrated_attempts/);
});

test('English-first new cards hide Chinese until a per-card action records the hint',()=>{
 assert.match(app,/显示中文释义/);
 assert.match(app,/s\.viewedChinese=true/);
 assert.match(app,/promptEvents/);
 assert.match(app,/s\.meaningShown=false/);
});

test('reading vocabulary marks support double-click selection, persistence and batch save',()=>{
 assert.match(app,/function toggleReadingMark/);
 assert.match(app,/function saveMarkedReadingWords/);
 assert.match(app,/保存已标记生词/);
 assert.match(app,/readingMarkId/);
 assert.match(app,/article\.addEventListener\('dblclick'/);
 assert.match(core,/mergeReadingMarks/);
});

test('V4.3.1 visual layer is optional, lazy, and does not enter the reading surface',()=>{
 assert.match(app,/visualAsset\('09'\)/);
 assert.match(app,/function visualFrame/);
 assert.match(app,/loading=asset\.id==='09'\?'eager':'lazy'/);
 assert.match(app,/展开修炼画卷/);
 assert.match(visualReadme,/explicitly authorized public use/);
 assert.match(css,/\.home-hero-visual/);
 assert.match(css,/\.visual-gallery/);
 assert.match(css,/\.reading-article/);
});

test('V5 authorized visual bundle contains all nine WebP resources',()=>{
 const files=['calligraphy-01.webp','calligraphy-02.webp','archive-03.webp','calligraphy-04.webp','quote-05.webp','archive-06.webp','portrait-07.webp','portrait-08.webp','hero-09.webp'];
 for(const file of files){const path=new URL(`../assets/visuals/${file}`,import.meta.url);assert.ok(fs.existsSync(path),`missing ${file}`);assert.ok(fs.statSync(path).size>1000,`empty ${file}`);assert.match(visuals,new RegExp(file.replace('.','\\.')));}
 assert.match(sw,/english-cultivation-static-v10\.3\.12/);assert.match(sw,/assets\/visuals\/hero-09\.webp/);
});

test('V6.2 visual polish keeps the existing asset layer and mobile-safe rhythm',()=>{
 assert.match(css,/--quiet-line-strong/);assert.match(css,/text-wrap:balance/);assert.match(css,/scroll-margin-block:120px/);assert.match(css,/reading-toolbar \.btn\{min-height:44px\}/);
 assert.match(visuals,/Authorized visual layer/);assert.match(visualReadme,/explicitly authorized public use/);
});

test('V4.4 transfer and optional reading comprehension paths preserve evidence',()=>{
 assert.match(app,/function renderTransferChallenge/);
 assert.match(app,/transferAttempts/);
 assert.match(app,/evidence_type/);
 assert.match(app,/function renderReadingCheck/);
 assert.match(app,/readingChecks/);
 assert.match(core,/transfer_tasks/);
 assert.match(core,/questions/);
});
test('V10 reading completion keeps unfinished comprehension partial',()=>{
 assert.match(app,/readingPartialIds/);assert.match(app,/check\?\.status!=='completed'/);assert.match(app,/status:partial\?'partial':'completed'/);
});
test('V10 reading checks reject blank submissions and allow explicit skip/resume',()=>{
 assert.match(app,/请填写答案，或明确点击跳过本题/);assert.match(app,/跳过本题/);assert.match(app,/status==='partial'/);assert.match(app,/prior&&prior.status==='partial'/);
});
test('V10 Journey schedules bounded delayed correction attempts and preserves linkage',()=>{
 assert.match(app,/baseQueueLength/);assert.match(app,/correctionIds/);assert.match(app,/Math\.min\(5/);assert.match(app,/correction_attempt/);assert.match(app,/correction_of/);
});

test('V5 training exposes a single transfer room route and local recording fallback',()=>{
 assert.match(app,/function renderTransferHub/);assert.match(app,/综合输出/);assert.match(app,/recordingCapability/);assert.match(app,/getUserMedia/);assert.match(app,/IndexedDB/);
});

test('V5 source links use safe external navigation and do not execute imported text',()=>{
 assert.match(app,/safeSourceUrl/);assert.match(app,/rel='noopener noreferrer'/);assert.match(app,/source_url|sourceUrl/);assert.doesNotMatch(app,/innerHTML=.*source/);
});

test('V5 journey report recovery passes transfer evidence locally',()=>{
 const block=app.slice(app.indexOf('function rebuildJourneyReport'),app.indexOf('function renderSummary'));
 assert.match(block,/const journeyTransferAttempts=journeyTransferAttemptsForReport/);
 assert.match(block,/transferAttempts:journeyTransferAttempts/);
 assert.match(block,/recovered_without_overwriting_original/);
 assert.match(app,/firstAnswer:j\.transferDraft/);
 assert.doesNotMatch(app,/暂不修改，保留初稿/);
});

test('VNext hides manual weak-room navigation while retaining the daily journey route',()=>{
 assert.doesNotMatch(app,/打开弱项迁移训练舱/);
 assert.match(app,/function renderTransferHub/);
 assert.match(app,/function renderPractice/);
 assert.match(app,/if\(page==='training'\)page='home'/);
});

test('V5.0 real audio listening exposes HTML audio and AB loop controls',()=>{
 assert.match(app,/function audioControls\(url\)/);
 assert.match(app,/audio\.currentTime/);
 assert.match(app,/开始 A—B 循环/);
 assert.match(app,/audio\.playbackRate/);
 assert.match(app,/audioControls\(item\.audioUrl\)/);
});

test('V5.1 external audio CSP and player validation stay HTTPS-only',()=>{
 assert.match(index,/media-src 'self' blob: https:/);
 assert.doesNotMatch(index,/media-src[^>]*data:/);
 assert.match(core,/safeAudioUrl/);
 assert.match(app,/isValidAudioLoop/);
 assert.match(app,/音频尚未加载完成|请先设置有效 A\/B/);
});

test('V5.1 daily overview exposes independent pack modules and task-specific writing/recording UI',()=>{
 assert.match(app,/function renderDailyOverview/);assert.match(app,/口语训练/);assert.match(app,/写作训练/);assert.match(app,/语法练习/);assert.match(app,/仅保存录音并提交初答/);assert.match(app,/建议 80–100 词/);assert.match(app,/阅读理解/);
});

test('V6 listening follow-along keeps reference and local recording evidence separate',()=>{
 assert.match(app,/function followAlongRecordingControls/);
 assert.match(app,/听参考音频|听设备参考朗读/);
 assert.match(app,/听我的初答/);
 assert.match(app,/听我的重答/);
 assert.match(app,/recording_ids/);
 assert.match(app,/stopActiveRecording\(\{renderAfter:false\}\)/);
 assert.match(app,/开始跟读录音/);
 assert.match(app,/录音只保存在本机/);
});

test('V7 Listening & Speaking Studio stays inside the existing listening Journey',()=>{
 assert.match(app,/function renderListeningStudio/);assert.match(app,/splitStudioSegments/);assert.match(app,/studio-source-text/);assert.match(css,/\.listening-speaking-studio/);
});

test('V7 progress page exposes evidence analytics without changing the existing trend view',()=>{
 assert.match(app,/function renderMasteryAnalytics/);assert.match(app,/buildMasteryAnalytics/);assert.match(app,/真实掌握证据/);assert.match(css,/\.mastery-evidence-panel/);
});

test('V10.0.1 finished-summary prioritizes only two visible actions while retaining advanced exports',()=>{
 const summary=app.slice(app.indexOf('function renderSummary(){'),app.indexOf('function renderReports(){'));
 assert.match(summary,/report-primary-actions/);
 assert.match(summary,/btn\('下载完整交接包 ZIP',\(\)=>exportCentralHandover\(true\)/);
 assert.match(summary,/btn\('返回首页',\(\)=>setPage\('home'\)/);
 assert.match(summary,/report-export-options/);
 assert.match(summary,/el\('summary','其他导出方式（备用）'\)/);
 for(const label of ['交接包 ZIP（不含录音）','复制文字战报','生成下次学习依据','导出反馈 JSON','分享文字战报','下载 Markdown','下载 JSON']){
   assert.ok(summary.includes(label),label);
 }
 assert.doesNotMatch(summary,/btn\('复制战报给中央仙窍'/);
 assert.match(app,/function exportCentralHandover/);
 assert.match(app,/不会自动上传/);
 assert.match(app,/checked\.actual_packaged_count\?\?0/);
});

test('V6 central feedback export is distinct from daily-pack import and legacy handoff',()=>{
 assert.match(core,/buildCentralLearningFeedback/);
 assert.match(core,/feedback_schema_version/);
 assert.match(app,/function exportCentralFeedback/);
 assert.match(app,/central-english-feedback-/);
 assert.match(app,/生成下次学习依据/);
 assert.match(app,/导出反馈 JSON/);
});

test('V6 reading marks are scoped to the current Journey and copied with the report',()=>{
 assert.match(core,/collectReadingMarkEvidence/);
 assert.match(core,/reading_vocabulary_evidence/);
 assert.match(core,/本次阅读标记生词/);
 assert.match(app,/function journeyReadingMarksForReport/);
 assert.match(app,/readingMarks:journeyReadingMarksForReport/);
 assert.match(app,/copyReport\(x\)/);
});

test('V1.0 Journey includes reading recall, Exit Ticket and story Section interfaces',()=>{
 assert.match(app,/function readingRecallQueueFor/);
 assert.match(app,/function renderReadingRecall/);
 assert.match(app,/readingRecallAttempts/);
 assert.match(app,/Exit Ticket/);
 assert.match(app,/参考表达：/);
 assert.match(app,/sectionTitle/);
 assert.match(core,/storyId/);
 assert.match(core,/exit_ticket/);
});
test('paper-first story practice stays inside the existing training shell without forcing digital rereading',()=>{
 assert.match(app,/storyPractice/);
 assert.match(app,/function renderPaperStoryEntry/);
 assert.match(app,/function renderPaperStoryPractice/);
 assert.match(app,/paper_reading_time_measured:false/);
 assert.match(app,/spoken_phrase_limit:10/);
 assert.match(app,/Practice this Section/);
 assert.match(app,/no_automatic_ielts_or_pronunciation_score:true/);
});
test('V20 dialogue and listening diagnostics reuse existing transfer and studio surfaces',()=>{
 assert.match(core,/normalizeDialogueScenarios/);assert.match(core,/normalizeListeningDiagnostics/);
 assert.match(app,/Scenario dialogue · Round/);assert.match(app,/听力盲区定位 · BLIND-SPOT DIAGNOSTICS/);assert.match(app,/listeningDiagnosticAttempts/);assert.match(app,/referenceViewed:false/);
});
test('V20.1 word hints avoid repeating the main context and sentence mode remains selectable',()=>{
 assert.match(app,/additionalContexts/);assert.match(app,/No additional context was supplied/);assert.match(app,/s\.sentenceStyle=value/);assert.doesNotMatch(app,/if\(s\.journeyStage==='listening'\)s\.sentenceStyle='listening'/);
});
test('V10.3.9 adds one-question retrieval and paper-safe reading retelling without scoring speech',()=>{
 assert.match(app,/Quick Retrieval/);assert.match(app,/INDEPENDENT RETELLING/);assert.match(app,/readingRetellingAttempts/);assert.match(core,/retelling_attempts/);assert.match(app,/speech_transfer/);assert.doesNotMatch(app,/IELTS.*pronunciation.*score/);
});

test('transfer recording submission is idempotent after the first tap',()=>{
 const fn=app.match(/function submitTransferRecordingOnly\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
 assert.match(fn,/j\.transferState==='revealed'/);
});


test('reading vocabulary offers a dedicated saved-card view and copy-to-chat export without automatic upload',()=>{
 assert.match(app,/function renderReadingVocabulary/);
 assert.match(app,/page==='readingVocabulary'/);
 assert.match(app,/打开阅读生词本/);
 assert.match(app,/复制筛选结果给中央仙窍/);
 assert.match(app,/readingVocabularyHandoff/);
 assert.match(app,/collectSavedReadingWords\(data\.items,data\.readingMarks,data\.readings\)/);
 assert.match(app,/navigator\.clipboard\?\.writeText/);
 assert.match(app,/可手动复制的原文/);
 assert.doesNotMatch(app,/function renderReadingVocabulary[\s\S]*?function renderReading\(\)[\s\S]*?upload.*readingWords/i);
});


test('V5.8 offers explicit local-only handoff and separates JSON from IndexedDB recordings',()=>{
 assert.match(app,/function copyCentralLearningHandoff/);
 assert.match(app,/function exportCentralLearningHandoff/);
 assert.match(app,/centralLearningHandoff\(\{report,readingWords:words/);
 assert.match(app,/function dataSafetyPanel/);
 assert.match(app,/listRecordings\(\)\.then\(rows/);
 assert.match(app,/btn\('导出录音',\(\)=>exportLocalRecording\(row\.id\)/);
 assert.match(app,/JSON备份只包含结构化学习数据，不包含 IndexedDB/);
 assert.match(app,/lastBackupExportAttemptAt/);
 assert.match(app,/navigator\.storage\.estimate\(\)/);
 assert.match(app,/复制不等于外部同步|不会上传资料/);
 assert.match(app,/voiceSettingsPanel\(\),buildSettingsPanel\(\),dataSafetyPanel\(\)/);
});


test('new-content card retains recall but removes mastered direct-test shortcut',()=>{
  assert.match(app,/btn\('开始回忆',\(\)=>\{item\.learningStage='learning'/);
  assert.doesNotMatch(app,/我已经掌握，直接测试/);
});

test('V10.3.9 multi-paragraph listening stays segmented but does not force verbatim writing or recording',()=>{
  assert.match(app,/if\(s\.sentenceStyle==='listening'&&isExtendedListening\(item\.text\)\)\{renderExtendedListeningQuestion\(container,item,s\);return;\}/);
  const start=app.indexOf('function renderExtendedListeningQuestion(');
  const end=app.indexOf('function buildSentenceQuestion(',start);
  assert.ok(start>=0&&end>start);
  const compact=app.slice(start,end);
  assert.match(compact,/renderListeningStudio\(item,\{/);
  assert.match(compact,/记录理解并进入下一题/);
  assert.match(compact,/一句话概括（可选）/);
  assert.match(compact,/跳过，进入下一题/);
  assert.doesNotMatch(compact,/followAlongRecordingControls|开始听写|请写出完整英文句子|rateControls\(/);
  assert.match(app,/if\(diagnostic&&!compact\)/);
  assert.match(app,/splitStudioSegments\(item\.text\)/);
});
test('V10.3.9 passage-level self-report advances without assigning false K/V/N due schedule',()=>{
  const from=app.indexOf('function finishExtendedListening(');
  const to=app.indexOf('function renderExtendedListeningQuestion(',from);
  assert.ok(from>=0&&to>from);
  const finish=app.slice(from,to);
  assert.match(finish,/status:null/);
  assert.match(finish,/evidence_type:skipped\?'skipped':'user_self_reported_comprehension'/);
  assert.match(finish,/comprehensionSelfReport/);
  assert.match(finish,/s\.index\+\+/);
  assert.doesNotMatch(finish,/scheduleReview|item\.dueAt=|item\.status=|grade\(item/);
});
