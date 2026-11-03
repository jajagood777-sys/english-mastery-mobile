import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBattleReport, buildMasteryAnalytics, mergeBackupState, migrateBackupPayload, persistState} from '../core.mjs';
import {FaultStorage, assertHandoverPaths, malformedBackupProbe, persistFailureProbe, roundTripBackup, syntheticBackup} from './reliability-fixture.mjs';

test('synthetic 30-day history round-trips without losing evidence or IDs', () => {
  const source = syntheticBackup();
  const {restored, isolated, repeated} = roundTripBackup(source);
  for (const state of [restored, isolated, repeated]) {
    assert.equal(state.items.length, source.items.length);
    assert.equal(state.attempts.length, source.attempts.length);
    assert.equal(state.sessions.length, source.sessions.length);
    assert.equal(state.readings.length, source.readings.length);
    assert.equal(state.readingMarks.length, source.readingMarks.length);
    assert.equal(state.transferAttempts.length, source.transferAttempts.length);
    assert.equal(state.reports.length, source.reports.length);
  }
  const originalAttempt = source.attempts.find(row => row.retry_answer);
  const restoredAttempt = restored.attempts.find(row => row.id === originalAttempt.id);
  assert.equal(restoredAttempt.answer, originalAttempt.answer);
  assert.equal(restoredAttempt.retry_answer, originalAttempt.retry_answer);
  assert.equal(restoredAttempt.status, originalAttempt.status);
  assert.equal(restored.dailyJourney.transferAttempts[0].firstAnswer, source.dailyJourney.transferAttempts[0].firstAnswer);
  assert.equal(repeated.packHistory.length, source.packHistory.length + 1);
  assert.equal(repeated.dailyJourney.packId, source.dailyJourney.packId);
});

test('backup merge remains idempotent and does not double-count report/session/attempt IDs', () => {
  const source = syntheticBackup({itemCount: 80, sessionCount: 12, days: 10});
  const first = mergeBackupState({items: [], attempts: [], sessions: [], readings: [], readingMarks: [], reports: [], packHistory: []}, migrateBackupPayload(source));
  const second = mergeBackupState(first, migrateBackupPayload(source));
  assert.equal(second.items.length, first.items.length);
  assert.equal(second.attempts.length, first.attempts.length);
  assert.equal(second.sessions.length, first.sessions.length);
  assert.equal(second.reports.length, first.reports.length);
  assert.equal(second.readingMarks.length, first.readingMarks.length);
  assert.equal(second.transferAttempts.length, first.transferAttempts.length);
});

test('repeated report inputs retain one attempt per stable ID/fingerprint', () => {
  const source = syntheticBackup({itemCount: 8, sessionCount: 2, days: 2});
  const session = source.sessions[0];
  const attempts = source.attempts.filter(row => row.sessionId === session.id);
  const report = buildBattleReport({session, attempts: [...attempts, ...attempts, {...attempts[0], id: 'different-id'}], items: source.items, now: new Date(session.endedAt)});
  assert.equal(report.attempts.length, attempts.length);
  assert.equal(new Set(report.attempts.map(row => row.attempt_id)).size, report.attempts.length);
  assert.equal(report.report_id, `report:${session.id}`);
});

test('storage write failure preserves the last known-good serialized backup', () => {
  const probe = persistFailureProbe();
  assert.equal(probe.result.ok, false);
  assert.equal(probe.preserved, true);
});

test('state serialization failure returns a safe save error without replacing the last backup', () => {
  const previous = JSON.stringify({version: 4.3, sentinel: 'known-good'});
  const storage = new FaultStorage(previous);
  const circular = {};
  circular.self = circular;
  const result = persistState(storage, 'state', circular, previous);
  assert.equal(result.ok, false);
  assert.match(result.error, /circular|serialize|JSON/i);
  assert.equal(storage.getItem(), previous);
});

test('malformed and duplicate backup payloads are rejected before merge', () => {
  const results = malformedBackupProbe();
  assert.equal(results.length, 3);
  assert.ok(results.every(row => row.rejected), results.map(row => `${row.name}: ${row.message || 'accepted'}`).join('\n'));
});

test('central handover keeps synthetic recording paths inside recordings/', () => {
  const {packageData, zip} = assertHandoverPaths();
  assert.equal(packageData.manifest.includes_recordings, true);
  assert.ok(zip.bytes.length > 0);
  assert.ok(zip.entries.some(entry => entry.name.startsWith('recordings/')));
});

test('mastery analytics never treats a skipped or blank K row as independent mastery', () => {
  const analytics = buildMasteryAnalytics({
    items: [{id: 'w:skipped'}, {id: 'w:blank'}],
    attempts: [
      {itemId: 'w:skipped', status: 'K', answer: '', skipped: true},
      {itemId: 'w:blank', status: 'K', answer: '', skipped: false}
    ]
  });
  assert.equal(analytics.evidence.independentCorrect, 0);
  assert.equal(analytics.evidence.promptedCorrect, 0);
  assert.equal(analytics.evidence.skipped, 1);
  assert.equal(analytics.evidence.unmeasured, 1);
});
