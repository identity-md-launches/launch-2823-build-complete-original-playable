export const API_URL = 'https://api.squeekchain.com/v1/core';
export const API_DOCS = 'https://docs.squeekchain.com/developers/api/';
export const FRESH_MS = 90_000;
export const FRONTIER_STALE_MS = 180_000;
export interface Snapshot {
  height: number; checkedAt: number; safeBlock: number; sourceBlock: number;
  blockHash: string; transactionHash: string; sourceTimestamp: number;
  coreAddress: string; installation: string; round: number; paused: boolean;
}
export type FeedStatus = 'LIVE' | 'STALE' | 'OFFLINE';
export interface Feed { status: FeedStatus; snapshot: Snapshot | null; error: string | null; fetching: boolean }
const object = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('The public API returned an invalid object.');
  return x as Record<string, unknown>;
};
function uint(x: unknown, field: string): number {
  if (typeof x !== 'string' || !/^(0|[1-9]\d*)$/.test(x) || BigInt(x) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`The API returned an invalid ${field}.`);
  return Number(x);
}
function hex(x: unknown, size: number, field: string): string {
  if (typeof x !== 'string' || !new RegExp(`^0x[0-9a-fA-F]{${size}}$`).test(x) || /^0x0+$/.test(x)) throw new Error(`The API returned invalid ${field} evidence.`);
  return x.toLowerCase();
}
/** Verifies the documented API's settlement evidence, not an independent Ethereum proof. */
export function validateCore(raw: unknown, now = Date.now()): Snapshot {
  const d = object(raw);
  if (d.schemaVersion !== 1) throw new Error('Unsupported API schema. Retry after the service is updated.');
  if (d.status !== 'available') throw new Error('The public API reports settlement data unavailable.');
  const chain = object(d.chain), core = object(d.core), identities = object(d.identities), source = object(d.source);
  if (chain.target !== 'sepolia' || chain.chainId !== '11155111') throw new Error('Unexpected network. Expected Squeekchain on Sepolia.');
  if (uint(chain.confirmations, 'confirmations') < 12) throw new Error('The settlement evidence has fewer than 12 confirmations.');
  const safeBlock = uint(chain.safeThroughBlock, 'safe Ethereum block');
  const indexed = uint(chain.indexedThroughBlock, 'indexed Ethereum block');
  const sourceBlock = uint(source.blockNumber, 'settlement Ethereum block');
  if (sourceBlock > safeBlock || safeBlock > indexed) throw new Error('The settlement evidence is beyond the safe chain frontier.');
  if (typeof d.installationId !== 'string' || d.installationId.length < 1 || d.installationId.length > 160) throw new Error('Missing deployment identity.');
  if (typeof core.paused !== 'boolean') throw new Error('Missing settlement pause state.');
  const height = uint(core.blockHeight, 'Squeek height');
  const progress = uint(core.blockProgress, 'block progress');
  if (typeof core.cumulativeBlockUnits !== 'string' || !/^\d+$/.test(core.cumulativeBlockUnits) || progress >= 1e9 || BigInt(core.cumulativeBlockUnits) !== BigInt(height) * 1_000_000_000n + BigInt(progress)) throw new Error('The settled block units do not match the reported height.');
  const sourceTimestamp = uint(source.blockTimestamp, 'settlement time') * 1000;
  if (sourceTimestamp > now + 60_000 || sourceTimestamp < 1_600_000_000_000) throw new Error('The settlement timestamp is invalid.');
  if (typeof source.eventName !== 'string' || !source.eventName) throw new Error('Missing settled event name.');
  const blockHash = hex(source.blockHash, 64, 'block hash'), transactionHash = hex(source.transactionHash, 64, 'transaction hash');
  const coreAddress = hex(identities.core, 40, 'core identity');
  // The newest matching event, when included, must agree with the source evidence.
  if (d.events !== undefined) {
    if (!Array.isArray(d.events)) throw new Error('Invalid settlement event list.');
    for (const item of d.events) {
      const e = object(item);
      if (e.transactionHash === source.transactionHash && e.logIndex === source.logIndex && (e.blockHash !== source.blockHash || e.blockNumber !== source.blockNumber)) throw new Error('Conflicting settlement event evidence.');
    }
  }
  return { height, checkedAt: now, safeBlock, sourceBlock, blockHash, transactionHash, sourceTimestamp, coreAddress, installation: d.installationId, round: uint(core.settledThroughRound, 'settled round'), paused: core.paused };
}
export function deploymentKey(s: Snapshot) { return `${s.installation}:${s.coreAddress}`; }
export function comparable(a: Snapshot, b: Snapshot) { return deploymentKey(a) === deploymentKey(b); }
export interface FrontierWatch { identity: string; block: number; advancedAt: number }
export function watchFrontier(previous: FrontierWatch | null, snapshot: Snapshot): FrontierWatch {
  const identity = deploymentKey(snapshot);
  if (!previous || previous.identity !== identity || snapshot.safeBlock > previous.block) return { identity, block: snapshot.safeBlock, advancedAt: snapshot.checkedAt };
  if (snapshot.safeBlock < previous.block) throw new Error('The safe Ethereum frontier moved backward. Retaining the previous verified observation.');
  if (snapshot.checkedAt - previous.advancedAt > FRONTIER_STALE_MS) throw new Error('The safe Ethereum frontier has not advanced for 3 minutes. Retaining the last verified observation.');
  return previous;
}
export function growth(previous: Snapshot | null, current: Snapshot | null) {
  if (!previous || !current || !comparable(previous, current) || current.height < previous.height || current.safeBlock < previous.safeBlock) return null;
  return { blocks: current.height - previous.height, trees: Math.floor(current.height / 60) - Math.floor(previous.height / 60), groves: Math.floor(current.height / 1200) - Math.floor(previous.height / 1200) };
}
export async function fetchCore(signal?: AbortSignal): Promise<Snapshot> {
  const res = await fetch(API_URL, { signal, cache: 'no-store', headers: { Accept: 'application/json' }, credentials: 'omit' });
  if (!res.ok) throw new Error(`Public API returned HTTP ${res.status}. Retry or play practice.`);
  const age = Number(res.headers.get('Age') || '0');
  const served = res.headers.get('X-Squeek-Settlement-Source');
  if (age > 30 || served === 'durable-cache' || served === 'unavailable') throw new Error('The public API returned cached or unavailable settlement evidence.');
  return validateCore(await res.json());
}
