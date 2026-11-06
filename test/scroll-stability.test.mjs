import test from 'node:test';
import assert from 'node:assert/strict';
import {captureStableViewport,restoreStableViewport} from '../scroll-stability.mjs';

const node = (className, top) => ({
  classList: {contains: value => value === className},
  getBoundingClientRect: () => ({top})
});
const root = panels => ({
  contains: item => panels.includes(item),
  querySelectorAll: selector => panels.filter(panel => panel.classList.contains(selector.slice(1)))
});
const viewport = scrollY => ({scrollY, calls: [], scrollTo(x, y) {this.calls.push([x,y]); this.scrollY=y;}});

test('reading question remains at same visual position after an in-place render', () => {
  const before = node('reading-check-panel', 520);
  const after = node('reading-check-panel', 640);
  const view = viewport(1100);
  const snapshot = captureStableViewport(root([before]),{closest: () => before},view);
  restoreStableViewport(root([after]),snapshot,view);
  assert.deepEqual(view.calls,[[0,1220]]);
});

test('matches the correct recording panel when more than one exists', () => {
  const a=node('recording-panel',100),b=node('recording-panel',600);
  const c=node('recording-panel',100),d=node('recording-panel',720);
  const view=viewport(350);
  const snapshot=captureStableViewport(root([a,b]),{closest: () => b},view);
  restoreStableViewport(root([c,d]),snapshot,view);
  assert.equal(snapshot.anchor.index,1);
  assert.deepEqual(view.calls,[[0,470]]);
});

test('uses saved scroll offset if the original panel disappears', () => {
  const old=node('reading-recall-panel',450);
  const view=viewport(830);
  const snapshot=captureStableViewport(root([old]),{closest:()=>old},view);
  view.scrollY=300;
  restoreStableViewport(root([]),snapshot,view);
  assert.deepEqual(view.calls,[[0,830]]);
});

test('no unnecessary scroll when layout is stable', () => {
  const p=node('daily-journey-card',480);
  const view=viewport(900);
  const snapshot=captureStableViewport(root([p]),{closest:()=>p},view);
  restoreStableViewport(root([p]),snapshot,view);
  assert.deepEqual(view.calls,[]);
});

test('clamps scroll to zero if the anchor moves above the viewport', () => {
  const before=node('reading-check-panel',330);
  const after=node('reading-check-panel',10);
  const view=viewport(100);
  const snapshot=captureStableViewport(root([before]),{closest:()=>before},view);
  restoreStableViewport(root([after]),snapshot,view);
  assert.deepEqual(view.calls,[[0,0]]);
});
