import test from 'node:test';
import assert from 'node:assert/strict';
import {V8_009_CONTEXT_GLOSSES,englishDefinitionFor,englishSpellingCue,maskSpellingTarget} from '../english-first.mjs';
import {recordsFromLearningPack} from '../core.mjs';
const PACK='EN-DAILY-20261104-V8-009';
test('V8-009 existing 16 word cards have English-only contextual definitions without replacing source evidence',()=>{
  assert.equal(Object.keys(V8_009_CONTEXT_GLOSSES).length,18);
  for(const word of ['nuance','follow through','convey','counterproductive','in hindsight','weigh up','put into perspective','sustainable','rattle','scramble','demographic','agitation','distinguish between','incapable of','lose track of time','scroll through my phone']){
    const definition=englishDefinitionFor({target:word,meaningZh:'中文释义'},PACK);
    assert.ok(definition.length>14,word);
    assert.doesNotMatch(definition,/[\u3400-\u9fff]/);
  }
  assert.equal(englishDefinitionFor({target:'nuance',definitionEn:'the context-provided English meaning'},PACK),'the context-provided English meaning');
  assert.equal(englishDefinitionFor({target:'nuance',meaningZh:'中文释义'},'OTHER-PACK'),'');
});
test('meaning-to-spelling uses a non-Chinese listenable English definition without the answer',()=>{
  const t={target:'scramble',cueZh:'仓促应对；匆忙设法',promptMode:'meaning_to_spelling',packId:PACK};
  const cue=englishSpellingCue(t);
  assert.match(cue.prompt,/act quickly/);
  assert.match(cue.audioText,/Spell the word/);
  assert.doesNotMatch(cue.prompt+cue.audioText,/scramble|仓促|匆忙/i);
});
test('audio-to-spelling displays no target word, even when audio text is the target',()=>{
  const cue=englishSpellingCue({promptMode:'audio_to_spelling',target:'nuance',ttsText:'nuance'});
  assert.equal(cue.audioText,'nuance');
  assert.doesNotMatch(cue.prompt+cue.audioLabel,/nuance/i);
});
test('sentence cloze hides the exact answer before independent submission',()=>{
  const cue=englishSpellingCue({promptMode:'sentence_cloze',target:'exhausted',example:'After the trip, I felt exhausted.'});
  assert.match(cue.prompt,/_____/);
  assert.doesNotMatch(cue.prompt+cue.audioText,/exhausted/i);
  assert.equal(maskSpellingTarget('The class began late.','class'),'The _____ began late.');
  assert.equal(maskSpellingTarget('a classroom','class'),'a classroom');
});
test('old packs without English clues fail safely or show answer-free context',()=>{
  const cue=englishSpellingCue({promptMode:'meaning_to_spelling',target:'unknownword',cueZh:'中文',example:'He knew the unknownword yesterday.',packId:'OLD'});
  assert.match(cue.prompt,/Context clue/);
  assert.doesNotMatch(cue.prompt,/unknownword|中文/);
  const missing=englishSpellingCue({promptMode:'meaning_to_spelling',target:'unknownword',cueZh:'中文',packId:'OLD'});
  assert.equal(missing.hasEnglishClue,false);
  assert.equal(missing.audioText,'');
});
test('new spelling cue_en survives pack normalization without rewriting the original mode',()=>{
  const raw={schema_version:'2.0',pack_id:'SYNTHETIC',items:[{id:'W01',type:'word',target:'nuance',example:'A good answer shows nuance in its reasoning.',meaning_zh:'细微差别'}],spelling_tasks:[{id:'SP01',target:'nuance',cue_en:'a subtle difference in meaning',cue_zh:'细微差别',prompt_mode:'meaning_to_spelling'}]};
  const imported=recordsFromLearningPack(raw);
  assert.equal(imported.pack.spellingTasks[0].cueEn,'a subtle difference in meaning');
  assert.equal(imported.pack.spellingTasks[0].promptMode,'meaning_to_spelling');
  assert.equal(imported.pack.packId,'SYNTHETIC');
});
