import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('word recall UI leads with meaning, part of speech, and masked context',()=>{
  const start=app.indexOf('function buildWordQuestion(');
  const end=app.indexOf('function sentenceStyleOptions(',start);
  assert.ok(start>=0&&end>start);
  const source=app.slice(start,end);
  assert.match(source,/English definition|Meaning:/);
  assert.match(source,/Part of speech/);
  assert.match(source,/Context:/);
  assert.match(source,/maskSpellingTarget\(item\.example,item\.target\)/);
  assert.match(source,/answerConfidence/);
});

test('word hint stages are recorded separately and reference viewing is explicit',()=>{
  const start=app.indexOf('function recordWordPromptEvent(');
  const end=app.indexOf('function sentenceStyleOptions(',start);
  const source=app.slice(start,end);
  assert.match(source,/semantic_hint/);
  assert.match(source,/form_hint/);
  assert.match(source,/reference_answer/);
  assert.match(app,/compareWordAnswer/);
  assert.match(app,/reference_viewed:Boolean\(s\.viewedAnswer\)/);
});

test('word recall mobile styling keeps the semantic clue readable in a narrow viewport',()=>{
  assert.match(css,/\.word-recall-clue/);
  assert.match(css,/\.word-meaning/);
  assert.match(css,/\.word-context/);
  assert.match(css,/@media\(max-width:640px\)/);
});

