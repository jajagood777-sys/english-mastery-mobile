import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RADIO_CHANNELS,
  computeShadowPauseMs,
  buildRadioPlaylist,
  summarizeRadioExposure
} from '../radio.mjs';
import { buildBattleReport, battleReportMarkdown } from '../core.mjs';

test('radio channels and shadowing pause calculator scale proportionally with sentence length', () => {
  assert.equal(RADIO_CHANNELS.length, 4);
  assert.equal(computeShadowPauseMs('Hello world', { enabled: false }), 900);
  const shortPause = computeShadowPauseMs('A vortex formed.', { enabled: true });
  const longPause = computeShadowPauseMs('Although rapid urbanization creates severe constraints on municipal water grids, engineers mitigated these risks.', { enabled: true });
  assert.ok(shortPause >= 1500);
  assert.ok(longPause > shortPause);
  assert.ok(longPause <= 8000);
});

test('weak_sniper channel prioritizes missed vocabulary choices and N/V weak cards', () => {
  const vocab = [
    { id: 'V-1', target: 'vortex', archivedExample: 'A vortex formed.', targetSense: 'Rotating mass.' },
    { id: 'V-2', target: 'valve', archivedExample: 'Open the valve.', targetSense: 'Flow control.' }
  ];
  const vocabAttempts = [
    { taskId: 'V-1', correct: false, firstCheck: { correct: false } },
    { taskId: 'V-2', correct: true, firstCheck: { correct: true } }
  ];
  const items = [
    { id: 'i-1', kind: 'word', target: 'constraint', example: 'Budget constraint.', status: 'N' },
    { id: 'i-2', kind: 'word', target: 'resilient', example: 'Resilient bridge.', status: 'K' }
  ];
  const tracks = buildRadioPlaylist({
    channel: 'weak_sniper',
    items,
    vocabularyPractice: vocab,
    vocabularyAttempts: vocabAttempts
  });
  assert.equal(tracks.length, 2);
  assert.ok(tracks.some(t => t.title === 'vortex'));
  assert.ok(tracks.some(t => t.title === 'constraint'));
  assert.equal(tracks.every(t => t.exposureOnly === true), true);
});

test('14.1.0 battle report logs passive radio exposure honestly without counting as mastery K', () => {
  const summary = summarizeRadioExposure({ clipsPlayed: 12, activeMs: 185000, lastChannel: 'weak_sniper' });
  assert.equal(summary.clipsPlayed, 12);
  assert.equal(summary.activeSeconds, 185);
  assert.equal(summary.countsAsMasteryK, false);

  const report = buildBattleReport({
    session: { id: 'sess-1300', startedAt: '2026-11-18T10:00:00Z', endedAt: '2026-11-18T10:20:00Z', activeMs: 1200000, mode: 'journey' },
    attempts: [],
    items: [],
    radioLog: { clipsPlayed: 12, activeMs: 185000, lastChannel: 'weak_sniper' }
  });
  assert.equal(report.app_version, '14.1.0');
  assert.equal(report.radio_exposure.clipsPlayed, 12);
  assert.equal(report.radio_exposure.countsAsMasteryK, false);

  const md = battleReportMarkdown(report);
  assert.match(md, /Pocket Radio Passive Exposure/);
  assert.match(md, /countsAsMasteryK: false/);
});

test("14.1.0 radio playlist emits exact single-unit segments for Kokoro af_heart matching and respects scope", () => {
  const items = [
    { id: "w1", packId: "P-TODAY", kind: "word", target: "vortex", example: "A vortex formed.", status: "N" },
    { id: "w2", packId: "P-OLD", kind: "word", target: "valve", example: "Open the valve.", status: "N" }
  ];
  const todayOnly = buildRadioPlaylist({ channel: "today_full", scope: "today", activePackId: "P-TODAY", items });
  assert.equal(todayOnly.length, 1);
  assert.deepEqual(todayOnly[0].segments, ["vortex", "A vortex formed."]);

  const allHistory = buildRadioPlaylist({ channel: "today_full", scope: "all", activePackId: "P-TODAY", items });
  assert.equal(allHistory.length, 2);
});
