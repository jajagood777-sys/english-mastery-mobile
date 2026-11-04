import {buildBattleReport, migrateBackupPayload, mergeBackupState, persistState, validateBackup} from '../core.mjs';
import {handoverEntries, zipStore} from '../handover.mjs';

const BASE_TIME = Date.parse('2026-10-01T00:00:00.000Z');

const iso = offsetMs => new Date(BASE_TIME + offsetMs).toISOString();

export function syntheticBackup({itemCount = 1000, sessionCount = 100, days = 30} = {}) {
  const items = Array.from({length: itemCount}, (_, index) => {
    const word = index % 2 === 0;
    return word
      ? {id: `w:synthetic:${index}`, kind: 'word', target: `target-${index}`, example: `We practice target-${index} in context.`, status: index % 3 === 0 ? 'K' : index % 3 === 1 ? 'V' : 'N', attempts: index % 4, dueAt: iso((index % days) * 86400000)}
      : {id: `s:synthetic:${index}`, kind: 'sentence', text: `Synthetic sentence ${index} gives a stable recovery fixture.`, status: index % 3 === 0 ? 'K' : index % 3 === 1 ? 'V' : 'N', attempts: index % 4, dueAt: iso((index % days) * 86400000)};
  });
  const sessions = Array.from({length: sessionCount}, (_, index) => ({
    id: `session:synthetic:${index}`,
    startedAt: iso((index % days) * 86400000),
    endedAt: iso((index % days) * 86400000 + 180000),
    activeMs: 90000 + index * 100,
    mode: 'journey',
    packId: `pack:synthetic:${index % days}`,
    count: 10,
    K: 4,
    V: 3,
    N: 3
  }));
  const attempts = Array.from({length: itemCount * 2}, (_, index) => {
    const itemIndex = index % itemCount;
    const status = index % 3 === 0 ? 'K' : index % 3 === 1 ? 'V' : 'N';
    return {
      id: `attempt:synthetic:${index}`,
      sessionId: `session:synthetic:${index % sessionCount}`,
      itemId: items[itemIndex].id,
      kind: items[itemIndex].kind,
      answer: status === 'N' ? '' : `answer-${itemIndex}`,
      status,
      prompt_used: index % 7 === 0,
      viewed_answer: index % 11 === 0,
      retry_answer: index % 13 === 0 ? `retry-${itemIndex}` : '',
      retried_after_error: index % 13 === 0,
      at: iso((index % days) * 86400000 + 30000)
    };
  });
  const readings = Array.from({length: days}, (_, index) => ({
    id: `reading:synthetic:${index}`,
    title: `Synthetic Reading ${index}`,
    text: `A synthetic article ${index} contains enough text to test backup restoration without personal material.`,
    source: 'Synthetic fixture'
  }));
  const readingMarks = Array.from({length: Math.min(itemCount, 300)}, (_, index) => ({
    readingId: readings[index % readings.length].id,
    sourceTitle: readings[index % readings.length].title,
    paragraphIndex: index % 4,
    position: index,
    wordText: `marked-${index}`,
    normalizedWord: `marked-${index}`,
    originalSentence: `The marked-${index} expression appears in a synthetic sentence.`,
    savedStatus: index % 2 === 0 ? 'SAVED' : 'UNSAVED',
    savedItemId: index % 2 === 0 ? items[index].id : null
  }));
  const transferAttempts = Array.from({length: 120}, (_, index) => ({
    id: `transfer:synthetic:${index}`,
    taskId: `task:synthetic:${index}`,
    taskType: index % 2 ? 'speaking' : 'writing',
    prompt: `Use synthetic expression ${index} in a new context.`,
    firstAnswer: `First answer ${index}`,
    firstSubmittedAt: iso((index % days) * 86400000 + 45000),
    retryAnswer: index % 4 === 0 ? `Retry answer ${index}` : '',
    retrySubmittedAt: index % 4 === 0 ? iso((index % days) * 86400000 + 60000) : null,
    hintUsed: index % 5 === 0,
    referenceViewed: index % 9 === 0,
    rating: index % 3 === 0 ? 'K' : index % 3 === 1 ? 'V' : 'N',
    packId: `pack:synthetic:${index % days}`,
    journeyId: `journey:synthetic:${index % sessionCount}`
  }));
  const reports = sessions.map(session => buildBattleReport({
    session,
    attempts: attempts.filter(attempt => attempt.sessionId === session.id),
    items,
    now: new Date(session.endedAt)
  }));
  return {
    version: 4.3,
    items,
    attempts,
    sessions,
    readings,
    readingMarks,
    readingChecks: [],
    weaknesses: [],
    transferAttempts,
    reports,
    dailyPack: {packId: 'pack:synthetic:today', title: 'Synthetic daily pack'},
    packHistory: Array.from({length: days}, (_, index) => ({packId: `pack:synthetic:${index}`, title: `Synthetic pack ${index}`})),
    dailyJourney: {
      packId: 'pack:synthetic:today',
      steps: ['words', 'sentences', 'reading', 'listening', 'transfer'],
      index: 3,
      completed: [{stage: 'words', status: 'completed'}],
      sessionIds: sessions.slice(0, 3).map(session => session.id),
      readingDoneIds: readings.slice(0, 2).map(reading => reading.id),
      transferAttempts: transferAttempts.slice(0, 2),
      readingRecallAttempts: [],
      transferRecordingIds: {'task:synthetic:1': ['recording:synthetic:1']}
    },
    settings: {duration: 40, speechRate: .9, theme: 'system'}
  };
}

