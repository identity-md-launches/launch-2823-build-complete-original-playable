/** Versioned deterministic puzzle engine. No network, clock or random scoring. */
export type Seed = 'willow' | 'pine' | 'glowcap';
export type Terrain = 'soil' | 'pond' | 'stump' | 'rock';
export interface Plant { cell: number; seed: Seed }
export interface Puzzle {
  id: string; name: string; mode: 'verified' | 'practice'; milestone: number;
  entropy: string; terrain: Terrain[]; spirits: number[]; solution: Plant[]; version: 1;
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
export function makePuzzle(mode: 'verified' | 'practice', milestone: number, entropy: string, key: string): Puzzle {
  const random = rng(hash(`seedkeeper-v1|${mode}|${milestone}|${entropy}|${key}`));
  const rotation = Math.floor(random() * 4), mirror = random() > .5;
  const tx = (i: number) => transform(i, rotation, mirror);
  const terrain: Terrain[] = Array(25).fill('soil');
  [1, 20].forEach(i => terrain[tx(i)] = 'pond');
  terrain[tx(21)] = 'stump';
  const solution: Plant[] = [{ cell: tx(6), seed: 'willow' }, { cell: tx(18), seed: 'pine' }, { cell: tx(12), seed: 'glowcap' }, { cell: tx(16), seed: 'glowcap' }];
  const names = ['Firefly hollow', 'Moonwater crossing', 'The sleeping glade', 'Whispering roots', 'Lanternwood', 'Mosslight meadow', 'The emerald hush', 'Little fern haven'];
  const spirits = [tx([8, 13, 7][Math.floor(random() * 3)]), tx([22, 15, 10][Math.floor(random() * 3)]), tx([11, 17, 12][Math.floor(random() * 3)])];
  const empty = terrain.map((t, i) => t === 'soil' && !solution.some(x => x.cell === i) && !spirits.includes(i) ? i : -1).filter(i => i >= 0);
  for (let n = 0; n < 3; n++) { const k = Math.floor(random() * empty.length); terrain[empty.splice(k, 1)[0]] = 'rock'; }
  return { id: key, mode, milestone, entropy, terrain, spirits, solution, name: names[Math.floor(random() * names.length)], version: 1 };
}
export function hint(p: Puzzle, plants: Plant[]): string {
  const intended = p.solution.find(x => !plants.some(y => x.cell === y.cell && x.seed === y.seed));
  if (!intended) return 'Every spirit is within reach. Check the glowing tiles.';
  if (plants.some(x => !p.solution.some(y => y.cell === x.cell && y.seed === x.seed))) return `One known route uses Willow ${coord(p.solution[0].cell)}, Sunpine ${coord(p.solution[1].cell)}, then Glowcaps ${coord(p.solution[2].cell)} and ${coord(p.solution[3].cell)}. Undo other plantings to follow it.`;
  return `Try ${SEEDS[intended.seed].name} at ${coord(intended.cell)}. ${SEEDS[intended.seed].effect}`;
}
export function practicePuzzle(index = 0) { return makePuzzle('practice', 0, `offline-practice-${index}`, `practice-v1-${index}`); }
