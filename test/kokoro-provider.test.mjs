import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cacheFile,textHash,normalizeText,ENGINE_VERSION} from '../server/kokoro-provider.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('private provider uses the shared text hash contract and bounded cache keys',()=>{
 const text='  New sentence  for   Heart. ';assert.equal(normalizeText(text),'New sentence for Heart.');const hash=textHash(text);assert.equal(hash.length,64);assert.match(cacheFile('af_heart',hash),/af_heart-[a-f0-9]{64}\.mp3$/);assert.equal(ENGINE_VERSION,'kokoro-js@1.2.1-q8');assert.throws(()=>cacheFile('../../etc',hash));
});
test('private provider is not a public Pages route and never embeds a secret',()=>{const source=read('server/kokoro-provider.mjs'),docs=read('server/README.md');assert.match(source,/TTS_SHARED_SECRET/);assert.match(source,/Bearer/);assert.match(source,/private-audio-cache/);assert.doesNotMatch(source,/gh[pousr]_[A-Za-z0-9]{20,}/);assert.match(docs,/private reverse proxy/);});
