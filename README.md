# English Cultivation

**The Language Immortal Aperture** · Learn. Recall. Refine. Advance.

A lightweight English-first mobile learning PWA for vocabulary, phrases, complete sentences, and honest self-assessment. The cultivation theme is a calm interface layer; the learning record remains grounded in real actions.

## V3.3 upgrade

- Day Cultivation and Night Cultivation themes, with System default and saved preference.
- English Cultivation home with a 20-minute goal, active minutes, due count, Refine Words, Forge Sentences, Knowledge Vault, and Battle Reports.
- Existing V2 practice retained: cloze vocabulary, optional Chinese hint, sentence recall/missing words, browser English speech, mixed sessions, due-first review, K/V/N, import preview, duplicate-safe library, local backups, and offline PWA cache.
- Structured local Battle Reports with stable report/session IDs, Asia/Shanghai timezone metadata, actual active seconds, mode breakdown, practice details, K/V/N summary, review recommendations, and `NOT_SUBMITTED`/`EXPORTED` sync state.
- Copy, Web Share, Markdown download, JSON download, and local Battle Report archive. Sharing never claims that ChatGPT, Sheets, Notion, or Drive received data.
- Material records carry content type, source, import time, stable IDs, and source identifiers where available.
- V1/V2 local storage and backup migration remains available; old storage is never deleted.
- 中文操作导航和帮助层；English questions, sentences, examples, and reading material remain in English.
- Explicit mode switching: Words, Sentences, Mixed, today's pack only, or due review only. An unfinished session always asks before switching.
- Word cloze and sentence missing-word inputs focus correctly on tap; sentence training clearly separates Missing Words from Full Sentence Recall.
- `english-learning-pack.json` import with `schema_version`, `pack_id`, `title`, `source`, `language`, and flexible `items`; CSV/TXT/Markdown imports remain supported.
- New cards now use Learn New Content → Guided Practice → Independent Retrieval instead of forcing a first-contact guess. Complete targets, examples, trusted optional metadata, and progressive hints are shown before recall.
- Learning records distinguish first independent answers, prompted answers, viewed-answer flows, and retry-after-error; no first-contact reading is counted as mastery.
- Answer checks distinguish exact, case/punctuation-only, minor spelling, and different answers; optional immediate retry stores the first answer and retry separately.
- Review scheduling uses K/V/N with bounded adaptive intervals based on the previous interval, while the home queue shows due, weak, and new counts.
- Optional tags, source, status, pack, and due filters are available in the local library.

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

The live Pages URL is `https://jajagood777-sys.github.io/english-mastery-mobile/` (main branch, root folder). The service worker cache is versioned as `english-cultivation-static-v3.3.0` so a deployment receives a fresh cache.
