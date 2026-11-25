import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { composeReadingRetellingSubmission } from '../core.mjs';

test('v20.0.5 composeReadingRetellingSubmission supports voice-only retelling and app.js renders visible submission receipt + toast', () => {
  const res = composeReadingRetellingSubmission({
    reading: { id: 'R1', packId: 'P1' },
    current: { id: 'retelling:R1:draft', readingId: 'R1', recordingIds: ['rec-1'] },
    answer: ''
  });
  assert.ok(res);
  assert.equal(res.status, 'VOICE_UNASSESSED');
  assert.deepEqual(res.recordingIds, ['rec-1']);
  assert.ok(res.firstSubmittedAt);

  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /已提交独立复述（/);
  assert.match(app, /录音复述已提交（/);
  assert.match(app, /last\?\.firstSubmittedAt\?'✓ 更新独立复述':'提交独立复述'/);
  assert.match(app, /录音回答已提交（/);
});
