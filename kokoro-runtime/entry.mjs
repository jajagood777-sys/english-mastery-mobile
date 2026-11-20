// Browser-only engine entry, built on CI from exact npm versions.
// Do not bundle model weights. Download happens only from a user click in the isolated lab.
import { env } from '@huggingface/transformers';
import { KokoroTTS } from 'kokoro-js';
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.wasmPaths = new URL('./', import.meta.url).href;
export { KokoroTTS };
