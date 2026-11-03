import {performance} from 'node:perf_hooks';
import {buildBattleReport} from '../core.mjs';
import {handoverEntries, zipStore} from '../handover.mjs';
import {assertHandoverPaths, malformedBackupProbe, persistFailureProbe, roundTripBackup, syntheticBackup} from '../test/reliability-fixture.mjs';

const sizes = [100, 1000, 5000];
const metrics = [];
for (const itemCount of sizes) {
  const source = syntheticBackup({itemCount, sessionCount: Math.max(10, Math.round(itemCount / 10)), days: 30});
  const start = performance.now();
  const result = roundTripBackup(source);
  const roundTripMs = performance.now() - start;
  const reportStart = performance.now();
  buildBattleReport({session: source.sessions[0], attempts: source.attempts, items: source.items, now: new Date(source.sessions[0].endedAt)});
  const reportMs = performance.now() - reportStart;
  metrics.push({itemCount, attempts: source.attempts.length, sessions: source.sessions.length, bytes: result.serialized.length, roundTripMs: Number(roundTripMs.toFixed(2)), reportMs: Number(reportMs.toFixed(2))});
}
const failure = persistFailureProbe();
const malformed = malformedBackupProbe();
const handover = assertHandoverPaths();
const handoverMetrics = [1, 5, 10].map(sizeMb => {
  const bytes = new Uint8Array(sizeMb * 1024 * 1024);
  const start = performance.now();
  const pack = handoverEntries({report: {report_id: `report:synthetic:${sizeMb}`}, recordings: [{id: `synthetic-${sizeMb}`, mimeType: 'audio/webm', bytes}]});
  const zip = zipStore(pack.entries);
  return {recordingMiB: sizeMb, zipBytes: zip.bytes.length, zipMs: Number((performance.now() - start).toFixed(2))};
});
console.log(JSON.stringify({
  audit: 'English Mastery reliability audit',
  synthetic_only: true,
  metrics,
  storage_failure: {ok: failure.result.ok, preserved_last_good: failure.preserved},
  malformed_backup_rejection: malformed.map(row => ({name: row.name, rejected: row.rejected})),
  handover: {zip_bytes: handover.zip.bytes.length, entries: handover.zip.entries.map(row => row.name), synthetic_recording_metrics: handoverMetrics}
}, null, 2));
