import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMPLEX_FRAME_TYPES,
  listDrillsByFrame,
  buildComplexSwapCritiquePrompt
} from '../complex-imitation.mjs';

test('v20.4.0: listDrillsByFrame filters across topics by grammar frame cleanly', () => {
  const allWork = listDrillsByFrame('all', 'work_routine');
  assert.ok(allWork.length >= 3);
  const whDrills = listDrillsByFrame('wh_cleft');
  assert.ok(whDrills.length >= 1);
  assert.ok(whDrills.every(d => d.frameId === 'wh_cleft'));
});

test('v20.4.0: buildComplexSwapCritiquePrompt builds structured 3-line Band 7.5 prompt', () => {
  const prompt = buildComplexSwapCritiquePrompt({
    userSentence: 'What really matters is staying consistent.',
    frame: COMPLEX_FRAME_TYPES[0],
    targetWords: ['consistent', 'pace']
  });
  assert.match(prompt, /点评:/);
  assert.match(prompt, /升级版:/);
  assert.match(prompt, /语调提示:/);
});

test('v20.4.0: app.js exposes standalone complexLab page right after speech with Stage 3 builder and slow-to-normal loop', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
  assert.match(appSrc, /if\(page==='complexLab'\)return renderComplexImitationPage\(\);/);
  assert.match(appSrc, /function renderComplexImitationPage\(/);
  assert.match(appSrc, /进入复杂句仿说专练/);
  assert.match(appSrc, /慢→常速连听/);
  assert.match(appSrc, /markComplexDrillMastered/);
  assert.match(appSrc, /complex-swap-builder/);
});
