import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeVocabularyPractice,
  resolveOptionMicroGloss,
  findLookAlikeWords,
  highlightLookAlikeDiff,
  compressEnglishGloss
} from '../vocab.mjs';

test('v20.3.7 resolveOptionMicroGloss returns concise L2 gloss from option.gloss, builtin, or archive (never for full definition options)', () => {
  const archive = [
    { id: 'W1', target: 'driftwood', definition_en: 'Pieces of wood floating on the sea or washed onto the shore.', example: 'Workers cleared driftwood.' }
  ];
  assert.equal(resolveOptionMicroGloss({ id: 'A', text: 'juvenile', gloss: 'young · not grown-up' }, {}, archive), 'young · not grown-up');
  assert.equal(resolveOptionMicroGloss({ id: 'B', text: 'staggered' }, {}, archive), 'walked unsteadily / shocked');
  assert.equal(resolveOptionMicroGloss({ id: 'C', text: 'driftwood' }, {}, archive), 'Pieces of wood floating on the sea or washed onto the shore');
  // Definition-recognition options (>4 words) must not get redundant micro-gloss
  assert.equal(resolveOptionMicroGloss({ id: 'D', text: 'To cause someone or something to be in a particular condition' }, {}, archive), '');
  assert.equal(compressEnglishGloss('To repair something that is broken or damaged.'), 'repair something that is broken or damaged');
  assert.equal(/\b(?:or|and|the)$/.test(compressEnglishGloss('To pull or twist something suddenly and')), false);
});

test('v20.3.7 findLookAlikeWords surfaces acquaintance/apprentice, prophecy/hypocrisy, pack lookalikes, and archive similarity', () => {
  const la1 = findLookAlikeWords({ target: 'acquaintance', lookalikes: [] }, []);
  assert.ok(la1.some((x) => x.word === 'apprentice'), 'should surface apprentice for acquaintance');

  const la2 = findLookAlikeWords({ target: 'prophecy', lookalikes: [] }, []);
  assert.ok(la2.some((x) => x.word === 'hypocrisy'), 'should surface hypocrisy for prophecy');

  const la3 = findLookAlikeWords(
    { target: 'customword', lookalikes: [{ word: 'customward', gloss: 'guarded room' }] },
    []
  );
  assert.equal(la3[0].word, 'customward');
  assert.equal(la3[0].gloss, 'guarded room');
});

test('v20.3.7 highlightLookAlikeDiff isolates differing core letters cleanly', () => {
  const segs = highlightLookAlikeDiff('acquaintance', 'apprentice');
  assert.equal(segs.map((s) => s.text).join(''), 'apprentice');
  assert.ok(segs.some((s) => s.diff), 'should mark differing segments');
});

test('v20.3.7 normalizeVocabularyPractice preserves opt.gloss and task.lookalikes, and app.js gates both behind post-answer prior', () => {
  const res = normalizeVocabularyPractice([
    {
      id: 'V1',
      source_item_id: 'S1',
      type: 'contextual_cloze',
      target: 'prophecy',
      prompt: 'Choose the word. Sentence: The _____ came true.',
      options: [
        { id: 'A', text: 'prophecy', gloss: 'prediction of the future' },
        { id: 'B', text: 'hypocrisy', gloss: 'saying one thing, doing another' },
        { id: 'C', text: 'staggered' },
        { id: 'D', text: 'bustle' }
      ],
      correct_option_ids: ['A'],
      explanation_en: 'Prophecy means prediction.',
      lookalikes: [{ word: 'hypocrisy', gloss: 'saying one thing, doing another' }]
    }
  ]);
  assert.equal(res.errors.length, 0);
  assert.equal(res.tasks[0].options[0].gloss, 'prediction of the future');
  assert.equal(res.tasks[0].lookalikes[0].word, 'hypocrisy');

  const appSrc = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(appSrc.includes('resolveOptionMicroGloss'), 'app.js must wire resolveOptionMicroGloss');
  assert.ok(appSrc.includes('findLookAlikeWords'), 'app.js must wire findLookAlikeWords');
  assert.ok(appSrc.includes('vocab-lookalike-panel'), 'app.js must render optional look-alike panel');
  assert.match(appSrc, /\blet\s+vocabLookAlikeOpenId\s*=\s*null\b/, 'app.js must explicitly declare vocabLookAlikeOpenId');
});
