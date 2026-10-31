# English Cultivation checkpoint

## V4.3.3 — authorized visual assets (complete)

- Owner authorization for public use of all nine supplied images was received on 2026-10-31.
- Converted the nine attached JPEGs to WebP in `assets/visuals/`, preserving dimensions, watermarks, and text readability. Current total is approximately 525 KB versus approximately 1.22 MB of JPEG originals.
- Updated `APP_VERSION`, package version, PWA cache, and cache asset list to `4.3.3`; no localStorage or learning-data changes.
- Full checks currently pass 62/62. Local visual smoke at 375×844, 390×844, and 430×844 confirms real hero, training, progress, gallery, and enlargement images load with no horizontal overflow.
- Pull Request: #5 (`https://github.com/jajagood777-sys/english-mastery-mobile/pull/5`) merged into `main`.
- Release commit: `96605cf`. GitHub Actions checks and Pages deployment completed successfully. All nine HTTPS WebP URLs return HTTP 200 with `image/webp`, and the live app reports `APP_VERSION='4.3.3'` with cache `english-cultivation-static-v4.3.3`.
- Chromium visual smoke at 375×844, 390×844, and 430×844 confirms real hero-09, training calligraphy, progress portrait/quote, five gallery tiles, enlargement image, and no horizontal overflow. Physical iPhone Safari/PWA remains user acceptance only.
- Next: none for this image deployment batch.

## V4.3.2 — ink-wash visual integration (complete; user images pending authorization)

- Baseline verified from `main` at `d59d749`; prior automated baseline was 60/60 and the working tree was clean.
- Added a non-invasive visual layer: optional hero slot for image 09, training calligraphy slot, progress portrait/quote slots, and a collapsible gallery with accessible enlargement in 我的. Reading text, answer controls, K/V/N, and local study data remain unchanged.
- Added optional `visuals.mjs` asset registry, `assets/visuals/README.md` mapping, CSS placeholders, lazy loading for gallery assets, eager hero loading, safe-area sizing, reduced-motion compatibility, and PWA cache inclusion.
- The nine supplied JPEGs were inspected locally (total about 1.2 MB; 1220px wide). Their public copyright/redistribution rights were not supplied, so optimized copies were used only in local preview and intentionally excluded from the public repository and deployment.
- Local Chromium visual smoke passed at 375×844, 390×844, and 430×844: hero slot, progress card, gallery enlargement, no horizontal overflow, and navigation remain usable. `npm run check` currently passes 61/61.
- Pull Request: #4 (`https://github.com/jajagood777-sys/english-mastery-mobile/pull/4`) merged into `main`.
- Safe visual-layer commit: `d2a53eb`; a follow-up exposes image 04 in the gallery (`048529e`). GitHub Actions checks and Pages deployment completed successfully. Live HTTPS verification exposes `APP_VERSION='4.3.2'`, `visuals.mjs`, and `english-cultivation-static-v4.3.2`; the original URL is unchanged.
- Public image upload/deployment remains blocked until the user confirms redistribution authorization or supplies licensed replacements. No supplied JPEG was committed.
- Next: none for the safe visual layer. If authorization is later confirmed, add only optimized WebP files listed in `assets/visuals/README.md`, update the PWA asset list, rerun the visual smoke, and deploy a small follow-up.

## V4.3.1 — Codex real-user quality repair (complete)

