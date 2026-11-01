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

## Owner-controlled iPhone staging runbook

Use two separate Cloudflare projects and the same PR branch. Do not use a raw GitHub proxy and do not point either project at `main`.

1. **Pages staging:** create a new Cloudflare Pages project from this repository, set the production branch to `codex/v5-7-on-demand-heart`, leave the build command empty, and use `.` as the static output directory. Keep the real GitHub Pages project unchanged. Record the resulting stable URL, for example `https://your-v59-staging.pages.dev`.
2. **Worker staging:** create/connect a Worker from the same repository and branch, set `Root directory` to `worker`, and deploy with `npx wrangler deploy`. Before deploying, replace the public placeholder `TTS_ALLOWED_ORIGIN` in `worker/wrangler.toml` with the exact Pages staging origin (scheme and host only, no trailing slash). Never replace it with `*` or the formal GitHub Pages URL.
3. In Worker Variables, keep `TTS_AUTH_MODE=pairing`, `TTS_REQUESTS_PER_MINUTE=10`, `TTS_DAILY_LIMIT=100`, and `TTS_TIMEOUT_MS=45000`. Add encrypted Secrets `GEMINI_API_KEY` and a long random `TTS_PAIRING_CODE`. Do not paste either secret into GitHub, Pages, this repository, or chat. KV is optional; if it is not bound, the UI and response header state that the quota is isolate-best-effort.
4. Open the Worker URL's `/health` in Safari, then enter `https://your-worker.workers.dev/v1/tts` in the staging site's Settings. Choose `iPhone一次性配对码`, enter the pairing code once, and press `建立本机Gemini会话` followed by `检测Gemini会话`. The code is exchanged for a short-lived session token and is not saved; closing Safari may require pairing again.
5. Select `Gemini云端`, open an authorized story, and play it. The first request should produce a WAV and cache it in IndexedDB; replay the same segment to verify the second play does not call the Worker. Use only non-sensitive practice text because Google's free-tier terms may allow product improvement use.

Before trusting the staging site, check from the Pages origin in Safari that `/v1/session/exchange` preflight returns `204` with `access-control-allow-origin` exactly equal to the Pages origin and `access-control-allow-credentials: true`. A different origin, a trailing slash, an old Worker deployment, or a preview URL not present in `TTS_ALLOWED_ORIGIN` must fail closed.

## When Workers Builds creation shows only three command fields

Cloudflare documents Git branch and Root directory under the project's Build settings; they may not appear in the first creation form. Use this safe sequence:

- Project name: `english-cultivation-gemini-v59-staging` (new name; do not select an existing Worker).
- Build command: leave empty.
- Deploy command: `test "$WORKERS_CI_BRANCH" = "codex/v5-7-on-demand-heart" || { echo "Refusing non-PR branch"; exit 1; }; cd worker && npx wrangler deploy`.
- Preview command: leave empty for this credential-bearing staging Worker.
- After the project is created, open **Settings → Builds → Build configuration**, set Git branch to `codex/v5-7-on-demand-heart`, and set Root directory to `worker` if the field is available. If Root directory is set, the deploy command can be shortened to `test "$WORKERS_CI_BRANCH" = "codex/v5-7-on-demand-heart" || exit 1; npx wrangler deploy`.

The branch guard is intentional: if Cloudflare tries its default `main` before the branch setting is changed, the build exits before Wrangler can deploy anything. Confirm the Worker name shown by Wrangler is `english-cultivation-gemini-v59-staging`; stop if Cloudflare reports an existing resource with that name.
