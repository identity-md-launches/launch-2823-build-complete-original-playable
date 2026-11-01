# Validation record

These are the results of checks I actually ran on the final source and the committed `dist/` export on 2026-11-01. I made no changes after this run except to documentation. Node 24.21.0, npm, Playwright 1.64.1.

| Command | Result |
| --- | --- |
| `npm ci` | Installed from the committed lockfile |
| `npm test` | 27 tests, 27 pass, 0 fail (exit 0) |
| `npm run typecheck` (`tsc --noEmit`) | Exit 0, no errors |
| `npm run build` | Built in under 1 s: `index.html` 1.16 kB, JS 266 kB (84 kB gzip), CSS 28 kB, two font files |
| `npm run check:export` | Relative asset URLs: yes. Metadata: yes. Export plus public files well inside the 8 MiB budget |
| `SEEDKEEPER_BROWSER=chromium npm run test:browser` | Chromium 156.0.8078.4: 28 checks pass, 0 failures, 0 runtime exceptions, 0 missing local resources |
| `npm run test:browser` (WebKit) | **Did not run.** `npx playwright install webkit` stopped because the host lacks WebKit's system libraries |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 16 of 16 checks pass at 320, 390 and 1440 wide |

## Unit tests (`npm test`)

The tests live in `test/data.test.ts`, `test/game.test.ts` and `test/storage.test.ts`, and they use the captured API response in `test/fixtures/core.json`.

- **Data (7):** captured evidence passes validation. Each of these is rejected: HTTP 200 with `status: unavailable`, an unknown schema, the wrong network, too few confirmations, malformed hashes, unsafe event blocks, future timestamps and conflicting event evidence. Height arithmetic goes through BigInt. Growth counts the 60- and 1,200-block boundaries that were crossed. The safe-frontier watchdog rejects a frontier that stops advancing and resets once it advances again.
- **Engine (11):**
  - 500 generated puzzles are deterministic. Each has 2 ponds, 1 old tree and 3 spirits on soil, and a stored route of 4–6 plantings that is legal step by step through `placementError` and scores exactly what the scoring rules give.
  - 200 puzzles give 200 distinct layouts and at least 10 different pond/old-tree spacings.
  - For 6 sample puzzles, a separate search that uses only the player-facing rules finds a route of the stored length and **no shorter route**.
  - The solver returns `null` for an unsolvable layout.
  - The placement rules (water, shade, dry soil, willow beside a pond), the stock and move limits, scoring of real choices (completion bonus only when solved) and hints (a legal next step, plus recovery when off-route) all behave as specified.
- **Storage (9):**
  - Milestones unlock only when observed. Backward readings are rejected. A different deployment gets its own archive. Best scores don't grow by replaying. Corrupt saves and failing storage are handled. Snapshots are capped at 100. Saved plantings are re-checked against the puzzle on load. 125 unlocked groves stay replayable.
  - **One milestone is one grid:** visitors who first observed milestone 1,200 at heights 1201 and 1255, with different hashes, get the same puzzle (`test/storage.test.ts:43`).
  - **Polling updates the current visit in place:** after an earlier visit and 150 polls, memory still holds both visits, and only the current one has changed (`test/storage.test.ts:57`).

## Browser checks (`scripts/validate-browser.mjs`, Chromium 156)

The script serves `dist/` under `/preview/`, which simulates a gateway subpath, and routes `https://api.squeekchain.com/v1/core` to fixture data or to failures. Service workers are blocked except in the offline check. It ran at 1440×1024, 390×844, 320, and 760.

