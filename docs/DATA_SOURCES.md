# Data sources and verification

## Source

The game makes one runtime request: a read-only `GET https://api.squeekchain.com/v1/core`, the documented SqueekCore public API (<https://docs.squeekchain.com/developers/api/>). It is sent without credentials and with `cache: no-store`, and it times out after 12 seconds. There is no wallet, transaction, key or backend. `test/fixtures/core.json` is a captured response used only by tests; it is never bundled.

## What "verified" means

`validateCore` in `src/data.ts` accepts a response only if all of the following hold:

- `schemaVersion` is 1 and `status` is `available`.
- The chain is Sepolia (`chainId` 11155111) with at least 12 confirmations.
- Settlement block ≤ safe block ≤ indexed block.
- Every number is a canonical decimal string within the safe-integer range.
- `cumulativeBlockUnits` equals `blockHeight × 10⁹ + blockProgress`, and progress is below 10⁹.
- The block hash, transaction hash and core address are well-formed and not zero.
- The settlement timestamp is not in the future.
- Any listed event that matches the source transaction agrees on its block.

Responses that a cache marks as older than 30 s, or as `durable-cache` or `unavailable`, are rejected. This checks the documented API's evidence. It is not an independent Ethereum proof.

## Status labels

| Label | Meaning |
| --- | --- |
| LIVE | The most recent reading passed validation within the last 90 seconds, and the safe frontier has advanced within the last 3 minutes |
| STALE | An earlier verified reading is shown, but the latest check failed, aged out, or saw a frontier that stalled or moved backward |
| OFFLINE | No verified reading exists in this browser |
| PRACTICE | The current puzzle comes from a fixed practice seed. No blockchain data powers it, whatever the connection shows |

## Puzzles from blocks

- The first verified reading unlocks the 60-block milestone it falls in, `floor(height / 60) × 60`. Later readings unlock each new milestone they observe. Milestones that were never observed are not filled in.
- The grove for a milestone is generated only from values every visitor shares: the milestone number, the deployment identity (`installationId:coreAddress`) and the grove ID. Two players who first reach milestone 1,200 at heights 1201 and 1255 get the same board.
- The reading that unlocked a grove is kept in the journal as a record of when it unlocked. It does not affect the puzzle.

## Forest memory

- One snapshot is recorded per page load. The 30-second poll and manual refreshes update that snapshot in place, so a long-open tab doesn't push out earlier visits. Up to 100 visits are kept in `localStorage`.
- "Since your previous recorded visit" compares the last snapshot from an earlier page load with the current reading, only for the same deployment and only when the frontier hasn't regressed. It shows the extra blocks, trees and groves.
- Growth rule: one growth tree every 60 settled blocks, and a new grove every 1,200.
- History that wasn't observed is never estimated. Snapshots can be exported as JSON.
- Local data can be changed or cleared by the browser, so it is not a public attestation.
