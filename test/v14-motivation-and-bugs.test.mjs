import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CULTIVATION_REALMS,
  computeCultivationRealm,
  getAdversityQuote,
  computeGritBadges
} from '../motivation.mjs';

test('cultivation realms progress strictly from authentic local K count and active minutes', () => {
  assert.equal(CULTIVATION_REALMS.length, 8);
  const start = computeCultivationRealm({ items: [], sessions: [] });
  assert.equal(start.realmIndex, 1);
  assert.equal(start.realmName, '初闻言道');
  assert.equal(start.isAuthenticMetric, true);

  const mid = computeCultivationRealm({
    items: Array.from({ length: 30 }, () => ({ status: 'K' })),
    sessions: [{ activeMs: 6000000 }, { activeMs: 3600000 }]
  });
  assert.ok(mid.realmIndex >= 4, 'reaches Breaking Through realm with real K & minutes');
  assert.ok(mid.effortScore === 30 * 3 + 160 + 2 * 2);
});

test('adversity quotes cover all difficulty contexts with bilingual zh/en text', () => {
  for (const ctx of ['home', 'error', 'rehearsal', 'difficult', 'transfer', 'complete']) {
    const q = getAdversityQuote(ctx, 1);
    assert.ok(q.zh.length >= 10);
    assert.ok(q.en.length >= 10);
  }
});

test('grit badges unlock only when authentic local evidence exists', () => {
  const empty = computeGritBadges({});
  assert.equal(empty.every(b => b.unlocked === false), true);

  const earned = computeGritBadges({
    items: Array.from({ length: 20 }, () => ({ status: 'K' })),
    sessions: [{ activeMs: 3600000 }],
    vocabularyAttempts: [{ rehearsalPassed: true }],
    transferAttempts: [
      { firstAnswer: 'First original English paragraph.' },
      { firstAnswer: 'Second original English paragraph.' },
      { firstAnswer: 'Third original English paragraph.' }
    ]
  });
  assert.equal(earned.every(b => b.unlocked === true), true);
});

test('15.1.4 bug fixes are verified in app.js and styles.css', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  // Bug 1: custom queue & dueGoal honored in newSession / startSession
  assert.match(app, /Array\.isArray\(options\.queue\)&&options\.queue\.length/);
  assert.match(app, /dueGoal:Number\(options\.dueGoal\|\|options\.duration/);

  // Bug 2: night theme overrides --card and --bg so new panels stay dark
  assert.match(css, /html\[data-theme="night"\][\s\S]*--card:\s*var\(--theme-card\)/);
  assert.match(css, /html\[data-theme="night"\][\s\S]*--bg:\s*var\(--theme-bg\)/);

  // Bug 3: setPage clears radioTimer
  assert.match(app, /function setPage\(which\)\{if\(radioTimer\)\{clearTimeout\(radioTimer\)/);

  // Bug 4: Pocket Radio checks offline Kokoro clip first
  assert.match(app, /getSpeechClip\(segText,\s*"af_heart"\)/);
  assert.match(app, /pruneOldPackSpeechClips/);
  assert.match(app, /⚡ 5 分钟通勤微冲刺/);

  // Bug 5: no corrupted replacement character in app.js
  assert.equal(app.includes('\ufffd'), false);
});
