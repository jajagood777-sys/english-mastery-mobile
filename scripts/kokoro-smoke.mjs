import { mkdir, readFile, stat } from 'node:fs/promises';
import { KokoroTTS } from 'kokoro-js';
const model = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const dir = 'kokoro-artifacts';
await mkdir(dir, { recursive: true });
console.log('Kokoro smoke test starting', { model, dtype: 'q8', device: 'cpu', node: process.version });
const t0 = performance.now();
const tts = await KokoroTTS.from_pretrained(model, { dtype: 'q8', device: 'cpu' });
console.log('Model ready, ms=', Math.round(performance.now()-t0));
for (const voice of ['af_heart','af_bella']) {
  const started = performance.now();
  const text = "I wasn't expecting the plan to change so suddenly.";
  const audio = await tts.generate(text, { voice });
  const path = dir + '/' + voice + '-sample.wav';
  await audio.save(path);
  const bytes = await readFile(path);
  const header = bytes.subarray(0,4).toString('ascii');
  const wave = bytes.subarray(8,12).toString('ascii');
  if (bytes.length < 1024 || header !== 'RIFF' || wave !== 'WAVE') throw new Error('Invalid WAV '+path+': '+bytes.length+' bytes, '+header+'/'+wave);
  console.log('VERIFIED WAV', { voice, path, bytes: bytes.length, milliseconds: Math.round(performance.now()-started) });
}
