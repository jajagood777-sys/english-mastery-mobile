import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeReadingMarks,
  mergeBackupState,
  buildBattleReport,
  battleReportMarkdown,
  buildCentralLearningFeedback
} from '../core.mjs';

test('v20.5.0: mergeReadingMarks preserves Word Harvest 2.0 savedGloss across backup merge', () => {
  const merged = mergeReadingMarks(
    [{
      readingId: 'r1',
      wordText: 'botanical',
      originalSentence: 'She worked at the botanical station.',
      paragraphIndex: 0,
      position: 18,
      savedGloss: { zh: '植物学的', en: 'relating to plants', chunk: 'botanical station' }
    }],
    [{
      readingId: 'r1',
      wordText: 'botanical',
      originalSentence: 'She worked at the botanical station.',
      paragraphIndex: 0,
      position: 18
    }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].savedGloss?.zh, '植物学的');
  assert.equal(merged[0].savedGloss?.chunk, 'botanical station');
});

test('v20.5.0: Battle Report, Markdown, Central Feedback & Backup preserve complex_imitation_evidence', () => {
  const complexLabProgress = {
    doneIds: ['work-wh-1', 'teach-frame-2'],
    todayDate: '2026-11-27',
    todayCount: 2,
    entries: [{
      id: 'cswap:work-wh-1:1',
      drillId: 'work-wh-1',
      frameId: 'wh_cleft',
      topicId: 'work_routine',
      sentence: 'What really matters is keeping a steady pace every morning.',
      aiFeedback: '点评: 骨架准确流畅。',
      at: '2026-11-27T12:00:00Z'
    }]
  };

  const report = buildBattleReport({
    session: { id: 's-2041', startedAt: '2026-11-27T10:00:00Z', endedAt: '2026-11-27T10:30:00Z', activeMs: 1800000, mode: 'journey' },
    attempts: [],
    items: [],
    complexLabProgress
  });
  assert.equal(report.complex_imitation_evidence.mastered_total, 2);
  assert.equal(report.complex_imitation_evidence.today_count, 2);
  assert.equal(report.complex_imitation_evidence.swap_entries.length, 1);

  const md = battleReportMarkdown(report);
  assert.match(md, /Complex Imitation Lab（复杂句仿说工坊）/);
  assert.match(md, /What really matters is keeping a steady pace every morning\./);

  const cf = buildCentralLearningFeedback({ report });
  assert.equal(cf.complex_imitation_evidence?.mastered_total, 2);
  assert.equal(cf.complex_imitation_evidence?.swap_entries?.length, 1);

  const mergedState = mergeBackupState(
    { items: [], attempts: [], sessions: [], reports: [], complexLabProgress },
    { items: [], attempts: [], sessions: [], reports: [], complexLabProgress: { doneIds: ['work-wh-1', 'extra-3'], entries: [], todayDate: '2026-11-27', todayCount: 1 } }
  );
  assert.equal(mergedState.complexLabProgress.doneIds.length, 3);
  assert.equal(mergedState.complexLabProgress.todayCount, 2);
});
