# English Cultivation checkpoint

- Base project preserved from English Mastery V2; no new repository created.
- Upgrade: V3 English Cultivation theme, Day/Night/System appearance, 20-minute home dashboard, content-type metadata, structured Battle Reports, Markdown/JSON/Copy/Web Share outputs, local report archive, explicit `NOT_SUBMITTED`/`EXPORTED` handoff state, and service-worker cache `english-cultivation-static-v3.0.0`.
- Preserved: Words & Phrases, Sentences, Mixed Practice, K/V/N, due review, browser speech synthesis, CSV/TXT/Markdown/paste import, duplicate-safe merge, local backups, V1/V2 migration, PWA shell, and history export.
- Data safety: old `english-mastery-v1` storage is read and migrated without deletion; V2 backups receive V3 defaults for reports/theme; public repository contains generic demo data only.
- Tests: 12 core tests pass; Chromium iPhone 390×844 smoke passes for cultivation home, real practice, report creation/archive, theme persistence, service worker, and no horizontal overflow. Physical iPhone verification remains pending.
- Deployment: source commit `86b31ac` is pushed to `main`; GitHub Pages status is `built`; HTTPS URL verified with all static resources returning 200. No external sync is claimed.
- Live URL: `https://jajagood777-sys.github.io/english-mastery-mobile/`.
