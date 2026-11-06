/** Keep an active control area visible through an in-place page render.
 * Pure DOM/scroll helpers; they do not read or mutate learner data.
 */
const ANCHORS = [
  'recording-panel', 'reading-check-panel', 'reading-recall-panel',
  'daily-journey-card', 'reading-toolbar', 'reading-article', 'practice-top'
];
const SELECTOR = ANCHORS.map(name => '.' + name).join(', ');

export function captureStableViewport(root, target, viewport) {
  if (!root || !viewport) return null;
  const scrollY = Number(viewport.scrollY) || 0;
  const matched = target?.closest?.(SELECTOR);
  const className = matched && root.contains(matched)
    ? ANCHORS.find(name => matched.classList.contains(name)) : null;
  if (!className) return {scrollY, anchor: null};
  const matching = Array.from(root.querySelectorAll('.' + className));
  const index = matching.indexOf(matched);
  if (index < 0) return {scrollY, anchor: null};
  return {scrollY, anchor: {className, index, top: matched.getBoundingClientRect().top}};
}

export function restoreStableViewport(root, snapshot, viewport) {
  if (!root || !snapshot || !viewport?.scrollTo) return;
  let scrollY = snapshot.scrollY;
  if (snapshot.anchor) {
    const matches = root.querySelectorAll('.' + snapshot.anchor.className);
    const current = matches[snapshot.anchor.index];
    if (current) scrollY += current.getBoundingClientRect().top - snapshot.anchor.top;
  }
  scrollY = Math.max(0, Math.round(scrollY));
  if (Math.abs((Number(viewport.scrollY) || 0) - scrollY) >= 1) viewport.scrollTo(0, scrollY);
}
