# English Cultivation

**The Language Immortal Aperture** · Learn. Recall. Refine. Advance.

A lightweight English-first mobile learning PWA for vocabulary, phrases, complete sentences, and honest self-assessment. The cultivation theme is a calm interface layer; the learning record remains grounded in real actions.

## 10.3.8 Speech Chamber — single-ZIP shadowing (2026-11-10)
- An optional `speeches` array in the existing `schema_version: "2.0"` JSON imports the user-supplied English manuscript once. **No printing, PDF, DOCX or paper editor is part of this website.**
- Speech Chamber uses one private **full-length** `af_heart` MP3 per manuscript from the existing ZIP `speech-manifest.json` / IndexedDB cache; no on-device model download, no unknown paid service and no public user-script uploads. The offline audio generator exports the single `speeches` category task; if a synthesis engine needs short chunks, the *offline pack maker* must concatenate those into a seekable final MP3 before import. Merely collecting unjoined segment clips is insufficient.
- Player: native HTML audio, play/pause, seek ±5 seconds, draggable timeline, 0.75/1/1.25 speed, optional A–B segment loop. Shadowing and hide/show original script use user-controlled buttons, **not AI pronunciation scoring**.
- The learning Journey adds Speech after Listening and before Transfer if the pack has speeches. No `speeches` field means legacy behavior remains unchanged. Unfinished speech stage and verified audio-active seconds survive the normal local backup path. Self-reported shadowing/delivery is stored separately from audio playback and never upgrades K/V/N or claims independent pronunciation success.
- Minimal example:
  ```json
  {"schema_version":"2.0","pack_id":"sample-speech","items":[],"speeches":[{"speech_id":"opening","title":"An Original Speech","script_en":"Good morning, everyone. ...","audio_voice":"af_heart","source_type":"user_supplied"}]}
  ```
- If `script_sha256` is provided, it MUST be SHA-256 of the NFKC, whitespace-collapsed script (UTF-8), matching `speechTextHash`. Imported audio manifest also verifies text and file hashes. The demo snippet above is illustrative only; it does not ship a real speech asset.
- iPhone Safari physical audio seeking/offline acceptance remains a **separate device test**, not implied by Node CI. Never clear Safari/IndexedDB, replace an in-progress R02 study ZIP, or claim generated MP3s were imported before actual evidence.


## V4.0 upgrade

- V4.0 consolidates the dashboard with due/new/difficult queues, actual training minutes, 7-day and 30-day trend summaries, reading, listening, daily packs, and provenance-rich battle reports.
- V3.8 adds a listening-recall mode using browser SpeechSynthesis, adjustable by the existing speech speed setting, with text fallback and no pronunciation scoring.
- V3.7 adds a local Reading Chamber for imported TXT/Markdown, paragraph reading, native speech playback, and selection-to-card extraction. Articles remain local and no dictionary or external text is fetched.
- V3.6 adds progressive real-data hints (meaning, definition, part of speech, collocations, first letter), keyboard completion, accepted-answer visibility, and mobile focus scrolling without losing input.
- Day Cultivation and Night Cultivation themes, with System default and saved preference.
- English Cultivation home with a 20-minute goal, active minutes, due count, Refine Words, Forge Sentences, Knowledge Vault, and Battle Reports.
- Existing V2 practice retained: cloze vocabulary, optional Chinese hint, sentence recall/missing words, browser English speech, mixed sessions, due-first review, K/V/N, import preview, duplicate-safe library, local backups, and offline PWA cache.
- Structured local Battle Reports with stable report/session IDs, Asia/Shanghai timezone metadata, actual active seconds, mode breakdown, practice details, K/V/N summary, review recommendations, and `NOT_SUBMITTED`/`EXPORTED` sync state.
- Copy, Web Share, Markdown download, JSON download, and local Battle Report archive. Sharing never claims that ChatGPT, Sheets, Notion, or Drive received data.
- Material records carry content type, source, import time, stable IDs, and source identifiers where available.
- V1/V2 local storage and backup migration remains available; old storage is never deleted.
- 中文操作导航和帮助层；English questions, sentences, examples, and reading material remain in English.
- Explicit mode switching: Words, Sentences, Mixed, today's pack only, or due review only. An unfinished session always asks before switching.
- Word cloze and sentence missing-word inputs focus correctly on tap; sentence training clearly separates Missing Words from Full Sentence Recall.
- `english-learning-pack.json` import with `schema_version`, `pack_id`, `title`, `source`, `language`, and flexible `items`; CSV/TXT/Markdown imports remain supported.
- Daily new-card and review limits are configurable in Settings; due items remain prioritized.
- Difficult-card training targets repeated N/V or error-prone items without creating duplicate cards.
- All practice entry points now send truly unlearned cards through Learn New Content first; learned cards can enter Independent Retrieval directly.
- Sentence cloze now requires an explicit target/cloze answer; otherwise it falls back to full-sentence recall. Daily training minutes use Asia/Shanghai calendar dates.
- New cards now use Learn New Content → Guided Practice → Independent Retrieval instead of forcing a first-contact guess. Complete targets, examples, trusted optional metadata, and progressive hints are shown before recall.
- Learning records distinguish first independent answers, prompted answers, viewed-answer flows, and retry-after-error; no first-contact reading is counted as mastery.
- Answer checks distinguish exact, case/punctuation-only, minor spelling, and different answers; optional immediate retry stores the first answer and retry separately.
- Review scheduling uses K/V/N with bounded adaptive intervals based on the previous interval, while the home queue shows due, weak, and new counts.
- Optional tags, source, status, pack, and due filters are available in the local library.

