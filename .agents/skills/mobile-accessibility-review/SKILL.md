---
name: mobile-accessibility-review
description: Review and test Chinese-language mobile navigation, iPhone Safari input focus/keyboard, tap targets, screen-reader labels, reading selection and visual accessibility. Use for phone UI problems or WCAG/mobile-accessibility reviews; complement (not replace) the playwright skill.
---
# English Cultivation — Mobile Accessibility Review

The website uses Chinese navigation with English study content and must be usable on a small iPhone, by touch, keyboard and assistive technology. Accessibility is about **actual interaction**, not merely passing a CSS regex.

## Start with a limited static baseline

From repository root:

```bash
node .agents/skills/mobile-accessibility-review/scripts/audit-baseline.mjs
```

The check covers language/viewport, main navigation, skip link, `role=status`, focus-visible styling, reduced-motion support and bottom safe-area treatment. It is a *smoke check*, **never a full WCAG certification**.

## Real browser checks (use `playwright` if available)

At 320, 375, 390 and 430 CSS pixels, test with a **synthetic pack**:
1. Visual inspection, no horizontal overflow, nav remains reachable, all controls retain readable names and feedback.
2. Focus a vocabulary field, sentence-cloze input and listening dictation input. Confirm keyboard does not entirely obscure the focused control or answer/next buttons; test scroll-to-focus behavior.
3. Long-press or text-select a passage in reading and inspect the save-as-card path. A desktop double-click cannot stand in for iOS touch selection.
4. Test touch/click targets. WCAG 2.2 SC 2.5.8 sets a **24×24 CSS px minimum with exceptions**; measure actual boxes and nearby spacing before claiming success.
5. Confirm error messages have usable text, status updates are announced, dialogs can be closed, and keyboard focus does not disappear behind a sticky footer.
6. Verify `prefers-reduced-motion` and high zoom, long text, dark theme and bottom `safe-area-inset-bottom`.
7. Test native `speechSynthesis` availability and graceful unavailable-state messaging. Do not infer real listening or pronunciation ability from synthetic TTS.

## Authoritative reference links

- WCAG 2.2 target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Focus not obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum

## Truthfulness and release safety

Automated Chromium mobile emulation is **not** physical iPhone Safari/PWA testing. No browser command may erase or clear the user's Safari storage. Use disposable profiles and fixture data. When a UI change is warranted, preserve all study data, avoid redesign without user intent and validate with `npm run check` and relevant browser flows.

Report: static pass/fail, browser test dimensions, what was clicked/typed, hardware not tested, issues with exact reproduction steps and recommended minimal fixes.
