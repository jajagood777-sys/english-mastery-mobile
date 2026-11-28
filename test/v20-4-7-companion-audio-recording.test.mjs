import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PHONICS_DAY_01_MODULE,
  buildCompanionBattleReport,
  companionBattleReportMarkdown,
  companionRecordingExt
} from '../adaptive-companion.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('v20.5.0 PHONICS_DAY_01_MODULE attaches IPA-exact Kokoro MP3 files and every MP3 exists on disk', () => {
  const urls = new Set();
  for (const blk of PHONICS_DAY_01_MODULE.blocks) {
    if (Array.isArray(blk.contrastDemo)) blk.contrastDemo.forEach(x => { assert.ok(x.audioUrl); urls.add(x.audioUrl); });
    if (Array.isArray(blk.tiles)) blk.tiles.forEach(x => { assert.ok(x.audioUrl); urls.add(x.audioUrl); });
    if (blk.partAudioMap) Object.values(blk.partAudioMap).forEach(u => urls.add(u));
    if (Array.isArray(blk.guided)) blk.guided.forEach(x => { assert.ok(x.audioUrl); urls.add(x.audioUrl); });
    if (blk.wordAudioMap) Object.values(blk.wordAudioMap).forEach(u => urls.add(u));
    if (Array.isArray(blk.items)) blk.items.forEach(x => { assert.ok(x.audioUrl); urls.add(x.audioUrl); });
    if (Array.isArray(blk.words)) blk.words.forEach(x => { assert.ok(x.audioUrl); urls.add(x.audioUrl); });
    if (blk.fullAudioUrl) urls.add(blk.fullAudioUrl);
    if (Array.isArray(blk.sentenceAudioUrls)) blk.sentenceAudioUrls.forEach(u => urls.add(u));
    if (blk.teacherVoiceAudioUrl) urls.add(blk.teacherVoiceAudioUrl);
  }
  assert.equal(urls.size, 42, `expected 42 unique Kokoro MP3 assets, got ${urls.size}`);
  for (const rel of urls) {
    const abs = path.join(ROOT, rel.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(abs), `missing audio file ${rel}`);
    const stat = fs.statSync(abs);
    assert.ok(stat.size >= 1200, `audio file too small (${stat.size}B): ${rel}`);
  }
});

test('v20.5.0 buildCompanionBattleReport & companionBattleReportMarkdown package progress and recordings cleanly', () => {
  assert.equal(companionRecordingExt('audio/mp4'), 'm4a');
  assert.equal(companionRecordingExt('audio/webm;codecs=opus'), 'webm');
  const report = buildCompanionBattleReport({
    module: PHONICS_DAY_01_MODULE,
    progress: {
      doneIds: ['s-a', 's-i', 'b-sat'],
      unseenMarks: { 'u-01': 'clean', 'u-08': 'review' },
      dictationResults: { 'dict-1': { revealed: true, typed: 'sat', correct: true } },
      checklistIds: ['d01-tpr:chk:0'],
      lastStudiedAt: '2026-11-28T10:00:00.000Z'
    },
    recordings: [
      { id: 'rec_1', taskId: 'd01-unseen', role: 'original', mimeType: 'audio/mp4', durationMs: 14200, bytes: new Uint8Array([1, 2, 3, 4]), sha256: 'abc123' }
    ],
    appVersion: '20.5.0',
    exportedAt: '2026-11-28T10:05:00.000Z'
  });
  assert.equal(report.schema, 'yandao-companion-battle-report-v1');
  assert.equal(report.summary.recording_count, 1);
  assert.equal(report.summary.unseen_clean, 1);
  assert.equal(report.summary.unseen_review, 1);
  assert.equal(report.summary.dictation_correct, 1);
  assert.equal(report.recordings[0].file, 'recordings/d01-unseen_rec_1.m4a');
  const md = companionBattleReportMarkdown(report);
  assert.match(md, /纸质伴学.*战报/);
  assert.match(md, /recordings\/d01-unseen_rec_1\.m4a/);
  assert.match(md, /读准 1/);
});

test('v20.5.0 app.js wires Kokoro audioUrl playback, per-block recording controls, and companion ZIP battle report export', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert.match(src, /buildCompanionBattleReport/);
  assert.match(src, /companionBattleReportMarkdown/);
  assert.match(src, /function speakCompanionAudio\(text, rate = 1\.0, audioUrl = ''\)/);
  assert.match(src, /async function exportCompanionBattleReport\(/);
  assert.match(src, /导出伴学战报 ZIP/);
  assert.match(src, /weaknessId:\s*`companion:\$\{active\.id\}`/);
});