## V4.1 upgrade

- Mobile-first home now centers on one honest “今日修炼” card showing due reviews, new items, and actual minutes, with a single primary start action.
- Five touch-safe destinations — 首页、训练、阅读、进度、我的 — keep the library, reports, help, and local settings reachable without crowding the iPhone header.
- Training hub separates new learning, due review, free vocabulary/sentence practice, difficult items, and today's pack while reusing the existing queue and confirmation rules.
- Practice cards have stronger single-question hierarchy, real keyboard-safe answer spacing, visible answer feedback, and touch feedback. Legacy `UNTESTED` cards still enter Learn New Content before recall.
- Reading typography and the selection toolbar are optimized for long English passages; report summaries use compact, readable metric cards.
- Version `4.1.0` refreshes the service-worker cache to `english-cultivation-static-v4.1.0`. No storage migration or data deletion was introduced.

## V4.2 upgrade

- Reliability audit fixed reading-card context, stable duplicate IDs, safe legacy migration, save-failure rollback, and complete backup merge/validation for readings, packs, attempts, sessions, reports, and settings.
- Answer provenance now distinguishes ordinary submission from skipped/viewed-answer flow; prompt counts only increase when a hint was used; sentence-cloze reports store the missing expression instead of the full sentence.
- Reading extraction stores the containing English sentence, reading ID, source, paragraph index, original selection, and context. Cross-sentence word selections are refused with a clear message.
- Knowledge Vault cards can be inspected, edited, paused, archived, restored, or sent back to learning without deleting practice history.
- Settings now has its own page with target minutes, speech speed, theme, hint/retry controls, limits, and backup restore preview. Word and sentence-cloze answers use compact single-line inputs; recall and dictation remain multiline.
- Version `4.2.0` refreshes the service-worker cache to `english-cultivation-static-v4.2.0`. Existing localStorage data remains the source of truth; no IndexedDB migration was introduced.

## V4.3.1 — Codex real-user data repair

- Combined journey reports now aggregate the actual stage session IDs, retain each original `session_id`, keep retries/prompts/raw answers, split vocabulary, sentences, and listening, and count only valid K/V/N rows as rated. Unrated or skipped actions remain explicit.
- Existing completed journeys can be rebuilt locally from preserved stage sessions and attempts. The rebuilt report receives a new recovery ID; the original report is never overwritten.
- New cards are English-first: Chinese meaning is hidden until the learner taps `显示中文释义`; that action is recorded as a prompt event and does not become an independent first answer.
- Reading supports native iPhone selection plus a lightweight double-tap fallback to mark multiple unfamiliar words. Marks persist locally, can be cancelled, batch-save as context-rich word cards, and appear in journey report exports. Existing selection-to-card saving remains available.
- Reading marks, articles, packs, attempts, sessions, reports, and old progress are included in backup validation and merge. Cache marker and app version are now `4.3.1`.