- Baseline audited: main at `d7fb6a2`, workspace was clean, V4.3 tests were 53/53 before this repair.
- Confirmed P0: `finishDailyJourney()` passed stage attempts to `buildBattleReport()` while the report builder filtered by the combined journey ID, producing empty `attempts` and zero K/V/N. Fixed with explicit allowed stage-session IDs, stable deduplication, original session IDs, listening separation, and explicit unrated rows.
- Added local recovery path for a finished journey. It reconstructs a new report from preserved raw attempts and stage sessions without overwriting the original report.
- Added persistent reading marks with stable occurrence IDs, double-click/selection fallback, cancel, batch-save, context preservation, duplicate-safe card creation, backup merge/validation, and report export evidence.
- New cards now hide Chinese meaning by default. `显示中文释义` is per-card, records a prompt event, and resets when the next card appears.
- Version/cache target: `4.3.1` / `english-cultivation-static-v4.3.1`.
- Tests currently pass 60/60; local Chromium 390×844 smoke covers reading marks, English-first hidden meaning, full four-module journey aggregation, one combined report, and no horizontal overflow. Physical iPhone Safari remains user acceptance only.
- Pull Request: #3 (`https://github.com/jajagood777-sys/english-mastery-mobile/pull/3`) merged into `main`.
- Release commit before this checkpoint: `6ccd1bb`. This checkpoint documents the final verification commit below.
- GitHub Actions checks and Pages deployment for `6ccd1bb` completed successfully. Live HTTPS verification returned the V4.3.1 app shell, `APP_VERSION='4.3.1'`, and `english-cultivation-static-v4.3.1`; original URL is unchanged.
- Physical iPhone Safari/PWA acceptance remains the only user-side verification. No external ChatGPT, Sheets, Notion, or Drive sync is claimed.
- Next: none for this repair batch; stop unless a new user request is supplied.

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
- Tests: 21 core tests pass; Chromium iPhone 390×844 smoke passes for Chinese navigation, mode selection/switch confirmation, cloze focus, sentence mode separation, JSON pack preview/import, today's-only queue controls, retry-after-error, and no horizontal overflow. Continue-original-session and PWA cache `english-cultivation-static-v4.0.0` checks pass. Physical iPhone verification remains pending.
- Deployment: V3.3 source remains live; V3.8 source remains live; V4.0 source commit `75c8697` is pushed; Pages status is built; live reading/listening/navigation resources and `english-cultivation-static-v4.0.0` cache are verified; Pages status is built; live v3.6 cache and Chinese resources are verified to the existing `main` branch; Pages status is `built`; live new-learning flow, HTTPS resources, and `english-cultivation-static-v4.0.0` cache are verified.
- Live URL: `https://jajagood777-sys.github.io/english-mastery-mobile/`.

## V4.1 mobile experience

- V4.1 Batch A–E complete locally: the homepage now leads with today's due/new/actual-minute summary; the five-item mobile navigation is 首页、训练、阅读、进度、我的; library, reports, help, and local settings remain reachable from 我的.
- Practice cards received stronger single-question hierarchy, keyboard-safe scroll spacing, touch feedback, and a regression guard so legacy `UNTESTED` cards without `learningStage` still enter Learn New Content.
- Reading page typography and selection controls received the same mobile-first treatment; report summary metrics use compact cards. Core learning, review scheduling, backup, and report data paths were not changed.
- Tests: `npm run check` passes 25/25. Chromium mobile smoke passes at 375×844, 390×844, and 430×844 for Chinese navigation, bottom-nav positioning, no horizontal overflow, day/night toggle, new-card learning, real textarea focus, answer feedback, reading navigation, and 我的 navigation. Physical iPhone Safari remains pending.
- Version/cache: package and app version `4.1.0`; service worker cache `english-cultivation-static-v4.1.0`. No localStorage migration or deletion introduced.
- Deployment status: feature commit `b7d585d` and final checkpoint commit `9931fe6` are pushed to `main`; GitHub Pages build for `9931fe6` is `built`; live shell returns HTTP 200 and exposes the V4.1 five-item navigation plus `english-cultivation-static-v4.1.0`. Physical iPhone Safari remains the only user-side acceptance step.
- Next task: none for V4.1. Stop after final verification unless a new product request is supplied.

## V4.2 audit and reliability progress

