# English Cultivation V4.1 Mobile Experience Design

## Intent

Make the existing English Cultivation V4.0 feel like a calm, focused iPhone learning app while preserving the tested learning engine, local data, reports, and public URL.

## Goals

- Make today's review, new material, actual minutes, and today's pack the clearest home action.
- Reduce mobile navigation crowding without hiding library, reports, help, or settings.
- Improve single-question focus, input affordances, feedback, and keyboard-safe spacing.
- Improve reading typography and selection feedback without changing reading data.
- Present progress and reports with concise, honest summaries.
- Keep Chinese for operations and English for learning content.

## Non-goals

- No change to the storage schema or scheduling algorithm.
- No accounts, server, paid AI, tracking, or external sync.
- No public personal data and no new repository.
- No large framework or heavy icon dependency.

## Approach

Use the existing vanilla HTML/CSS/JavaScript architecture. Add small presentational helpers and page-level classes, then consolidate the CSS into V4.1 design tokens and responsive rules. The mobile navigation will use five compact destinations: 首页, 训练, 阅读, 进度, 我的. The existing library, reports, help, and settings remain reachable from 我的. A training hub will expose new, due, difficult, mixed, and today's pack actions without changing queue construction.

## Constraints

- Preserve V1–V4.0 localStorage and backup compatibility.
- Keep the existing GitHub Pages URL and service-worker update path.
- Verify 375px, 390px, and 430px Chromium viewports; physical iPhone Safari remains a user acceptance step.

## Success evidence

`npm run check` remains green; Playwright smoke verifies navigation, home hierarchy, practice input focus, no horizontal overflow at three mobile widths, day/night theme readability, and the unchanged core learning flow. The Pages URL returns the updated V4.1 shell and versioned service-worker cache.
