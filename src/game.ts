/** Versioned deterministic puzzle engine. No network, clock or random scoring. */
export type Seed = 'willow' | 'pine' | 'glowcap';
export type Terrain = 'soil' | 'pond' | 'stump' | 'rock';
export interface Plant { cell: number; seed: Seed }
export interface Puzzle {
  id: string; name: string; mode: 'verified' | 'practice'; milestone: number;
  entropy: string; terrain: Terrain[]; spirits: number[]; solution: Plant[]; version: 2;
}
export const SEEDS: Record<Seed, { name: string; rule: string; effect: string; short: string }> = {
  willow: { name: 'Willow', rule: 'Plant beside a pond, away from pines.', effect: 'Waters all 8 neighboring tiles.', short: 'Spreads water' },
  pine: { name: 'Sunpine', rule: 'Plant on dry soil, away from ponds and willows.', effect: 'Shades all 8 neighboring tiles.', short: 'Makes shade' },
  glowcap: { name: 'Glowcap', rule: 'Plant on soil with both water and shade.', effect: 'Wakes spirits on its tile and all 8 neighbors.', short: 'Wakes spirits' },
};
export const LIMIT = 6;
export const STOCK: Record<Seed, number> = { willow: 2, pine: 2, glowcap: 2 };
export const ADJACENCY = 'Beside means any of the 8 surrounding tiles, including diagonals.';
export const near = (a: number, b: number) => a !== b && Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) <= 1 && Math.abs(a % 5 - b % 5) <= 1;
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const coord = (i: number) => `${String.fromCharCode(65 + i % 5)}${Math.floor(i / 5) + 1}`;
export function environment(p: Puzzle, plants: Plant[], cell: number) {
  const water = p.terrain.some((t, i) => t === 'pond' && near(i, cell)) || plants.some(x => x.seed === 'willow' && near(x.cell, cell));
  const shade = p.terrain.some((t, i) => t === 'stump' && near(i, cell)) || plants.some(x => x.seed === 'pine' && near(x.cell, cell));
  return { water, shade };
}
export function placementError(p: Puzzle, plants: Plant[], cell: number, seed: Seed): string | null {
  if (!Number.isInteger(cell) || cell < 0 || cell >= 25) return 'Choose a tile in the grove.';
  if (litSpirits(p, plants).length === p.spirits.length) return 'This grove is restored. Replay to try a new arrangement.';
  if (plants.length >= LIMIT) return 'All six plantings used. Undo a planting or restart the grove.';
  if (p.terrain[cell] !== 'soil') return `${coord(cell)} is ${p.terrain[cell] === 'pond' ? 'a pond' : p.terrain[cell] === 'rock' ? 'a rock' : 'an old tree'}. Choose an empty soil tile.`;
  if (plants.some(x => x.cell === cell)) return `${coord(cell)} is already planted. Undo to change it.`;
  if (plants.filter(x => x.seed === seed).length >= STOCK[seed]) return `No ${SEEDS[seed].name} seeds left. Choose another seed or undo.`;
  const env = environment(p, plants, cell);
  if (seed === 'willow') {
    if (!p.terrain.some((t, i) => t === 'pond' && near(i, cell))) return 'Willow needs a neighboring pond, including diagonals.';
    if (plants.some(x => x.seed === 'pine' && near(x.cell, cell))) return 'That willow would water a Sunpine. Keep pines on dry soil.';
  }
  if (seed === 'pine' && env.water) return 'Sunpine needs dry soil. Choose a tile away from ponds and willows.';
  if (seed === 'glowcap' && (!env.water || !env.shade)) return `Glowcap needs ${!env.water && !env.shade ? 'water and shade' : !env.water ? 'water' : 'shade'}. Add a nearby ${!env.water ? 'Willow' : 'Sunpine'}, or use the natural terrain.`;
  return null;
}
export function litSpirits(p: Puzzle, plants: Plant[]) {
  return p.spirits.filter(cell => plants.some(x => x.seed === 'glowcap' && (x.cell === cell || near(x.cell, cell))));
}
export function score(p: Puzzle, plants: Plant[]) {
  const lit = litSpirits(p, plants).length;
  const saved = lit === p.spirits.length ? (LIMIT - plants.length) * 40 : 0;
  const diversity = lit === p.spirits.length ? new Set(plants.map(x => x.seed)).size * 20 : 0;
  return { total: lit * 100 + saved + diversity, spirits: lit * 100, saved, diversity };
}
function transform(cell: number, rotation: number, mirror: boolean) {
  let x = cell % 5, y = Math.floor(cell / 5);
  if (mirror) x = 4 - x;
  for (let i = 0; i < rotation; i++) [x, y] = [4 - y, x];
  return y * 5 + x;
}
const NAMES = ['Firefly hollow', 'Moonwater crossing', 'The sleeping glade', 'Whispering roots', 'Lanternwood', 'Mosslight meadow', 'The emerald hush', 'Little fern haven'];
/** A generated layout is kept only when its best route needs at least this many plantings. */
export const MIN_ROUTE = 4;
export const LAYOUT_ATTEMPTS = 64;
function subsets(cells: number[], max: number): number[][] {
  const out: number[][] = [[]];
  for (let i = 0; i < cells.length; i++) {
    out.push([cells[i]]);
    if (max > 1) for (let j = i + 1; j < cells.length; j++) out.push([cells[i], cells[j]]);
  }
  return out;
}
const NEIGHBORS = Array.from({ length: 25 }, (_, c) => Array.from({ length: 25 }, (_, i) => i).reduce((m, i) => near(i, c) ? m | 1 << i : m, 0));
const area = (cells: number[]) => cells.reduce((m, c) => m | NEIGHBORS[c], 0);
/**
 * Exhaustive search for the highest-scoring legal route on a layout.
 * Played as willows, then pines, then glowcaps, a planting set is legal exactly when its final state is,
 * so each set is checked once. Returns null when no route within LIMIT and STOCK wakes every spirit.
 */
