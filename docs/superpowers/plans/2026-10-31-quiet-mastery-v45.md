# Quiet Mastery V4.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a non-destructive V4.5 visual and navigation upgrade that makes the existing English Cultivation PWA feel like a premium mobile learning app while preserving V4.4 behavior and local data.

**Architecture:** Keep the current vanilla ES module app and data model. Add a compact visual token layer, replace mixed text nav glyphs with inline SVG icons, and use targeted page-scoped CSS plus minimal markup changes in existing render functions. Bump only the software/cache release marker to 4.5.0; keep learning data schema 4.3.

**Tech Stack:** HTML, CSS, vanilla ES modules, existing WebP visual registry, Node check scripts, project-scoped Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-10-31-quiet-mastery-v45-design.md`

## Global Constraints

- Preserve existing `localStorage`, K/V/N, attempts, sessions, reports, reading marks/checks and backup behavior.
- Preserve the single daily JSON import and all V4.4 optional modules.
- No new runtime dependency, paid API, external font, account system or destructive migration.
- Keep Chinese navigation and English learning content.
- Chromium emulation must be reported separately from physical iPhone Safari.

## Review Focus

- A real pack-less home must show a useful empty state and never invent stats; covered by existing home rendering and browser smoke.
- A daily journey with transfer/comprehension must retain controls after visual changes; covered by synthetic browser flow.
- Long English text and native selection must remain usable; covered by mobile static checks and reading smoke.
- Sticky navigation and keyboard focus must not obscure controls; covered by accessibility audit and viewport screenshots.
- Software/cache markers must remain aligned without changing data schema; covered by PWA audit and `npm run check`.

### Task 1: Establish the V4.5 visual system and navigation

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `package.json`, `core.mjs`, `sw.js`
- Test: existing `npm run check` and project audit scripts

- [ ] Replace the five mixed text glyphs in `index.html` with accessible inline SVG line icons and preserve each `data-page` route and Chinese label.
- [ ] Add the Quiet Mastery token layer and scoped responsive rules in `styles.css`; keep reading selection, form focus, safe-area and reduced-motion behavior.
- [ ] Bump software release markers to `4.5.0` while leaving the learning data `VERSION` unchanged.
- [ ] Run static checks and inspect the diff for accidental storage/schema changes.

### Task 2: Refine the real home hierarchy and page surfaces

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: Chromium screenshots and synthetic flow

- [ ] Add small semantic classes/labels needed to distinguish brand, primary CTA, real stats and the optional journey route without changing event handlers or values.
- [ ] Style training, reading, progress, reports and more surfaces from the same tokens; keep existing controls and route transitions.
- [ ] Verify theme switching, empty states, input focus and visual assets at mobile and desktop dimensions.

### Task 3: Release verification and handoff

**Files:**
- Modify: `README.md`, `CODEX_CHECKPOINT.md`
- Create: `output/playwright/*` screenshots as local evidence only (not committed unless useful)

- [ ] Run `npm run check`, daily-pack QA, learning-data-safety, mobile-accessibility-review, pwa-release-audit and browser smoke.
- [ ] Review screenshots, run `git diff --check`, commit the branch, create/merge the PR, and verify GitHub Actions, Pages assets and SW cache marker.
- [ ] Update the checkpoint with exact SHA, PR, tests, live verification and the physical iPhone Safari items still pending.
