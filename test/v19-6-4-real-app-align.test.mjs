import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v20.4.4: real-app native speech script aligns with v18+ #gemini-voice-select offline fallback UI', () => {
  const s = fs.readFileSync(new URL('../scripts/test-real-app-native-speech.mjs', import.meta.url), 'utf8');
  assert.match(s, /#gemini-voice-select/);
  assert.doesNotMatch(s, /#native-voice-select/);
});
