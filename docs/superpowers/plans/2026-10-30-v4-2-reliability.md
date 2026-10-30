# V4.2 Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans when implementing this plan.

## Requirements

- Preserve V1–V4.1 local data, URL, reports, learning-pack formats, and review behavior.
- Use Chinese for operations and English for learning content.
- Keep local-first storage; no IndexedDB or external sync unless a safe migration exists.

## Review Focus

- A storage quota failure must not be followed by a success toast or discarded data.
- A selected reading word must use its containing sentence, including repeated words and punctuation.
- Sentence cloze reports must reference the missing expression, while recall/listening reports retain the full sentence.
- Backup merge must retain readings, pack metadata, attempts, sessions, reports, and existing progress.
- Existing active sessions and legacy `UNTESTED` cards must remain resumable.

### Task 1: Pure reliability and provenance helpers

**Files:** `core.mjs`, `test/core.test.mjs`

- Add failing tests for `readingSelectionContext`, `readingCardId`, `persistState`, `mergeBackupState`, and safe validation defaults.
- Implement pure helpers with stable normalization and explicit failure results.
- Run the full test suite and commit.

### Task 2: App data paths and answer records

**Files:** `app.js`, `test/ui.test.mjs`

- Add failing source/UI tests for migration, save-result guards, independent submission provenance, prompt counts, sentence-cloze references, and configurable goal text.
- Make `load` migration safe, track the last persisted snapshot, guard critical saves, and use the new backup merge.
- Separate normal answer submission from answer viewing/skipping and preserve the real sentence-cloze reference.
- Run tests and commit.

### Task 3: Reading extraction and card management

**Files:** `app.js`, `styles.css`, `test/core.test.mjs`, `test/ui.test.mjs`

- Add failing tests for sentence-context extraction, stable duplicate reading cards, archive/pause behavior, and card edit preservation.
- Save reading ID, source, paragraph, context, and original selection; use stable IDs and refuse ambiguous cross-sentence word extraction.
- Add card detail/edit/history controls and archive/pause/relearn actions without deleting history.
- Run tests and commit.

### Task 4: iPhone inputs, settings, timer, and backup UX

**Files:** `app.js`, `styles.css`, `README.md`

- Add failing UI checks for single-line word/cloze inputs, settings destination, explicit time-progress label, and backup preview/verification text.
- Add compact inputs, a real settings page, dynamic goal notifications, and readable restore previews.
- Run full checks and mobile smoke at 375/390/430px; commit.

### Task 5: V4.2 deployment checkpoint

**Files:** `package.json`, `core.mjs`, `sw.js`, `CODEX_CHECKPOINT.md`, `README.md`

- Update version/cache to 4.2.0, document confirmed defects and fixes, run all checks, push main, poll Pages, and verify the live shell, version, cache, and mobile layout.
