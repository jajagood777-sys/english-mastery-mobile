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

test('V4.1 shell exposes five clear Chinese mobile destinations', () => {
  for (const label of ['首页', '训练', '阅读', '进度', '我的']) assert.match(index, new RegExp(`>${label}<`));
  assert.match(index, /class="mobile-nav"/);
  assert.match(app, /function renderTrainingHub/);
  assert.match(app, /function renderMore/);
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

test('V4.2 PWA cache marker is versioned for safe resource refresh',()=>{
 assert.match(sw,/english-cultivation-static-v4\.3\.3/);
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

test('V4.3.3 authorized visual bundle contains all nine WebP resources',()=>{
 const files=['calligraphy-01.webp','calligraphy-02.webp','archive-03.webp','calligraphy-04.webp','quote-05.webp','archive-06.webp','portrait-07.webp','portrait-08.webp','hero-09.webp'];
 for(const file of files){const path=new URL(`../assets/visuals/${file}`,import.meta.url);assert.ok(fs.existsSync(path),`missing ${file}`);assert.ok(fs.statSync(path).size>1000,`empty ${file}`);assert.match(visuals,new RegExp(file.replace('.','\\.')));}
 assert.match(sw,/english-cultivation-static-v4\.3\.3/);assert.match(sw,/assets\/visuals\/hero-09\.webp/);
});
