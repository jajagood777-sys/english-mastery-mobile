import test from 'node:test';
import assert from 'node:assert/strict';
import {readingContextForSelection,readingCardId,mergeReadings} from '../core.mjs';
test('reading extraction retains selected paragraph, not article beginning',()=>{
 const article='The first paragraph discusses birds.\n\nWe need to address the underlying problem. It matters a lot.';
 assert.equal(readingContextForSelection(article,'address'),'We need to address the underlying problem.');
 assert.equal(readingContextForSelection(article,'not present'),'');
});
test('repeated selection creates a stable reading card id',()=>{
 assert.equal(readingCardId('article-1','address'),readingCardId('article-1',' ADDRESS '));
 assert.notEqual(readingCardId('article-1','address'),readingCardId('article-2','address'));
 assert.notEqual(readingCardId('article-1','address','sentence'),readingCardId('article-1','address','word'));
});
test('backup article merge skips duplicates while preserving originals',()=>{
 const original=[{id:'a',text:'Existing reading'}];
 const incoming=[{id:'a',text:'Existing reading'},{id:'b',text:'New story text'},{id:'c',text:'New story text'}];
 const merged=mergeReadings(original,incoming);
 assert.deepEqual(merged.map(r=>r.id),['a','b']);
 assert.deepEqual(original.map(r=>r.id),['a']);
});
