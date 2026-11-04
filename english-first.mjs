/**
 * English-first display cues. Pure functions; no changes to saved learning data.
 * V8-009 glosses are original context-specific English explanations supplied for
 * this particular pack because its legacy JSON omitted definition_en/cue_en.
 * Other packs prefer their own authored English fields and never auto-translate
 * Chinese clues into invented English meanings.
 */
const V8_009_PACK_ID = 'EN-DAILY-20261104-V8-009';
export const V8_009_CONTEXT_GLOSSES = Object.freeze({
  "follow through": "to finish something you planned or promised to do rather than stopping halfway.",
  "convey": "to communicate an idea, feeling, or message.",
  "counterproductive": "having the opposite effect from the result you intended.",
  "nuance": "a small but meaningful difference in meaning, feeling, or judgment.",
  "in hindsight": "when looking back at a situation after it has happened.",
  "weigh up": "to consider the advantages and disadvantages carefully before deciding.",
  "put into perspective": "to see the true importance of something by comparing it with the bigger picture.",
  "sustainable": "able to be maintained over time without excessive strain.",
  "rattle": "to make someone nervous, worried, or less confident.",
  "scramble": "to act quickly and with difficulty to deal with an urgent problem.",
  "demographic": "a group of people who share a characteristic, such as age or income, especially in statistics.",
  "agitation": "a state of worry or restlessness that makes it difficult to stay calm.",
  "distinguish between": "to recognize how two things are different.",
  "incapable of": "not able to do something.",
  "lose track of time": "to stop noticing how much time has passed.",
  "scroll through my phone": "to move through information on a phone screen, usually with a finger.",
  "exhausted": "extremely tired.",
  "class": "a group of students who learn together, or a lesson they attend."
});
const clean = value => String(value ?? '').trim();
const matchKey = value => clean(value).toLocaleLowerCase('en').replace(/\s+/g,' ');
export function contextualGloss(target,packId){
  return clean(packId)===V8_009_PACK_ID ? V8_009_CONTEXT_GLOSSES[matchKey(target)]||'' : '';
}
export function englishDefinitionFor(item={},packId=''){
  return clean(item.definitionEn||item.definition_en)||contextualGloss(item.target,packId||item.sourceId||item.source_id);
}
export function maskSpellingTarget(example,target){
  const text=clean(example), word=clean(target);
  if(!text||!word)return '';
  const escaped=word.replace(/[.*+?^\x24{}()|[\]\\]/g,'\\$&');
  const regex=new RegExp('(^|[^\\p{L}\\p{N}])('+escaped+')(?=$|[^\\p{L}\\p{N}])','giu');
  return text.replace(regex,(_match,prefix)=>prefix+'_____');
}
export function englishSpellingCue(task={}){
  const mode=clean(task.promptMode||task.prompt_mode)||'meaning_to_spelling';
  const target=clean(task.target);
  if(mode==='audio_to_spelling'){
    return {prompt:'Listen to the word, then spell what you hear.',audioLabel:'▶ Play word audio',audioText:clean(task.ttsText||task.tts_text)||target,hasEnglishClue:true};
  }
  if(mode==='sentence_cloze'){
    const cloze=maskSpellingTarget(task.example,target);
    return cloze
      ? {prompt:cloze,audioLabel:'▶ Listen to the sentence',audioText:'Complete the missing word: '+cloze.replaceAll('_____','blank'),hasEnglishClue:true}
      : {prompt:'Sentence clue unavailable. Skip this item if needed.',audioLabel:'',audioText:'',hasEnglishClue:false};
  }
  const gloss=clean(task.cueEn||task.cue_en||task.definitionEn||task.definition_en)||contextualGloss(target,task.packId||task.pack_id);
  if(gloss) {
    // Never accidentally expose an exact answer as a visible meaning clue.
    const masked=maskSpellingTarget(gloss,target);
    return {prompt:masked||gloss,audioLabel:'▶ Listen to the English clue',audioText:'Spell the word that means: '+(masked||gloss),hasEnglishClue:true};
  }
  const context=maskSpellingTarget(task.example,target);
  return context
    ? {prompt:'Context clue: '+context,audioLabel:'▶ Listen to the context clue',audioText:'Complete the missing word in this sentence: '+context.replaceAll('_____','blank'),hasEnglishClue:true}
    : {prompt:'English clue unavailable for this pack. You may skip this question without a test result.',audioLabel:'',audioText:'',hasEnglishClue:false};
}

/** English-only hint with source-backed English definition or masked example. */
export function englishWordHint(item={},packId=''){
  const meaning=englishDefinitionFor(item,packId);
  if(meaning)return maskSpellingTarget(meaning,item.target)||meaning;
  const example=clean(item.example);
  const masked=maskSpellingTarget(example,item.target);
  return masked&&masked!==example?'Context clue: '+masked:
    'English definition unavailable for this item. Skip rather than claiming recall.';
}
