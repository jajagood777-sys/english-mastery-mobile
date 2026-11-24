import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeStateProgressScore, pickNewerStateSnapshot } from '../state-mirror.mjs';

test('v19.8.7 pickNewerStateSnapshot recovers newer IndexedDB mirror when same-journey localStorage rolls back or wipes', () => {
  const staleLocal = { stateRevision: 12, attempts: [{ id: 'a1' }], vocabularyAttempts: [], sessions: [], dailyJourney: { id: 'j-today', vocabularyIndex: 0, index: 0 } };
  const newerIdb = { stateRevision: 28, attempts: [{ id: 'a1' }, { id: 'a2' }], vocabularyAttempts: [{ id: 'v1' }], sessions: [{ id: 's1' }], dailyJourney: { id: 'j-today', vocabularyIndex: 25, index: 2 } };
  assert.ok(computeStateProgressScore(newerIdb) > computeStateProgressScore(staleLocal));
  assert.equal(pickNewerStateSnapshot(staleLocal, newerIdb), 'idb');
  assert.equal(pickNewerStateSnapshot(newerIdb, staleLocal), 'local');
  assert.equal(pickNewerStateSnapshot({ stateRevision: 0, attempts: [], dailyJourney: null, dailyPack: null }, newerIdb), 'idb');
});

test('v19.8.7 protects distinct localStorage dailyJourney.id (legacy Safari recovery / backup import) and counts spelling progress', () => {
  const legacyLocal = {
    stateRevision: 0,
    attempts: [],
    dailyJourney: { id: 'legacy-journey', index: 0, spellingIndex: 0, spellingAttempts: [{ taskId: 'sp-1', firstAnswer: 'scramble' }] }
  };
  const finishedIdb = {
    stateRevision: 15,
    attempts: [],
    dailyJourney: { id: 'journey:pack-1:123', index: 1, spellingIndex: 3, spellingAttempts: [{ taskId: 'sp-1' }, { taskId: 'sp-2' }, { taskId: 'sp-3' }] }
  };
  assert.ok(computeStateProgressScore(legacyLocal) >= 2);
  assert.equal(pickNewerStateSnapshot(legacyLocal, finishedIdb), 'local');
});

test('v19.8.7 app.js and sw.js integrate IndexedDB dual-write mirror and controllerchange pre-flush', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(app, /mirrorStateToIdb/);
  assert.match(app, /readStateMirrorFromIdb/);
  assert.match(app, /pickNewerStateSnapshot/);
  assert.match(app, /本地双保险有更新的学习记录，已自动恢复/);
  assert.match(sw, /\.\/state-mirror\.mjs/);
});
