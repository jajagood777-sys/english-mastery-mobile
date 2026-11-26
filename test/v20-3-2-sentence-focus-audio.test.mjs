import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripSpeechMarkdown, speechTextHash, getSpeechClip } from '../speech-clips.mjs';

test('v20.3.3 stripSpeechMarkdown removes **bold** markers without altering text', () => {
  const raw = 'Nadia was a new **apprentice** at the botanical station, and during her first week she focused on finding steady **footing** before trying anything fancy.';
  const clean = 'Nadia was a new apprentice at the botanical station, and during her first week she focused on finding steady footing before trying anything fancy.';
  assert.equal(stripSpeechMarkdown(raw), clean);
});

test('v20.3.3 getSpeechClip matches IndexedDB clips stored with **bold** markers when queried with clean text', async () => {
  const raw = 'Nadia was a new **apprentice** at the botanical station, and during her first week she focused on finding steady **footing** before trying anything fancy.';
  const clean = stripSpeechMarkdown(raw);
  const rawHash = await speechTextHash(raw);
  const fakeBytes = new Uint8Array(128).fill(7).buffer;
  const rows = new Map([[`af_heart:${rawHash}`, { key: `af_heart:${rawHash}`, text: raw, voice: 'af_heart', bytes: fakeBytes, mimeType: 'audio/mpeg' }]]);

  const prevIdb = globalThis.indexedDB;
  globalThis.indexedDB = {
    open() {
      const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        req.result = {
          objectStoreNames: { contains: () => true },
          close() {},
          transaction() {
            const tx = {
              oncomplete: null,
              onerror: null,
              objectStore() {
                return {
                  get(k) {
                    const r = { result: rows.get(k), onsuccess: null, onerror: null };
                    queueMicrotask(() => { r.onsuccess?.(); tx.oncomplete?.(); });
                    return r;
                  },
                  getAll() {
                    const r = { result: [...rows.values()], onsuccess: null, onerror: null };
                    queueMicrotask(() => { r.onsuccess?.(); tx.oncomplete?.(); });
                    return r;
                  },
                };
              },
            };
            return tx;
          },
        };
        req.onsuccess?.();
      });
      return req;
    },
  };
  try {
    const exact = await getSpeechClip(raw, 'af_heart');
    assert.ok(exact && exact.size === 128, 'exact raw lookup should succeed');
    const fromClean = await getSpeechClip(clean, 'af_heart');
    assert.ok(fromClean && fromClean.size === 128, 'clean-text lookup should match raw **bold** IndexedDB clip');
  } finally {
    globalThis.indexedDB = prevIdb;
  }
});

test('v20.3.3 app.js and styles.css preserve raw sentence text, stop audio on sentence switch, and sync natural player state', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(appSrc, /sentenceTracker=\{list:\[\],rawList:\[\],activeIdx:readingFocusSentenceIdx\}/);
  assert.match(appSrc, /speakNaturalOrDevice\(curSentText,\[curSentRaw\]/);
  assert.match(appSrc, /naturalSpeechPlayer\?\.isPlaying\?\.\(\)/);
  assert.match(appSrc, /dockPlayRawList=readingSentenceFocusMode/);
  assert.match(cssSrc, /box-decoration-break:clone/);
});
