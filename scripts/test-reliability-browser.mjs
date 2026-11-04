import {chromium} from 'playwright-core';
import {accessSync, constants} from 'node:fs';
import assert from 'node:assert/strict';

const executablePath = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/google/chrome/chrome'].find(path => {
  try { accessSync(path, constants.X_OK); return true; } catch { return false; }
});
if (!executablePath) throw Error('No Chromium executable');

const browser = await chromium.launch({headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage']});
const page = await browser.newPage({viewport: {width: 390, height: 844}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const state = {
  version: 4.3,
  items: [{id: 'w:recovery', kind: 'word', target: 'recovery', example: 'A careful backup supports recovery.', status: 'K', attempts: 1}],
  attempts: [{id: 'attempt:recovery', itemId: 'w:recovery', status: 'K', answer: 'recovery'}],
  sessions: [], reports: [], readings: [], readingMarks: [], readingChecks: [], weaknesses: [], transferAttempts: [],
  dailyPack: null, dailyJourney: null, packHistory: [],
  activeSession: {id: 'session:paused', mode: 'words', scope: 'all', queue: ['w:recovery'], index: 0, running: true, startedAt: '2026-11-03T00:00:00.000Z', activeMs: 12000},
  settings: {duration: 40, speechRate: .9, theme: 'system', onboardingSeen: true}
};

try {
  await page.addInitScript(({state: initial}) => {
    localStorage.setItem('central-english-mastery.v2', JSON.stringify(initial));
  }, {state});
  await page.goto('http://127.0.0.1:4175/', {waitUntil: 'domcontentloaded'});
  assert.match(await page.locator('#app').innerText(), /继续上次训练/);
  const afterLoad = await page.evaluate(() => JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(afterLoad.items[0].status, 'K');
  assert.equal(afterLoad.attempts[0].answer, 'recovery');
  await page.reload({waitUntil: 'domcontentloaded'});
  assert.match(await page.locator('#app').innerText(), /继续上次训练/);
  const afterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('central-english-mastery.v2')));
  assert.equal(afterReload.attempts.length, 1);
  assert.equal(afterReload.reports.length, 0);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({width, height: 844});
    const overflow = await page.evaluate(() => ({scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth}));
    assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `horizontal overflow at ${width}px`);
  }
  console.log('RECOVERY RELOAD AND MOBILE OVERFLOW PASS');

  await page.addInitScript(() => localStorage.setItem('central-english-mastery.v2', '{invalid-json'));
  await page.goto('http://127.0.0.1:4175/', {waitUntil: 'domcontentloaded'});
  assert.match(await page.locator('#app').innerText(), /把今天的英语/);
  assert.deepEqual(errors, []);
  console.log('MALFORMED LOCAL STORAGE FALLBACK PASS');
} finally {
  await browser.close();
}