- Confirmed defects: reading extraction used the first article paragraph; reading card IDs were timestamp-based; legacy localStorage migration referenced uninitialized `data`; normal answer submission was marked as viewed-answer; prompt counts incremented without a hint; sentence-cloze reports used the full sentence; backup merge omitted readings and could omit pack metadata; settings route landed on progress; word/cloze answers used multiline textareas.
- Fixed in the current unversioned checkpoint: pure reading-context and stable-ID helpers; save failure rollback with explicit error; complete backup merge/validation for readings, pack history, attempts, sessions, reports, and settings; safe legacy migration; independent answer provenance; prompt counts; sentence-cloze reference answers; stable reading extraction metadata; archive/pause/relearn and card detail/edit/history; dedicated settings page; single-line word/cloze inputs; dynamic timer goal copy and explicit time-progress label.
- Tests: 36/36 pass. Local Chromium smoke confirms single-line answer input, `viewedAnswer=false` for normal submission, sentence-cloze `referenceAnswer` is the missing expression, reading context is the containing sentence, duplicate reading extraction remains one card, and settings navigation works.
- Next: update package/app version and PWA cache to V4.2.0, run final mobile/PWA regression, deploy, and verify the original Pages URL.

## V4.2 release candidate

- Version/cache files now target `4.2.0` and `english-cultivation-static-v4.2.0`.
- `npm run check` passes 37/37. Chromium mobile smoke passes at 375×844, 390×844, and 430×844 for bottom navigation, no overflow, onboarding persistence, single-line answer inputs, settings navigation, reading sentence context, stable duplicate extraction, and legacy localStorage migration. PWA registration works in the local HTTP smoke.
- Physical iPhone Safari is not available in this environment and remains user acceptance only.
- Deployment status: final V4.2 code is pushed in commit `0067fec` (including the remote audit commit `c71af9f`), GitHub Pages build is `built`, live URL returns HTTP 200, `APP_VERSION` is `4.2.0`, manifest name is `言道修炼殿 · English Cultivation`, and Service Worker cache is `english-cultivation-static-v4.2.0`. Physical iPhone Safari remains user acceptance only.
- Next task: none for V4.2. Stop after the final checkpoint commit unless a new product request is supplied.

## V4.3 — Unified Daily Master Pack (2026-10-31)

- Branch: feature/v4-3-unified-daily-pack. Source: main at 6ee969d.
- New single-file pack: English word, sentence, reading and listening types; legacy format maintained.
- One-click staged learning flow and cumulative positive-count timer; modules completed separately and combined report generated with evidence and self-reported reading status.
- Reading articles and module progress included in backups, with safe paused resume after reload.
- Demo fixture and tests must pass before merging to main or deployment. Physical iPhone Safari keyboard/reading interactions remain user acceptance, not automation proof.

## V4.3 Codex independent audit

- Confirmed hidden defects in the external V4.3 merge: `VERSION` stayed at 4.2 while `APP_VERSION` was 4.3; full backup JSON could be routed through the daily-pack importer; normal free listening could receive non-listening sentence cards; listening inputs lacked the standard answer-input class; and each completed journey module created an extra report before the final combined report.
- Fixed: explicit full-backup detection and restore-route error; V4.3 data version contract; listening-only scope for the listening home entry; standard listening textarea class; final journey button wording; module reports are kept as session records and only one combined `journey` report is archived.
- Independent end-to-end Chromium smoke: one JSON import → 2 words → 2 sentences → 1 reading confirmation → 2 listening dictations → combined summary produced exactly 1 report, 4 sessions, and four module coverage records. Normal answer/K/V/N and reading/listening data remained local.
- Tests: `npm run check` passes 53/53. Physical iPhone Safari remains unverified. Codex Verified Edition commit `58cbc32` is pushed to `main`; GitHub Pages is `built`, live HTTP 200, `APP_VERSION` is `4.3.0`, and the cache is `english-cultivation-static-v4.3.0`.
- Next task: none for V4.3. Stop unless a new product request is supplied.
