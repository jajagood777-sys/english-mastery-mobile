# English Cultivation checkpoint

## V5.3.0 — Continuous long-text speech and Kokoro feasibility gate (implementation ready)

- Baseline: main `9275f9f700965bb751224e027ca6c4c229c4f30c` / V5.2.0. Branch: `codex/v5-3-kokoro-continuous-speech`.
- Native reading playback now splits long text at sentence boundaries and exposes pause, resume, stop and replay controls. Queue state is cancelled when a new utterance starts or the page changes.
- Kokoro model files were verified from the public model index: `onnx/model_quantized.onnx` is about 92.4 MB, `onnx/model_q4.onnx` about 305 MB, and `voices/af_heart.bin` / `voices/af_bella.bin` about 0.5 MB each. `kokoro-js` npm metadata is Apache-2.0, version 1.2.1, about 30 MB unpacked.
- Kokoro was not successfully integrated in this static release: iPhone Safari memory, WASM/WebGPU runtime, model loading time and continuous playback were not verifiable here. No model is bundled, auto-downloaded, or pre-cached; native speech remains the explicit fallback.
- Learning data `VERSION=4.3`, localStorage, reports, daily journeys and IndexedDB recordings are unchanged.
- Release pending: final checks, PR, CI, Pages deployment and live 5.3.0 verification. Physical iPhone Safari remains unverified.

## V5.2.0 — Native American English voice selection (complete)

