---
name: pwa-release-audit
description: Verify English Cultivation GitHub Pages PWA release version consistency, service worker cached asset paths, install/offline behavior and rollback. Use before or after a public site deployment or when users see stale versions/404s; not for daily learning.
---
# English Cultivation — PWA Release and Offline Reliability

A GitHub merged commit, a GitHub Actions green check, a Pages build and **actual HTTPS resources** are different stages. In particular, if any entry in `sw.js` `cache.addAll(ASSETS)` is missing, the install can fail and offline behavior can break.

## First run the local no-network audit

```bash
node .agents/skills/pwa-release-audit/scripts/check-bundle.mjs
npm run check
```

The script compares `package.json` version, `core.mjs` `APP_VERSION`, `sw.js` cache marker, checks unique static asset paths and their actual presence, and validates the PWA manifest icon. It does not fetch the web or mutate any cache. The numerical `VERSION` in core is the **backward-compatible learning data schema** and may differ from the patch software version on purpose.

## After user-authorized release

1. Record original main SHA, PR number, CI run SHA, check conclusion and merge SHA. Never push unrelated changes or change `localStorage` to fix a cache issue.
2. Verify Pages build success, then fetch actual `index.html`, `app.js`, `core.mjs`, `sw.js`, `manifest.webmanifest` and referenced images over HTTPS. A CI pass does not guarantee the remote site has updated.
3. Check assets load with appropriate HTTP status/content type, and that the browser has switched SW cache to the new marker.
4. Use a fresh/disposable browser profile to test offline first-load after online installation, repeat refresh, and a reload after version upgrade. Preserve user's original Safari profile and storage.
5. If update is stale, inspect SW lifecycle rather than telling user to clear site storage: doing so can erase unique local learning history. Ask the user to export their backup first before any risky action.
6. Compare current and previous asset manifests for missing files and changed paths. No unverified release claims.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

## Result contract

- LOCAL ASSET AUDIT: pass/fail.
- CI: name/run ID/commit/status.
- PAGES: build status and verified public URLs.
- LIVE BROWSER: online/offline update behavior with emulator/device specified.
- REAL IPHONE SAFARI: unknown until user verifies it; cannot claim based on CI or Chromium alone.
- Safety notes and next action.
