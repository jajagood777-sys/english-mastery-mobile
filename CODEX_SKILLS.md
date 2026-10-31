# Project-scoped Codex Skills — English Cultivation

This file records Skills included in the **website code repository**, as a practical addition to the user's separate private central-skills repository. No user's personal data, learning reports or credential is included.

| Skill | Source | Why included | Runtime requirement |
| --- | --- | --- | --- |
| `playwright` | `openai/skills` legacy curated | Verify iPhone-sized browser flows, DOM focus, import UI and visual regressions | `node`/`npx`, browser and network package access if not cached |
| `gh-fix-ci` | `openai/skills` legacy curated | Diagnose the exact failing GitHub Actions run/commit instead of guessing from email | Python, GitHub CLI `gh`, authenticated access |
| `frontend-design` | `anthropics/skills` | Refine mobile navigation, type, hierarchy and accessible English learning UI | Instruction-only; no new runtime |
| `english-daily-master-pack-qa` | Original for this repository | Validate a single JSON file across words/sentences/reading/listening before iPhone import | Node >=18; uses local `core.mjs` |

## Verified provenance at copy time (2026-10-31)

- OpenAI legacy source: https://github.com/openai/skills/tree/main/skills/.curated
  - `playwright/SKILL.md` blob `77c01afb31aa602d0b002ae2438c2b67f0335fcb`
  - `gh-fix-ci/SKILL.md` blob `76bdeb6a7bff93cbe924c0652f1fd7a3c3ffc46c`
- Anthropic source: https://github.com/anthropics/skills/tree/main/skills/frontend-design
  - `frontend-design/SKILL.md` blob `a5333457c414d20d625f307df945842c0952ecc3`
- The upstream `openai/skills` repository states that it is deprecated and directs new builds to https://github.com/openai/plugins and the current plugin guide. This project copy is **pinned and reviewed**, not automatically updated.
- Each upstream skill retains its full individual `LICENSE.txt` (Apache-2.0). `playwright` SKILL and reference examples were adapted to the actual `.agents/skills/` repository paths; the changes and explanation are embedded in those files. `gh-fix-ci` and `frontend-design` have appended local scope/safety notes.

## Evidence and limits

- GitHub code files are a **project-scoped installation**, not an account-wide Codex Skills installation. Only opening a Codex work session in the repository and checking actual skill discovery can establish that this Codex runtime recognizes them.
- The bundled Playwright wrapper invokes a package via `npx` only when the skill is **explicitly used**; this commit does not run/install dependencies. The GitHub CI helper uses `gh` only on demand. No hooks, credentials, webhooks, paid servers, or new background automations were installed.
- Structural unit tests validate the installation files and one synthetic JSON import. Runtime browser usage, GitHub CLI auth and Safari hardware remain pending until they are actually attempted by Codex.

## Next step inside Codex

Open `jajagood777-sys/english-mastery-mobile`. Confirm discovery of the four project Skills, and run `npm run check`. On a request to audit the daily JSON input, call `english-daily-master-pack-qa`; on a request to inspect mobile UI, use `playwright` if the runtime supports it. Do not redeploy the website merely to install instruction files.
