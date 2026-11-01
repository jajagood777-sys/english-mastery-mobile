# V5.4 Kokoro isolated experiment — 2026-11-01

## Verified baseline
- GitHub main package.json version 5.3.1; existing index.html uses restrictive same-origin CSP.
- Existing CODEX_CHECKPOINT.md contains prior feasibility research, not a proven Kokoro integration.
- No matching Kokoro development branch found by GitHub branch search.
- New branch: `work/v5-4-kokoro-isolated-prototype-20261101`.

## Work completed
- Added standalone `kokoro-test.html` and `kokoro-test.mjs` on isolated branch only.
- Requires explicit model download click; defaults to Heart, offers Bella.
- Sentence and ~180-word original story; WAV synthesis/playback/download controls; errors and load timing.
- No import of app.js, no localStorage/IndexedDB calls, no service worker modification, no model in default PWA precache.
- Experimental pinned esm.sh module import; production must vendor/build and audit same-origin runtime and verify license/dependencies.

## Verification status
- GitHub commits succeeded for both files.
- Browser loading, module resolution, model downloads, WASM execution, audio generation and real iPhone Safari playback: **NOT VERIFIED**.
- No live preview deployment is claimed. No production changes, no main merge.
- Container network npm registry access timed out; cannot assert local npm check passed.

## Next
1. Use Work browser / network-enabled CI to test isolated page and inspect console/network failures.
2. Replace CDN experiment with version-locked, locally bundled dependencies and carefully scoped CSP.
3. Confirm actual q8 model size, CORS, redirects, Safari memory and cache.
4. Host an isolated HTTPS preview and verify reachable before giving iPhone audition link.
5. Await user iPhone confirmation before any integration/merge.

## Verified actual neural synthesis — 2026-11-01

- Added `scripts/kokoro-smoke.mjs` and `.github/workflows/kokoro-smoke.yml` to **the existing PR #22**.
- GitHub Actions run https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41276834766 **completed successfully** (job 124760605838).
- Node v20.20.2; `kokoro-js@1.2.1`; model `onnx-community/Kokoro-82M-v1.0-ONNX`; `dtype: q8`; `device: cpu`.
- Model load reported 1,275 ms in CI environment (likely runner/network cache effects; not a cold mobile download benchmark).
- **af_heart**: `kokoro-artifacts/af_heart-sample.wav`, 324,044 bytes, synthesis 2,089 ms.
- **af_bella**: `kokoro-artifacts/af_bella-sample.wav`, 352,844 bytes, synthesis 1,550 ms.
- Both files passed RIFF/WAVE header and nonempty-length checks; artifacts uploaded successfully.
- Artifact: https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41276834766/artifacts/13071606651 (expires ~2026-11-08).
- npm install audit warned **3 high severity vulnerabilities** in experimental dependency tree; investigate before any production integration.
- **Not yet verified:** actual listening/playback on browser, iPhone Safari WASM execution, CSP compatibility, isolated HTTPS preview, and story-length synthesis. Do not merge or change default TTS.
- Local container npm/Hugging Face requests failed DNS resolution; GitHub Actions successfully worked around this limitation.
- Current deliverable is a real downloadable WAV artifact, **not** a browser-based mobile synthesis preview.
