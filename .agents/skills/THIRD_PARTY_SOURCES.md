# Codex repository skills — original sources and licenses

Installed: 2026-11-01. Scope: **this GitHub repository only**, under `.agents/skills/`.

These eight skills are verbatim copies of upstream `SKILL.md` documents, with necessary Markdown reference documents. We did not install or execute scripts from these third-party projects. Each source is pinned to the audited upstream commit; do not auto-update without review.

| Installed skill | Original repo/path | Original pinned commit | Repo stars (approx. Nov 1, 2026) |
|---|---|---|---|
| `systematic-debugging` | [obra/superpowers](https://github.com/obra/superpowers/tree/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/systematic-debugging) | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | 310k |
| `verification-before-completion` | [obra/superpowers](https://github.com/obra/superpowers/tree/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/verification-before-completion) | same | 310k |
| `ponytail` | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail) | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` | 182k |
| `codebase-design` | [mattpocock/skills](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/codebase-design) | `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | 309k |
| `github-actions-hardening` | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/5269f7ea2d6c3a9bfda5ed878b6726cf509121fd/skills/github-actions-hardening) | `5269f7ea2d6c3a9bfda5ed878b6726cf509121fd` | 41k |
| `github-actions-efficiency` | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/5269f7ea2d6c3a9bfda5ed878b6726cf509121fd/skills/github-actions-efficiency) | same | 41k |
| `security-review` | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/5269f7ea2d6c3a9bfda5ed878b6726cf509121fd/skills/security-review) | same | 41k |
| `test-gap-audit` | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/5269f7ea2d6c3a9bfda5ed878b6726cf509121fd/skills/test-gap-audit) | same | 41k |

Star counts belong to the **source repository**, not an individual skill, and are not quality, safety, or compatibility guarantees. Skills are instructions, not active tooling.

## MIT license preservation

Original license notices are copied in `_third_party_notices/`:

- `obra--superpowers-LICENSE`
- `mattpocock--skills-LICENSE`
- `DietrichGebert--ponytail-LICENSE`
- `github--awesome-copilot-LICENSE`

## Operational rules

1. At task start, Codex reads `AGENTS.md` and selects only relevant skills; read actual `SKILL.md`, do not pretend a skill executed.
2. Use repository-specific safety, PWA QA, and mobile browser skills alongside the external skills when needed. No private learning records or recordings should be read, logged, committed, or uploaded.
3. If a skill requires access to a tool or runtime unavailable to the current Codex session, report the missing prerequisite and continue safe core work.
4. For this vanilla JavaScript GitHub Pages PWA, do not impose unrelated React/Next.js tooling or large frameworks.
5. Before importing future revisions, examine upstream diff, dependencies, license, and relevant security concerns. No automatic unreviewed code downloads.

See [Codex skills documentation](https://learn.chatgpt.com/docs/build-skills) for official repo-level discovery of `.agents/skills/`.
