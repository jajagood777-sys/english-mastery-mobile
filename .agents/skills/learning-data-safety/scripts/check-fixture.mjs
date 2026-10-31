#!/usr/bin/env node
// Synthetic-only smoke test for learning data preservation. Does not read user files.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {migrateBackupPayload,mergeBackupState,mergeDailyPackItems,persistState,VERSION} from '../../../../core.mjs';

export function runSyntheticDataSafetyChecks(){
  const checks=[];
  const run=(name,fn)=>{fn();checks.push(name);};
  const fakeBackup={
    version:4.2,
    items:[{id:'fake-word',kind:'word',target:'address',example:'We address the issue.',status:'K',attempts:5,intervalDays:7,dueAt:'2026-11-03T00:00:00Z'}],
    attempts:[{id:'fake-attempt',sessionId:'fake-session',initialAnswer:'original independent answer',promptUsed:false}],
    sessions:[{id:'fake-session',activeMs:120000}],
    reports:[{report_id:'fake-report',session_id:'fake-session'}],
    readings:[{id:'fake-reading',title:'Original example',text:'An original example reading passage.'}],
    packHistory:[],
    dailyPack:{packId:'fake-pack'},
    settings:{duration:40}
  };
  let migrated;
  run('old full backup migrates without changing learning evidence',()=>{
    migrated=migrateBackupPayload(structuredClone(fakeBackup));
    assert.equal(migrated.version,VERSION);
    assert.equal(migrated.items[0].status,'K');
    assert.equal(migrated.items[0].dueAt,fakeBackup.items[0].dueAt);
    assert.equal(migrated.items[0].attempts,5);
    assert.equal(migrated.attempts[0].initialAnswer,'original independent answer');
    assert.equal(migrated.sessions[0].activeMs,120000);
    assert.equal(migrated.readings[0].id,'fake-reading');
    assert.equal(migrated.dailyPack.packId,'fake-pack');
  });
  run('restore merges by stable IDs and does not overwrite current K/V/N',()=>{
    const current=structuredClone(migrated);
    const incoming=structuredClone(migrated);
    incoming.items[0].status='N';
    incoming.attempts.push({id:'fake-attempt-two',sessionId:'fake-session',initialAnswer:'a second real attempt'});
    const merged=mergeBackupState(current,incoming);
    assert.equal(merged.items.length,1);
    assert.equal(merged.items[0].status,'K');
    assert.equal(merged.attempts.length,2);
    assert.equal(merged.sessions.length,1);
    assert.equal(merged.reports.length,1);
    assert.equal(merged.readings.length,1);
    assert.equal(current.attempts.length,1);
    assert.equal(mergeBackupState(merged,incoming).attempts.length,2);
  });
  run('new daily pack reuses an already-learned matching card',()=>{
    const incoming={...migrated.items[0],id:'fake-new-pack-word',status:'UNTESTED',attempts:0,intervalDays:0};
    const result=mergeDailyPackItems(migrated.items,[incoming]);
    assert.deepEqual(result.itemIds,['fake-word']);
    assert.equal(result.added,0);
    assert.equal(result.items[0].status,'K');
    assert.equal(result.items[0].attempts,5);
  });
  run('storage write failure never changes the last successfully persisted raw value',()=>{
    const storage={value:'LAST_GOOD',setItem(_key,value){if(value==='NEW_FAIL')throw Error('synthetic quota failure');this.value=value;}};
    const saved=persistState(storage,'fake-store','NEW_FAIL','LAST_GOOD');
    assert.equal(saved.ok,false);
    assert.equal(storage.value,'LAST_GOOD');
  });
  return {ok:true,kind:'synthetic_fixture_only',source:'core.mjs',checks,counts:{checks:checks.length},realSafariDataTested:false};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  try{console.log(JSON.stringify(runSyntheticDataSafetyChecks(),null,2));}
  catch(error){console.error('DATA SAFETY FIXTURE FAILED:',error.stack||error.message);process.exitCode=1;}
}
