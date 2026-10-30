# English Cultivation V4.2 Reliability Design

## Intent

Make V4.1 trustworthy for long-term local learning by fixing confirmed data, attribution, reading-context, and iPhone interaction defects without replacing the working vanilla architecture.

## Goals

- Preserve local records while making saves and backup merges verifiable and failure-safe.
- Record answer provenance accurately: independent submission, hints, skip/viewed answer, retry, and sentence-cloze reference.
- Save reading selections with the sentence/paragraph that actually contains them and stable de-duplicated IDs.
- Add a focused settings destination and minimal card editing/pause/history controls.
- Use compact single-line inputs for word and sentence-cloze answers while preserving multiline recall/dictation.
- Make timer goal text and progress semantics explicit.

## Non-goals

- No IndexedDB migration, external sync, accounts, paid APIs, new repository, or URL change.
- No redesign of the existing review algorithm.
- No fabricated meanings, semantic grading, IELTS scores, or automatic external archive claims.

## Approach

Extend `core.mjs` with pure helpers for selection context, stable reading-card identity, safe persistence, and backup-state merging. Keep `app.js` as the local state coordinator, but make critical mutations check save results and restore the last persisted snapshot on failure. Add a small settings route and inline card editor, leaving the existing report and scheduling contracts intact.

## Data safety

New optional fields (`readingId`, `paragraphIndex`, `context`, `packHistory`, `archived`, `paused`) receive safe defaults during validation. Existing IDs, attempts, reports, and review dates are never deleted. Archived cards remain in backups and history but leave active queues.

## Acceptance evidence

Core tests cover context extraction, stable de-duplication, save rollback, backup merge completeness, answer provenance, sentence-cloze references, prompt counts, legacy migration, and custom timer goals. Chromium smoke covers reading extraction, settings navigation, single-line inputs, bottom navigation, and 375/390/430px overflow. Physical iPhone Safari remains a user acceptance step.