## V4.4 — evidence-based transfer and comprehension upgrade

- Daily JSON remains backward-compatible and can optionally include `transfer_tasks` plus `readings[].questions`.
- The optional journey stage “迁移挑战” records independent first answers, prompt use, model-answer viewing, self-correction and K/V/N without replacing the original answer.
- Reading articles can expose an optional comprehension check. Choice answers are checked deterministically; open answers remain unassessed for human comparison.
- Battle reports preserve evidence layers and explicit unmeasured states; no IELTS or semantic score is fabricated.
- Version `4.4.0` refreshes the PWA cache without changing the learning data schema (`VERSION` remains backward-compatible).

## V4.5.0 — Quiet Mastery visual and navigation system

- The existing V4.4 learning flow now uses a calm modern-East-Asian visual system: warm ivory surfaces, deep jade actions, antique-gold focus accents, restrained shadows and responsive type.
- The home page keeps real `homeSummary` values, but gives the daily learning action one clear visual focus with the authorized ink-wash hero image, honest three-stat summary and a compact route through the learning modes.
- The five Chinese destinations remain 首页、训练、阅读、进度、我的. Their mixed text glyphs are replaced by consistent inline SVG line icons; mobile navigation respects the iPhone safe area and keeps reading tools above the bar.
- Training, reading, progress, reports and 我的 share the same tokens. Reading text remains selectable, long-form, high-contrast and free of image overlays.
- Software/cache version is `4.5.0`; the backward-compatible learning data schema remains `VERSION=4.3`. No localStorage migration or deletion was introduced.

## V5.3.0 — Continuous long-text speech and Kokoro feasibility gate

- Native speech now splits long English text at sentence boundaries and provides pause, resume, stop and replay controls in the reading toolbar. Switching text cancels the previous queue.
- Kokoro-82M was checked against the current browser delivery constraints: the quantized ONNX file is about 92.4 MB, q4 is about 305 MB, and `af_heart.bin`/`af_bella.bin` are about 0.5 MB each. With runtime memory and iPhone Safari uncertainty, Kokoro was not falsely exposed as a working engine or placed in the default cache.
- V5.3 therefore keeps the verified native voice path and records Kokoro as not successfully integrated pending real iPhone performance evidence. No model download starts automatically and no learning data or recordings are touched.
- Software/cache version is `5.3.0`; learning data `VERSION=4.3` remains unchanged.

## V5.2.0 — Native American English voice selection

- Native browser speech now discovers the actual `speechSynthesis.getVoices()` list, waits for `voiceschanged`, prefers available `en-US` voices and safely falls back when the device has no American English voice.
- The existing Settings page now offers an English Voice selector, a sample audition, automatic voice reset and bounded 0.75×–1.25× speed choices. The selected voice URI, language and name are stored in the existing settings object; learning schema remains `VERSION=4.3`.
- Vocabulary, sentence, listening and reading buttons share the same selected voice and stop an earlier utterance before starting another one. Speech playback is not counted as a learning attempt.
- Kokoro feasibility was reviewed but is not enabled in the default PWA: `kokoro-js` is Apache-2.0 but its npm package is about 30 MB unpacked and still requires a separate model download (the referenced quantized model is roughly 90 MB) plus device-dependent ONNX/WASM memory. No model is bundled or pre-cached, and native speech remains the stable iPhone path.
- Software/cache version is `5.2.0`; no localStorage, K/V/N, reports, daily journeys or IndexedDB recordings were cleared or migrated.

## V5.1.1 — Transfer skip navigation reliability