1. A valid fixture unlocks a LIVE grove at the observed milestone.
2. An invalid planting explains the rule and doesn't use up a move.
3. A full playthrough wakes 3 spirits and earns the exact route score: 440 points with 4 plantings.
4. After a verified win, when there is no unplayed verified grove, the only next action is labelled "Try a practice grove".
5. Undo returns the seed to the satchel, and reload keeps the in-progress board and the best score.
6. Replaying keeps the highest score and doesn't add up points across replays.
7. The field guide dialog opens, Escape closes it, and focus returns to the button that opened it.
8. A return visit at the same height shows zero growth, and the snapshot table shows the observed evidence.
9. The forest-snapshot JSON export downloads.
10. **Network failure (aborted request):** cached evidence is labelled STALE and the save stays playable.
11. Repeated refreshes within one page load update that visit in place. Two page loads keep exactly two snapshots.
12. After a verified win, "Open next verified grove" opens the unplayed LIVE grove, not practice.
13. A newly confirmed milestone unlocks another puzzle, and the journal replays the earlier grove.
14. **HTTP 503 with no cache:** the connection shows OFFLINE and the puzzle is labelled PRACTICE.
15. A touch-sized mobile practice playthrough scores correctly and adds no blockchain observations.
16. No horizontal overflow at 320, 390, 760 or 1440. The seed controls are on the first screen at 390×844.
17. The field guide button keeps its accessible name in the icon-only 320 px header.
18. After six plantings without restoring the grove, the game explains how to recover, and undo and restart still work.
19. Arrow keys and Enter plant on the board.
20. The mobile hint control suggests a legal planting.
21. **Invalid payload (HTTP 200, `status: unavailable`):** rejected with a visible error and no invented height.
22. **Invalid schema (wrong chain ID):** rejected with an error that says what to do.
23. A return visit computes exactly which tree and grove boundaries were crossed (27 blocks, 1 tree, 1 grove).
24. Memory, journal and expanded hash evidence reflow without overflow at 320, 390 and 1440.
25. **Browser offline (`context.setOffline`):** the cached static shell reloads, shows STALE, and practice stays playable.
26. When storage is full, the game shows an honest alert and keeps playing in memory.
27. No runtime exceptions and no missing local resources under the gateway subpath.
28. **Reviewer reproduction:** two fresh visitors whose first readings are heights 1201 and 1255 both see "Block milestone 1,200" with the same rendered grid (`Firefly hollow`: `soil,stump,soil,soil,soil,soil,soil,soil,pond,rock,soil,soil,soil,soil,soil,soil,soil,soil,soil,soil,rock,rock,soil,pond,soil`, spirits on tiles 0, 2 and 22).

API failure states not exercised in the browser:

- **12-second timeout:** the `AbortController` path in `src/App.tsx` was not run automatically, because it would add 12 s of waiting. It produces the same STALE/OFFLINE transition as check 10.
- **Regressing frontier:** covered by unit tests (`test/data.test.ts` watchdog, `test/storage.test.ts` backward readings), not by a browser run.

## Design review (Better Interface, six domains)

I used the pinned guide while building. This revision changed the win actions and the evidence wording, so I reviewed them again:

| Domain | Coverage | Findings and outcome |
| --- | --- | --- |
| Accessibility | Probe: contrast, targets (41 controls, all ≥24 px or spaced). Browser: keyboard board, dialog focus return, accessible names at 320 | No failures |
| Layout | Probe: no overflow at 320/390/1440. Screenshots: 390 first screen, 390 win state | First screen at 390 shows the title, board, objective and seed satchel. The two win buttons stack full width below 760 px (`src/styles.css:304`) |
| Writing | Probe: copy budget (15 prose words on the first screen at 390), no slogans or repeats | **Fixed:** after a verified win, the only button said "Play another grove" but opened practice. It now says "Try a practice grove", and "Open next verified grove" leads when one is unplayed (`src/App.tsx:182`). **Fixed:** the evidence panel claimed puzzles were "anchored" to observed evidence. It now says the grove comes from the milestone and deployment identity (`src/App.tsx:199`) |
| Typography | Probe: 3 sizes at 390, 2 families, no all-caps or tracked eyebrows | No failures |
| Colors | Probe: all measured text meets 4.5:1 (3:1 large) | No failures. The secondary win button uses the existing outlined style, so the filled accent stays on one action |
| UI | Probe: no stacked border+shadow, no nested cards, no gradient text, motion respects reduced motion | No failures |

Limitations:

- In the headless container, `✦` after the title (`src/App.tsx:130`) and the `⌁` shade marker (`src/App.tsx:167`) render as empty boxes: the container has no font with those glyphs. Both are decorative and `aria-hidden`; shade is also announced in each tile's accessible name. I did not check rendering on real phones.
- No measurements on real devices or Safari/WebKit.
- The browser checks ran headless only.
