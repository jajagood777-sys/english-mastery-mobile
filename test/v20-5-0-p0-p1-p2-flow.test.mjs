import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const stylesCss = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('v20.5.0 P0: Two-speed vocab triage, 85% retention toggle, and Criterion=1 badge exist in app.js', () => {
  assert.match(appJs, /let vocabTriageFilter = 'all'/);
  assert.match(appJs, /单轮答对 1 次即出栈 · 双速分流/);
  assert.match(appJs, /backlogRetentionMode/);
  assert.match(appJs, /核心抢救/);
  assert.match(appJs, /顽固急救/);
});

test('v20.5.0 P1: Stage-level 30-60s conceptual micro-summary and 15s quiet buffer exist and guard short CI journeys', () => {
  assert.match(appJs, /function shouldShowStageConsolidationGate\(/);
  assert.match(appJs, /j\.steps\.length < 3/);
  assert.match(appJs, /if\(page==='stageSummary'\)return renderStageSummary\(\);/);
  assert.match(appJs, /function renderStageSummary\(\)/);
  assert.match(appJs, /开启 15 秒闭眼静默缓冲/);
  assert.match(appJs, /查看刚才真实练过的锚点（解释反馈）/);
});

test('v20.5.0 P2: Pre-sentences Phonics warm-up bridge and ComplexLab grammar interleaving toggle exist', () => {
  assert.match(appJs, /P2 句前口腔热身/);
  assert.match(appJs, /打开伴学拼读\/HVPT/);
  assert.match(appJs, /let complexInterleaveMode = false/);
  assert.match(appJs, /语法交错:/);
});

test('v20.5.0 CSS & SW: New flow styles and 20.5.0 cache version are present', () => {
  assert.match(stylesCss, /\.vocab-triage-bar/);
  assert.match(stylesCss, /\.stage-consolidation-card/);
  assert.match(stylesCss, /\.p2-phonics-bridge-banner/);
  assert.match(swJs, /20\.5\.0/);
});
