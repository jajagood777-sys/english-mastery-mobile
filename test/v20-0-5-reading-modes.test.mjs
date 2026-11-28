import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { annotateConnectedSpeechAndWeakForms } from '../sla-enhancers.mjs';

test('v20.5.0 reading modes are wired into app.js and styles.css', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(app, /function splitReadingSentences\(/);
  assert.match(app, /function appendProsodyRichText\(/);
  assert.match(app, /function renderEnhancedReadingParagraph\(/);
  assert.match(app, /annotateConnectedSpeechAndWeakForms\(plain\)/);
  assert.match(app, /reading-focus-bar/);
  assert.match(app, /reading-focus-bar/);
  assert.match(app, /reading-mode-compact-strip/);
  assert.match(app, /function extractSpeechAnchorKeywords\(/);
  assert.match(app, /speech-plan-banner/);

  assert.match(css, /\.reading-sentence-span\.is-focused-sentence/);
  assert.match(css, /\.reading-sentence-span\.is-dimmed-sentence/);
  assert.match(css, /\.weak-form-ipa/);
  assert.match(css, /\.link-arc/);
  assert.match(css, /body\.pure-book-mode #reading-article/);
});

test('v20.5.0 weak-form prosody helper annotates weak forms, links, and pauses', () => {
  const tokens = annotateConnectedSpeechAndWeakForms('We went to an old house, and for a moment we stood still.');
  assert.ok(tokens.some(t => t.weak && t.weakIpa));
  assert.ok(tokens.some(t => t.linkNext));
  assert.ok(tokens.some(t => t.thoughtBreak));
});
