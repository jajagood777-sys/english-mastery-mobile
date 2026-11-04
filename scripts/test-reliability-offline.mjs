import {chromium} from 'playwright-core';
import {accessSync, constants} from 'node:fs';
import assert from 'node:assert/strict';

const executablePath = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/opt/google/chrome/chrome'].find(path => {
  try { accessSync(path, constants.X_OK); return true; } catch { return false; }
});
if (!executablePath) throw Error('No Chromium executable');

const browser = await chromium.launch({headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage']});
const context = await browser.newContext();
const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:4175/', {waitUntil: 'networkidle'});
  await page.evaluate(async () => navigator.serviceWorker.ready);
  const cacheState = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys[0]);
    return {keys, hasApp: Boolean(await cache.match('./app.js')), hasCore: Boolean(await cache.match('./core.mjs'))};
  });
  assert.deepEqual(cacheState.keys, ['english-cultivation-static-v9.0.0']);
  assert.equal(cacheState.hasApp, true);
  assert.equal(cacheState.hasCore, true);
  await context.setOffline(true);
  await page.reload({waitUntil: 'domcontentloaded'});
  assert.match(await page.locator('#app').innerText(), /今日修炼/);
  console.log('SERVICE WORKER OFFLINE APP-SHELL PASS');
} finally {
  await browser.close();
}