export function solve(terrain: Terrain[], spirits: number[]): Plant[] | null {
  const of = (kind: Terrain) => terrain.map((t, i) => t === kind ? i : -1).filter(i => i >= 0);
  const soil = of('soil'), pondArea = area(of('pond')), stumpArea = area(of('stump'));
  const light = soil.map(c => spirits.reduce((m, s, k) => s === c || near(s, c) ? m | 1 << k : m, 0));
  const all = (1 << spirits.length) - 1;
  const has = (mask: number, c: number) => (mask >> c & 1) === 1;
  let best: Plant[] | null = null, bestValue = -1;
  for (const willows of subsets(soil.filter(c => has(pondArea, c)), STOCK.willow)) {
    const wet = pondArea | area(willows);
    for (const pines of subsets(soil.filter(c => !willows.includes(c) && !has(wet, c)), STOCK.pine)) {
      const used = willows.length + pines.length;
      if (used >= LIMIT) continue;
      const shade = stumpArea | area(pines);
      const glow = soil.map((c, k) => ({ c, lit: light[k] })).filter(({ c, lit }) => lit && has(wet & shade, c) && !willows.includes(c) && !pines.includes(c));
      const types = (willows.length ? 1 : 0) + (pines.length ? 1 : 0) + 1;
      for (let i = 0; i < glow.length; i++) for (let j = i; j < glow.length; j++) {
        const caps = i === j ? [glow[i]] : [glow[i], glow[j]];
        if (caps.length > LIMIT - used || (caps[0].lit | caps[caps.length - 1].lit) !== all) continue;
        const value = (LIMIT - used - caps.length) * 40 + types * 20;
        if (value > bestValue) {
          bestValue = value;
          best = [...willows.map(cell => ({ cell, seed: 'willow' as const })), ...pines.map(cell => ({ cell, seed: 'pine' as const })), ...caps.map(x => ({ cell: x.c, seed: 'glowcap' as const }))];
        }
      }
    }
  }
  return best;
}
/** The original hand-checked layout, used only if no generated layout passes the solver within LAYOUT_ATTEMPTS. */
function templateLayout(random: () => number) {
  const rotation = Math.floor(random() * 4), mirror = random() > .5;
  const tx = (i: number) => transform(i, rotation, mirror);
  const terrain: Terrain[] = Array(25).fill('soil');
  [1, 20].forEach(i => terrain[tx(i)] = 'pond');
  terrain[tx(21)] = 'stump';
  const solution: Plant[] = [{ cell: tx(6), seed: 'willow' }, { cell: tx(18), seed: 'pine' }, { cell: tx(12), seed: 'glowcap' }, { cell: tx(16), seed: 'glowcap' }];
  const spirits = [tx([8, 13, 7][Math.floor(random() * 3)]), tx([22, 15, 10][Math.floor(random() * 3)]), tx([11, 17, 12][Math.floor(random() * 3)])];
  const empty = terrain.map((t, i) => t === 'soil' && !solution.some(x => x.cell === i) && !spirits.includes(i) ? i : -1).filter(i => i >= 0);
  for (let n = 0; n < 3; n++) { const k = Math.floor(random() * empty.length); terrain[empty.splice(k, 1)[0]] = 'rock'; }
  return { terrain, spirits, solution };
}
/** Two ponds, one old tree, three spirits and three rocks on distinct seeded cells, kept only if solvable. */
function generatedLayout(random: () => number) {
  for (let attempt = 0; attempt < LAYOUT_ATTEMPTS; attempt++) {
    const open = Array.from({ length: 25 }, (_, i) => i);
    const take = () => open.splice(Math.floor(random() * open.length), 1)[0];
    const terrain: Terrain[] = Array(25).fill('soil');
    terrain[take()] = 'pond'; terrain[take()] = 'pond'; terrain[take()] = 'stump';
    const spirits = [take(), take(), take()];
    for (let n = 0; n < 3; n++) terrain[take()] = 'rock';
    const solution = solve(terrain, spirits);
    if (solution && solution.length >= MIN_ROUTE) return { terrain, spirits, solution };
  }
  return null;
}
const made = new Map<string, Puzzle>();
/** Deterministic: the same mode, milestone, entropy and key always give the same layout and stored route. */
export function makePuzzle(mode: 'verified' | 'practice', milestone: number, entropy: string, key: string): Puzzle {
  const seed = `seedkeeper-v2|${mode}|${milestone}|${entropy}|${key}`;
  const cached = made.get(seed);
  if (cached) return cached;
  const random = rng(hash(seed));
  const layout = generatedLayout(random) ?? templateLayout(random);
  const puzzle: Puzzle = { id: key, mode, milestone, entropy, ...layout, name: NAMES[Math.floor(random() * NAMES.length)], version: 2 };
  made.set(seed, puzzle);
  return puzzle;
}
export function hint(p: Puzzle, plants: Plant[]): string {
  const same = (a: Plant, b: Plant) => a.cell === b.cell && a.seed === b.seed;
  const intended = p.solution.find(x => !plants.some(y => same(x, y)));
  if (!intended) return 'Every spirit is within reach. Check the glowing tiles.';
  if (plants.some(x => !p.solution.some(y => same(x, y)))) return `One known route: ${p.solution.map(x => `${SEEDS[x.seed].name} ${coord(x.cell)}`).join(', ')}. Undo other plantings to follow it.`;
  return `Try ${SEEDS[intended.seed].name} at ${coord(intended.cell)}. ${SEEDS[intended.seed].effect}`;
}
export function practicePuzzle(index = 0) { return makePuzzle('practice', 0, `offline-practice-${index}`, `practice-v1-${index}`); }
