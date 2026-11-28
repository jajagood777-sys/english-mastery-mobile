import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PHONICS_DAY_01_MODULE,
  BUILTIN_COMPANION_MODULES,
  normalizeCompanionModule,
  listCompanionModules,
  resolveActiveCompanionModule,
  summarizeCompanionEvidence
} from '../adaptive-companion.mjs';

test('v20.4.9 Phonics Day 01 built-in companion matches printed Day 01 sheet', () => {
  assert.equal(PHONICS_DAY_01_MODULE.id, 'phonics-day-01');
  assert.equal(BUILTIN_COMPANION_MODULES.length >= 1, true);
  const byType = Object.fromEntries(PHONICS_DAY_01_MODULE.blocks.map(b => [b.type, b]));
  assert.equal(byType.sound_board.tiles.length, 8);
  assert.equal(byType.blend_stepper.wordList.length, 12);
  assert.equal(byType.unseen_decoder.items.length, 10);
  assert.deepEqual(
    byType.blind_dictation.words.map(w => w.word),
    ['sat', 'pin', 'mat', 'dip', 'nap']
  );
  assert.equal(byType.reading_companion.sentences.length, 9);
  assert.equal(byType.tpr_timer.phases.length, 5);
});

test('v20.4.9 adaptive companion resolves dailyPack > custom > builtin priority', () => {
  const defaultMod = resolveActiveCompanionModule({});
  assert.equal(defaultMod.id, 'phonics-day-01');

  const customMod = normalizeCompanionModule({
    id: 'phonics-day-02',
    title: 'Phonics Day 02',
    blocks: [{ id: 'b1', type: 'rule_focus', title: 'Five short vowels', rule: 'a e i o u' }]
  });
  assert.ok(customMod);
  assert.equal(customMod.homeLabel, '📄 伴学·Phonics Day 02');

  const withPack = {
    dailyPack: {
      companion_lab: {
        id: 'voa-companion-01',
        homeLabel: '📄 伴学·VOA 精读',
        title: 'VOA Paper Companion',
        blocks: [{ id: 'r1', type: 'reading_companion', title: 'VOA Passage', sentences: ['Hello world.'] }]
      }
    },
    companionState: {
      customModules: [customMod]
    }
  };
  const listed = listCompanionModules(withPack);
  assert.equal(listed[0].id, 'voa-companion-01');
  assert.equal(listed[0].source, 'daily_pack');
  assert.equal(resolveActiveCompanionModule(withPack).id, 'voa-companion-01');

  const switched = {
    ...withPack,
    companionState: { ...withPack.companionState, activeModuleId: 'phonics-day-02' }
  };
  assert.equal(resolveActiveCompanionModule(switched).id, 'phonics-day-02');
});

test('v20.4.9 summarizeCompanionEvidence tracks unseen marks & dictation honestly', () => {
  const ev = summarizeCompanionEvidence({
    companionState: {
      activeModuleId: 'phonics-day-01',
      progress: {
        'phonics-day-01': {
          doneIds: ['b-sat', 'b-pin'],
          unseenMarks: { 'u-01': 'clean', 'u-02': 'review' },
          dictationResults: {
            'dict-1': { revealed: true, correct: true },
            'dict-2': { revealed: true, correct: false }
          },
          lastStudiedAt: '2026-11-28T10:00:00Z'
        }
      }
    }
  });
  assert.equal(ev.active_module_id, 'phonics-day-01');
  assert.equal(ev.counts_as_mastery_k, false);
  assert.equal(ev.modules.length, 1);
  assert.equal(ev.modules[0].done_items, 2);
  assert.equal(ev.modules[0].unseen_clean, 1);
  assert.equal(ev.modules[0].unseen_review, 1);
  assert.equal(ev.modules[0].dictation_checked, 2);
  assert.equal(ev.modules[0].dictation_correct, 1);
});

test('v20.4.9 app.js, core.mjs, sw.js wire Adaptive Companion Lab cleanly', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const core = fs.readFileSync(new URL('../core.mjs', import.meta.url), 'utf8');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(core, /APP_VERSION\s*=\s*'20\.4\.9'/);
  assert.match(sw, /english-cultivation-static-v20\.4\.9/);
  assert.match(sw, /\.\/adaptive-companion\.mjs/);
  assert.match(app, /from '\.\/adaptive-companion\.mjs'/);
  assert.match(app, /if\(page==='companion'\)return renderCompanionLab\(\);/);
  assert.match(app, /function renderCompanionLab\(/);
  assert.match(app, /resolveActiveCompanionModule\(data\)/);
});
