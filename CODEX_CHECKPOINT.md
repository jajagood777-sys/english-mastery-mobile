# English Cultivation checkpoint

## V3.9 batches

- V3.9 audit complete: localStorage remains the stable store; readings, reports, backups, and migration defaults are preserved. IndexedDB migration is intentionally deferred until a non-destructive migration/rollback test exists.
- Next: V4.0 dashboard trends and final integration.

V3.8 batches

- V3.8 complete: listening-recall mode plays native speech, supports replay and full-sentence dictation comparison, and explicitly avoids pronunciation scoring.
- Next: V3.9 backup/storage audit; IndexedDB only if migration is proven safe.

V3.7 batches

- V3.7 complete: local Reading Chamber preserves imported TXT/Markdown, displays paragraphs, supports native speech, and saves selected English text as existing word/sentence cards.
- Next: V3.8 lightweight listening mode; no audio scoring.

V3.6 batches

- V3.6 complete: progressive metadata hints, keyboard completion, accepted-answer feedback, retry distinction, and mobile focus scrolling added.
- Next: V3.7 reading extraction; advanced reading/listening remain optional after audit.

V3.5 batches

- V3.5 complete: configurable daily new/review limits and difficult-card scope added with existing local scheduling.
- V3.4 batches

- V3.4 audit/fix complete: unlearned cards now enter Learn New Content from every practice entry; explicit sentence targets control cloze, otherwise recall fallback; Asia/Shanghai date keys fix daily-minute boundaries.
- Tests: 21 core tests pass; free-practice new-card mobile smoke passes.
- Next: V3.5 review burden controls and difficult-card training.

## V3.3 batches

- Batch A complete: V3.2 audit and baseline finished; workspace clean; `npm run check` passes 18/18.
- Batch B complete: Learn New Content cards show complete target/context/trusted metadata; Guided Practice adds progressive meaning/first-letter hints; Independent Retrieval remains direct for learned cards; V3.3 metadata fields migrate safely.
- Batch C complete: independent retrieval keeps first answers separate from prompts/retries; accepted_answers are honored; stage-aware K/V/N scheduling and report prompt/learning-stage statistics are verified.
- Batch D complete: home new-content entry, report provenance summary, accepted-answer flow, and learning-package mobile regression are covered.
- Batch E: richer reading/listening material remains deferred by design; native SpeechSynthesis remains available.
- Batch F complete: full npm run check passes 20/20; local and live Chromium iPhone 390x844 new-learning, accepted-answer, retry, and mobile layout checks pass.

## V3.2 batches

- Batch A complete: V3.1 audit finished; baseline `npm run check` passes 14/14; workspace was clean before V3.2 changes.
- Batch B complete: precise answer checks (exact, case/punctuation, minor spelling, incorrect), retry-after-error with separate initial/retry records, adaptive review intervals, tags/status/source filters, and richer battle-report attempt details.
- Batch C complete: home review queue shows due/weak/new counts; daily pack preview shows date/source/counts and duplicate quality messages; normalized pack duplicates are removed without changing existing progress.
- Batch D complete: CSV/pack tags and source/status filters covered by tests and mobile smoke.
- Batch E: Reading Chamber and richer listening material remain intentionally deferred; browser SpeechSynthesis listening remains available.
- Batch F complete: full npm run check passes 18/18; final Chromium iPhone 390x844 and live HTTPS smoke checks pass.

- Base project preserved from English Mastery V2; no new repository created.
- V3.2 preserves: Chinese navigation/help, explicit Words/Sentences/Mixed mode switching with confirmation, touch-to-focus cloze inputs, distinct sentence Missing Words vs Full Sentence Recall, daily learning-pack JSON import and today-only queues.
- Preserved: K/V/N, due review, browser speech synthesis, CSV/TXT/Markdown/paste import, duplicate-safe merge, local backups, V1/V2 migration, V3 battle reports, Day/Night theme, and PWA shell.
- Data safety: old `english-mastery-v1` storage is read and migrated without deletion; V2/V3 backups receive V4 defaults; saved reports and daily-pack metadata merge without resetting progress. Public repository contains generic demo data only.
- Tests: 21 core tests pass; Chromium iPhone 390×844 smoke passes for Chinese navigation, mode selection/switch confirmation, cloze focus, sentence mode separation, JSON pack preview/import, today's-only queue controls, retry-after-error, and no horizontal overflow. Continue-original-session and PWA cache `english-cultivation-static-v3.8.0` checks pass. Physical iPhone verification remains pending.
- Deployment: V3.3 source remains live; V3.7 source remains live; V3.8 source is now pushed and deployed; Pages status is built; live v3.6 cache and Chinese resources are verified to the existing `main` branch; Pages status is `built`; live new-learning flow, HTTPS resources, and `english-cultivation-static-v3.8.0` cache are verified.
- Live URL: `https://jajagood777-sys.github.io/english-mastery-mobile/`.
