# English Cultivation

**The Language Immortal Aperture** · Learn. Recall. Refine. Advance.

A lightweight English-first mobile learning PWA for vocabulary, phrases, complete sentences, and honest self-assessment. The cultivation theme is a calm interface layer; the learning record remains grounded in real actions.

## V3 upgrade

- Day Cultivation and Night Cultivation themes, with System default and saved preference.
- English Cultivation home with a 20-minute goal, active minutes, due count, Refine Words, Forge Sentences, Knowledge Vault, and Battle Reports.
- Existing V2 practice retained: cloze vocabulary, optional Chinese hint, sentence recall/missing words, browser English speech, mixed sessions, due-first review, K/V/N, import preview, duplicate-safe library, local backups, and offline PWA cache.
- Structured local Battle Reports with stable report/session IDs, Asia/Shanghai timezone metadata, actual active seconds, mode breakdown, practice details, K/V/N summary, review recommendations, and `NOT_SUBMITTED`/`EXPORTED` sync state.
- Copy, Web Share, Markdown download, JSON download, and local Battle Report archive. Sharing never claims that ChatGPT, Sheets, Notion, or Drive received data.
- Material records carry content type, source, import time, stable IDs, and source identifiers where available.
- V1/V2 local storage and backup migration remains available; old storage is never deleted.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. ES modules and the service worker require HTTP(S), not a `file://` URL.

Run automated checks:

```sh
npm run check
```

## Privacy and handoff

Only generic demo cards are committed. Personal CSV files, answers, backups, tokens, and private notes stay on the device. Local storage can be erased by Safari website-data deletion, so export JSON regularly.

The Markdown battle report ends with a Chinese Central Immortal Aperture handoff request. It is a user-approved handoff instruction, not an automatic sync. External systems must verify report and session IDs before writing anything.

## GitHub Pages

The live Pages URL is `https://jajagood777-sys.github.io/english-mastery-mobile/` (main branch, root folder). The service worker cache is versioned as `english-cultivation-static-v3.0.0` so a deployment receives a fresh cache.