- Fixed the Daily Journey blank-screen defect when skipping from the second speaking task into writing: transfer draft state is normalized before rendering, and all skip/rating advances now use one bounded transition path.
- Speaking → reading-to-speaking → writing → grammar transitions are covered by a synthetic 006 regression fixture. Skipped tasks remain explicitly skipped/partial and never create a fake completed attempt.
- Invalid transfer state now shows a recoverable error panel with return-to-overview and resume controls. Active recordings are stopped safely before a skip; IndexedDB audio is retained.
- Software/cache version is `5.1.1`; learning data `VERSION=4.3` is unchanged.

## V5.1.0 — Daily pack modules and speaking integration

- The daily overview now shows separate counts and progress for vocabulary, sentence/grammar, reading, reading comprehension, listening, speaking, writing and grammar transfer. Existing `transfer_tasks` are classified conservatively from `task_type` or tags; unknown tasks remain general transfer.
- Daily journey speaking and reading-to-speaking tasks now expose the existing IndexedDB recording controls. A pure voice attempt can be saved without typing a transcript; it remains unassessed until reviewed.
- Writing tasks have a dedicated multiline draft view with 80–100 word guidance and live word count. Grammar tasks remain text-only transformation prompts. Original drafts and retries stay separate.
- Reading completion and reading comprehension remain separate states; the reading page keeps the optional question panel visible and the journey notifies when questions are still pending.
- Software/cache version is `5.1.0`; learning data `VERSION=4.3` and the V5.0 recording store remain unchanged.

## V5.0.0 — English ability transfer system

- Adds one “弱项迁移｜Transfer & Mastery” room under 训练. It separates real errors, untested knowledge and due transfers while retaining independent first answers, hints, reference viewing, self-correction, K/V/N and delayed evidence.
- Adds optional source traceability fields for Notion, Google Drive, YouTube timestamps, A4 identifiers, internal readings and report/session references. Only safe `http:`/`https:` links are clickable; imported JSON remains text data.
- Adds local speaking capture with runtime MediaRecorder MIME detection, original/retry roles, replay and export. Audio is stored in IndexedDB only and is excluded from ordinary JSON backups and Battle Reports. Text input remains available when permission or storage fails.
- Adds transparent transfer evidence analytics to 7/30-day progress, with measured denominators and “尚未测量” for missing evidence. No IELTS or pronunciation score is fabricated.
- Daily JSON `schema_version: "2.0"`, old backups, K/V/N and existing reports remain compatible; learning data `VERSION=4.3` is unchanged. No child classroom simulation or second numeric database was added.

## V10.3 — one daily ZIP with pre-generated natural speech

- `scripts/generate-audio-pack.mjs` reads one schema 2.0 pack, extracts English targets, definitions, examples, sentences, listening text, safe reading segments and transfer prompts, and de-duplicates exact text by voice and generator version.
- With the pinned `kokoro-js@1.2.1` runtime available, the generator validates WAV/MP3 output, writes `speech-manifest.json`, `package-info.json` (including the manifest SHA-256), and produces one ZIP containing the byte-preserved `learning-pack.json` plus `audio/*.mp3`. A failed generation exits non-zero and records failures in `audio-report.json`; it never fabricates silent audio.
- In the app, the existing “导入每日学习包 ZIP” control accepts that ZIP or a JSON-only ZIP. It validates package IDs, schema version, manifest hash, ZIP CRC/size/path safety, and clip text/file hashes before caching clips in the existing `english-cultivation-audio-v1` IndexedDB store. No learner localStorage, Journey, K/V/N, report or recording store is reset.
- Existing English speech buttons prefer an imported Heart (`af_heart`) MP3 and fall back to the existing device voice when a clip is missing or playback is unavailable. Playback is not a learning attempt and generated audio is never treated as a user recording.
- The public repository contains only synthetic demo audio. Private daily packs and generated audio remain local or in an authorized private workflow.

## V4.3.2 — ink-wash visual layer

