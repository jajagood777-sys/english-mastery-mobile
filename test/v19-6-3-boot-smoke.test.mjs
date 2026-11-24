import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v19.8.3: app.js defines renderPwaUpdateBanner and lexicon drawer state variables (no boot ReferenceError)', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function renderPwaUpdateBanner\s*\(/);
  assert.match(app, /let lexiconDrawerOpen\s*=/);
  assert.match(app, /let lexiconQuery\s*=/);
  assert.match(app, /let aiDictLoading\s*=/);
  assert.match(app, /let aiDictReplyText\s*=/);
  assert.match(app, /let aiDictAutoRunQuery\s*=/);
});

test('v19.8.3: sw.js uses Network-First for JS/MJS/CSS to prevent ES-module cache skew', () => {
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /english-cultivation-static-v19\.8\.3/);
  assert.match(sw, /\\\.\(\?:m\?js\|css\)\$/);
});
