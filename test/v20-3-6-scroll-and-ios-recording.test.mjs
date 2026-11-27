import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chooseRecordingMimeType } from '../recordings.mjs';

test('v20.3.6: recordings.mjs supports plain audio/mp4 fallback for iOS Safari', () => {
  const iosSafariMock = { isTypeSupported: (t) => t === 'audio/mp4' };
  assert.equal(chooseRecordingMimeType(iosSafariMock), 'audio/mp4');
});

test('v20.3.6: app.js prevents Speech Chamber page-yank scroll and switches iOS audioSession to play-and-record', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
  assert.match(appSrc, /const shouldAutoFollow=!audio\.paused\|\|forcedIdx!==null;/);
  assert.match(appSrc, /scrollRowInsideSubList\(rowEls\[idx\]\)/);
  assert.doesNotMatch(appSrc, /rowEls\[idx\]\.scrollIntoView/);
  assert.match(appSrc, /navigator\.audioSession\.type='play-and-record'/);
  assert.match(appSrc, /new MediaRecorder\(stream\)/);
});
