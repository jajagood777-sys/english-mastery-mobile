import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PHONICS_DAY_01_MODULE,
  upsertCompanionErrorBank,
  recordCompanionErrorPass,
  collectCompanionErrorBank,
  buildCompanionBattleReport,
  companionBattleReportMarkdown
} from '../adaptive-companion.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('v20.4.9 PHONICS_DAY_01_MODULE includes all 5 review modes and every review/HVPT MP3 exists on disk', () => {
  const rs = PHONICS_DAY_01_MODULE.reviewSuite;
  assert.ok(rs?.gpcFlash?.visualCards?.length >= 8);
  assert.ok(rs?.gpcFlash?.auditoryCards?.length >= 6);
  assert.ok(rs?.wordChains?.chains?.length >= 2);
  assert.equal(rs?.hvptTrials?.trials?.length, 12);
  assert.ok(rs?.connectedCheck?.sentences?.length >= 3);
  assert.ok(rs?.microDemos?.prompts?.length >= 4);

  const urls = new Set();
  rs.gpcFlash.visualCards.forEach(c => urls.add(c.audioUrl));
  rs.gpcFlash.auditoryCards.forEach(c => urls.add(c.audioUrl));
  rs.wordChains.chains.forEach(ch => ch.steps.forEach(s => urls.add(s.audioUrl)));
  rs.hvptTrials.trials.forEach(t => urls.add(t.audioUrl));
  rs.connectedCheck.sentences.forEach(s => urls.add(s.audioUrl));

  for (const rel of urls) {
    const abs = path.join(ROOT, rel.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(abs), `missing review audio file ${rel}`);
    assert.ok(fs.statSync(abs).size >= 1200, `review audio too small: ${rel}`);
  }
});

test('v20.4.9 Error Bank requires 2 consecutive clean passes to clear and feeds into Battle Report', () => {
  const prog = { errorBank: {}, hvptResults: { 'hv-01': { picked: 'sot', correct: false }, 'hv-02': { picked: 'sot', correct: true } }, flashDoneIds: ['vf-a'], chainDoneIds: ['wc-1'], microDemoDoneIds: ['md-1'] };
  upsertCompanionErrorBank(prog, { id: 'hv-01', label: 'sat', ipa: '/sæt/', source: 'hvpt' });
  assert.equal(collectCompanionErrorBank(prog).open.length, 1);
  recordCompanionErrorPass(prog, 'hv-01');
  assert.equal(collectCompanionErrorBank(prog).open.length, 1, '1 pass should not clear yet');
  recordCompanionErrorPass(prog, 'hv-01');
  assert.equal(collectCompanionErrorBank(prog).open.length, 0, '2 consecutive passes should clear');
  assert.equal(collectCompanionErrorBank(prog).cleared.length, 1);

  const rep = buildCompanionBattleReport({ module: PHONICS_DAY_01_MODULE, progress: prog, recordings: [], appVersion: '20.4.9' });
  assert.equal(rep.summary.hvpt_total, 2);
  assert.equal(rep.summary.hvpt_correct, 1);
  assert.equal(rep.summary.error_bank_cleared, 1);
  const md = companionBattleReportMarkdown(rep);
  assert.match(md, /多音色 HVPT 辨音：1 \/ 2/);
  assert.match(md, /已清零 1/);
});

test('v20.4.9 app.js renders all 5 review modes and includes companion recordings in main handover export', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert.match(src, /全能复习（5 模式）/);
  assert.match(src, /双向快闪/);
  assert.match(src, /词链变音/);
  assert.match(src, /多音色辨音/);
  assert.match(src, /错题池/);
  assert.match(src, /60秒脱稿试讲/);
  assert.match(src, /upsertCompanionErrorBank/);
  assert.match(src, /companionState\?\.progress/);
});