- Baseline: main `f3bdf15691971ed7022ebe800c2988a196520eec` / V5.1.1. Branch: `codex/v5-2-native-voice`.
- Current implementation discovers actual browser voices with `getVoices()` and `voiceschanged`, selects available `en-US` voices, persists only voice URI/name/language in the existing settings object, provides sample audition and 0.75×–1.25× speed choices, and routes all existing speech buttons through the same safe utterance path.
- Native speech fallback remains available when the list is empty, the saved URI disappears, or the browser has no American English voice. Speech playback is not a learning attempt.
- Kokoro feasibility evidence: `kokoro-js` npm metadata reports version 1.2.1, Apache-2.0 and about 30 MB unpacked; the referenced quantized model is roughly 90 MB before runtime/voice memory. iPhone Safari/PWA stability and offline model delivery are not proven, so Kokoro is not bundled, pre-cached or exposed as a misleading button.
- Learning data `VERSION=4.3` and the IndexedDB recording store are unchanged. No real localStorage, Safari data, private pack or recording was accessed.
- Local verification so far: `npm test` 95/95; learning-data-safety 4/4; mobile static baseline 11/11; PWA audit 18 assets aligned with 5.2.0; Chromium 390×844 settings smoke shows the voice panel, real device voice selector and no horizontal overflow.
- Pull Request [#18](https://github.com/jajagood777-sys/english-mastery-mobile/pull/18) merged as `ab3bb32f8fb76d047d75e05f8f5cc23aef44befb`.
- CI run `41272515581` and Pages deployment `41272515401` completed successfully. Live HTTPS reports `APP_VERSION = '5.2.0'`, `english-cultivation-static-v5.2.0`, and all core resources return HTTP 200.
- Physical iPhone Safari voice availability, actual playback quality, and PWA voice-list timing remain user-side checks. Chromium emulation cannot prove them.
- Next minimal recovery command: `git checkout main && git pull --ff-only origin main && npm run check`.

## V5.1.1 — Transfer skip navigation bugfix (complete)

- Baseline: main `176fa281ca934e670daa871b99c3d2d647d119ca` / V5.1.0. Branch: `codex/v5-1-1-transfer-skip`.
- Root cause reproduced with the synthetic equivalent of `EN-V51-SPEAK-TEST-20261031-006`: the old skip handler incremented `transferIndex`, cleared `transferState`, and rendered directly. On the first writing task, `transferDraft` was undefined and `renderTransferChallenge()` called `.trim()`, after the main content had already been cleared.
- Fixed with bounded `advanceTransferTask()`, explicit skipped-task IDs, transfer-stage finalization, safe draft normalization/autosave, active-recording stop-before-skip handling, and a recoverable render/error panel. Skips do not create attempts or mark a task completed; the final skipped transfer stage is reported as partial/skipped.
- Added synthetic fixture `test/fixtures/v51-1-006.json` and regression assertions in `test/v51-1-skip.test.mjs`. Local Chromium flow covers 006 at 375/390/430: T01 → T02 → Writing → Grammar → summary, writing draft restore, no page errors, no horizontal overflow, and synthetic IndexedDB recording metadata preservation.
- Software/cache target is `5.1.1`; learning data `VERSION=4.3` and the existing recording IndexedDB remain unchanged. No real Safari storage or private pack was accessed.
- Local verification: `npm run check` passes 94/94; learning-data-safety 4/4; mobile-accessibility-review 11/11; PWA audit 18 assets aligned with 5.1.1 and no warnings.
- Pull Request: [#16](https://github.com/jajagood777-sys/english-mastery-mobile/pull/16), merged as `ad75341ae70e7e74918a525ff26b5596c5966794`.
- CI run `41218019892` and Pages deployment `41218019277` completed successfully. Live HTTPS returns V5.1.1 (`APP_VERSION = '5.1.1'`, `english-cultivation-static-v5.1.1`, `recordings.mjs` HTTP 200). Live disposable Chromium 390×844 repeats the skip flow without page errors.
- Remaining user-side checks: real iPhone Safari/PWA keyboard, active microphone stop-before-skip confirmation, playback/export and existing device-history preservation. Chromium emulation is not physical iPhone Safari evidence.
- Next minimal recovery command: `git checkout main && git pull --ff-only origin main && npm run check`.

## V5.1.0 — Daily Pack modules and speaking integration (complete)

- Baseline: V5.0.0 main `aca6007`. V5.1 implementation branch `codex/v5-1-daily-pack-integration` was merged through Pull Request [#15](https://github.com/jajagood777-sys/english-mastery-mobile/pull/15).
- Release merge: `eaf1bcfd221cc090ffebbbc703bbd6689886b265` (`feat: integrate daily pack modules and speaking recording`).
- Daily Journey now exposes the existing IndexedDB recording controls for speaking and reading-to-speaking tasks, including pure voice submission, replay, re-record, save/export metadata and text fallback. Recording completion is not presented as language-quality or IELTS scoring evidence.
- Daily Learning Overview separates vocabulary, sentence/grammar, reading, reading comprehension, listening, speaking, writing and grammar-transfer progress. The synthetic 005-shaped fixture renders 8/6/1/5/4/2/1/1 items without duplicating transfer tasks.
- Writing tasks use a dedicated 80–100-word surface with live count and separate draft/revision evidence. Grammar tasks use text transformation UI. Reading completion and optional comprehension completion remain separate.
- `task_type` is optional and backward compatible; older transfer tasks remain available as general transfer when type cannot be identified. Learning data `VERSION=4.3` is unchanged.
- Recording blobs remain in IndexedDB (`english-cultivation-recordings-v1`); ordinary backups/reports carry metadata only. No private pack, audio, real Safari localStorage or personal learning history was accessed.
- Verification: `npm run check` passes 91/91; learning-data-safety 4/4; mobile-accessibility-review 11/11; Daily Pack QA and public-asset scan pass; PWA audit aligns 18 precache assets with `5.1.0`; synthetic 005 Chromium smoke passes at 390×844 and transfer smoke passes at 375/390/430 without horizontal overflow.
- CI run `41214900967` completed successfully. Pages deployment run `41214900558` completed successfully. Live HTTPS checks return HTTP 200 for the app shell, `core.mjs`, `recordings.mjs`, `sw.js` and manifest; live `core.mjs` reports `APP_VERSION = 5.1.0`, and live `sw.js` uses `english-cultivation-static-v5.1.0`.
- A live Chromium 390×844 smoke found the five Chinese navigation entries, the Quiet Mastery home hero, no horizontal overflow (`scrollWidth === innerWidth`), an active Service Worker controller and no page errors. Screenshot: `/tmp/v51-live-home-390x844.png` (generated locally; not committed).
- Remaining user-side checks: real iPhone Safari/PWA microphone permission, playback/export, keyboard behavior, offline refresh and preservation of existing device history. Chromium emulation is not physical iPhone Safari evidence.
- Next minimal recovery command: `git checkout main && git pull --ff-only origin main && npm run check`.

## V4.4 — evidence-based learning upgrade (complete)

- Baseline: `main` at `125a130` with seven project-scoped Skills; prior Skills acceptance was recorded in `8e1293d` and `npm run check` passed 71/71.
- Implemented optional backward-compatible `transfer_tasks` and `readings[].questions` parsing, a journey transfer stage, evidence-layer fields, optional reading comprehension checks, backup preservation for reading checks, and an extended daily-pack QA summary.
- Synthetic browser smoke confirms transfer first answer → reference reveal → K self-assessment, optional reading choice check, report creation, and no mobile overflow.
- Current release target is `4.4.0`; learning data schema remains `VERSION=4.3` and is not reset or migrated for cosmetic changes.
- Full local verification: `npm run check` passes 74/74; the daily-pack QA validator reports words 2, sentences 2, readings 1, listening 2, transfer 2 and reading questions 2 with no warnings.
- Chromium 390×844 smoke confirms transfer first answer → reference reveal → K self-assessment, optional reading choice check, one report and no horizontal overflow. Physical iPhone Safari remains unverified.
- Pull Request: #9 (`https://github.com/jajagood777-sys/english-mastery-mobile/pull/9`) merged into `main`.
- Release commit: `096a95a`; GitHub Actions checks and Pages deployment completed successfully. Live app version/cache and local asset bundle are verified after merge.
- No real user localStorage or private backups were accessed. Physical iPhone Safari remains unverified.
- Next: none for this V4.4 batch; stop unless a new request is supplied.

## Project-scoped Skills acceptance (2026-10-31)

- Baseline synchronized to `main` commit `125a130` (`125a1308...`); workspace was clean before this documentation-only checkpoint.
- Seven project-scoped Skills are present under `.agents/skills/`: playwright, gh-fix-ci, frontend-design, english-daily-master-pack-qa, learning-data-safety, mobile-accessibility-review, and pwa-release-audit.
- New skill scripts passed: learning-data-safety synthetic probe (4 checks), mobile-accessibility-review static baseline (11/11), and pwa-release-audit local bundle check (17 assets, version/cache alignment, no warnings).
- `npm run check` passes 71/71, including skill manifest, daily-pack QA, safety, accessibility, and PWA regression tests.
- Runtime distinctions: project files are discoverable and callable from this repository; they are not global/account-wide Skills. Playwright wrapper help, `npx`, Node/npm, Python and authenticated `gh` are available. Frontend design is instruction-only. Real iPhone Safari/PWA and private localStorage remain unverified.
- No production learning code, localStorage, reports, K/V/N history or website version was changed by this acceptance.

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

## V5.4.1 — Kokoro seamless delivery and observable cache (2026-11-01)

- Baseline: `e70fa8c8b9260e8b02bc589c7b8dc654bdfb444` / V5.4.0.
- `neural-tts.mjs` now passes kokoro-js/Transformers.js `progress_callback`, aggregates real `loaded`/`total` bytes across resources, and reports download, initialization, audio generation, ready, and error phases. Unknown totals remain an honest indeterminate state; no percentage is fabricated.
- Heart (`af_heart`) and Bella (`af_bella`) continue to share the pinned q8 Kokoro model. The current verified runtime requests `onnx-community/Kokoro-82M-v1.0-ONNX` from its Hugging Face endpoint; no large model files were committed or added to PWA shell precache. The formal page therefore still needs access to that endpoint for a first uncached load; same-origin hosting is not claimed without a reproducible Pages artifact and license/size review.
- Settings now exposes live progress, byte totals, cache status, a resource connection check, and retry guidance. Cache metadata is isolated under `english-cultivation-kokoro-model-v1`; learner localStorage, IndexedDB recordings, and JSON backup paths are untouched. `navigator.storage.estimate()` is used when available, without claiming Safari persistence.
- Service worker advanced to `english-cultivation-static-v5.4.1`; activation only removes prior app-shell caches and never deletes model/runtime caches. The model is not in default install precache.
- Validation: `npm run check` passes 102/102. Desktop Chromium real model/audio, iPhone Safari network/cache/offline behavior, storage eviction, and mobile memory remain user-device acceptance items; this environment cannot truthfully claim those physical-device tests.

## V5.5 — Audio-first natural voice pipeline (implementation checkpoint, 2026-11-01)

- Started from `main` `8a8dd6e82fdd3b76618f70dc58fec8948b82e588` and reviewed the existing V5.5 branch through `c70a35d29dc698a48153c6e9b0418318828ab232`. The branch's first public-audio workflow failed before generation because the runner did not have `ffmpeg`; the workflow now installs the codec explicitly.
- Public speech lookup is now same-origin at `./speech-assets/speech-manifest.json`, keyed by normalized-text SHA-256 plus `af_heart`/`af_bella`. A fetched MP3 is checked for size and optional file SHA-256, then cached in the separate `english-cultivation-audio-v1` IndexedDB store. No learner records, attempts, sessions, reading marks, backups, or recordings are changed.
- Local import accepts the same manifest format and now supports a ZIP containing the manifest and audio files, with path traversal, file type, size, text-hash, and ZIP structure checks. Repeated imports overwrite the same content-addressed key instead of duplicating clips.
- Every existing `speakEnglish` path remains the single controller. Word cards expose separate word and example controls. Natural audio is tried first; missing/failed clips produce an explicit message and invoke real device speech when available. The legacy Kokoro model remains an advanced manual experiment, never a normal playback prerequisite.
- Cloud generation remains limited to public demo text. It uses pinned `kokoro-js@1.2.1`, q8 Kokoro, Heart/Bella, WAV validation, ffmpeg MP3 conversion, and a manifest containing text hash, file hash, engine, format, size and generation time. Private learning packs are not uploaded by this workflow.
- `npm run check` passes 104/104 locally. Local real TTS generation could not complete because this execution environment cannot reach the model endpoint (IPv4 connection refused/IPv6 unreachable); GitHub Actions must be the authoritative generation check after push. No generated audio is claimed until that workflow succeeds.

- Public closure assets are now present in `speech-assets/`: 2 MP3 clips (Heart and Bella) for the verified demo sentence, 41,516 and 45,260 bytes, with ffprobe durations 3.744s and 3.432s. The manifest contains both text hashes and file hashes. This is the only public natural-audio set currently claimed; other words, new examples, and arbitrary articles use the explicit device fallback until their clips are generated.

## V5.6 — real learning-pack audio pipeline checkpoint (2026-11-01)

- Latest baseline rechecked: main `cc75269c7a57d79a6e8e6f4363fd17bbe48a7e68`, V5.5.0, PR #27 merged and Pages deployed.
- Added `audio-tasks.mjs`: uses the existing `recordsFromLearningPack()` contract and extracts normalized, SHA-256 keyed tasks from word targets, word examples, sentences, listening, reading segments, transfer prompts, and reference answers. The public synthetic fixture `examples/v56-audio-sample-pack.json` produces 29 unique tasks: 8 words, 8 examples, 6 sentences, 3 listening, 2 reading segments, 2 transfer.
- Added `scripts/generate-audio-pack.mjs`: incremental Heart/Bella generation, existing-manifest reuse, WAV/MP3/ffprobe validation, file hashes, duration, failure report, task report, and optional ZIP output. It never reads arbitrary files in the public workflow.
- Added a manual public-only GitHub Actions workflow. It rejects pack paths outside `examples/*.json` and uploads an artifact instead of committing generated private material. Private daily packs are not connected to any inaccessible Central Immortal Aperture automation and must use a private execution environment or local/authorized ZIP flow.
- The app now reports real natural-audio coverage by module, supports a one-file ZIP containing the learning-pack JSON, `speech-manifest.json`, and audio files, and plays reading segments sequentially when matching clips exist. Missing clips use explicit device fallback; learner data remains in its existing stores.
- Validation so far: `npm run check` 108/108; real ZIP decompression test passed; dry-run extraction counts above passed. Full 29-clip Kokoro inference remains a GitHub Actions runtime check; no unverified generated count is claimed until that run succeeds.

## V5.6 generation result and deployment note (2026-11-01)

- GitHub Actions run `41287606297` generated 29/29 Heart MP3s for the authorized synthetic sample pack `V56-PUBLIC-AUDIO-SAMPLE`: 8 word targets, 8 examples, 6 sentences, 3 listening items, 2 reading segments, and 2 transfer tasks. Failure count: 0.
- Generated MP3 payload total from the run log: 1,300,444 bytes (about 1.24 MiB); artifact finalized at 1,288,823 bytes for the ZIP/report upload. Individual durations are present in the machine manifest artifact; this session cannot download that artifact because the GitHub token lacks artifact read permission.
- The bot publish commit merged the 29 Heart clips into public `speech-assets`, alongside the original Heart/Bella demo clips. Main manifest contains 31 clips total, 30 Heart and 1 Bella.
- PR #28 merged as `3c95c29bcc8c66141027ff58c043d327b219ce75`; main CI passed and the real-app Chromium test passed. Pages build passed, but deployment attempts were rejected by a stale GitHub Pages deployment lock referring to prior SHA `7030a808febcda119fabe38dfe2b5453e8be915d`. The current token lacks `deployments:write`, so the lock could not be cancelled through the API; online Pages remains unverified as V5.6 until GitHub clears the lock.

## V5.7 — browser-first on-demand Heart generation (implementation PR, 2026-11-01)

- Baseline: main `98a93f67890df49cefff7063d2fe5b8dbfa63b6f`, V5.6.0.
- PR #33 wires missing Heart/Bella text to the existing `neural-tts.mjs` Kokoro WASM engine. Public manifest and IndexedDB are checked first; missing clips are generated lazily, deduplicated by `voice:normalizedTextSHA256`, persisted to `english-cultivation-audio-v1`, and reused on later playback.
- Reading segment playback prefetches the next segment. Heart/Bella generation failures are explicit and do not silently use iOS system speech. Device speech remains available only when the user explicitly chooses device mode.
- Validation: `npm run check` passes 109/109; real-app Chromium Heart/Bella playback passes in CI. Physical iPhone Safari model download, memory, generation latency, and offline replay remain unverified; PR is intentionally not merged or deployed until device acceptance.
- No server, API key, private upload, learner-data migration, Pages trigger, or deployment change was added. A provider callback remains the seam for a future private server if Safari cannot sustain WASM.

- V5.7 device-preview attempt: added `v57-device-smoke.html` on PR #33. It exercises a new sentence, second-play IndexedDB reuse, sequential story segments with next-segment prefetch, and refresh-state messaging without learner data.
- Temporary HTTPS exposure was attempted with accountless localtunnel and Cloudflare Quick Tunnel; both relay connections were refused by this execution environment. No external account, payment, credential, or formal Pages deployment was used. Physical iPhone acceptance remains blocked on a reachable HTTPS preview/device path.

## V5.8 — server provider reference and bounded browser inference (PR #33 follow-up, 2026-11-01)

- Feedback evidence: physical iPhone Safari downloaded 92,364,770 bytes but remained in Kokoro inference for 31 seconds without audio; browser WASM is therefore not yet daily-use reliable.
- Added a private provider reference under `server/`: authenticated `POST /v1/tts`, normalized-text SHA-256 validation, `af_heart`/`af_bella` allowlist, private filesystem MP3 cache, concurrent request deduplication, q8 CPU Kokoro initialization once, ffmpeg conversion, and bounded request size. No server is deployed and no key/account is configured.
- Browser generation now has a 90-second inference timeout and reports a concrete error instead of an indefinite spinner. Existing on-demand IndexedDB generation and Heart hard-error behavior remain intact.
- Validation: `npm run check` passes 111/111. CI Chromium does not prove iPhone Safari inference; physical device playback/reuse remains the release gate.
- Cost/privacy boundary: a private host or cloud account is the only remaining external authorization needed for server delivery. No free 24-hour GPU capacity is assumed, and no public proxy is used.

## V5.8 — free-tier investigation and provider hardening (2026-11-01)

- Re-read PR #33 head `e25a015bd73e5486123f18156ecacaededfe5663`, owner feedback, AGENTS.md and the existing V5.8 checkpoint. The physical iPhone evidence remains: 92,364,770 bytes downloaded, then `phase=inference` for 31 seconds without completed audio; this is not a missing-preview-URL problem and is not claimed as universal Safari failure.
- Hardened the private provider reference without deploying it: container binding defaults to `0.0.0.0:$PORT`; one exact `TTS_ALLOWED_ORIGIN` controls CORS; Bearer secret remains server-only; request size, per-address rate limit, active-generation limit, 90-second inference timeout, allowed voice IDs, normalized text hash and private cache checks are enforced. Same-text concurrent callers share one promise and cache hits do not consume an active-generation slot.
- Added `server/Dockerfile`, `.dockerignore`, and `private-tts-client.mjs`. The browser adapter is deliberately not enabled by default because a static Pages frontend cannot safely hold `TTS_SHARED_SECRET`; a private authenticated gateway/session token is required before binding it to production UI. No learner data, private text, API key, or audio was uploaded.
- Added isolated HTTP/provider tests for health, missing authorization, hash mismatch, exact-origin CORS, normalized request/hash payload, non-audio/provider errors, cache-key bounds and no browser-storage credential persistence.
- Fresh local verification: `npm test` passes **114/114**; `npm run check` remains the required final command. The provider HTTP test does not run Kokoro inference; it intentionally proves security and validation before model execution. No generated server MP3 count is claimed.
- Official documentation checks performed 2026-11-01: Hugging Face Spaces says Static Spaces are free, while Gradio/Docker CPU Basic compute requires a subscription; ZeroGPU uses Gradio-only shared GPU quota and is not a private Node endpoint with durable cache. Cloud Run pricing documents a monthly free tier but billing documentation requires an active billing account and free-tier overages/storage/egress can charge. GitHub Actions is batch execution, not an always-available private TTS endpoint.
- Deployment boundary: no provider host, account, card, long-lived token, PR merge, Pages deployment, or formal-site change. Browser Kokoro remains the live path with a bounded 90-second error; the exact remaining external action is approval and provisioning of a private authenticated host/account if server fallback is required. Physical iPhone playback and IndexedDB reuse remain unverified after the timeout change.

### Remote verification for `366798842337338bc5e27bd6c76066e20ca14cfc`

- PR #33 remains open and unmerged: https://github.com/jajagood777-sys/english-mastery-mobile/pull/33
- `test` passed in Actions run `41304013768`: https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41304013768
- `real-app` passed in Actions run `41304013735`: https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41304013735
- These are desktop/CI browser checks; they do not alter the physical-iPhone release gate.

### Final documentation commit verification `2cbff0dccf3b7b7fc42d2973bbb6ee7f6eec4013`

- `test` passed in Actions run `41304089112`: https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41304089112
- `real-app` passed in Actions run `41304089001`: https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41304089001

## V5.9 — Gemini TTS + Cloudflare Worker private gateway (implementation, not deployed) (2026-11-01)

- Latest PR #33 feedback requested a new route because iPhone Kokoro WASM reached inference without completing audio. The branch remains `codex/v5-7-on-demand-heart`; main remains unchanged. No Pages deployment or merge was triggered.
- Official Gemini documentation was fetched and inspected on 2026-11-01: `gemini-3.8-flash-tts` uses `POST https://generativelanguage.googleapis.com/v1beta/interactions`, unary output is complete `audio/wav` (24 kHz, mono, 16-bit PCM), and the documented request selects a prebuilt voice such as `Kore` plus `speech_metadata.style`. Sources: https://ai.google.dev/gemini-api/docs/speech-generation and https://ai.google.dev/gemini-api/docs/pricing.
- Added `worker/src/index.mjs` and `worker/wrangler.toml.example`. The Worker keeps `GEMINI_API_KEY` server-side, requires a separate bearer gateway token, restricts one exact CORS origin, validates normalized text SHA-256, bounds text/body/rate/time, sanitizes provider errors, and returns WAV directly. It intentionally does not use public Cloudflare Cache/R2 for private learning text; browser IndexedDB remains the durable user cache.
- Added `private-tts-client.mjs` WAV support and `GEMINI_TTS_ENGINE='gemini-3.8-flash-tts@kore-v1'`. Gemini and Kokoro clips now use distinct IndexedDB keys, so an audio file generated by one engine cannot satisfy the other. The app exposes an explicit Gemini cloud mode only when a secure endpoint plus short-lived token callback is supplied; no silent device-voice fallback occurs in that mode. Existing Heart/Bella Kokoro mode and learning data are preserved.
- Added mocked Worker tests for unauthenticated requests, hash mismatch before upstream calls, exact-origin CORS, quota errors, REST request shape, WAV response, server-only API-key forwarding, and engine isolation. No Gemini request was sent because no API key or project credentials are available in this environment.
- Account boundary: Google AI Pro browser/Studio access does not by itself prove Gemini API project quota. The current pricing page labels the TTS model's free tier as quota-limited and states free-tier data-use terms; it is not unlimited and may permit Google product improvement use. Cloudflare deployment still requires the owner's account and secret configuration. No key, token, billing account, or private learning text was requested or committed.
- Remaining real acceptance: configure an authorized private Worker gateway, verify the owner's project can call the model and observe actual quota/429 behavior, then on physical iPhone Safari play a never-seen sentence and replay it from IndexedDB; test multi-segment story playback and error paths. Until those steps, this is provider-ready code, not a live Gemini service or a claim of iPhone success.

### V5.9 implementation commits and remote checks

- Gemini gateway implementation: `81204d7551b76fbdec540dfbd84df5e387baa58c`; engine-choice regression correction: `a9df3c708a6de7e246eaf8b785b1c3012a7bd07c`.
- `npm run check` after the correction: **118/118 passed**.
- Actions for `a9df3c7`: [test 41306451184](https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41306451184) and [real-app 41306451196](https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41306451196), both successful. The real-app failure on `81204d7` was an obsolete `3 choices` assertion; its browser errors were empty and the corrected run passed.

## V5.9 — secure session bootstrap and quota guardrails (2026-11-01)

- Addressed review `#6557973087`: the static app no longer depends on undeclared global token functions. Settings now accepts only an HTTPS Worker endpoint, lets the user select Cloudflare Access or the Workers.dev pairing fallback, provides a session check, and starts a pairing session without persisting the pairing code or Gemini key.
- Cloudflare Access mode sends `credentials: include`; the Worker verifies `CF-Access-Jwt-Assertion` signature, issuer, audience, expiry and JWKS key. `/v1/session` provides a user-facing login/session check. No bearer secret is published to Pages.
- Pairing mode adds `/v1/session/exchange`: a Worker-only `TTS_PAIRING_CODE` exchanges once for a short-lived HMAC session token kept in `sessionStorage`. This is explicitly documented as weaker than Access and intended for a private Workers.dev staging endpoint; rotating the pairing code invalidates existing sessions.
- Added optional `TTS_QUOTA` KV daily counter keyed by a hash of date + session subject. Responses report `x-quota-scope: kv` or `isolate-best-effort`; the code never claims global quota when KV is absent. Isolate rate limits, body/text/style limits and upstream timeout remain active.
- Added tests for Access-default rejection/session preflight, pairing exchange and token enforcement, KV quota scope, credential-free Access client requests, pairing client exchange, and UI session bootstrap. No secrets, private learning text or audio were added.
- iPhone-only setup boundary: the owner must create/configure the free Worker and enter the Worker URL in the app. For Access, the owner must protect a suitable hostname and first open the Worker session URL in Safari to complete login; for Workers.dev, use a long random pairing code in Worker Secrets and enter it once in the app. Gemini API key is entered only into Worker Secret configuration.

### Final session integration commit

- Commit `777557b` contains the secure session wiring and review fixes.
- Fresh local verification: `npm run check` passes **124/124**.
- Remote verification for this commit: [test 41307928912](https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41307928912) and [real-app 41307928914](https://github.com/jajagood777-sys/english-mastery-mobile/actions/runs/41307928914), both passed. These CI jobs do not prove a real Gemini account or physical iPhone playback.

## V5.9 — owner-controlled Cloudflare staging correction (2026-11-01)

- Review `#6558209173` required separating staging from the formal GitHub Pages origin. `worker/wrangler.toml` and `.example` now contain only `https://REPLACE_WITH_STAGING.pages.dev`; a regression test rejects `jajagood777-sys.github.io` in the staging config.
- Added an owner-controlled two-project runbook in `worker/README.md`: separate Cloudflare Pages staging project from PR branch, Worker Builds root `worker`, exact Pages origin replacement, secret UI, pairing flow, preflight check, Safari cache test and no third-party raw preview credential entry.
- Worker bounds Gemini text to 2,000 normalized characters and decoded WAV to 8 MiB to respect free Worker CPU/memory realities. No claim is made that an isolate rate limit is a global quota; KV remains optional and explicitly labeled.
- Fresh local verification after the staging correction: `npm run check` passes **125/125**. No Cloudflare or Gemini account was accessed, and no formal GitHub Pages deployment was made.

### V5.9 staging Origin selected (2026-11-01)

- Owner supplied the controlled Pages staging origin: `https://english-mastery-v59-staging.pages.dev`.
- `worker/wrangler.toml` now authorizes exactly that origin; the example template remains a placeholder for other staging projects. Formal `https://jajagood777-sys.github.io` remains excluded.
- Worker secrets and deployment were not performed in this step.

## Native Web Speech restoration (2026-11-01)

- Formal app speech path now uses only `window.speechSynthesis` and `SpeechSynthesisUtterance`; Gemini, private Worker, and active Kokoro integration files from this PR were removed from the branch runtime.
- Settings no longer exposes Gemini pairing, Worker URL, Heart/Bella model loading, model progress or neural cache controls. It shows the native `en-US` device voice list, refreshes after `voiceschanged`, and falls back to the browser's default voice when no matching device voice exists.
- Existing word, example, sentence, listening, reading/story, pause, resume, stop, replay and speed controls remain wired to the native queue. Learner localStorage/IndexedDB/backup schemas were not changed.
- Replaced the PR's neural browser smoke with a native Web Speech browser wiring smoke; CI workflow is named `Real app native Web Speech integration`. Physical iPhone Safari remains the final device check.
- Fresh `npm run check`: **106/106** passed. No Gemini/Cloudflare credentials, accounts, deployments or formal Pages changes were made.

## Native Safari voice chooser fix (2026-11-01)

- Settings now renders every actual English voice returned by `speechSynthesis.getVoices()`, sorted with `en-US` first. Labels use the real `name (lang)` values; no voice names are invented.
- The selected voice uses `voiceURI` when available, with a stable name/language key fallback, is saved as `settings.speechVoiceURI`, restored after reload, and assigned to `SpeechSynthesisUtterance.voice` for every word, example, sentence and story chunk.
- `voiceschanged` refreshes the settings list after Safari finishes loading voices. Missing saved voices fall back to a local en-US voice, then another local English voice, then browser default behavior.
- Added the requested `Hello! Let's practice English together.` audition button and a browser smoke that selects a second provided voice, verifies the utterance voice key, and checks learner data persistence.
- Service Worker/app cache bumped to `5.6.1`; this only refreshes app shell files and does not clear learning storage or recordings.
- Fresh local check remains **106/106**. Physical iPhone Safari is still required to verify which voices iOS exposes in the user's current configuration.

## Safari system-voice compatibility investigation (2026-11-01)

- WebKit Bug 290497 remains `NEW` with no resolution or fixed version. Its report says voices downloaded from iOS Settings → Accessibility → Spoken Content → Voices are absent from `SpeechSynthesis.getVoices()`.
- WebKit Bug 250665 remains `NEW` with no resolution. It records the earlier Kyoko regression and links the iOS 18 low-quality-voice symptom to 290497. No WebKit patch or release note was found that fixes either issue.
- MDN defines `getVoices()` as returning voices available to the current device and documents `voiceschanged` for changes to that returned list. `pageshow` and `visibilitychange` support a best-effort refresh when Safari returns from Settings or another app. WebKit's `SpeechSynthesis` source only wraps the platform-provided voice list and invalidates its cache before `voiceschanged`; it provides no web API to discover a voice the platform did not return.
- The native chooser enumerates only actual `SpeechSynthesisVoice` objects, labels real `name (lang)`, saves the selected URI/key, and assigns that object to each utterance. Hard-coded URIs, fabricated voice objects, and private iOS interfaces cannot expose voices WebKit withholds.
- Minimal independent fix on `fix/v5-6-1-safari-voice-compat`: preserve an explicitly assigned control ID in `field()` (the prior helper replaced `#native-voice-select`, so the browser smoke silently skipped the real dropdown), add `pageshow`/visible `visibilitychange` refreshes, and require exactly one voice select in the browser smoke. Existing playback, stop/pause/resume, rate, import, and learner storage paths are unchanged.
- Source evidence: https://bugs.webkit.org/show_bug.cgi?id=290497 · https://bugs.webkit.org/show_bug.cgi?id=250665 · https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices · https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event · https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event · https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event · https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/speech/SpeechSynthesis.cpp

## V5.7 — Safari integration and transfer-draft recovery (2026-11-02)

- Baseline: latest `origin/main` after PR #35, V5.6.2, with reading vocabulary notebook preserved. PR #34's effective Safari changes were cherry-picked without replacing the newer main files: explicit `#native-voice-select` IDs survive `field()`, and voice enumeration refreshes on `voiceschanged`, `pageshow`, and visible `visibilitychange`.
- Root cause of the migration-report defect: daily-journey transfer rows were written as `taskId/answer/selfCorrection/modelAnswerViewed`, while the canonical layer only read `firstAnswer/retryAnswer/referenceViewed`. This converted valid drafts to empty values and left task IDs absent in reports.
- `normalizeTransferAttempt()` now accepts both shapes, preserves legacy fields, maps `answer` to `firstAnswer`, `selfCorrection` to `retryAnswer`, `modelAnswerViewed` to `referenceViewed`, and retains task, pack, journey, prompt, type, timestamps, reference answer, auto-check, recording and skipped evidence. Merge fills missing canonical values without replacing existing non-empty answers.
- Daily journey submission now writes canonical records at the moment the initial answer is submitted. Report reconstruction enriches old rows from the current pack task, uses a deterministic recovered report ID, preserves the original report, and is idempotent. The reports screen exposes “重新导出修复后的 Battle Report（保留原报告）”.
- Markdown transfer sections now include task type/ID, prompt, pack/journey IDs, multiline original draft, submission time, hints, reference-answer evidence, optional retry, K/V/N, AI-unassessed status, recording status, and explicit submitted/skipped state. It never uses `undefined` as an ID.
- Tests: `node .agents/skills/learning-data-safety/scripts/check-fixture.mjs` passed (4 synthetic safety checks, real Safari data not accessed); `npm run check` passed **110/110**. The synthetic tests cover an 80-word legacy writing answer with no retry, both answers, repeated merge, and daily-journey backup migration. Physical iPhone data remains inaccessible and unverified.
- PR #36 remote verification: `test` passed in Actions run `41351011539`; `real-app` passed in run `41351011695`; staging Pages passed. The unrelated legacy check `Workers Builds: english-cultivation-gmini-v59-mobile` failed again. Because this release instruction requires stopping on any CI failure, PR #36 remains open and main/Formal Pages were not changed. The old Worker was not modified.

## V5.7 — mixed IELTS metadata increment (2026-11-02)

- Extended the existing schema 2.0 importer without adding navigation or a second database. `readings.questions` and `transfer_tasks` now preserve optional Cambridge/IELTS metadata: source, Academic/GT, test number, skill, question ID/number, type, answer constraints, source page, and authentic-source flag. Old English-only JSON remains unchanged.
- The existing reading checks and transfer challenges remain the interaction surfaces. No official listening claim is made when an audio asset is absent; no automatic IELTS band score is generated.
- The single Battle Report now carries IELTS reading question metadata/check answers and IELTS transfer metadata alongside ordinary practice, including original answers, reference visibility, retries, K/V/N, recording status and actual session time.
- Release marker advanced to V5.7.0 and the Service Worker app-shell cache marker to `english-cultivation-static-v5.7.0`; localStorage keys, IndexedDB recordings and data schema `4.3` remain unchanged.
- New mixed-pack regression covers ordinary English plus three IELTS reading questions, one speaking task and one writing task. `npm run check` passes **111/111** after the increment.

### V5.7.0 formal release verification (2026-11-02)

- PR #36 was merged by GitHub as commit `9c5d3e54b9f89d9c43b760a476dbca7168c833ec`. The old Workers Builds check remained a non-blocking external failure; GitHub accepted the merge because the repository's actual checks were mergeable.
- Main test run `41352027523` passed. Formal Pages run `41352027278` passed build, deploy, and build-status reporting.
- Public verification: `https://jajagood777-sys.github.io/english-mastery-mobile/core.mjs` reports `APP_VERSION = '5.7.0'`; public `sw.js` uses `english-cultivation-static-v5.7.0`; public `app.js` contains `native-voice-select`, `pageshow`, and `refreshSpeechVoiceUi`; public `core.mjs` contains `normalizeExamMeta` and IELTS metadata handling.
- No localStorage key, IndexedDB recording store, backup schema (`4.3`), learning record, or private Cambridge source was uploaded or cleared. Physical iPhone voice enumeration and any actual private historical draft remain user-device-only checks.

## V5.8.1 — PR #43 audio delivery and cache fixes (2026-11-02)

- Based on the latest `origin/main` PR #43 merge `cb88618f2826f229e30437eaeff39ff2f1c13ead`; no prior audio-player work was reimplemented.
- External listening URLs now use `safeAudioUrl`, which accepts HTTPS only and rejects HTTP, `javascript:`, `data:`, and malformed values. `index.html` and the isolated preview CSP use `media-src 'self' blob: https:`; scripts, workers, connections and objects remain restricted.
- Audio A/B controls require loaded metadata and a valid `0 <= A < B <= duration` interval with a 0.1-second minimum. Invalid or incomplete ranges show an actionable message; stale audio is stopped on navigation and `pagehide`; load/play errors remain explicit.
- The app shell is versioned as `5.8.1`. The Service Worker cache marker is `english-cultivation-static-v5.8.1`, registration uses `updateViaCache: 'none'` and requests an update. No localStorage, IndexedDB, backups, learning records or recordings are cleared.
- New regression coverage checks HTTPS-only audio parsing, invalid A/B intervals, CSP alignment, cache marker and app version. Local `npm run check` passes 121/121; `check-bundle.mjs` passes. A real Chromium mobile-viewport smoke loaded and played the CC0 MDN MP3 (`https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3`, 2.074s) and exercised an A/B loop. A separate browser profile confirmed old `v5.8.0` cache removal and new `v5.8.1` cache activation.
- Formal Pages deployment and physical iPhone Safari remain pending until the repair PR is merged and the public resources are fetched. This checkpoint makes no live-site claim.

## V6.0 recovery checkpoint — follow-along and central feedback (in progress, 2026-11-02)

- Baseline remains `origin/main` `121f154` / V5.8.1. The current working tree is intentionally based on that released main; no learner storage was reset.
- Implemented locally: `buildCentralLearningFeedback()` emits a separate `feedback_schema_version: "1.0"` evidence-only JSON contract with report/session/pack IDs, actual active seconds, K/V/N evidence, P0/P1/P2 candidates, unmeasured rows, transfer evidence and explicit no-AI-score/no-sync flags. App buttons expose “生成下次学习依据” and `central-english-feedback-YYYY-MM-DD.json`; the existing Markdown handoff remains unchanged.
- Implemented locally: listening tasks now expose follow-along controls for reference audio/device reference speech, original/retry recording labels, local playback, export and stop. Recording start stops speech/reference/local playback; pagehide stops active recording without clearing its IndexedDB data. Session attempts carry local recording IDs/status into Battle Reports.
- UI transfer labels now use “综合输出”; legacy `transfer_tasks` parsing and IDs remain intact.
- Fresh local `npm run check` passes **124/124**; the static mobile baseline passes 11/11. A disposable Chromium 390px flow (`scripts/test-v6-follow-along-feedback.mjs`) passed with synthetic microphone permission: reference audio loaded, original recording was saved and replayed without overlap, tracks were released, the recording ID appeared in the report, and the separate feedback JSON copied with `feedback_schema_version: "1.0"`. Existing native speech browser flow also passes. Transfer Journey recording IDs are now retained in `dailyJourney.transferRecordingIds` and transfer attempts.
- This remains an unmerged checkpoint: PR/CI, Pages deployment and physical iPhone Safari are pending. Next action: push this branch, wait for `test` and real-app CI, then review and merge only after fresh verification.

## V6.0 formal release verification (2026-11-02)

- PR #45 merged as `0c668e2de28a8cc60d47bb69c5a4ed6d607b2cb6`.
- Main checks run `41387441555` and Pages build/deploy run `41387441593` completed successfully. The historical `Workers Builds: english-cultivation-gmini-v59-mobile` check remains an unrelated non-blocking failure; the Worker was not changed.
- Live HTTPS verification returned package/app version `6.0.0`, Service Worker cache `english-cultivation-static-v6.0.0`, `buildCentralLearningFeedback`, follow-along controls and the `central-english-feedback-` export path.
- The disposable Chromium 390px flow passed against the formal Pages URL: external CC0 reference audio loaded, synthetic recording permission saved/replayed without overlap, microphone tracks were released, the recording ID appeared in the Battle Report, and the feedback JSON copied with `feedback_schema_version: "1.0"` and `is_learning_pack: false`.
- No localStorage, IndexedDB recordings, learning records, backups or private material were cleared or uploaded. Physical iPhone Safari microphone, keyboard and PWA behavior remain the only final device checks.

## V6.0.1 — reading mark evidence handoff (in progress, 2026-11-02)

- Based on latest `origin/main` `c901da8` / V6.0.1. Existing reading mark storage, saved-card view, Battle Report, central handoff and feedback JSON were retained.
- Added read-only `collectReadingMarkEvidence()`. Current Journey reports now include unsaved and saved marks with stable mark ID, word, reading ID/title, sentence, saved state, pack ID and true card K/V/N when available; untested marks remain `UNTESTED` and never enter P0/P1/P2.
- Markdown always states `本次阅读标记生词：N条`, including zero. Central handoff includes current marks and removes duplicated current saved cards from the historical vocabulary section. Feedback JSON adds optional `reading_vocabulary_evidence` without changing the existing schema version or score statistics.
- Current Journey marks are time-scoped from `startedAt` to `finishedAt`, so unrelated historical marks are excluded. Local `npm run check` passes **128/128** and the PWA bundle audit passes. PR, CI, Pages deployment and physical iPhone Safari remain pending.

## V6.0.1 reading mark handoff formal verification (2026-11-02)

- PR #47 merged as `72d0790952ab885c4e93f6b005fb237c02c07200`.
- Main checks `41423721997` and Pages build/deploy `41423720904` completed successfully. The historical Cloudflare Worker check remains unrelated and non-blocking; no Worker or learner data was changed.
- Live HTTPS verification returned `6.0.1`, `english-cultivation-static-v6.0.1`, `collectReadingMarkEvidence`, `reading_vocabulary_evidence`, the zero-count Markdown line, and Journey time-scoped mark filtering.
- Synthetic tests cover 3 unsaved marks, 2 saved + 1 unsaved, multiple articles, zero marks, stable mark IDs, K/V/N preservation, duplicate suppression and feedback JSON compatibility. Physical iPhone Safari remains unverified.

## V6.1.0 — daily pack four-in-one Journey (formal release verification, 2026-11-02)

- Based on `origin/main` `c901da8` / V6.0.1. Existing reading vocabulary handoff, native Safari voice selection, follow-along recording, IELTS metadata, Battle Reports, localStorage and IndexedDB contracts remain in place.
- Added optional schema 2.0 Story Section metadata (`story_id`, `story_title`, `section_id`, `section_order`, `section_title`, `previous_section_id`, `source_reference`) and `exit_ticket` transfer tasks with optional response structure, target phrases and IELTS Part metadata. Old packs remain accepted.
- Reading marks in the active Journey now create up to five per-article immediate recall prompts after the user finishes reading. A mark alone remains `UNTESTED`; the report records the independent answer, self-rating, mark/reading/source IDs and original sentence. No marks skips this stage.
- Exit Ticket tasks use the existing transfer first-answer, hint, reference, retry, recording and K/V/N evidence path. The visible label is `Exit Ticket｜课末独立验收`; no second navigation or database was added.
- Battle Reports now carry Story Section fields, per-section completion, normalized immediate recall evidence and a dedicated Markdown section; central feedback includes `reading_recall_evidence` without changing `feedback_schema_version: "1.0"`.
- Added synthetic schema documentation, a four-in-one pack example, and Chromium Journey smoke `scripts/test-v1-four-in-one.mjs`.
- Local evidence: `npm run check` passes **131/131**; the four-in-one pack validator, PWA bundle audit, synthetic learning-data safety probe, V1 Journey smoke, existing V6 follow-along/feedback smoke and native speech/data persistence smoke all pass. Real iPhone Safari remains unverified.
- Release marker is `6.1.0`; Service Worker cache is `english-cultivation-static-v6.1.0`. No localStorage, IndexedDB recordings, backups or private learning content were cleared or uploaded.
- PR #48 merged as `7b7d9ee1cacc962b6b116331c3b4a8ce81182a44`. Main checks run `41444148193` and Pages build/deploy run `41444146645` completed successfully. The unrelated historical Cloudflare Workers Builds check remained non-blocking and was not changed.
- Live HTTPS verification returned `6.1.0`, `english-cultivation-static-v6.1.0`, the new parser/report markers and HTTP 200 for `/`, `index.html`, `app.js`, `core.mjs`, `sw.js`, the schema document and synthetic example. Disposable Chromium 390×844 confirmed the deployed shell title and four navigation destinations. Physical iPhone Safari remains the only unverified device check.

## V6.1.0 night audit and low-risk bug fix (2026-11-02)

- Audited the latest `origin/main` V6.1.0 against the existing Journey, reading recall, Story Section, IELTS/Exit Ticket, recording, report/export, storage migration, speech, PWA and mobile shell paths. No learning-order, K/V/N, FSRS, schema, localStorage or IndexedDB reset was introduced.
- Reproduced one concrete idempotency defect: `submitTransferRecordingOnly()` could append a second recording-only transfer attempt if the user double-tapped before the view rerendered. Added the same `transferState === 'revealed'` guard used by text submission. No other speculative behavior changes were made.
- Added a regression assertion in `test/ui.test.mjs`. Local `npm run check` passes **132/132** after the fix; learning-data-safety fixture 4/4, mobile static baseline 11/11, PWA bundle audit, V1 four-in-one Journey, V6 follow-along/feedback and native speech/data persistence browser smokes all pass.
- PR #50 merged as `18d72f37c3277d5f1505730d402d246cef4098b9`. Main CI run `41458148288` passed; Pages build/deploy run `41458147308` passed. Live HTTPS returned HTTP 200 for the app shell, `app.js`, `core.mjs` and `sw.js`; `app.js` contains the duplicate-submission guard and V6.1 interfaces, and `sw.js` remains `english-cultivation-static-v6.1.0`.
- Historical `Workers Builds: english-cultivation-gmini-v59-mobile` remains an unrelated external failure and was not changed. Real iPhone Safari keyboard, microphone, voice enumeration, PWA cache refresh and touch selection remain unverified; Chromium emulation is not a substitute.

## V6.2.0 — premium visual polish (formal release verification, 2026-11-02)

- Based on latest `origin/main` `4ab8d04` / V6.1.0. The existing nine authorized WebP assets are present in `assets/visuals/` and already integrated into the hero, training strip, progress card and visual gallery; no historical image was missing from the repository.
- Added a restrained CSS-only visual refinement: balanced heading/text wrapping, clearer card hierarchy and gold accent edges, improved focus rings, reading-toolbar depth, keyboard scroll margins, recording focus state and mobile safe-area spacing. No app interaction, learning order, data schema, K/V/N meaning, localStorage or IndexedDB contract changed.
- Release marker is `6.2.0`; Service Worker cache marker is `english-cultivation-static-v6.2.0` so installed PWAs can receive the stylesheet safely.
- Local evidence: `npm run check` passes **133/133**; PWA bundle audit, learning-data-safety fixture 4/4, mobile static baseline 11/11, V1/V6/native-speech browser smokes, 375/390/430 viewport overflow and navigation target checks, and day/night Chromium screenshots pass. Physical iPhone Safari remains unverified.
- PR #52 merged as `42d1753b504a56992a39ae7892550f52a5b03842`. Main checks run `41529104567` and Pages build/deploy run `41529103737` completed successfully. Live HTTPS returns `6.2.0`, `english-cultivation-static-v6.2.0`, the new visual CSS markers, and HTTP 200 for the app shell and authorized hero asset. The historical Cloudflare Worker check remains unrelated and unchanged.

## V7.0 — Speaking Studio, mastery evidence and Central Handover (in progress, 2026-11-02)

- Based on latest `origin/main` `7bdfb9e` / V6.2.0. Existing Journey, audio A/B loop, native speech, MediaRecorder/IndexedDB recordings, Battle Report, central feedback and visual assets remain in use.
- Added `studio.mjs` sentence-safe segmentation and evidence helpers. Listening tasks now show an optional Listening & Speaking Studio inside the existing listening Journey: show/hide source text, sentence-level native speech practice, existing reference audio/A-B controls, local original/retry recording and explicit `pronunciationAssessment: not_available` semantics.
- Added `buildMasteryAnalytics()` to the existing core data layer. Progress can distinguish UNTESTED, exposed, independent correct, prompted correct, corrected-after-error, delayed-review success/pending, skipped and unmeasured evidence, with real 7/30-day sessions and error types. No second FSRS or score system was added.
- Added `handover.mjs` store-only ZIP writer and a local-only “导出完整中央交接包” action. The default package contains manifest, Battle Report JSON, central feedback JSON and README; recordings are included only after explicit user selection. No upload or automatic sync occurs.
- Release marker is `7.0.0`; Service Worker marker is `english-cultivation-static-v7.0.0`. Data schema remains `4.3`; old JSON, reports and recording IDs are unchanged.
- Local evidence: `npm run check` passes **141/141**; dedicated Studio/ZIP tests pass 4/4; data safety 4/4; PWA audit and mobile baseline 11/11 pass; V1/V6/native browser smokes pass, including Studio segment controls. Real iPhone Safari remains unverified.

## V7.0 — Speaking Studio, mastery evidence and Central Handover (formal release verification, 2026-11-02)

- PR #54 merged as `66083511a68c2d9571c078e65c1509a2a3f450e0`; main test run `41533661640` and Pages deployment `41533660927` completed successfully. The historical Cloudflare Worker is unrelated and unchanged.
- Formal release marker is `7.0.0`; Service Worker cache is `english-cultivation-static-v7.0.0`; data schema remains `4.3`.
- Public HTTPS verification returned `APP_VERSION = '7.0.0'`, the new `renderListeningStudio`, `buildMasteryAnalytics` and `exportCentralHandover` markers, and HTTP 200 for `/`, `app.js`, `core.mjs`, `studio.mjs`, `handover.mjs`, `styles.css` and `sw.js`.
- V7 adds no second Journey, no second FSRS and no cloud sync. Original JSON, reports, K/V/N, IndexedDB recordings and visual assets remain compatible. Default handover ZIP excludes recordings; recording inclusion requires an explicit local action.
- Local evidence: `npm run check` passes **141/141**; dedicated Studio/ZIP tests pass 4/4; data safety 4/4; PWA audit and mobile baseline 11/11; V1/V6/native browser smokes pass. Physical iPhone Safari, microphone permissions, ZIP download behavior and actual voice availability remain user-only checks.
