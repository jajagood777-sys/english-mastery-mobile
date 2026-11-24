import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseVocabPromptParts } from '../vocab.mjs';

test('v19.8.6: parseVocabPromptParts separates instruction, meaning, and sentence cleanly', () => {
  const cloze = parseVocabPromptParts(
    "Choose the word that best completes this source sentence. Meaning: To keep a feeling or thought secretly in your mind. Sentence: He continued to _____ doubts about the captain's explanation."
  );
  assert.equal(cloze.instruction, 'Choose the word that best completes this source sentence.');
  assert.equal(cloze.blocks.length, 2);
  assert.equal(cloze.blocks[0].kind, 'meaning');
  assert.match(cloze.blocks[0].text, /To keep a feeling or thought secretly/);
  assert.equal(cloze.blocks[1].kind, 'sentence');
  assert.match(cloze.blocks[1].text, /He continued to _____ doubts/);

  const syn = parseVocabPromptParts(
    'Choose the expression matching this precise meaning and example. Meaning: To make a problem worse. Example: Rumours could _____ the panic.'
  );
  assert.equal(syn.instruction, 'Choose the expression matching this precise meaning and example.');
  assert.equal(syn.blocks[1].kind, 'sentence');

  const rev = parseVocabPromptParts(
    'Which word matches this English definition? Present or encountered almost everywhere.'
  );
  assert.equal(rev.instruction, 'Which word matches this English definition?');
  assert.equal(rev.blocks.length, 1);
  assert.equal(rev.blocks[0].kind, 'meaning');

  const conf = parseVocabPromptParts(
    'Similar-looking words can have different meanings. Which one means: To cause someone to suffer something unpleasant.'
  );
  assert.equal(conf.instruction, 'Similar-looking words can have different meanings. Which one means');
  assert.equal(conf.blocks[0].kind, 'meaning');

  const plain = parseVocabPromptParts('Choose the most accurate English meaning of "dilate".');
  assert.equal(plain.instruction, '');
  assert.equal(plain.blocks.length, 1);
  assert.equal(plain.blocks[0].kind, 'plain');
});

test('v19.8.6: speaking submission receipt, live status pill, and mobile button wrap guard exist', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(app, /parseVocabPromptParts\(task\.prompt\)/);
  assert.match(app, /syncTransferRecordingStatus/);
  assert.match(app, /submitted-recording-receipt/);
  assert.match(app, /回听已提交录音/);
  assert.match(app, /提交初答（含录音）/);
  assert.match(css, /\.actions > \.btn \{ flex: 1 1 138px;/);
  assert.match(css, /\.vocab-prompt-instruction/);
  assert.match(css, /\.submitted-recording-receipt/);
});
