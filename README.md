# English Mastery

English-first daily retrieval practice for Words & Phrases and Sentences. This is a static site with no account, backend, analytics, external requests, or paid AI API.

## Included

- Context cloze vocabulary practice with optional Chinese hints and browser English speech.
- Sentence Read → Hide → Recall → Compare practice, with full-sentence and missing-word modes.
- Mixed or focused sessions with active-time tracking, pause/resume, and 20-minute goal.
- Due-first review queue: N ≈ 1 day, V ≈ 3 days, K ≈ 7 days.
- Local CSV/TXT/Markdown/paste imports with preview, duplicate-safe merging, source labels, search and filters.
- JSON backup/restore and quoted CSV practice-history export.
- Offline-ready PWA assets for HTTPS or localhost.
- Migration from the previous MVP's `english-mastery-v1` storage and backup shape; the old storage key is left untouched.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Service workers and ES modules require HTTP(S), so do not use a `file://` URL.

Run tests:

```sh
npm run check
```

## Privacy

Only generic demo cards are included in this repository. Personal CSV files, answers, backups, tokens, and private study notes must stay on the user's device and must never be committed.

The app stores learning data in browser local storage. Safari website-data deletion or changing devices can remove local progress; export a JSON backup regularly.

## GitHub Pages

This repository is designed for GitHub Pages. Enable Pages from the repository Settings using the `main` branch and root folder. The deployed app registers its service worker only on HTTPS or localhost. Current deployment is pending because the connected GitHub token cannot create a repository (HTTP 403); see `CODEX_CHECKPOINT.md`.
