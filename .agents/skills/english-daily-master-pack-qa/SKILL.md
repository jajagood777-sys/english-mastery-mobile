---
name: english-daily-master-pack-qa
description: Validate a single English Cultivation daily JSON file for word, sentence, reading, and listening modules. Use when asked to generate, inspect, debug, or accept an english-daily-master-pack.json before iPhone import.
---

# One-file Daily English Pack Quality Gate

Purpose: validate a **local, user-provided or original** English daily master pack before importing it into English Cultivation. Never claim a pack has been learned or synced just because it parses.

## The exact acceptance command

From repository root:

```sh
node .agents/skills/english-daily-master-pack-qa/scripts/validate-daily-pack.mjs path/to/english-daily-master-pack.json
```

The validator uses the real `recordsFromLearningPack` implementation in `core.mjs`, checks the actual `schema_version`, stable IDs, module routing, explicit cloze targets, field sizes, source and duplication warnings, and prints a JSON summary. Exit code 0 indicates structural acceptance by the validator; it **does not** prove iPhone Safari import or educational accuracy.

For a release or schema change also run `npm run check`; exercise the real import UI with the synthetic example `examples/english-daily-master-pack.json`.

## Required user workflow

1. Obtain the daily file from the Central Immortal Aperture or an attached original source. Do not assume connected Google Drive/Notion/TickTick records are accessible inside Codex.
2. Use `schema_version: "2.0"`, a stable `pack_id`, a title, `source`, `recommended_minutes`, `items`, and `readings`. The four module types are `word`, `sentence`, `listening`, and `readings`.
3. Validate before giving the user a downloadable JSON. If validation fails, correct only the offending fields and rerun. Do not silently delete items or invent missing articles to reach four modules.
4. Inspect English teaching quality manually: examples must be idiomatic, accurately sourced (or clearly original), unambiguous cloze targets, copyright-compatible. Alternative accepted answers must be truly acceptable.
5. The website counts actual active time upward; `recommended_minutes` (often 40) is guidance, **not** a mandatory finish condition. New items should teach first then test.
6. Do not commit user-specific pack content, raw answers, private source documents, credentials, or exported battle reports to this public GitHub repository. Use only synthetic fixture data in tests.
7. After completion, only a real Battle Report submitted to the Central Immortal Aperture can be considered for verified Sheets/Notion recording. No automatic synchronization is implied.

## Output

Report parse outcome, counts for words/sentences/readings/listening, suggested minutes, warning/errors, and whether actual mobile testing or local user-data import was performed. Never conflate validation, import, and learning completion.
