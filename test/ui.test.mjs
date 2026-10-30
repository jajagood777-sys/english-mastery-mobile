import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

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
  assert.match(app,/if\(item\.learningStage==='new'\|\|\(!item\.learningStage&&item\.status==='UNTESTED'\)\)\{buildLearnCard/);
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
  assert.match(app,/每日目标分钟/);
  assert.match(app,/恢复 JSON 备份（先预览，再合并）/);
  assert.match(app,/if\(page==='settings'\)return renderSettings/);
});
