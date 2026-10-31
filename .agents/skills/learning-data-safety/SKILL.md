---
name: learning-data-safety
description: Audit localStorage backup import, V1–V4.x migration, K/V/N history, attempts and report deduplication before changing English Cultivation storage or learning progression. Use for any data-loss, restore, version migration, or session integrity bug; not for ordinary design.
---
# English Cultivation — Learning Data Safety

This is the project's **data-preservation gate**. A user's local Safari `localStorage` is the only authoritative record held by the website, not GitHub. **Never clear, reset, replace, upload or log private learner storage.** Imported learning materials and actual completed sessions are different evidence.

## Before a storage-related code change

1. Inspect `core.mjs` (`VERSION`, `migrateBackupPayload`, `validateBackup`, `mergeBackupState`, `mergeDailyPackItems`, `persistState`) and `app.js` (`load`, `save`, `importBackup`, `finishDailyJourney`, `rebuildJourneyReport`).
2. Identify the actual schema/data version separately from `APP_VERSION`, which is a software release marker. Never increment backup schema only for cosmetic releases; test every migration.
3. Verify old and new local data retain item IDs, historical K/V/N, due dates, original answers, prompted retries, session IDs, reading marks, article source and report IDs.
4. Confirm report import/dedup does not double-count active seconds or create multiple final journey reports.
5. Simulate `localStorage.setItem` failure. The save must fail visibly and leave the last known-good backup recoverable.
6. Test repeated backup restoration and identical daily pack reimport for idempotency.

## Run the synthetic safety probe

From repository root:

```bash
node .agents/skills/learning-data-safety/scripts/check-fixture.mjs
npm run check
```

The probe uses **original fake IDs and synthetic records only**, reads no personal files, and calls the live `core.mjs` functions. Passing it does not prove that an actual iPhone Safari user's private data can be recovered.

## Real-data workflow: only when user explicitly approves

Ask the user to make a complete backup **to iPhone Files** before risky changes. If the user voluntarily uploads a backup for troubleshooting, inspect it only in a private session and report counts/field health; never commit it, paste private records into issues, or send it to external services. Do not ask for browser credentials. Restoration to a real device must be user-directed and visually verified; do not describe it as completed based on code tests.

## Output

- Source `main` SHA, backup/data schema version, exact affected fields and changed code.
- Evidence from synthetic tests; user-device and real-data cases separately marked **unverified** until observed.
- Risks and rollback/backup path. Stop before destructive migrations.
