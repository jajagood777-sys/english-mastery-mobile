# English Mastery checkpoint

- Current commit: `08f63f3` (`Build English Mastery 2.0 mobile learning app`)
- Completed: V2 UI, Words & Phrases, Sentence Read/Hide/Recall/Compare, mixed/focused sessions, active timer pause/resume, due-first review, speech synthesis, CSV/TXT/Markdown/paste import, duplicate-safe merge, source filters/search/remove, JSON backup/restore, history CSV, PWA manifest/service worker, and V1 storage/backup migration.
- Verified before this checkpoint: original MVP tests passed; V2 core tests passed; legacy migration tests passed; Chromium iPhone 390×844 smoke flow passed for home, demo, word reveal/rating, sentence recall/compare, pause/resume/end, and CSV preview/import; HTTPS/local static assets served successfully.
- Privacy: repository contains generic demo material only. Personal CSV files, answers, backups, tokens, and private notes are excluded.
- Deployment status: repository `https://github.com/jajagood777-sys/english-mastery-mobile` now exists and is public; local `origin` points to it, but no commit has been uploaded. Git push and Git blobs API both return HTTP 403 `Resource not accessible by integration`. The API reports the user as admin/push, so the connected Codex GitHub App token is the blocker.
- Next action: reconnect/reauthorize the GitHub integration with repository Contents read/write (and Pages administration) access for `jajagood777-sys/english-mastery-mobile`, then push `main` and enable Pages from the `main` branch root.
