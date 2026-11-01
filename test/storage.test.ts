import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/core.json';
import { validateCore } from '../src/data';
import { practicePuzzle, score } from '../src/game';
import { archivedPuzzle, completeGame, emptyMemory, loadMemory, recordSnapshot, saveMemory, validPlants } from '../src/storage';
const snapshot=()=>validateCore(fixture,1793539000000);
test('observations unlock only current observed milestone; existing evidence never changes',()=>{
  let m=recordSnapshot(emptyMemory(),snapshot()); assert.equal(m.archive.length,1); assert.equal(m.archive[0].milestone,5940);
  const p=archivedPuzzle(m.archive[0]);
  m=recordSnapshot(m,{...snapshot(),height:5974,checkedAt:1793539030000}); assert.equal(m.archive.length,1); assert.deepEqual(archivedPuzzle(m.archive[0]),p);
  m=recordSnapshot(m,{...snapshot(),height:6121,checkedAt:1793539060000}); assert.equal(m.archive.length,2); assert.equal(m.archive[1].milestone,6120);
  assert.equal(m.archive.some(e=>e.milestone===6000),false);
});
test('backward observations are rejected and deployment changes start separate archives',()=>{
  const m=recordSnapshot(emptyMemory(),snapshot()); assert.equal(recordSnapshot(m,{...snapshot(),height:5900}),m);
  const next=recordSnapshot(m,{...snapshot(),coreAddress:'0x'+'a'.repeat(40)}); assert.equal(next.archive.length,2);
});
test('save, reload, in-progress state, best score and replay do not farm points',()=>{
  const p=practicePuzzle(), top=score(p,p.solution).total; assert.ok(top>300); let m=completeGame(emptyMemory(),p,p.solution); assert.equal(m.games[p.id].best,top);
  m=completeGame(m,p,[]); assert.equal(m.games[p.id].best,top);
  m=completeGame(m,p,p.solution); assert.equal(m.games[p.id].best,top);
  let text=''; assert.equal(saveMemory(m,{setItem:(_k,v)=>{text=v;}}),null);
  const restored=loadMemory({getItem:()=>text}); assert.equal(restored.error,null); assert.deepEqual(restored.memory.games[p.id],m.games[p.id]);
});
test('malformed and unavailable storage recover without a crash',()=>{
  assert.ok(loadMemory({getItem:()=>'{broken'}).error);
  assert.ok(loadMemory({getItem:()=>{throw Error('blocked');}}).error);
  assert.ok(saveMemory(emptyMemory(),{setItem:()=>{throw Error('quota');}}));
});
test('snapshots are bounded and corrupted evidence is filtered',()=>{
  let m=emptyMemory(); for(let i=0;i<110;i++) m=recordSnapshot(m,{...snapshot(),checkedAt:1793539000000+i}); assert.equal(m.snapshots.length,100);
  const raw=JSON.stringify({...m,snapshots:[{...snapshot(),blockHash:'fake'}]}); assert.equal(loadMemory({getItem:()=>raw}).memory.snapshots.length,0);
});
test('saved plantings must form a legal sequence for the exact puzzle',()=>{
  const p=practicePuzzle(); assert.deepEqual(validPlants(p,p.solution),p.solution); assert.deepEqual(validPlants(p,[{cell:p.terrain.indexOf('pond'),seed:'pine'}]),[]);
});
test('previously unlocked groves remain replayable beyond 120 milestones',()=>{
  let m=emptyMemory();for(let i=0;i<125;i++)m=recordSnapshot(m,{...snapshot(),height:6000+i*60,checkedAt:1793539000000+i});
  assert.equal(m.archive.length,125);assert.equal(m.snapshots.length,100);
  assert.equal(loadMemory({getItem:()=>JSON.stringify(m)}).memory.archive.length,125);
});
test('one milestone is one grid for every visitor, whatever height or hash they first observed',()=>{
  // Two browsers cross milestone 1,200 at different heights with different settlement evidence.
  const early=recordSnapshot(emptyMemory(),{...snapshot(),height:1201,checkedAt:1793539000000});
  const late=recordSnapshot(emptyMemory(),{...snapshot(),height:1255,checkedAt:1793539900000,blockHash:'0x'+'b'.repeat(64),transactionHash:'0x'+'c'.repeat(64),sourceBlock:12041060});
  assert.equal(early.archive[0].milestone,1200);assert.equal(late.archive[0].milestone,1200);
  assert.equal(early.archive[0].id,late.archive[0].id);
  const a=archivedPuzzle(early.archive[0]),b=archivedPuzzle(late.archive[0]);
  assert.deepEqual(a.terrain,b.terrain);assert.deepEqual(a.spirits,b.spirits);assert.deepEqual(a,b);
  // The observed evidence is still kept as the record of when the grove unlocked.
  assert.equal(early.archive[0].evidence.height,1201);assert.equal(late.archive[0].evidence.height,1255);
  // A different milestone gives a different grid.
  const next=recordSnapshot(early,{...snapshot(),height:1260,checkedAt:1793539960000});
  assert.notDeepEqual(archivedPuzzle(next.archive[1]).terrain,a.terrain);
});
test('polling within one page load updates the current visit in place and keeps earlier visits',()=>{
  // An earlier day's visit, then a page load that polls 150 times.
  let m=recordSnapshot(emptyMemory(),{...snapshot(),height:5900,checkedAt:1793400000000});
  m=recordSnapshot(m,{...snapshot(),checkedAt:1793539000000});
  for(let i=1;i<=150;i++) m=recordSnapshot(m,{...snapshot(),height:5973+Math.floor(i/10),checkedAt:1793539000000+i*30000},true);
  assert.equal(m.snapshots.length,2);
  assert.equal(m.snapshots[0].checkedAt,1793400000000);assert.equal(m.snapshots[1].height,5988);
  assert.equal(m.archive.length,2);assert.deepEqual(m.archive.map(e=>e.milestone),[5880,5940]);
  // replaceLast never invents history on an empty memory.
  assert.equal(recordSnapshot(emptyMemory(),snapshot(),true).snapshots.length,1);
  // A rejected regression is not recorded either way.
  assert.equal(recordSnapshot(m,{...snapshot(),height:5000},true),m);
});
