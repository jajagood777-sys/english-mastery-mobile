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
