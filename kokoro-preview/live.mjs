// V5.4 isolated browser-only experiment. Not integrated with application storage.
const $ = (id) => document.getElementById(id);
const log = (message) => { $('log').textContent += '\n' + new Date().toISOString() + ' ' + message; };
const setStatus = (message) => { $('status').textContent = message; log(message); };
const sample = "I wasn't expecting the plan to change so suddenly.";
const story = `When Maya opened the old wooden gate, she found a narrow path behind the garden. She had lived in the village for years, yet she had never noticed it before. The path led through tall grass toward a quiet river. A small bridge crossed the water, and beyond it stood a stone house with a blue door. Maya knocked twice. No one answered. Then she heard a soft voice from inside. "The key is under the flowerpot," it said. She looked down and found a silver key wrapped in a piece of paper. The paper carried a simple message: "Every journey begins with a question." Maya smiled. She had plenty of questions, but she decided to start with just one. Why had someone left a key for her? She unlocked the door and stepped into a bright room filled with maps, books, and photographs of places she had never seen. On the table sat a warm cup of tea and another note. "Welcome," it read. "You are exactly where you need to be." Outside, the wind moved gently through the trees. Maya knew her ordinary afternoon had become the beginning of something new.`;
let engine = null;
let audioUrl = null;
let lastBlob = null;
let loading = false;
const clearAudio = () => {
  $('player').pause();
  $('player').removeAttribute('src');
  $('player').load();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null; lastBlob = null; $('download').disabled = true;
};
$('sentence').addEventListener('click', () => { $('text').value = sample; });
$('story').addEventListener('click', () => { $('text').value = story; });
$('stop').addEventListener('click', () => { $('player').pause(); $('player').currentTime = 0; });
$('load').addEventListener('click', async () => {
  if (engine || loading) return;
  loading = true; $('load').disabled = true;
  const start = performance.now();
  try {
    setStatus('Loading pinned kokoro-js browser module. This may require network access.');
    // Same-origin, version-locked browser runtime built in PR CI; no external executable CDN.
    const { KokoroTTS } = await import('./runtime/kokoro-engine.mjs');
    setStatus('Downloading/loading q8 model on CPU/WASM. First run can be large and slow.');
    engine = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm' });
    setStatus('Model loaded in ' + Math.round(performance.now() - start) + ' ms. Ready to synthesize.');
    $('generate').disabled = false;
  } catch (error) {
    setStatus('LOAD FAILED: ' + (error?.stack || String(error)));
    $('load').disabled = false;
  } finally { loading = false; }
});
$('generate').addEventListener('click', async () => {
  if (!engine) return;
  const text = $('text').value.trim();
  if (!text) { setStatus('Enter English text first.'); return; }
  clearAudio(); $('generate').disabled = true;
  const start = performance.now();
  try {
    setStatus('Generating ' + $('voice').value + ' audio…');
    const audio = await engine.generate(text, { voice: $('voice').value });
    // Kokoro-js RawAudio exposes toBlob() for a WAV representation.
    const blob = audio.toBlob();
    if (!(blob instanceof Blob) || blob.size === 0) throw new Error('Generated audio was empty.');
    lastBlob = blob; audioUrl = URL.createObjectURL(blob);
    $('player').src = audioUrl; $('download').disabled = false;
    setStatus('Generated ' + blob.size + ' bytes in ' + Math.round(performance.now() - start) + ' ms. Tap Play to audition.');
  } catch (error) { setStatus('SYNTHESIS FAILED: ' + (error?.stack || String(error))); }
  finally { $('generate').disabled = false; }
});
$('download').addEventListener('click', () => {
  if (!lastBlob || !audioUrl) return;
  const a = document.createElement('a');
  a.href = audioUrl; a.download = 'kokoro-' + $('voice').value + '-test.wav';
  document.body.append(a); a.click(); a.remove();
});
log('No model or audio downloaded yet. iPhone Safari compatibility unverified.');
