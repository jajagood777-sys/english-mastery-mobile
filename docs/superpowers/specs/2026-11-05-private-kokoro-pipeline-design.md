# Private Kokoro learning-pack pipeline design

## Intent

Turn a final schema 2.0 learning JSON into one verified Kokoro `af_heart` MP3 ZIP with the existing V10.3 site import contract, while reusing valid audio and keeping learner data private.

## Goals

- Keep the shared extraction, segment and hash algorithm in this repository.
- Validate cached MP3 bytes, codec, duration, text hash, voice and engine before reuse.
- Remove stale/unreferenced clips from each final package and fail truthfully when any task cannot be generated.
- Provide a private GitHub Actions manual entry point that accepts only a minimal private input artifact and returns a private Actions artifact.
- Preserve resumability through an explicit cache directory and machine-readable reports.

## Non-goals and anti-goals

- No new web backend, account system, public learner-data upload, Drive credential handling, or automatic Drive upload in this change.
- No changes to learning records or website storage.
- No duplicate private copy of the speech algorithm.
- No claim of physical iPhone Safari acceptance.

## Approaches

1. Shared generator repair plus a private-repository workflow (chosen): the public repository owns extraction/segment/hash/packaging; the private repository owns the trigger and private input. This preserves one algorithm and keeps personal text out of the public repository.
2. Public workflow for private input: rejected because it would expose private text and requires public-repository write permissions.
3. Copied private generator: rejected because it creates version drift and violates the single shared implementation requirement.

## Design

The generator will build a task set from schema 2.0, deduplicate by normalized text plus voice and engine, and consult a cache only after checking the referenced MP3 exists, has the expected byte hash, is decodable MP3 with positive duration, and matches the current voice/engine. It will copy only clips referenced by the current task set into `audio/`, write `learning-pack.json`, `speech-manifest.json`, `package-info.json`, and an audio report, and exit nonzero for extraction, cache, synthesis, or packaging failures. A verified same-pack output may be returned on rerun without synthesis.

The private workflow will run manually with a small input JSON supplied through a private GitHub Actions artifact or an approved private repository file, install pinned Node/Kokoro/ffmpeg dependencies, restore a private cache, run the shared generator, upload the ZIP and reports as a private artifact, and avoid commits of learner text. It will use read-only repository permissions unless the private repository later authorizes a safer write path.

## Verification

Use synthetic schema 2.0 fixtures to prove extraction, real Kokoro synthesis where the runner permits it, cache reuse, one-text invalidation, multi-reading coverage, listening mapping, ZIP integrity, and truthful failure. Label cloud Artifact success separately from Drive, website import, and physical iPhone playback.
