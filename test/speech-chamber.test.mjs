import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsFromLearningPack,normalizeSpeechEntries,clampSpeechSeek,validateBackup,mergeBackupState} from '../core.mjs';
import {extractAudioTasks} from '../audio-tasks.mjs';

const manuscript='Good evening, everyone. The hardest part of learning English is not the first lesson. It is returning to practice, day after day, until our ideas become clear and confident.';
const pack={schema_version:'2.0',pack_id:'speech-test-01',title:'Speech test',speeches:[{speech_id:'first',title:'One Small Choice',script_en:manuscript,source_type:'user_supplied',audio_voice:'af_heart'}]};

test('speech-only daily pack keeps original paragraphs without adding fake reading cards',()=>{
 const out=recordsFromLearningPack(pack);
 assert.equal(out.items.length,0);
 assert.equal(out.readings.length,0);
 assert.equal(out.speeches.length,1);
 assert.equal(out.pack.speechIds.length,1);
 assert.equal(out.speeches[0].scriptEn,manuscript);
 assert.deepEqual(out.errors,[]);
 assert.equal(out.speeches[0].sourceType,'user_supplied');
});

test('old V2 pack without speeches remains compatible',()=>{
 const old={schema_version:'2.0',pack_id:'old-sentence',items:[{id:'s1',type:'sentence',text:'Practice makes progress when we review old ideas every day.'}]};
 const out=recordsFromLearningPack(old);
 assert.deepEqual(out.speeches,[]);
 assert.deepEqual(out.pack.speechIds,[]);
 assert.equal(out.items.length,1);
});

test('speech deduplication retains one manuscript and honest error',()=>{
 const repeat={...pack,speeches:[...pack.speeches,{speech_id:'another',title:'Duplicated',script_en:manuscript}]};
 const out=recordsFromLearningPack(repeat);
 assert.equal(out.speeches.length,1);
 assert.ok(out.errors.some(e=>e.includes('重复演讲')));
});

test('invalid full-text material or unsupported voice is rejected, never accepted silently',()=>{
 const invalid=normalizeSpeechEntries([{speech_id:'a',title:'bad',script_en:'short text'},{speech_id:'b',title:'bad voice',script_en:manuscript,audio_voice:'unknown'}],'p');
 assert.equal(invalid.speeches.length,0);
 assert.equal(invalid.errors.length,2);
});

test('actual mp3 extraction uses a single unbroken speech text and matchable SHA',()=>{
 const result=extractAudioTasks(pack);
 const speech=result.tasks.filter(t=>t.category==='speeches');
 assert.equal(result.errors.length,0);
 assert.equal(speech.length,1);
 assert.equal(speech[0].text,manuscript);
 assert.equal(speech[0].sourceId,'first');
 assert.match(speech[0].textHash,/^[a-f0-9]{64}$/);
 assert.equal(speech[0].needsGeneration,true);
});

test('seek clamp handles before zero, beyond end, pause-independent positions and invalid metadata',()=>{
 assert.equal(clampSpeechSeek(2,-5,180),0);
 assert.equal(clampSpeechSeek(177,5,180),180);
 assert.equal(clampSpeechSeek(42,-5,180),37);
 assert.equal(clampSpeechSeek(42,5,180),47);
 assert.equal(clampSpeechSeek(0,5,Number.NaN),null);
});

const oldState=()=>({items:[],attempts:[],sessions:[],reports:[],readings:[],settings:{},dailyPack:null,dailyJourney:null});
test('a restored unfinished speech Journey remains unfinished and pauses active clock',()=>{
 const out=recordsFromLearningPack(pack);
 const j={id:'journey:test',packId:pack.pack_id,steps:['speech'],index:0,finishedAt:null,speechMs:7800,speechRunning:true,speechLastTick:123,speechDoneIds:[],speechAttempts:[]};
 const recovered=validateBackup({...oldState(),speeches:out.speeches,speechAttempts:[],speechProgress:{'journey:test:foo':{shadowed:true}},dailyJourney:j});
 assert.equal(recovered.dailyJourney.steps[0],'speech');
 assert.equal(recovered.dailyJourney.finishedAt,null);
 assert.equal(recovered.dailyJourney.speechMs,7800);
 assert.equal(recovered.dailyJourney.speechRunning,false);
 assert.equal(recovered.speeches[0].id,out.speeches[0].id);
});

test('backup merge deduplicates speech identities and user-reported attempts',()=>{
 const speech=recordsFromLearningPack(pack).speeches[0];
 const attempt={id:'attempt-1',speechId:speech.id,shadowed:true,source:'USER_SELF_REPORT'};
 const merged=mergeBackupState({...oldState(),speeches:[speech],speechAttempts:[attempt],speechProgress:{one:{shadowed:true}}},{...oldState(),speeches:[speech],speechAttempts:[attempt],speechProgress:{two:{delivered:true}}});
 assert.equal(merged.speeches.length,1);
 assert.equal(merged.speechAttempts.length,1);
 assert.deepEqual(merged.speechProgress,{two:{delivered:true},one:{shadowed:true}});
});
