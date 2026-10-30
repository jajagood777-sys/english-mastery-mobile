import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsFromLearningPack,migrateBackupPayload,mergeBackupState} from '../core.mjs';

const pack={schema_version:'2.0',pack_id:'one-file-test',title:'Daily All Skills',recommended_minutes:40,language:'en',source:'Original sample',items:[
{id:'w1',type:'word',target:'address',example:'We address the problem.'},
{id:'s1',type:'sentence',text:'We practice English regularly.',cloze_target:'practice'},
{id:'l1',type:'listening',text:'Listening carefully improves your understanding.'}
],readings:[{id:'r1',title:'Original story',text:'A short English story is worth reading carefully.'}]};
test('single master JSON automatically distributes four study modules',()=>{
const data=recordsFromLearningPack(pack);
assert.equal(data.items.length,3);
assert.equal(data.readings.length,1);
assert.deepEqual(data.items.map(x=>x.module),['words','sentences','listening']);
assert.equal(data.pack.listeningIds.length,1);
assert.equal(data.pack.readingIds.length,1);
assert.equal(data.pack.recommendedMinutes,40);
});
test('legacy daily pack without readings/listening still imports',()=>{
const data=recordsFromLearningPack({pack_id:'old',items:[{type:'word',target:'address',example:'We address this issue.'}]});
assert.equal(data.items.length,1);assert.deepEqual(data.readings,[]);assert.equal(data.pack.recommendedMinutes,null);
});
test('reading-only daily pack is usable, absent modules are not invented',()=>{
const data=recordsFromLearningPack({pack_id:'read-only',items:[],readings:[{title:'Story',text:'A short English story for the learner.'}]});
assert.equal(data.items.length,0);assert.equal(data.readings.length,1);assert.deepEqual(data.pack.listeningIds,[]);
});
test('deduplicate same listening within pack without collapsing it into sentence study',()=>{
const data=recordsFromLearningPack({pack_id:'q',items:[{type:'sentence',text:'Listen carefully to this simple sentence.'},{type:'listening',text:'Listen carefully to this simple sentence.'},{type:'listening',text:'Listen carefully to this simple sentence.'}]});
assert.equal(data.items.length,2);assert.equal(data.errors.length,1);
});
test('invalid reading and unsupported item type report errors without fabricating content',()=>{
const data=recordsFromLearningPack({...pack,items:[...pack.items,{type:'video',text:'Invalid thing'}],readings:[...pack.readings,{id:'bad',title:'Broken',text:'short'}]});
assert.equal(data.items.length,3);assert.equal(data.readings.length,1);assert.equal(data.errors.length,2);
});
test('daily journey persists paused and is included in merged backups',()=>{
const raw={version:4.2,items:[],attempts:[],sessions:[],reports:[],readings:[],packHistory:[],dailyPack:{packId:'one-file-test'},dailyJourney:{id:'j1',packId:'one-file-test',steps:['words','sentences','reading','listening'],index:2,completed:[{stage:'words',status:'completed'}],readingMs:125000,readingRunning:true,readingLastTick:123,sessionIds:['s1'],readingDoneIds:[]},settings:{duration:40}};
const restored=migrateBackupPayload(raw);assert.equal(restored.dailyJourney.index,2);assert.equal(restored.dailyJourney.readingRunning,false);assert.equal(restored.dailyJourney.readingMs,125000);
const merged=mergeBackupState({...restored,dailyJourney:null},restored);assert.equal(merged.dailyJourney.packId,'one-file-test');
});
