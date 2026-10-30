# English Cultivation checkpoint

## V3.2 batches

- Batch A complete: V3.1 audit finished; baseline `npm run check` passes 14/14; workspace clean before V3.2 changes.
- Current next batch: B — precise retrieval checks, retry-after-error, and review scheduling.

- Base project preserved from English Mastery V2; no new repository created.
- V3.1 in progress: Chinese navigation/help, explicit Words/Sentences/Mixed mode switching with confirmation, touch-to-focus cloze inputs, distinct sentence Missing Words vs Full Sentence Recall, daily learning-pack JSON import and today-only queues.
- Preserved: K/V/N, due review, browser speech synthesis, CSV/TXT/Markdown/paste import, duplicate-safe merge, local backups, V1/V2 migration, V3 battle reports, Day/Night theme, and PWA shell.
- Data safety: old `english-mastery-v1` storage is read and migrated without deletion; V2/V3 backups receive V4 defaults; saved reports and daily-pack metadata merge without resetting progress. Public repository contains generic demo data only.
- Tests: 14 core tests pass; Chromium iPhone 390×844 smoke passes for Chinese navigation, mode selection/switch confirmation, cloze focus, sentence mode separation, JSON pack preview/import, today's-only queue controls, and no horizontal overflow. Continue-original-session and PWA cache `english-cultivation-static-v3.1.0` smoke checks pass. Physical iPhone verification remains pending.
- Deployment: source commit `00d7e1c` is pushed to the existing `main` branch; Pages status is `built`; live Chinese navigation, HTTPS resources, and v3.1 service-worker cache have been verified.
- Live URL: `https://jajagood777-sys.github.io/english-mastery-mobile/`.
