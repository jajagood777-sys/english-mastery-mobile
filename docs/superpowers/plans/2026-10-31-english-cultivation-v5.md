# English Cultivation V5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single local evidence layer for cross-source transfer, speaking recordings, source traceability, error analytics and delayed mastery without replacing V4.4/V4.5 learning flows.

**Architecture:** Keep the vanilla ES module app and one localStorage state. Extend `core.mjs` with safe source parsing, weakness/attempt merge, transfer status and analytics helpers; add an IndexedDB-only recording module; add small V5 routes and panels to `app.js`. All new fields are optional and backward-compatible.

**Tech Stack:** Existing HTML/CSS/vanilla ES modules, IndexedDB, MediaRecorder/getUserMedia capability detection, Node built-in tests and direct Chromium smoke.

**Spec:** `docs/superpowers/specs/2026-10-31-english-cultivation-v5-design.md`

## Global Constraints

- Preserve all existing localStorage records, K/V/N, attempts, sessions, reports, daily packs and backup behavior.
- Keep `VERSION=4.3` unless a migration test proves a schema change is required.
- No private data, recordings, OAuth credentials, paid API, server, child classroom module or second numeric database.
- JSON links are safe `http:`/`https:` links only; imported text is never executed.
- Chromium simulation is not real iPhone Safari evidence.

## Tasks

### Task 1: Core evidence and source model

**Files:** `core.mjs`, `test/core.test.mjs`, `test/daily-master-pack.test.mjs`

- Add tested URL sanitization, source metadata normalization, stable weakness IDs, weakness/transfer-attempt merge, status scheduling and analytics helpers.
- Extend pack parsing and backup validation/merge with optional source and weakness fields while preserving old V4.3/V4.4 fixtures.
- RED→GREEN tests prove duplicate imports are idempotent, historical K/V/N is retained, unsafe URLs are not linkable, and denominators distinguish measured from unmeasured data.

### Task 2: Local recording capability

**Files:** `recordings.mjs`, `test/recordings.test.mjs`, `app.js`

- Add runtime capability helpers and IndexedDB CRUD for blobs; select a supported MIME type, never hard-code one format.
- Add start/stop/play/re-record/save/export controls to transfer output with original/retry roles. Permission is requested only from the start button; errors leave text entry usable.
- RED→GREEN tests cover unsupported MediaRecorder, MIME selection, storage failure fallback and metadata isolation from JSON backups.

### Task 3: Transfer room and sources

**Files:** `app.js`, `styles.css`, `index.html`, `test/ui.test.mjs`, `test/app.test.js`

- Add a Training hub entry and route for three weakness groups. Derive real-error candidates from preserved attempts/status and untested/due tasks from optional pack/weakness records.
- Implement independent answer → staged hints → reference reveal → self-correction → K/V/N, with stable transfer attempts and optional next-context selection. Never overwrite first answers.
- Render safe source details and timestamped YouTube links; show text when a URL is unsafe or absent.
- Add mobile focus/recording styles without changing the five-tab navigation.

### Task 4: Progress analytics and delayed review

**Files:** `app.js`, `styles.css`, `test/core.test.mjs`, `test/app.test.js`

- Add transparent 7/30-day evidence panels: measured independent, prompted, retry, delayed transfer and unmeasured counts, plus source/category grouping.
- Add conservative priority ordering using existing due dates and transfer status; no automatic mastery claims or IELTS scores.
- Keep report exports compatible and add optional transfer analytics/source snapshots.

### Task 5: Full verification and release

**Files:** `README.md`, `CODEX_CHECKPOINT.md`, `sw.js`, `package.json`, `core.mjs`, tests

- Run `npm run check`, all project Skills, public asset scan, daily-pack QA and Chromium smoke at 375/390/430/768/1280.
- Bump software/cache marker to the next release (`5.0.0` unless main has moved), keep data schema unchanged, audit SW assets and live HTTPS resources.
- Create PR from the V5 branch, wait for CI, merge only after review, verify Pages and record exact SHAs and remaining physical iPhone checks.
