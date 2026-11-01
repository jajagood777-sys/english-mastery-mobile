# Gemini TTS Worker (staging reference)

This Worker is a private gateway reference. It is not deployed by this repository and contains no API key or client token.

`POST /v1/tts` accepts `{text, voice, style, textHash}` and calls Google's documented `POST https://generativelanguage.googleapis.com/v1beta/interactions` with model `gemini-3.8-flash-tts`. The response is the unary WAV format documented by Google (24 kHz, mono, 16-bit PCM). `GEMINI_API_KEY` is a Worker secret only.

## Authentication modes

`TTS_AUTH_MODE=access` is the default and is preferred when a Cloudflare Access application protects the Worker hostname. The browser sends `credentials: include`; it does not receive or store a bearer secret. The Worker verifies the `CF-Access-Jwt-Assertion` signature, issuer, audience, expiry and signing key. `/v1/session` is a credential-free session check after the Access login.

For a `workers.dev` hostname where Access cannot be attached, `TTS_AUTH_MODE=pairing` is the no-subscription fallback. `TTS_PAIRING_CODE` is a Worker secret, not a public token. The iPhone enters it once in the settings page; `/v1/session/exchange` returns a short-lived HMAC session token that the page keeps only in `sessionStorage`. The pairing code is never stored or sent to Google. This is weaker than Access: anyone who obtains the pairing code can use the gateway until it is rotated, so use a long random code and rotate it after device setup. The old constant `TTS_CLIENT_TOKEN` mode remains only for controlled private staging.

Both modes enforce exact-origin CORS, request size/text/style limits, normalized SHA-256 matching, per-IP isolate rate limiting, bounded upstream timeout and sanitized errors. Set `TTS_DAILY_LIMIT` for the per-user daily cap. Bind a private KV namespace as `TTS_QUOTA` to enforce a cross-isolate approximate daily counter; without KV, the response explicitly reports `x-quota-scope: isolate-best-effort` rather than claiming a global quota. KV increments are intentionally conservative and contain no text, audio or email.

The Worker does not log submitted text or audio. It does not use public Cloudflare Cache or R2 for private learning material. The browser's existing IndexedDB audio store is the durable user cache; Worker isolates may restart and are not a durable cache.

Google AI Pro access does not itself prove Gemini API quota. API availability, model access, free-tier quota, regional restrictions, and Google's free-tier data-use terms must be checked with the owner's API project. The free tier is quota-limited, not unlimited, and may allow Google to use free-tier content to improve products according to current pricing terms.

Cloudflare deployment and secret configuration require the owner's account authorization and are intentionally not performed here. Never place `GEMINI_API_KEY`, `TTS_PAIRING_CODE`, or a client session token in Pages JavaScript, localStorage, JSON/ZIP learning packs, GitHub Actions logs, or this repository.
