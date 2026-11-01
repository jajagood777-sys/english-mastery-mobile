# Gemini TTS Worker (staging reference)

This Worker is a private gateway reference. It is not deployed by this repository and contains no API key or client token.

`POST /v1/tts` accepts `{text, voice, style, textHash}` and calls Google's documented `POST https://generativelanguage.googleapis.com/v1beta/interactions` with model `gemini-3.8-flash-tts`. The response is the unary WAV format documented by Google (24 kHz, mono, 16-bit PCM). `GEMINI_API_KEY` is a Worker secret only. `TTS_CLIENT_TOKEN` is a separate short-lived/private gateway credential; it is never the Gemini key. Set one exact `TTS_ALLOWED_ORIGIN` before browser use.

The Worker enforces bearer authorization, origin-scoped CORS, request size/text limits, normalized SHA-256 matching, a bounded per-IP request rate, and a bounded upstream timeout. It does not log submitted text or audio. It does not use Cloudflare Cache or public R2 for private learning material. The browser's existing IndexedDB audio store is the durable user cache; Worker isolates may restart and are not a durable cache.

A production browser binding needs an authenticated session/token mechanism (for example Cloudflare Access or a private token broker). Do not place `GEMINI_API_KEY` in Pages JavaScript, localStorage, JSON/ZIP learning packs, GitHub Actions logs, or this repo. Cloudflare deployment and secret configuration require the owner's account authorization and are intentionally not performed here.

Google AI Pro access does not itself prove Gemini API quota. API availability, model access, free-tier quota, regional restrictions, and Google's free-tier data-use terms must be checked with the owner's API project. The free tier is quota-limited, not unlimited, and may allow Google to use free-tier content to improve products according to the current pricing terms.
