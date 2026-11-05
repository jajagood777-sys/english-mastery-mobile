# Private Kokoro Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the existing V10.3 generator safely reuse verified Kokoro MP3s and produce a truthful, exact schema 2.0 ZIP through a private GitHub Actions entry point.

**Architecture:** Keep extraction, normalization, segmentation and packaging in the public repository. Add file-level cache validation and current-task pruning there. Add a private-repository workflow that stages minimal JSON, invokes the shared generator, and uploads a private Artifact without committing learner text.

**Tech Stack:** Node.js 20 ESM, `kokoro-js@1.2.1`, ffmpeg/ffprobe, GitHub Actions, ZIP, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-05-private-kokoro-pipeline-design.md`

## Global Constraints

- Schema version is `2.0`; voice is `af_heart`; engine is `kokoro-js@1.2.1-q8`.
- Final ZIP contains only `learning-pack.json`, `speech-manifest.json`, `package-info.json`, and referenced `audio/*.mp3`.
- Private learner text never enters the public repository or public Pages assets.
- Failed synthesis exits nonzero and reports `AUDIO_PENDING`-equivalent failure details; no false success.
- No Google Drive credentials, paid services, or production merge/deploy actions.

## Review Focus

- A manifest entry whose MP3 is deleted or modified must be regenerated.
- A valid old clip for another voice/engine must never satisfy a current task.
- A prior output clip no longer referenced by the current pack must be absent from the new ZIP.
- Duplicate normalized text across categories must yield one MP3 with all source references.
- A failed task must leave a nonzero process and an inspectable report.

### Task 1: Add verified cache primitives and regression tests

**Files:**
- Modify: `audio-tasks.mjs`
- Test: `test/audio-tasks.test.mjs`

**Interfaces:**
- Produce a cache-validation helper used by the generator that accepts a manifest row and output directory and returns a validated row or a reason.
- Preserve `extractAudioTasks` output and V10.3 segmentation behavior.

- [ ] Add failing tests for missing file, file-hash mismatch, wrong engine/voice, duplicate normalized text, and valid cache reuse.
- [ ] Implement async MP3 existence/hash/decode metadata validation using `ffprobe` only where the generator can supply it; keep pure extraction deterministic.
- [ ] Run the focused test file and commit.

### Task 2: Make generation and ZIP output exact and truthful

**Files:**
- Modify: `scripts/generate-audio-pack.mjs`
- Test: `test/generate-audio-pack.test.mjs` (new)

**Interfaces:**
- CLI remains `node scripts/generate-audio-pack.mjs --pack <json> --out <dir> [--voice] [--engine] [--zip]`.
- Output report includes pack ID, requested/existing/generated/failed counts, cache invalidations, and failure details.

- [ ] Add fixture-based tests for first run, rerun reuse, one changed sentence, two-reading coverage, stale-clip pruning, ZIP member set, and failed generation exit status.
- [ ] Validate cached MP3 bytes, file SHA-256, positive duration, MP3 codec, voice and engine before reuse.
- [ ] Build the manifest from current tasks only, copy only current files under ZIP `audio/`, and include all source references for deduplicated clips.
- [ ] Ensure package info references the current pack/schema and manifest hash; write truthful report before nonzero exit.
- [ ] Run focused tests and the full Node suite; commit.

### Task 3: Add the private Actions entry point and operating guide

**Files:**
- Create in private repo: `.github/workflows/build-private-audio-pack.yml`
- Create in private repo: `docs/PRIVATE_KOKORO_AUDIO_PIPELINE.md`
- Modify in private repo: `README.md` only if a pointer is needed

**Interfaces:**
- Manual dispatch accepts a private artifact/input reference and optional pack ID; workflow never accepts public repository paths for learner data.
- Artifact output includes the ZIP, `audio-report.json`, `audio-tasks.json`, and checksums.

- [ ] Pin checkout/setup/upload actions, set read-only permissions, set timeout/concurrency, and install ffmpeg/zip.
- [ ] Fetch the shared generator at a pinned public commit or checkout a temporary worktree without committing private input.
- [ ] Restore a private audio cache keyed by voice/engine/model/runtime; run generator; upload only on successful or explicitly diagnosable failure.
- [ ] Document manual input, expected output, cache behavior, status fields, and unimplemented Drive upload.
- [ ] Run workflow syntax/security checks and commit the private-repo changes.

### Task 4: Perform verification and prepare PRs

**Files:**
- Create: `docs/verification/private-kokoro-pipeline-2026-11-05.md`
- Modify: private repo checkpoint/guide only with evidence links if needed

- [ ] Run synthetic JSON extraction and local packaging tests without personal data.
- [ ] Run one real Kokoro generation where dependencies/model access permit; record duration, counts, ZIP SHA-256, and artifact URL.
- [ ] Trigger the private workflow with the synthetic pack, inspect logs/artifact, and distinguish cloud success from Drive/site/iPhone states.
- [ ] Run `npm run check`, `gh pr create` for the public branch, and create a private-repo PR; do not merge or deploy.
- [ ] Record any unavailable validation honestly and provide the exact next command.
