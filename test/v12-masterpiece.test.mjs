import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAbLoopState,
  setAbLoopPoint,
  shouldLoopBack,
  dictationCapability,
  registerMediaSession
} from '../immersion.mjs';
import {
  buildCultivationHeatmap,
  buildFsrsForecast,
  lookupOfflineLexicon,
  buildCommuteSprintQueue,
  evaluateBackupFreshness
} from '../mastery-os.mjs';

test('A-B loop state machine enforces valid bounds and triggers loop back cleanly', () => {
  let st = createAbLoopState();
  assert.equal(st.active, false);
  st = setAbLoopPoint(st, 'a', 4.2, 30);
  assert.equal(st.a, 4.2);
  assert.equal(st.active, false);
  st = setAbLoopPoint(st, 'b', 8.5, 30);
  assert.equal(st.b, 8.5);
  assert.equal(st.active, true);
  assert.equal(shouldLoopBack(st, 8.0), false);
  assert.equal(shouldLoopBack(st, 8.5), true);
  st = setAbLoopPoint(st, 'clear', 0, 30);
  assert.equal(st.active, false);
  assert.equal(st.a, null);
});

test('MediaSession and dictation capability degrade gracefully in headless Node environment', () => {
  const ms = registerMediaSession({ title: 'Test Clip' });
  assert.equal(ms.supported, false);
  const dc = dictationCapability();
  assert.equal(dc.supported, false);
});

test('90-day cultivation heatmap aggregates authentic active minutes without inventing streaks', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const sessions = [
    { activeByDay: { '2026-11-18': 1800000, '2026-11-17': 900000 } },
    { startedAt: '2026-11-16T08:00:00Z', endedAt: '2026-11-16T08:20:00Z', activeMs: 1200000 }
  ];
  const hm = buildCultivationHeatmap(sessions, { days: 90, now, timeZone: 'Asia/Shanghai' });
  assert.equal(hm.cells.length, 90);
  assert.equal(hm.activeDays, 3);
  assert.equal(hm.totalMinutes, 65);
  assert.equal(hm.currentStreak, 3);
});

test('FSRS 6.3.2 7-day forecast buckets independent recall cards and excludes prompted attempts', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const items = [
    { id: 'w:1', kind: 'word', target: 'vortex' },
    { id: 'w:2', kind: 'word', target: 'constraint' }
  ];
  const attempts = [
    { itemId: 'w:1', status: 'N', at: '2026-11-17T10:00:00Z', prompt_used: false, viewed_answer: false },
    { itemId: 'w:2', status: 'K', at: '2026-11-18T10:00:00Z', prompt_used: false, viewed_answer: false },
    { itemId: 'w:2', status: 'K', at: '2026-11-18T11:00:00Z', prompt_used: true, viewed_answer: false }
  ];
  const fc = buildFsrsForecast(attempts, items, { horizonDays: 7, now });
  assert.equal(fc.trackedCards, 2);
  assert.equal(fc.dailyBuckets.length, 7);
  assert.ok(fc.dailyBuckets[0].dueCount >= 1);
  assert.equal(fc.topRiskCards[0].target, 'vortex');
});

test('offline lexicon lookup searches archive, vocabularyPractice, and items with exact-match priority', () => {
  const hits = lookupOfflineLexicon('vort', {
    originalWordArchive: [{ target: 'vortex', definition_en: 'A rapidly rotating mass of air or water.', example: 'A vortex formed.' }],
    items: [{ kind: 'word', target: 'constraint', definitionEn: 'A limitation.', example: 'Budget constraint.' }]
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].headword, 'vortex');
});

test('commute 5-min sprint queue prioritizes overdue & weak items and backup freshness flags overdue backups', () => {
  const now = new Date('2026-11-18T12:00:00Z').getTime();
  const items = [
    { id: 'w1', kind: 'word', status: 'K', dueAt: '2026-12-01T00:00:00Z' },
    { id: 'w2', kind: 'word', status: 'N', dueAt: '2026-11-17T00:00:00Z' },
    { id: 's1', kind: 'sentence', status: 'V', dueAt: '2026-11-18T00:00:00Z' }
  ];
  const q = buildCommuteSprintQueue(items, { maxWords: 5, maxSentences: 2, now });
  assert.deepEqual(q, ['w2', 'w1', 's1']);

  const fresh = evaluateBackupFreshness({ lastBackupExportAttemptAt: '2026-11-17T00:00:00Z' }, 20, 10, new Date(now));
  assert.equal(fresh.needsReminder, false);

  const stale = evaluateBackupFreshness({ lastBackupExportAttemptAt: '2026-11-01T00:00:00Z' }, 20, 10, new Date(now));
  assert.equal(stale.needsReminder, true);
  assert.ok(stale.daysSinceBackup >= 17);
});
