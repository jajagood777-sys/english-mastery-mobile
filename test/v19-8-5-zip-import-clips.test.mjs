import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import { importSpeechClips, speechTextHash } from '../speech-clips.mjs';

function makeMockIndexedDb() {
  const storeMap = new Map();
  return {
    open() {
      const req = {};
      queueMicrotask(() => {
        const dbObj = {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => ({}),
          close() {},
          transaction(_store, _mode) {
            const tx = {
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore() {
                return {
                  get(key) {
                    const r = {};
                    queueMicrotask(() => {
                      r.result = storeMap.get(key);
                      r.onsuccess?.();
                      tx.oncomplete?.();
                    });
                    return r;
                  },
                  put(row) {
                    storeMap.set(row.key, row);
                    queueMicrotask(() => {
                      tx.oncomplete?.();
                    });
                  }
                };
              }
            };
            return tx;
          }
        };
        req.result = dbObj;
        req.onsuccess?.();
      });
      return req;
    },
    _storeMap: storeMap
  };
}

test('v20.0.1 importSpeechClips imports manifest clips without ReferenceError on parsed and preserves pack_id/engine', async () => {
  const prevIdb = globalThis.indexedDB;
  const mockIdb = makeMockIndexedDb();
  globalThis.indexedDB = mockIdb;
  try {
    const text = 'The morning train crossed a desolate district.';
    const sha256 = await speechTextHash(text);
    const mp3Bytes = new Uint8Array(128).fill(0x49);
    const fileSha256 = createHash('sha256').update(mp3Bytes).digest('hex');
    const manifestObj = {
      version: 1,
      pack_id: 'EN-DAILY-20261125-R11-V1984-001',
      voice: 'af_heart',
      engine: 'kokoro-js@1.2.1-q8',
      clips: [
        {
          file: 'clip_001.mp3',
          text,
          voice: 'af_heart',
          sha256,
          bytes: mp3Bytes.byteLength,
          fileSha256,
          category: 'sentences'
        }
      ]
    };
    const manifestJson = JSON.stringify(manifestObj);
    const manifestFile = {
      name: 'speech-manifest.json',
      size: Buffer.byteLength(manifestJson),
      type: 'application/json',
      text: async () => manifestJson,
      arrayBuffer: async () => Buffer.from(manifestJson).buffer
    };
    const audioFile = {
      name: 'clip_001.mp3',
      size: mp3Bytes.byteLength,
      type: 'audio/mpeg',
      arrayBuffer: async () => mp3Bytes.buffer.slice(mp3Bytes.byteOffset, mp3Bytes.byteOffset + mp3Bytes.byteLength)
    };
    const summary = await importSpeechClips([manifestFile, audioFile]);
    assert.equal(summary.imported, 1);
    assert.equal(summary.missing, 0);
    const saved = mockIdb._storeMap.get(`af_heart:${sha256}`);
    assert.ok(saved, 'clip should be saved to IndexedDB');
    assert.equal(saved.packId, 'EN-DAILY-20261125-R11-V1984-001');
    assert.equal(saved.engine, 'kokoro-js@1.2.1-q8');
  } finally {
    globalThis.indexedDB = prevIdb;
  }
});

test('v20.0.1 speech-clips.mjs contains zero stray parsed.pack_id or parsed.engine references', () => {
  const src = readFileSync(new URL('../speech-clips.mjs', import.meta.url), 'utf8');
  assert.equal(/\bparsed\.pack_id\b/.test(src), false);
  assert.equal(/\bparsed\.engine\b/.test(src), false);
});
