import { comparable, deploymentKey, type Snapshot } from './data';
import { makePuzzle, placementError, score, type Plant, type Puzzle, type Seed } from './game';
export const STORAGE_KEY = 'squeekforest-seedkeeper-v1';
export interface ArchiveEntry { milestone: number; evidence: Snapshot; id: string }
export interface SavedGame { plants: Plant[]; best: number }
export interface Memory { version: 1; snapshots: Snapshot[]; archive: ArchiveEntry[]; games: Record<string, SavedGame>; active: string; practiceIndex: number }
export const emptyMemory = (): Memory => ({ version: 1, snapshots: [], archive: [], games: {}, active: '', practiceIndex: 0 });
function isSnapshot(x: unknown): x is Snapshot {
  if (!x || typeof x !== 'object') return false;
  const s = x as Snapshot;
  return [s.height, s.safeBlock, s.sourceBlock, s.checkedAt, s.sourceTimestamp, s.round].every(n => Number.isSafeInteger(n) && n >= 0) && s.sourceBlock <= s.safeBlock && s.sourceTimestamp <= s.checkedAt + 60_000 && /^0x[0-9a-f]{64}$/.test(s.blockHash) && /^0x[0-9a-f]{64}$/.test(s.transactionHash) && /^0x[0-9a-f]{40}$/.test(s.coreAddress) && typeof s.installation === 'string' && typeof s.paused === 'boolean';
}
export function loadMemory(storage: Pick<Storage, 'getItem'> = localStorage): { memory: Memory; error: string | null } {
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return { memory: emptyMemory(), error: null };
    if (text.length > 8_000_000) throw new Error('Oversized save');
    const raw = JSON.parse(text);
    if (raw.version !== 1 || !Array.isArray(raw.snapshots) || !Array.isArray(raw.archive) || !raw.games || typeof raw.games !== 'object') throw new Error('Invalid save');
    const snapshots = raw.snapshots.filter(isSnapshot).slice(-100);
    const archive: ArchiveEntry[] = raw.archive.filter((e: ArchiveEntry) => e && isSnapshot(e.evidence) && Number.isSafeInteger(e.milestone) && e.milestone >= 0 && e.milestone % 60 === 0 && e.milestone <= e.evidence.height && e.id === `verified-v1:${deploymentKey(e.evidence)}:${e.milestone}`);
    const games: Record<string, SavedGame> = {};
    for (const [id, g] of Object.entries(raw.games)) {
      const game = g as SavedGame;
      if (game && Array.isArray(game.plants) && game.plants.length <= 6 && game.plants.every(p => Number.isInteger(p.cell) && p.cell >= 0 && p.cell < 25 && ['willow', 'pine', 'glowcap'].includes(p.seed as Seed)) && Number.isSafeInteger(game.best) && game.best >= 0 && game.best <= 600) games[id] = game;
    }
    return { memory: { version: 1, snapshots, archive, games, active: typeof raw.active === 'string' ? raw.active : '', practiceIndex: Number.isSafeInteger(raw.practiceIndex) && raw.practiceIndex >= 0 && raw.practiceIndex < 10000 ? raw.practiceIndex : 0 }, error: null };
  } catch { return { memory: emptyMemory(), error: 'Saved progress could not be read. This session still works; local history is unavailable.' }; }
}
export function saveMemory(memory: Memory, storage: Pick<Storage, 'setItem'> = localStorage): string | null {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(memory)); return null; }
  catch { return 'This browser could not save progress. Keep this tab open to continue this session.'; }
}
export function recordSnapshot(memory: Memory, snapshot: Snapshot): Memory {
  const last = memory.snapshots.at(-1);
  if (last && comparable(last, snapshot) && (snapshot.height < last.height || snapshot.safeBlock < last.safeBlock)) return memory;
  const milestone = Math.floor(snapshot.height / 60) * 60;
  const id = `verified-v1:${deploymentKey(snapshot)}:${milestone}`;
  // Every observed milestone is anchored once. Never invent a measurement for missed milestones.
  const archive = memory.archive.some(e => e.id === id) ? memory.archive : [...memory.archive, { milestone, evidence: snapshot, id }];
  const snapshots = [...memory.snapshots, snapshot].slice(-100);
  return { ...memory, snapshots, archive };
}
export function archivedPuzzle(entry: ArchiveEntry): Puzzle {
  return makePuzzle('verified', entry.milestone, `${entry.evidence.height}|${entry.evidence.blockHash}|${entry.evidence.transactionHash}`, entry.id);
}
export function validPlants(puzzle: Puzzle, plants: Plant[]): Plant[] {
  const accepted: Plant[] = [];
  for (const p of plants) { if (placementError(puzzle, accepted, p.cell, p.seed)) break; accepted.push(p); }
  return accepted;
}
export function completeGame(memory: Memory, puzzle: Puzzle, plants: Plant[]): Memory {
  const result = score(puzzle, plants);
  const best = result.spirits === puzzle.spirits.length * 100 ? Math.max(result.total, memory.games[puzzle.id]?.best ?? 0) : memory.games[puzzle.id]?.best ?? 0;
  return { ...memory, active: puzzle.id, games: { ...memory.games, [puzzle.id]: { plants, best } } };
}