- The home page now has an optional mountain-and-crane hero slot, training-page calligraphy detail, progress-page growth portrait/quote slots, and a collapsible visual scroll in 我的.
- Visual assets are optional and fail back to an ink-wash CSS placeholder. Missing images never block English practice, reading, keyboard input, or offline startup.
- The reading surface remains a clean high-contrast English page; no image is placed behind reading text or answer controls.
- The nine owner-authorized images are mapped in [`assets/visuals/README.md`](assets/visuals/README.md) and are served as optimized WebP files from `assets/visuals/`.
- Version `4.3.3` refreshed the PWA cache and included `visuals.mjs` plus all nine visual assets in the offline shell.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. ES modules and the service worker require HTTP(S), not a `file://` URL.

Run automated checks:

```sh
npm run check
```

## Privacy and handoff

Only generic demo cards are committed. Personal CSV files, answers, backups, tokens, and private notes stay on the device. Local storage can be erased by Safari website-data deletion, so export JSON regularly.

The Markdown battle report ends with a Chinese Central Immortal Aperture handoff request. It is a user-approved handoff instruction, not an automatic sync. External systems must verify report and session IDs before writing anything.

## GitHub Pages

The live Pages URL is `https://jajagood777-sys.github.io/english-mastery-mobile/` (main branch, root folder). The service worker cache is versioned with each release; V5.1.1 uses `english-cultivation-static-v5.1.1` so a deployment receives a fresh cache.

## V4.3 — one JSON file for all today's English study

The Central Immortal Aperture now generates **one UTF-8 JSON daily pack** named `english-daily-master-pack.json`. Import once under 资料库; the app previews and automatically separates **炼词 → 炼句 → 阅读 → 听力**, then walks through the available modules. A missing module is shown as absent; it is never fabricated or marked completed. Original V1–V4.2 packs, CSV, TXT, Markdown and local backup import still work.

JSON structure: `schema_version`, `pack_id`, `title`, `source`, `created_at`, `language`, `recommended_minutes`, `items` (`type: word | sentence | listening`) and `readings` (article objects with `id, title, text, source`). Use the checked-in example `examples/english-daily-master-pack.json` as the handoff template. Words require `target, example`; sentence tasks require `text` and may include `cloze_target`; listening tasks require `text` and use native browser speech synthesis; readings require `title, text`. Every task must have authentic or clearly authored, appropriately attributed English material.

A daily journey stores actual word/sentence/listening attempts in their original sessions. Reading is explicitly confirmed by the learner (not graded as proven comprehension); a combined battle report shows module completion status, real active reading time, attempts, K/V/N and provenance. All data is local and can be backed up; no external synchronization is implied.

## V4.3 Codex Verified Edition

- Independent review corrected the V4.3 data-version mismatch, separated full-backup restore from daily-pack import, constrained the free listening entry to listening items, added the standard mobile answer-input class to listening dictation, and removed per-module report duplicates from a daily journey.
- The complete journey now archives one combined `journey` report after the four stages. Module session records remain available for accurate timing and history.

**Timer**: elapsed time starts at 00:00 and counts upward. Recommended 30/40/60 or a custom goal (5–180 minutes in a pack; 1–180 minutes in settings) is a *soft target*, never an automatic finish. Pausing, hiding or exiting the reading page pauses reading time. User may continue after goal; results only count actual recorded learning.


### V10.3.9 · Multi-paragraph listening closeout (2026-11-10)
For long multi-segment Listening material, the three original "片段 1/2/3" device-speech controls remain. The old duplicate whole-passage dictation and mandatory shadowing recorder are replaced with a compact comprehension self-report: optional one-sentence gist, understanding choice, then next card (or explicit skip). Such a task is recorded as `UNRATED`, with `listening_variant=brief_comprehension`, never a new K/V/N or FSRS due. Short listening sentences keep the existing full sentence-dictation practice and optional follow-along recording. Existing unfinished Safari R02 sessions and diagnostic source records are not deleted; long items already at `recall` or `revealed` are shown in the new compact closeout without resetting the session. Segments are device voice, not claimed to be original human recordings. No additional package requirements or printing features.
