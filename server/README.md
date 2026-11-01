# Private on-demand Kokoro provider

This is a deployment reference, not a public Pages service. Run it only on a private VM/container or behind an authenticated private gateway. It requires Node 20+, `ffmpeg`, `kokoro-js@1.2.1`, and `TTS_SHARED_SECRET`; no secret belongs in the frontend or this repository.

`POST /v1/tts` accepts `{text, voice, textHash}` and returns `audio/mpeg`. It validates normalized text, SHA-256, allowed voices, request size, and the shared bearer secret. Generated files are cached privately as `<voice>-<sha256>.mp3`; concurrent requests share one generation promise. The response uses the same text hash and engine metadata contract as `speech-clips.mjs`.

A private reverse proxy should terminate TLS and enforce user authentication/rate limits. Keep `KOKORO_CACHE_DIR` on private persistent storage. This repository does not deploy or provision this service, and no free or 24-hour GPU capacity is assumed. A provider deployment requires an approved private host/account and cost review.
