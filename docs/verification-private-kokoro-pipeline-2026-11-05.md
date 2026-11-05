# Private Kokoro pipeline verification — 2026-11-05

This record uses the public synthetic fixture `examples/v56-audio-sample-pack.json`; it contains no learner history, recordings or private source material.

## Code and static checks

- Public branch: `codex/private-kokoro-pipeline-v1`; PR #70 is open for review.
- Private branch: `codex/private-kokoro-actions-v1`; PR #10 is open for review.
- `npm test`: 191 passed locally. The public PR check run `42128155746` passed. Codec-dependent tests skip when a bare Node check runner lacks `ffprobe`; the generator workflow installs ffmpeg/ffprobe before synthesis.
- Private `python scripts/validate_bundle.py`: passed. The private repository's existing unittest suite still has one unrelated baseline mirror-drift failure in `test_registry_and_mirrors`.

## Generator behavior

- Extraction: 29 tasks from the schema 2.0 fixture, including words, examples, sentences, listening, reading segments and transfer.
- Cache reuse: 29 existing, 0 generated, 0 failed; ZIP SHA-256 `d05981f998ca9b25bc444731c496e46223b07bbdd669e68120ea1eddcdb6ab23`.
- ZIP integrity: `unzip -t` passed; the archive contains exactly `learning-pack.json`, `speech-manifest.json`, `package-info.json` and 29 current `audio/*.mp3` members. A rerun test proves stale ZIP members are removed.
- Changed example: dry run reports 28 existing and exactly 1 missing example task.
- Failure behavior: a real local Kokoro attempt reached the pinned runtime but model fetch returned `fetch failed`; it reported 29 failures, exited nonzero and emitted no deliverable ZIP.
- The generated package metadata declares schema `2.0`, pack ID `V56-PUBLIC-AUDIO-SAMPLE`, voice `af_heart`, and engine `kokoro-js@1.2.1-q8`.

## Cloud and delivery states

- Existing private eight-shard Actions run `42059200204` is recorded in the private repository history as a successful Kokoro cloud synthesis mechanism. Its old artifact download was unavailable from this environment because the signed artifact URL returned HTTP 403; no new artifact is claimed here.
- The new single-pack private workflow is implemented and reviewable in PR #10, but GitHub does not register a workflow_dispatch file from a non-default branch until it is merged or otherwise installed. It has not been merged or triggered.
- Google Drive upload: not implemented or claimed.
- Website import: not run in a browser for this fixture.
- iPhone Safari playback: not tested; requires the user's device.

## Final repair pass

- Public HEAD after cache repair: `ee133bf`.
- `npm test`: 193/193 passed; public PR check run `42130607503` passed.
- Browser integration: `V10.3 BROWSER ZIP IMPORT + IDB CACHE + NATURAL PLAYBACK PASS`; `V10.3.1 LISTENING STUDIO NATURAL SEGMENTS PASS`; a synthetic two-reading browser run also played both articles through their final segments.
- Three-run cache simulation: day 1 `added=2,reused=0,kept=2`; day 2 `added=1,reused=2,kept=3`; day 3 `added=0,reused=3,kept=3`. Invalid cache rows were not reused.
- The new cache manager stores only validated MP3s and manifest rows in the long-lived library; every ZIP is built in a clean temporary directory and the Artifact glob resolves to one current-pack ZIP.
- Private HEAD after workflow repair: `bf3a61b`. The private workflow now has a versioned run-ID key, restore-keys, bounded cache, repository-dispatch file input, and the no-token helper `scripts/submit-private-audio-pack.mjs`.
