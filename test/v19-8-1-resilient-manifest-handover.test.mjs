import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpeechManifestPayload } from '../speech-clips.mjs';
import { isSupportedSourcePackSchema, handoverEntries } from '../handover.mjs';

test('v20.2.0 normalizeSpeechManifestPayload accepts both v1 object and legacy top-level array', () => {
  const v1Obj = { version: 1, clips: [{ file: 'a.mp3', text: 'hello', voice: 'af_heart' }] };
  const norm1 = normalizeSpeechManifestPayload(v1Obj);
  assert.equal(norm1.version, 1);
  assert.equal(norm1.clips.length, 1);

  const legacyArr = [{ file: 'audio/b.mp3', text: 'world', voice: 'af_heart' }];
  const norm2 = normalizeSpeechManifestPayload(legacyArr);
  assert.equal(norm2.version, 1);
  assert.equal(norm2.clips.length, 1);
  assert.equal(norm2.clips[0].file.split('/').pop(), 'b.mp3');

  assert.equal(normalizeSpeechManifestPayload({ version: 99 }), null);
});

test('v20.2.0 isSupportedSourcePackSchema and handoverEntries preserve r11-v19.8.0 packs', () => {
  assert.equal(isSupportedSourcePackSchema('2.0'), true);
  assert.equal(isSupportedSourcePackSchema('r11-v19.8.0'), true);
  assert.equal(isSupportedSourcePackSchema('1.0'), false);

  const r11Pack = {
    schema_version: 'r11-v19.8.0',
    pack_id: 'EN-DAILY-20261124-R11-V1980-001',
    title: 'R11 Pack'
  };
  const raw = JSON.stringify(r11Pack);
  const { entries, manifest } = handoverEntries({
    report: { report_id: 'rep:1', session_id: 's1', pack_id: r11Pack.pack_id },
    pack: { packId: r11Pack.pack_id },
    sourcePack: { raw, packId: r11Pack.pack_id, schemaVersion: r11Pack.schema_version }
  });
  assert.equal(manifest.source_pack_included, true);
  assert.equal(manifest.source_pack_id, r11Pack.pack_id);
  assert.equal(entries.some(e => e.name === 'learning-pack.json'), true);
});