export class FaultStorage {
  constructor(initial = '') {
    this.value = initial;
    this.failNext = false;
  }
  getItem() { return this.value; }
  setItem(_key, value) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('synthetic quota exceeded');
    }
    this.value = String(value);
  }
}

export function roundTripBackup(raw) {
  const serialized = JSON.stringify(raw);
  const restored = migrateBackupPayload(JSON.parse(serialized));
  const isolated = mergeBackupState({items: [], attempts: [], sessions: [], readings: [], readingMarks: [], readingChecks: [], weaknesses: [], transferAttempts: [], reports: [], packHistory: []}, restored);
  const repeated = mergeBackupState(isolated, restored);
  return {serialized, restored, isolated, repeated};
}

export function assertHandoverPaths() {
  const packageData = handoverEntries({
    report: {report_id: 'report:synthetic', session_id: 'session:synthetic', pack_id: 'pack:synthetic'},
    feedback: {feedback_schema_version: '1.0', is_learning_pack: false},
    recordings: [{id: '../synthetic\\recording', mimeType: 'audio/webm', bytes: new Uint8Array([1, 2, 3])}]
  });
  const zip = zipStore(packageData.entries);
  const names = zip.entries.map(entry => entry.name);
  if (names.some(name => name.startsWith('/') || name.split('/').includes('..'))) throw new Error('handover path traversal guard failed');
  return {packageData, zip};
}

export function persistFailureProbe() {
  const previous = JSON.stringify({version: 4.3, sentinel: 'known-good'});
  const storage = new FaultStorage(previous);
  storage.failNext = true;
  const result = persistState(storage, 'state', {version: 4.3, sentinel: 'new'}, previous);
  return {result, preserved: storage.getItem() === previous};
}

export function malformedBackupProbe() {
  const cases = [
    {name: 'invalid readings container', value: {items: [], attempts: [], sessions: [], readings: 'bad'}},
    {name: 'duplicate item IDs', value: {items: [{id: 'w:1', kind: 'word', target: 'one'}, {id: 'w:1', kind: 'word', target: 'one'}], attempts: [], sessions: []}},
    {name: 'invalid reading row', value: {items: [], attempts: [], sessions: [], readings: [{id: 'r'}]}}
  ];
  return cases.map(testCase => {
    try {
      validateBackup(testCase.value);
      return {...testCase, rejected: false};
    } catch (error) {
      return {...testCase, rejected: true, message: error.message};
    }
  });
}
