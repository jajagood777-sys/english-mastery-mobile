import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('v20.1.0 Speech Chamber uses compact player, synced scrolling subtitles, tap-to-seek, and single-sentence loop', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(app, /speech-compact-player/);
  assert.match(app, /speech-subtitle-panel/);
  assert.match(app, /buildAutoSyncedSegments\(\{title:speech\.title,text:speech\.scriptEn\},0\)/);
  assert.match(app, /rescaleSyncedSegments\(speechSegments,audio\.duration\)/);
  assert.match(app, /🔁 单句循环/);
  assert.match(css, /\.speech-compact-player/);
  assert.match(css, /\.speech-subtitle-list/);
});
