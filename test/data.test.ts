import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/core.json';
import { comparable, growth, validateCore, watchFrontier } from '../src/data';
const now = 1793539000000;
const clone = () => structuredClone(fixture);
const snap = () => validateCore(clone(),now);
test('captured public API evidence passes full settlement validation', () => { const s = snap(); assert.equal(s.height,5973); assert.equal(s.safeBlock,12041063); assert.equal(s.checkedAt,now); });
test('unavailable and unknown schemas are rejected even for HTTP 200', () => { const d=clone(); d.status='unavailable'; assert.throws(()=>validateCore(d,now), /unavailable/); d.status='available'; d.schemaVersion=3; assert.throws(()=>validateCore(d,now), /schema/); });
test('wrong network, low confirmations, malformed hashes and unsafe event blocks are rejected', () => {
  let d=clone(); d.chain.chainId='1'; assert.throws(()=>validateCore(d,now),/network/);
  d=clone(); d.chain.confirmations='1'; assert.throws(()=>validateCore(d,now),/confirmations/);
  d=clone(); d.source.blockHash='0xno'; assert.throws(()=>validateCore(d,now),/hash/);
  d=clone(); d.source.blockNumber=String(Number(d.chain.safeThroughBlock)+1); assert.throws(()=>validateCore(d,now),/frontier/);
});
test('height arithmetic and number safety use BigInt then bounded safe integers', () => {
  let d=clone(); d.core.blockHeight='5974'; assert.throws(()=>validateCore(d,now),/block units/);
  d=clone(); d.core.blockHeight='9007199254740992'; assert.throws(()=>validateCore(d,now),/height/);
  d=clone(); d.core.blockHeight='1.5'; assert.throws(()=>validateCore(d,now),/height/);
  d=clone(); d.core.blockProgress='1000000000'; assert.throws(()=>validateCore(d,now),/block units/);
});
test('future timestamps and conflicting event evidence are rejected', () => {
  let d=clone(); d.source.blockTimestamp=String(Math.floor(now/1000)+120); assert.throws(()=>validateCore(d,now),/timestamp/);
  d=clone(); d.events[0].blockHash='0x'+'a'.repeat(64); assert.throws(()=>validateCore(d,now),/Conflicting/);
});
test('forest growth counts crossed 60 and 1200 boundaries, never elapsed-time estimates', () => {
  const a={...snap(),height:1199}, b={...snap(),height:1260};
  assert.deepEqual(growth(a,b),{blocks:61,trees:2,groves:1});
  assert.deepEqual(growth(b,b),{blocks:0,trees:0,groves:0});
  assert.equal(growth(null,b),null); assert.equal(growth(b,a),null);
  assert.equal(growth(a,{...b,coreAddress:'new-deployment'}),null);
  assert.equal(growth(a,{...b,safeBlock:a.safeBlock-1}),null);
  assert.equal(comparable(a,b),true);
});
test('safe frontier watchdog rejects non-advancing stale reads and resets on progress', () => {
  const s=snap(), first=watchFrontier(null,s);
  assert.deepEqual(watchFrontier(first,{...s,checkedAt:now+30000}),first);
  assert.throws(()=>watchFrontier(first,{...s,checkedAt:now+181000}),/not advanced/);
  assert.equal(watchFrontier(first,{...s,safeBlock:s.safeBlock+1,checkedAt:now+200000}).advancedAt,now+200000);
  assert.throws(()=>watchFrontier(first,{...s,safeBlock:s.safeBlock-1}),/backward/);
});
