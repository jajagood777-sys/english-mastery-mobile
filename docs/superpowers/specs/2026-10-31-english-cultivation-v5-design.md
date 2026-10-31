# English Cultivation V5 — Transfer, Speaking, Sources and Delayed Mastery

## Intent

Extend the V4.5 PWA so knowledge from stories, videos, imported packs and real errors can be tested in a new context, recorded as evidence, traced back to its source and revisited later. The existing daily journey, K/V/N scheduler, reports and five-tab Quiet Mastery shell remain the primary experience.

## Decisions and approaches

### Chosen: one local evidence layer over the existing state

Add optional `weaknesses`, `transferAttempts` and `source` fields to the existing local state. Existing cards, attempts, sessions and reports remain authoritative. The training hub derives three views—真实错误、待验证知识、到期迁移—from those records and the current daily pack. This keeps one scheduler and one backup format while allowing repeated transfer attempts with stable IDs.

### Rejected: a second review database

A separate mastery database would duplicate K/V/N and create conflicting due dates. It also makes backup recovery and Google Sheets handoff harder. V5 instead stores evidence and uses the existing `scheduleReview` rules for optional transfer due dates.

### Chosen: IndexedDB for local recordings

Audio blobs live in an isolated IndexedDB store, keyed by weakness/task and attempt. Text answers and evidence stay in the existing JSON localStorage state. MediaRecorder capability and MIME type are detected at runtime; unsupported or denied recording always leaves the text answer flow usable.

### Rejected: upload or audio-in-localStorage

No server, OAuth, paid API or automatic upload is permitted. Base64 audio in the main localStorage JSON would risk quota failures and make backups unexpectedly huge, so recordings are explicitly excluded from ordinary backups and reports. Users can play or export a selected local blob.

## V5 data additions

All additions are optional and default to empty arrays or `null` when reading old state.

- `weaknesses[]`: stable `id`, `source_type`, `source_id`, `source_item_id`, `source_url`, `source_locator`, `source_name`, `target_expression`, `skill_type`, `evidence_type`, `retrieval_status`, `next_review_at`, `last_transfer_at`, `contexts[]`.
- `transferAttempts[]`: stable `id`, `weakness_id`, `context_id`, `first_answer`, `hint_used`, `hint_events`, `reference_viewed`, `retry_answer`, `rating`, `evidence_type`, `at`, `source_snapshot`.
- `items` and `transfer_tasks` accept safe source metadata (`source_type`, `source_name`, `source_url`, `source_locator`, `source_date`, `youtube_video_id`, `youtube_start_seconds`, `learning_goal`). Only `http:` and `https:` URLs are linkable.
- `recordings` are not persisted in the JSON state. IndexedDB records contain blob, MIME type, role (`original` or `retry`), weakness/task IDs and timestamps.

## User flows

1. Training hub offers “弱项迁移｜Transfer & Mastery” without changing the five bottom tabs.
2. The transfer room groups real errors, untested knowledge and due transfers. A task opens with no answer or reference text exposed.
3. The learner writes an independent answer, optionally reveals staged hints, submits, optionally views the reference, self-corrects, rates K/V/N and may repeat in another context. Every layer is preserved.
4. A recording panel is available for transfer output. Permission begins only after tapping start; text input remains available if permission, format or storage fails.
5. Progress shows transparent 7/30-day evidence counts and error categories. Unknown denominators are shown as “尚未测量”, never as zero failures.
6. Source details are visible beside a card/task. A safe external link opens a new tab; YouTube timestamps use a validated video ID and seconds.

## Safety and compatibility

- `VERSION` remains 4.3 for the learning data schema unless a tested migration becomes necessary; V5 additions are progressive defaults.
- Backup merge deduplicates stable weakness and transfer IDs, preserves existing K/V/N and never imports audio blobs.
- JSON imports never execute content. Unsafe URLs are displayed as text and are not linked.
- Reports gain optional transfer evidence and analytics snapshots without changing existing report IDs or sync status.
- No child classroom simulation, TPR game or teacher-training module is added.

## Verification

Synthetic tests cover duplicate weakness import, independent/prompted/retry evidence, safe source URLs and YouTube timestamps, analytics denominators, old-state migration, IndexedDB/MediaRecorder capability fallbacks, and backup preservation. Chromium smoke covers the transfer hub, text fallback, source link rendering, recording-unavailable state and mobile focus at 375/390/430px. Real iPhone Safari microphone permission, playback, keyboard and native selection remain user-side checks.
