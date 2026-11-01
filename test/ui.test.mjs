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
  assert.match(app,/const input=textInput\(s\.draft,'例如：address'\)/);
  assert.match(app,/const input=textInput\(s\.draft,'请输入缺少的英文单词/);
});

test('V4.2 settings page owns duration, backup and theme controls',()=>{
  assert.match(app,/function renderSettings/);
  assert.match(app,/参考目标分钟（正向计时，不强制结束）/);
  assert.match(app,/恢复 JSON 备份（先预览，再合并）/);
  assert.match(app,/if\(page==='settings'\)return renderSettings/);
});

test('V5 PWA cache marker is versioned for safe resource refresh',()=>{
 assert.match(sw,/english-cultivation-static-v5\.8\.0/);
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
 assert.match(sw,/english-cultivation-static-v5\.8\.0/);assert.match(sw,/assets\/visuals\/hero-09\.webp/);
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

test('V5 training exposes a single transfer room route and local recording fallback',()=>{
 assert.match(app,/function renderTransferHub/);assert.match(app,/弱项迁移/);assert.match(app,/recordingCapability/);assert.match(app,/getUserMedia/);assert.match(app,/IndexedDB/);
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
 assert.match(app,/暂不修改，保留初稿/);
});

test('VNext hides manual weak-room navigation while retaining the daily journey route',()=>{
 assert.doesNotMatch(app,/打开弱项迁移训练舱/);
 assert.match(app,/function renderTransferHub/);
 assert.match(app,/function renderPractice/);
 assert.match(app,/if\(page==='training'\)page='home'/);
});

test('V5.1 daily overview exposes independent pack modules and task-specific writing/recording UI',()=>{
 assert.match(app,/function renderDailyOverview/);assert.match(app,/口语训练/);assert.match(app,/写作训练/);assert.match(app,/语法迁移/);assert.match(app,/仅保存录音并提交初答/);assert.match(app,/建议 80–100 词/);assert.match(app,/阅读理解/);
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
