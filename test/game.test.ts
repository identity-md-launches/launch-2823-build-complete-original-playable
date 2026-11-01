import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environment, hint, LIMIT, litSpirits, makePuzzle, MIN_ROUTE, placementError, practicePuzzle, score, solve, SEEDS, type Plant, type Puzzle, type Seed } from '../src/game';

const routeScore = (p: Puzzle) => 300 + (LIMIT - p.solution.length) * 40 + new Set(p.solution.map(x => x.seed)).size * 20;
/** Independent check that uses only the player-facing rule function: every legal sequence of n plantings. */
function solvableWithin(p: Puzzle, n: number, plants: Plant[] = []): boolean {
  if (litSpirits(p, plants).length === p.spirits.length) return true;
  if (plants.length >= n) return false;
  for (let cell = 0; cell < 25; cell++) for (const seed of Object.keys(SEEDS) as Seed[]) {
    // Each set once, in willow, pine, glowcap order: that order is legal whenever any order of the set is.
    const key = (x: Plant) => Object.keys(SEEDS).indexOf(x.seed) * 25 + x.cell, last = plants.at(-1);
    if (last && key({ cell, seed }) <= key(last)) continue;
    if (!placementError(p, plants, cell, seed) && solvableWithin(p, n, [...plants, { cell, seed }])) return true;
  }
  return false;
}

test('500 generated puzzles are deterministic and their stored route is legal and complete', () => {
  for (let i = 0; i < 500; i++) {
    const p = makePuzzle('verified', i * 60, `deployment-${i % 3}`, `test-${i}`);
    assert.deepEqual(p, makePuzzle('verified', i * 60, `deployment-${i % 3}`, `test-${i}`));
    assert.equal(p.terrain.length, 25); assert.equal(new Set(p.spirits).size, 3);
    assert.equal(p.terrain.filter(t => t === 'pond').length, 2); assert.equal(p.terrain.filter(t => t === 'stump').length, 1);
    assert.ok(p.spirits.every(s => p.terrain[s] === 'soil'));
    assert.ok(p.solution.length >= MIN_ROUTE && p.solution.length <= LIMIT);
    const plants: Plant[] = [];
    for (const step of p.solution) { assert.equal(placementError(p, plants, step.cell, step.seed), null, `puzzle ${i}: ${JSON.stringify(step)}`); plants.push(step); }
    assert.equal(litSpirits(p, plants).length, 3);
    assert.equal(score(p, plants).total, routeScore(p));
  }
});
test('layouts are procedurally varied, not one template rotated', () => {
  const shapes = new Set<string>(), relative = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = makePuzzle('verified', i * 60, 'deployment', `variety-${i}`);
    shapes.add(`${p.terrain.join()}|${p.spirits}`);
    const ponds = p.terrain.flatMap((t, c) => t === 'pond' ? [c] : []), stump = p.terrain.indexOf('stump');
    const dist = (a: number, b: number) => Math.max(Math.abs(a % 5 - b % 5), Math.abs(Math.floor(a / 5) - Math.floor(b / 5)));
    relative.add(`${dist(ponds[0], ponds[1])}|${Math.min(...ponds.map(c => dist(c, stump)))}`);
  }
  assert.equal(shapes.size, 200);
  assert.ok(relative.size >= 10, `pond/stump spacings vary: ${relative.size}`);
});
test('the solver finds a shortest route: no legal sequence of fewer plantings restores sample groves', () => {
  for (let i = 0; i < 6; i++) {
    const p = makePuzzle('verified', i * 60, 'deployment', `shortest-${i}`);
    assert.equal(solvableWithin(p, p.solution.length), true, `puzzle ${i}: independent search finds the stored length`);
    assert.equal(solvableWithin(p, p.solution.length - 1), false, `puzzle ${i} has a shorter route than ${p.solution.length}`);
  }
});
test('solver rejects an impossible layout', () => {
  // No pond anywhere: nothing can ever be watered, so no Glowcap can grow.
  assert.equal(solve(Array(25).fill('soil'), [0, 12, 24]), null);
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
  for (let i = 0; i < 50; i++) {
    const p = practicePuzzle(i);
    for (const cell of p.terrain.keys()) {
      const env = environment(p, [], cell);
      if (p.terrain[cell] !== 'soil') continue;
      assert.equal(placementError(p, [], cell, 'pine') === null, !env.water, `pine at ${cell}`);
      assert.equal(placementError(p, [], cell, 'glowcap') === null, env.water && env.shade, `glowcap at ${cell}`);
      assert.equal(placementError(p, [], cell, 'willow') === null, p.terrain.some((t, j) => t === 'pond' && Math.abs(j % 5 - cell % 5) <= 1 && Math.abs(Math.floor(j / 5) - Math.floor(cell / 5)) <= 1), `willow at ${cell}`);
    }
    // Every Glowcap in the route needs the water and shade the earlier plantings built.
    p.solution.forEach((step, k) => { if (step.seed === 'glowcap') assert.deepEqual(environment(p, p.solution.slice(0, k), step.cell), { water: true, shade: true }); });
  }
});
test('planting a willow cannot invalidate an existing dry pine', () => {
  const p = practicePuzzle();
  let inspected = 0;
  for (let pine = 0; pine < 25; pine++) if (!placementError(p, [], pine, 'pine')) {
    for (let willow = 0; willow < 25; willow++) if (!placementError(p, [], willow, 'willow')) {
      const env = environment(p, [{ cell: willow, seed: 'willow' }], pine);
      if (env.water) { assert.ok(placementError(p, [{ cell: pine, seed: 'pine' }], willow, 'willow')); inspected++; }
    }
  }
  assert.ok(inspected > 0);
});
test('stock and move limits are enforced without consuming invalid moves', () => {
  const p = practicePuzzle();
  const dry = p.terrain.flatMap((t, i) => t === 'soil' && !environment(p, [], i).water ? [i] : []);
  const stock: Plant[] = [{ cell: dry[0], seed: 'pine' }, { cell: dry[1], seed: 'pine' }];
  const candidate = p.terrain.findIndex((t, i) => t === 'soil' && !stock.some(x => x.cell === i));
  assert.match(placementError(p, stock, candidate, 'pine')!, /No Sunpine seeds/);
  assert.match(placementError(p, Array.from({ length: LIMIT }, (_, cell) => ({ cell, seed: 'willow' as const })), 24, 'pine')!, /All six/);
});
test('score changes with actual choices, excludes completion bonuses until solved', () => {
  const p = practicePuzzle();
  assert.equal(score(p, []).total, 0);
  const partial = score(p, p.solution.slice(0, -1));
  assert.ok(partial.spirits < 300); assert.equal(partial.saved, 0); assert.equal(partial.diversity, 0);
  const full = score(p, p.solution);
  assert.equal(full.spirits, 300); assert.equal(full.saved, (LIMIT - p.solution.length) * 40); assert.equal(full.total, routeScore(p));
  assert.ok(placementError(p, p.solution, 0, 'willow')?.includes('restored'));
});
test('guidance gives the next legal step and explains off-route recovery', () => {
  const p = practicePuzzle(), first = p.solution[0];
  assert.match(hint(p, []), new RegExp(`Try ${SEEDS[first.seed].name}`));
  assert.equal(placementError(p, [], first.cell, first.seed), null);
  const off = p.terrain.findIndex((t, i) => t === 'soil' && !p.solution.some(x => x.cell === i) && !placementError(p, [], i, 'willow'));
  if (off >= 0) assert.match(hint(p, [{ cell: off, seed: 'willow' }]), /One known route: .*Undo other plantings/);
});
