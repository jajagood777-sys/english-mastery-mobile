import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  COMPLEX_FRAME_TYPES,
  COMPLEX_STAGE_META,
  COMPLEX_IMITATION_TOPICS,
  extractLearnedVocabPool,
  buildLinkedComplexDrill,
  buildAiComplexSentencePrompt,
  parseAiComplexSentenceResponse
} from '../complex-imitation.mjs';

test('v20.3.2 complex-imitation exports 8 spoken frames, 3 stages, and 6 topics with thought groups & skeletons', () => {
  assert.equal(COMPLEX_FRAME_TYPES.length, 8);
  assert.equal(COMPLEX_STAGE_META.length, 3);
  assert.equal(COMPLEX_IMITATION_TOPICS.length, 6);
  const frameIds = new Set(COMPLEX_FRAME_TYPES.map(f => f.id));
  for (const topic of COMPLEX_IMITATION_TOPICS) {
    assert.ok(topic.drills.length >= 3, `${topic.id} has >= 3 drills`);
    for (const d of topic.drills) {
      assert.ok(frameIds.has(d.frameId), `valid frameId ${d.frameId}`);
      assert.ok(d.sentence.length >= 40, `natural spoken length for ${d.id}`);
      assert.ok(d.chunks.includes('/'), `thought-group slash present in ${d.id}`);
      assert.ok(d.skeleton.includes('[___'), `skeleton slot present in ${d.id}`);
    }
  }
});

test('v20.3.2 extractLearnedVocabPool prioritizes today mistakes & deduplicates across all YanDao stores', () => {
  const pool = extractLearnedVocabPool({
    dailyPack: {
      vocabularyPractice: [
        { target: 'executive', cue: '高管', isReviewMistake: true },
        { target: 'steady', cue: '稳定的', isReviewMistake: false }
      ]
    },
    readingMarks: [{ word: 'insulated', note: '隔热的' }, { word: 'steady', note: 'dup' }],
    items: [{ kind: 'word', target: 'priority', cue: '优先事项', attempts: 3 }],
    masteredVocabWords: ['convenience'],
    fsrsState: { 'w:skip-id': {}, 'restore': {} }
  });
  const words = pool.map(p => p.word.toLowerCase());
  assert.equal(words[0], 'executive');
  assert.ok(words.includes('steady'));
  assert.ok(words.includes('insulated'));
  assert.ok(words.includes('priority'));
  assert.ok(words.includes('convenience'));
  assert.ok(words.includes('restore'));
  assert.equal(words.filter(w => w === 'steady').length, 1);
  assert.ok(!words.includes('w:skip-id'));
});

test('v20.3.2 buildLinkedComplexDrill links learned words and flags in-model matches', () => {
  const linked = buildLinkedComplexDrill({
    topicId: 'work_routine',
    drillIndex: 0,
    learnedWords: [
      { word: 'steady', cue: '稳定的', source: '今日新词' },
      { word: 'executive', cue: '高管', source: '今日错词' },
      { word: 'priority', cue: '优先事项', source: '已练词库' }
    ]
  });
  assert.equal(linked.topic.id, 'work_routine');
  assert.equal(linked.matchedInSentence.length, 1);
  assert.equal(linked.matchedInSentence[0].word, 'steady');
  assert.equal(linked.linkedWords[0].inModel, true);
  assert.match(linked.stage3Prompt, /steady/);
});

test('v20.3.2 AI prompt builder and parser handle structured and fallback responses cleanly', () => {
  const prompt = buildAiComplexSentencePrompt({
    topicLabel: '教学与学习',
    frame: COMPLEX_FRAME_TYPES[2],
    learnedWords: [{ word: 'steady' }, { word: 'priority' }]
  });
  assert.match(prompt, /steady, priority/);
  assert.match(prompt, /SENTENCE:/);

  const parsed = parseAiComplexSentenceResponse(
    'SENTENCE: Even though keeping a steady pace feels slow, making clarity your priority pays off.\nCHUNKS: Even though keeping a steady pace feels slow, / making clarity your priority / pays off.\nSKELETON: Even though [___], / making [___] / pays off.',
    { topicId: 'teaching_learning', frameId: 'concession', linkedWords: ['steady', 'priority'] }
  );
  assert.ok(parsed);
  assert.equal(parsed.isAiGenerated, true);
  assert.ok(parsed.chunks.includes('/'));
  assert.ok(parsed.skeleton.includes('[___]'));

  const fallback = parseAiComplexSentenceResponse(
    'Even though it rained all morning, we still finished the walk.',
    { topicId: 'travel_changes', frameId: 'concession' }
  );
  assert.ok(fallback);
  assert.ok(fallback.chunks.includes('/'));
});

test('v20.3.2 app.js, styles.css, and sw.js wire Complex Imitation Lab, 3-stage fading, and A/B compare', () => {
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const cssSrc = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const swSrc = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(appSrc, /function renderComplexImitationLab\(/);
  assert.match(appSrc, /function speakComplexModel\(/);
  assert.match(appSrc, /complex-imitation\.mjs/);
  assert.match(appSrc, /🔁 A\/B 对比（示范→我）/);
  assert.match(appSrc, /✨ AI 现造一句/);
  assert.match(cssSrc, /\.complex-imitation-lab/);
  assert.match(cssSrc, /\.complex-thought-slash/);
  assert.match(swSrc, /\.\/complex-imitation\.mjs/);
  assert.match(swSrc, /english-cultivation-static-v20\.3\.2/);
});
