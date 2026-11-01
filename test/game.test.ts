import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environment, hint, LIMIT, litSpirits, makePuzzle, placementError, practicePuzzle, score, type Plant } from '../src/game';

test('500 generated puzzles are deterministic and have a legal complete solution', () => {
  for (let i = 0; i < 500; i++) {
    const p = makePuzzle('verified', i * 60, `evidence-${i}`, `test-${i}`);
    assert.deepEqual(p, makePuzzle('verified', i * 60, `evidence-${i}`, `test-${i}`));
    assert.equal(p.terrain.length, 25); assert.equal(new Set(p.spirits).size, 3);
    const plants: Plant[] = [];
    for (const step of p.solution) { assert.equal(placementError(p, plants, step.cell, step.seed), null, `puzzle ${i}: ${JSON.stringify(step)}`); plants.push(step); }
    assert.equal(litSpirits(p, plants).length, 3);
    assert.equal(score(p, plants).total, 440);
  }
});
test('practice never adopts block provenance and has distinct reproducible levels', () => {
  assert.equal(practicePuzzle().mode, 'practice'); assert.equal(practicePuzzle().milestone, 0);
  assert.deepEqual(practicePuzzle(2), practicePuzzle(2)); assert.notDeepEqual(practicePuzzle(1).terrain, practicePuzzle(2).terrain);
});
test('invalid placements do not mutate moves or score', () => {
  const p = practicePuzzle(), plants: Plant[] = [];
  const pond = p.terrain.indexOf('pond');
  assert.match(placementError(p, plants, pond, 'willow')!, /pond/);
  assert.equal(plants.length, 0); assert.equal(score(p, plants).total, 0);
  assert.ok(placementError(p, plants, -1, 'pine'));
});
test('water, shade and dry soil rules constrain player choices', () => {
  const p = practicePuzzle();
  const [willow,pine,glowcap] = p.solution;
  assert.ok(placementError(p, [], glowcap.cell, 'glowcap'));
  assert.equal(placementError(p, [], willow.cell, 'willow'), null);
  assert.equal(placementError(p, [], willow.cell, 'pine')?.includes('dry soil'), true);
  const plants = [willow,pine];
  assert.deepEqual(environment(p, plants, glowcap.cell), { water:true, shade:true });
  assert.equal(placementError(p, plants, glowcap.cell, 'glowcap'), null);
});
test('planting a willow cannot invalidate an existing dry pine', () => {
  const p = practicePuzzle();
  // Inspect every candidate pair on the real generated terrain.
  let inspected = 0;
  for(let pine=0;pine<25;pine++) if (!placementError(p,[],pine,'pine')) {
    for(let willow=0;willow<25;willow++) if (!placementError(p,[],willow,'willow')) {
      const env = environment(p,[{cell:willow,seed:'willow'}],pine);
      if(env.water) { assert.ok(placementError(p,[{cell:pine,seed:'pine'}],willow,'willow')); inspected++; }
    }
  }
  assert.ok(inspected > 0);
});
test('stock and move limits are enforced without consuming invalid moves', () => {
  const p = practicePuzzle();
  const stock: Plant[] = [{cell:0,seed:'pine'},{cell:1,seed:'pine'}];
  const candidate = p.terrain.findIndex((t,i)=>t==='soil' && !stock.some(x=>x.cell===i));
  assert.match(placementError(p,stock,candidate,'pine')!, /No Sunpine seeds/);
  assert.match(placementError(p,Array.from({length:LIMIT},(_,cell)=>({cell,seed:'willow' as const})),24,'pine')!, /All six/);
});
test('score changes with actual choices, excludes completion bonuses until solved', () => {
  const p = practicePuzzle();
  assert.equal(score(p,[]).total,0);
  assert.equal(score(p,p.solution.slice(0,2)).total,0);
  const partial = score(p,p.solution.slice(0,3));
  assert.ok(partial.spirits > 0 && partial.spirits < 300); assert.equal(partial.saved,0);
  assert.deepEqual(score(p,p.solution),{total:440,spirits:300,saved:80,diversity:60});
  assert.ok(placementError(p,p.solution,0,'willow')?.includes('restored'));
});
test('guidance gives a legal next step and explains off-route recovery', () => {
  const p = practicePuzzle(); assert.match(hint(p,[]), /Try Willow/);
  assert.match(hint(p,[{cell:24,seed:'willow'}]), /known route|Try/);
});
