# English Cultivation checkpoint

## V3.2 batches

- Batch A complete: V3.1 audit finished; baseline `npm run check` passes 14/14; workspace was clean before V3.2 changes.
- Batch B complete: precise answer checks (exact, case/punctuation, minor spelling, incorrect), retry-after-error with separate initial/retry records, adaptive review intervals, tags/status/source filters, and richer battle-report attempt details.
- Batch C complete: home review queue shows due/weak/new counts; daily pack preview shows date/source/counts and duplicate quality messages; normalized pack duplicates are removed without changing existing progress.
- Batch D complete: CSV/pack tags and source/status filters covered by tests and mobile smoke.
- Batch E: Reading Chamber and richer listening material remain intentionally deferred; browser SpeechSynthesis listening remains available.
- Batch F next: final full test, commit, push, and Pages verification.

- Base project preserved from English Mastery V2; no new repository created.
- V3.2 preserves: Chinese navigation/help, explicit Words/Sentences/Mixed mode switching with confirmation, touch-to-focus cloze inputs, distinct sentence Missing Words vs Full Sentence Recall, daily learning-pack JSON import and today-only queues.
- Preserved: K/V/N, due review, browser speech synthesis, CSV/TXT/Markdown/paste import, duplicate-safe merge, local backups, V1/V2 migration, V3 battle reports, Day/Night theme, and PWA shell.
- Data safety: old `english-mastery-v1` storage is read and migrated without deletion; V2/V3 backups receive V4 defaults; saved reports and daily-pack metadata merge without resetting progress. Public repository contains generic demo data only.
- Tests: 18 core tests pass; Chromium iPhone 390×844 smoke passes for Chinese navigation, mode selection/switch confirmation, cloze focus, sentence mode separation, JSON pack preview/import, today's-only queue controls, retry-after-error, and no horizontal overflow. Continue-original-session and PWA cache `english-cultivation-static-v3.2.0` checks pass. Physical iPhone verification remains pending.
- Deployment: V3.1 source is live at the existing URL; V3.2 changes are pending the next commit/push.
- Live URL: `https://jajagood777-sys.github.io/english-mastery-mobile/`.
