import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { autoSentenceClozeParts, sentenceClozeParts } from '../core.mjs';

test('v20.4.7 autoSentenceClozeParts falls back to strongest content word when no explicit target is set', () => {
  const s = 'She suggested checking the original record before making an accusation.';
  assert.equal(sentenceClozeParts(s, ''), null);
  const auto = autoSentenceClozeParts(s, '');
  assert.ok(auto, 'must produce cloze parts automatically');
  assert.ok(auto.question.includes('_____'));
  assert.ok(auto.answer.length >= 5);
  assert.ok(!auto.question.toLowerCase().includes(auto.answer.toLowerCase()));
  // Explicit target still takes priority
  const explicit = autoSentenceClozeParts(s, 'checking');
  assert.equal(explicit.answer, 'checking');
});

test('v20.4.7 app.js enables cloze listen-and-fill, mode switch in listening, and hides false no-audio banner', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /autoSentenceClozeParts\(item\.text/);
  assert.match(app, /听英文原句，只填写缺少的单词。/);
  assert.match(app, /先听英文，再写出你听到的内容。'\),sentenceStyleOptions\(s\)/);
  assert.doesNotMatch(app, /没有真实音频；普通朗读可继续使用设备语音，精确 AB 循环不可用。/);
});
