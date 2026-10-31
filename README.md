# English Cultivation

**The Language Immortal Aperture** · Learn. Recall. Refine. Advance.

A lightweight English-first mobile learning PWA for vocabulary, phrases, complete sentences, and honest self-assessment. The cultivation theme is a calm interface layer; the learning record remains grounded in real actions.

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

## V4.3.2 — ink-wash visual layer

- The home page now has an optional mountain-and-crane hero slot, training-page calligraphy detail, progress-page growth portrait/quote slots, and a collapsible visual scroll in 我的.
- Visual assets are optional and fail back to an ink-wash CSS placeholder. Missing images never block English practice, reading, keyboard input, or offline startup.
- The reading surface remains a clean high-contrast English page; no image is placed behind reading text or answer controls.
- The nine owner-authorized images are mapped in [`assets/visuals/README.md`](assets/visuals/README.md) and are served as optimized WebP files from `assets/visuals/`.
- Version `4.3.3` refreshes the PWA cache and includes `visuals.mjs` plus all nine visual assets in the offline shell.

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

The live Pages URL is `https://jajagood777-sys.github.io/english-mastery-mobile/` (main branch, root folder). The service worker cache is versioned with each release; V4.3.2 uses `english-cultivation-static-v4.3.2` so a deployment receives a fresh cache.

## V4.3 — one JSON file for all today's English study

The Central Immortal Aperture now generates **one UTF-8 JSON daily pack** named `english-daily-master-pack.json`. Import once under 资料库; the app previews and automatically separates **炼词 → 炼句 → 阅读 → 听力**, then walks through the available modules. A missing module is shown as absent; it is never fabricated or marked completed. Original V1–V4.2 packs, CSV, TXT, Markdown and local backup import still work.

JSON structure: `schema_version`, `pack_id`, `title`, `source`, `created_at`, `language`, `recommended_minutes`, `items` (`type: word | sentence | listening`) and `readings` (article objects with `id, title, text, source`). Use the checked-in example `examples/english-daily-master-pack.json` as the handoff template. Words require `target, example`; sentence tasks require `text` and may include `cloze_target`; listening tasks require `text` and use native browser speech synthesis; readings require `title, text`. Every task must have authentic or clearly authored, appropriately attributed English material.

A daily journey stores actual word/sentence/listening attempts in their original sessions. Reading is explicitly confirmed by the learner (not graded as proven comprehension); a combined battle report shows module completion status, real active reading time, attempts, K/V/N and provenance. All data is local and can be backed up; no external synchronization is implied.

## V4.3 Codex Verified Edition

- Independent review corrected the V4.3 data-version mismatch, separated full-backup restore from daily-pack import, constrained the free listening entry to listening items, added the standard mobile answer-input class to listening dictation, and removed per-module report duplicates from a daily journey.
- The complete journey now archives one combined `journey` report after the four stages. Module session records remain available for accurate timing and history.

**Timer**: elapsed time starts at 00:00 and counts upward. Recommended 30/40/60 or a custom goal (5–180 minutes in a pack; 1–180 minutes in settings) is a *soft target*, never an automatic finish. Pausing, hiding or exiting the reading page pauses reading time. User may continue after goal; results only count actual recorded learning.
