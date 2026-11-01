# Private on-demand Kokoro provider

This is a deployment reference, not a public Pages service. Run it only on a private VM/container or behind an authenticated private gateway. It requires Node 20+, `ffmpeg`, `kokoro-js@1.2.1`, and `TTS_SHARED_SECRET`; no secret belongs in the frontend, a learning JSON, or this repository.

`POST /v1/tts` accepts `{text, voice, textHash}` and returns `audio/mpeg`. It validates normalized text, SHA-256, allowed voices (`af_heart`/`af_bella`), request size, and the shared bearer secret. Generated files are cached privately as `<voice>-<sha256>.mp3`; concurrent requests for the same key share one generation promise. The response uses the same text hash and engine metadata contract as `speech-clips.mjs`.

Runtime safeguards are deliberately bounded: `HOST` defaults to `0.0.0.0` for containers, `PORT` is configurable, one active generation is allowed by default, requests are rate-limited per source address, and inference has a 90-second timeout. Set `TTS_ALLOWED_ORIGIN` to one exact HTTPS origin before browser calls; an unset value emits no CORS permission. A private reverse proxy should terminate TLS, authenticate the user and issue a short-lived session token. Never put `TTS_SHARED_SECRET` in public Pages JavaScript or localStorage.

Keep `KOKORO_CACHE_DIR` on private persistent storage when recomputation cost justifies it. Browser IndexedDB remains the user-side cache. This repository does not deploy or provision this service, and no free or 24-hour GPU capacity is assumed.

## Free-tier feasibility boundary

The official Hugging Face Spaces documentation was checked on 2026-11-01. Static Spaces are free, but Gradio/Docker Spaces on CPU Basic require a paid subscription; ZeroGPU is a Gradio-only shared-quota feature, so it is not a private Node endpoint with a durable cache. Google Cloud Run can scale to zero and has a monthly free tier, but its official pricing and billing documentation require an active billing account and do not guarantee zero spend once free quota, storage, or egress is exceeded. GitHub Actions is a batch runner, not a private always-available request endpoint. Therefore no zero-cost, no-card, private server is claimed as deployed here.

A production deployment needs one approved private host/account and a cost limit review. Until then, the browser Kokoro path remains the only live implementation; it has a bounded error instead of an infinite wait, but physical iPhone inference is still an acceptance gate.
