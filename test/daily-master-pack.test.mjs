import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsFromLearningPack,migrateBackupPayload,mergeBackupState,mergeDailyPackItems,battleReportMarkdown} from '../core.mjs';

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

test('reimport a learned vocabulary expression preserves K/V/N, interval and history',()=>{
 const previous={id:'old',kind:'word',target:'address',example:'We address the problem.',status:'K',attempts:3,dueAt:'2026-11-01T00:00:00Z',intervalDays:7};
 const newer={id:'new',kind:'word',target:'address',example:'We address the problem.',status:'UNTESTED'};
 const m=mergeDailyPackItems([previous],[newer]);
 assert.equal(m.added,0);assert.equal(m.skipped,1);assert.deepEqual(m.itemIds,['old']);assert.equal(m.items[0].attempts,3);assert.equal(m.items[0].status,'K');
});
test('same sentence as listening and sentence remain separate learning tasks',()=>{
 const a={id:'sentence',kind:'sentence',module:'sentences',text:'We learn a new expression together.'};
 const b={id:'listening',kind:'sentence',module:'listening',text:'We learn a new expression together.'};
 const r=mergeDailyPackItems([a],[b]);assert.equal(r.added,1);assert.equal(r.items.length,2);
});
test('combined report markdown includes actual four-module completion and reading minutes',()=>{
 const md=battleReportMarkdown({report_id:'r1',session_id:'j1',created_at:'2026-10-31T00:00:00Z',timezone:'Asia/Shanghai',active_seconds:1800,mode:'journey',mode_breakdown:{words:2,sentences:3},ratings_summary:{K:1,V:2,N:2},attempts:[],prompt_stats:{},review_items:{},module_coverage:[{stage:'words',label:'炼词',status:'completed',count:2},{stage:'reading',label:'阅读',status:'partial',count:1}],reading_seconds:600,reading_completed:1,target_minutes:40});
 assert.match(md,/今日综合学习模块/);assert.match(md,/Actual reading time: 600 seconds/);assert.match(md,/炼词: completed/);assert.match(md,/阅读: partially completed/);
});
