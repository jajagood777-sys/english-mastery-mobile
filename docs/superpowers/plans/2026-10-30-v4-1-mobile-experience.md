# V4.1 Mobile Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans when implementing this plan.

## Requirements

- Preserve the V4.0 learning logic, local data, reports, and URL.
- Use Simplified Chinese for operations; keep English learning content in English.
- Support iPhone widths 375px, 390px, and 430px without horizontal scrolling.
- Update package version, README, checkpoint, and PWA cache to 4.1.0.

## Review Focus

- Existing active sessions must remain resumable from the new training entry.
- Mobile keyboard focus must still target the real answer textarea.
- Day/night themes must preserve contrast and must not hide primary actions.
- Old storage must load without new required fields.
- The five-item mobile navigation must leave library/reports/settings reachable.

### Task 1: V4.1 version and navigation shell

**Files:** `package.json`, `core.mjs`, `sw.js`, `index.html`, `app.js`, `styles.css`

- Add a failing test that asserts version/cache markers are 4.1.0 and the shell exposes the five Chinese destinations.
- Run `npm run check` and observe the expected marker failure.
- Update version constants and the navigation shell; add a training hub and a “我的” hub while preserving page IDs for existing routes.
- Run the full check and commit.

### Task 2: Home and training hub hierarchy

**Files:** `app.js`, `styles.css`, `test/core.test.mjs`

- Add a failing test for a stable home-summary helper that returns due, new, weak, today-minutes, and pack status from real data.
- Implement the helper and use it to render a single “今日修炼” card, a primary action, focused mode cards, and a compact recent-progress strip.
- Add training-hub controls for new, due, mixed, difficult, and today's pack using existing queue scopes.
- Verify the existing active-session confirmation and daily-pack behavior remain unchanged.
- Run all tests and commit.

### Task 3: Practice, reading, library, and report presentation

**Files:** `app.js`, `styles.css`

- Add UI smoke assertions for practice status, real answer input, reading article controls, and report actions.
- Add page classes and focused visual treatments: practice header/progress, feedback blocks, reading controls/progress, library import groups, and report summary cards.
- Keep all existing event handlers and data writes intact.
- Run the full check and Playwright mobile smoke, then commit.

### Task 4: First-use/help and settings clarity

**Files:** `app.js`, `styles.css`, `README.md`

- Add a failing test for Chinese first-use/help labels and theme/settings controls.
- Improve onboarding, help, settings grouping, and explanatory empty states without adding new storage requirements.
- Run tests and commit.

### Task 5: Regression, deployment, checkpoint

**Files:** `test/core.test.mjs`, `CODEX_CHECKPOINT.md`, `README.md`

- Run `npm run check` and Playwright at 375/390/430px, including no overflow, navigation, day/night, practice focus, reading, reports, and old demo data.
- Update documentation and checkpoint with exact commit, tests, deployment, and physical-iPhone limitation.
- Push `main`, poll GitHub Pages until built, fetch live HTML and service worker, then commit any checkpoint-only update if needed.
