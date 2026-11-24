export const STATE_MIRROR_DB_NAME = 'english-cultivation-state-mirror-v1';
export const STATE_MIRROR_STORE_NAME = 'snapshots';

export function computeStateProgressScore(state = null) {
  if (!state || typeof state !== 'object') return 0;
  const attempts = Array.isArray(state.attempts) ? state.attempts.length : 0;
  const vocab = Array.isArray(state.vocabularyAttempts) ? state.vocabularyAttempts.length : 0;
  const retell = Array.isArray(state.readingRetellingAttempts) ? state.readingRetellingAttempts.length : 0;
  const transfer = Array.isArray(state.transferAttempts) ? state.transferAttempts.length : 0;
  const sessions = Array.isArray(state.sessions) ? state.sessions.length : 0;
  const speechTop = Array.isArray(state.speechAttempts) ? state.speechAttempts.length : 0;
  const readingChecks = Array.isArray(state.readingChecks) ? state.readingChecks.length : 0;
  const j = state.dailyJourney && typeof state.dailyJourney === 'object' ? state.dailyJourney : null;
  const jScore = j
    ? (Number(j.vocabularyIndex) || 0)
      + (Number(j.index) || 0) * 10
      + (Number(j.spellingIndex) || 0)
      + (Array.isArray(j.spellingAttempts) ? j.spellingAttempts.length * 2 : 0)
      + (Array.isArray(j.readingDoneIds) ? j.readingDoneIds.length * 3 : 0)
      + (Array.isArray(j.readingRecallAttempts) ? j.readingRecallAttempts.length : 0)
      + (Array.isArray(j.vocabularyAttempts) ? j.vocabularyAttempts.length : 0)
      + (Array.isArray(j.transferAttempts) ? j.transferAttempts.length * 2 : 0)
      + (Array.isArray(j.speechDoneIds) ? j.speechDoneIds.length * 2 : 0)
    : 0;
  const fsrsCount = state.fsrsState && typeof state.fsrsState === 'object' && !Array.isArray(state.fsrsState) ? Object.keys(state.fsrsState).length : 0;
  const masteredCount = Array.isArray(state.masteredVocabWords) ? state.masteredVocabWords.length : 0;
  return attempts + vocab + retell * 3 + transfer * 2 + sessions * 5 + speechTop + readingChecks + fsrsCount + masteredCount + jScore;
}

export function pickNewerStateSnapshot(localObj = null, idbObj = null) {
  if (!idbObj || typeof idbObj !== 'object') return 'local';
  if (!localObj || typeof localObj !== 'object') return 'idb';
  const localRev = Number(localObj.stateRevision) || 0;
  const idbRev = Number(idbObj.stateRevision) || 0;
  const localScore = computeStateProgressScore(localObj);
  const idbScore = computeStateProgressScore(idbObj);
  const localJourneyId = String(localObj.dailyJourney?.id || '').trim();
  const idbJourneyId = String(idbObj.dailyJourney?.id || '').trim();
  const localPackId = String(localObj.dailyPack?.packId || '').trim();

  // Protect intentional distinct sessions (legacy Safari recovery, manual backup import, or new pack switch):
  // Never overwrite localStorage if it already holds a non-empty, different dailyJourney.id.
  if (localJourneyId && idbJourneyId && localJourneyId !== idbJourneyId) {
    return 'local';
  }
  // If localStorage is completely wiped (no progress, no active journey, no pack) while IDB has real data -> recover.
  if (localScore === 0 && !localJourneyId && !localPackId && idbScore > 0) {
    return 'idb';
  }
  // Same journey (or no conflicting journey): recover only if IDB is strictly ahead.
  if (idbScore > localScore && idbRev >= localRev) return 'idb';
  if (idbRev > localRev && idbScore >= localScore) return 'idb';
  return 'local';
}

function openMirrorDb(indexedDBValue = globalThis.indexedDB) {
  if (!indexedDBValue) return Promise.reject(new Error('IndexedDB unavailable.'));
  return new Promise((resolve, reject) => {
    const req = indexedDBValue.open(STATE_MIRROR_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STATE_MIRROR_STORE_NAME)) {
        req.result.createObjectStore(STATE_MIRROR_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Unable to open state mirror DB.'));
  });
}

export async function mirrorStateToIdb(key, serialized, stateObj = null, { indexedDB: db = globalThis.indexedDB } = {}) {
  if (!key || typeof serialized !== 'string' || !serialized) return false;
  const database = await openMirrorDb(db);
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STATE_MIRROR_STORE_NAME, 'readwrite');
    tx.objectStore(STATE_MIRROR_STORE_NAME).put({
      id: String(key),
      serialized,
      stateRevision: Number(stateObj?.stateRevision) || 0,
      progressScore: computeStateProgressScore(stateObj),
      savedAt: new Date().toISOString()
    });
    tx.oncomplete = () => { database.close(); resolve(true); };
    tx.onerror = () => { database.close(); reject(tx.error || new Error('Failed to mirror state.')); };
  });
}

export async function readStateMirrorFromIdb(key, { indexedDB: db = globalThis.indexedDB } = {}) {
  if (!key) return null;
  const database = await openMirrorDb(db);
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STATE_MIRROR_STORE_NAME, 'readonly');
    const req = tx.objectStore(STATE_MIRROR_STORE_NAME).get(String(key));
    req.onsuccess = () => { database.close(); resolve(req.result || null); };
    req.onerror = () => { database.close(); reject(req.error || new Error('Failed to read state mirror.')); };
  });
}
