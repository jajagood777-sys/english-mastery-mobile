import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_VERSION,
  compareAnswer,
  persistState,
  addActiveInterval,
  summarizeSessionTime,
  replayFsrsShadowHistory,
  migrateBackupPayload
} from '../core.mjs';

test('v19.2.0 Blind Grading Audit: accepts UK/US variants & curly quotes while rejecting meaning-changing errors', () => {
  assert.equal(APP_VERSION, '19.2.0');
  // Accepted UK/US variants (preserves original user text verbatim)
  const uk1 = compareAnswer('colour', 'color');
  assert.equal(uk1.status, 'correct');
  assert.equal(uk1.variant_accepted, true);
  assert.equal(uk1.user, 'colour');

  const uk2 = compareAnswer('We need to organise the programme.', 'We need to organize the program.');
  assert.equal(uk2.status, 'correct');
  assert.equal(uk2.variant_accepted, true);

  // Holdout UK/US pair
  const uk3 = compareAnswer('neighbour', 'neighbor');
  assert.equal(uk3.status, 'correct');

  // iPhone smart apostrophe / quote normalization
  const smartQ = compareAnswer('don’t', "don't");
  assert.equal(smartQ.status, 'case_or_punctuation');

  // Meaning-changing / tense errors MUST still be rejected
  assert.equal(compareAnswer('leave', 'live').status, 'incorrect');
  assert.equal(compareAnswer('go', 'went').status, 'incorrect');
  assert.equal(compareAnswer('borrow', 'lend').status, 'incorrect');
});

test('v19.2.0 Cross-Tab Stale-Write Guard: older tab revision cannot overwrite newer saved learning state', () => {
  const mem = new Map();
  const storage = {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v)
  };
  const first = persistState(storage, 'store', { stateRevision: 1, attempts: [{ id: 'a1' }] });
  assert.equal(first.ok, true);
  const newer = persistState(storage, 'store', { stateRevision: 2, attempts: [{ id: 'a1' }, { id: 'a2' }] });
  assert.equal(newer.ok, true);
  // Stale tab still at revision 1 tries to overwrite revision 3
  const stale = persistState(storage, 'store', { stateRevision: 1, attempts: [{ id: 'a1' }] });
  assert.equal(stale.ok, false);
  assert.equal(stale.conflict, 'stale_tab_revision');
  assert.equal(JSON.parse(mem.get('store')).attempts.length, 2);
});

test('v19.2.0 Cross-Midnight Asia/Shanghai Continuation & Unstamped FSRS Exclusion', () => {
  // 2026-11-21 23:59:59.500+08:00 to 2026-11-22 00:00:00.500+08:00 (1000ms split across Beijing midnight)
  const start = Date.parse('2026-11-21T23:59:59.500+08:00');
  const end = Date.parse('2026-11-22T00:00:00.500+08:00');
  const buckets = addActiveInterval({}, start, end, 1800);
  assert.equal(buckets['2026-11-21'], 500);
  assert.equal(buckets['2026-11-22'], 500);
  const total = summarizeSessionTime([{ activeMs: 1000, activeByDay: buckets }], '2026-11-21', '2026-11-22');
  assert.equal(total.knownMs, 1000, 'Cross-midnight active ms must be counted exactly once');

  // Missing timestamp or prompted attempt must NOT fabricate FSRS history
  const shadow = replayFsrsShadowHistory([
    { item_id: 'w:1', rating: 'K', prompt_used: false, viewed_answer: false, at: '' },
    { item_id: 'w:2', rating: 'K', prompt_used: true, viewed_answer: false, at: '2026-11-21T12:00:00+08:00' }
  ], new Date('2026-11-22T12:00:00+08:00'));
  assert.equal(shadow.qualifiedIndependentEvents, 0);
  assert.equal(shadow.trackedCards, 0);
});

test('v19.2.0 iPhone 14 Pro Max Guards: IME composition Enter, visualViewport keyboard-open & SW non-destructive update', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('e.isComposing'), 'IME composition Enter guard required');
  assert.ok(appSrc.includes('v19-keyboard-open'), 'visualViewport keyboard-open class required');
  assert.ok(appSrc.includes("addEventListener('controllerchange'"), 'SW non-destructive controllerchange notice required');
  assert.ok(cssSrc.includes('html.v19-keyboard-open .mobile-nav'), 'Keyboard-open bottom nav hide rule required');
});

test('v19.2.0 Pocket Radio iOS Safari Recovery Guard: flushes silent WAV metadata, re-unlocks after background, and never freezes silently on autoplay block', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('try { elA.load(); } catch {}'), 'playUrlOnRadioAudio must call elA.load() after swapping src');
  assert.ok(appSrc.includes('if(document.hidden){radioAudioUnlocked=false;}'), 'visibilitychange(hidden) must reset radioAudioUnlocked for iOS');
  assert.ok(appSrc.includes('点「▶ 继续」立即播放'), 'playRadioPodcastAt must transition to paused ready state instead of silent zombie when ok === false');
});


test('v19.2.0 revision survives backup migration and blocks stale after two successful consecutive writes',()=>{
  const mem=new Map(),store={getItem:key=>mem.get(key)||null,setItem:(key,value)=>mem.set(key,value)};
  const base={stateRevision:0,items:[],attempts:[],sessions:[]};
  const first=persistState(store,'learning',base);
  assert.equal(first.ok,true);assert.equal(first.revision,1);
  const restored=migrateBackupPayload(JSON.parse(first.serialized));
  assert.equal(restored.stateRevision,1);
  restored.attempts.push({id:'first'});
  const second=persistState(store,'learning',restored);
  assert.equal(second.ok,true);assert.equal(second.revision,2);
  assert.equal(migrateBackupPayload(JSON.parse(second.serialized)).stateRevision,2);
  const stale=persistState(store,'learning',base);
  assert.equal(stale.ok,false);assert.equal(stale.conflict,'stale_tab_revision');
  assert.equal(JSON.parse(store.getItem('learning')).attempts[0].id,'first');
});


test('v19.2.0 same-revision storage replacement is never clobbered by an old pagehide save',()=>{
  const memory=new Map();
  const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
  const key='learning';
  const page={stateRevision:0,dailyJourney:{id:'finished',finishedAt:'2026-11-20T12:00:00Z'}};
  const initial=persistState(storage,key,page);
  assert.equal(initial.ok,true);
  const firstRaw=storage.getItem(key);
  const external={...JSON.parse(firstRaw),dailyJourney:{id:'legacy-recovery',finishedAt:null}};
  const restoredRaw=JSON.stringify(external);
  storage.setItem(key,restoredRaw);
  const oldPageExit=persistState(storage,key,{...page,stateRevision:initial.revision},firstRaw);
  assert.equal(oldPageExit.ok,false);
  assert.equal(oldPageExit.conflict,'stale_tab_revision');
  assert.equal(storage.getItem(key),restoredRaw);
  const resumed=persistState(storage,key,external,restoredRaw);
  assert.equal(resumed.ok,true);
  assert.equal(JSON.parse(storage.getItem(key)).dailyJourney.id,'legacy-recovery');
});
