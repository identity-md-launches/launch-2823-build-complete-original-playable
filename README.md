# SQUEEKFOREST: SEEDKEEPER

A complete browser positioning game in a moonlit pixel forest. Plant Willows, Sunpines and Glowcaps to wake three forest spirits with six plantings or fewer. Settled Squeekchain blocks unlock reproducible groves; local practice works without the API.

This is a new React/TypeScript/Vite implementation, including original game logic, canvas artwork and SVG sprites. It acknowledges [SQUEEKFOREST](https://github.com/Peymanworship/squeekforest), created by [@AhoteSpirit](https://x.com/AhoteSpirit), as its concept and visual reference. The original site is not the source of this implementation. No original source or artwork was copied.

Independent community project. No wallet, transactions, payments, gambling or token rewards. Local points have no financial value. No official endorsement or guaranteed Genesis approval is claimed.

## Run and rebuild

Use Node **22.18 or newer** and npm. The lockfile is included.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. To rebuild and inspect the exact production export:

```sh
npm run typecheck
npm run build
npm run preview
```

`dist/index.html`, its assets, the share image, favicon, font license and generated `sw.js` are delivered alongside the source. The export uses relative asset URLs (`base: './'`) and one page, so no route rewrites are needed. Serve the whole `dist/` directory at a static host or gateway subpath. Do not open `index.html` through `file://`.

There is no backend, private credential, `.env` requirement, wallet dependency, analytics service or remote font/CDN dependency. The only runtime data request is the public SqueekCore HTTPS API. HTTPS (or localhost) and service-worker support enable offline reload after the first successful asset load; gateways can disable service workers. API-offline practice still works in any already open tab.

## Play

1. Select a seed in the satchel, then a marked soil tile.
2. Build water and shade for Glowcaps. Diagonal neighbors count.
3. Light all three spirits. Undo, restart and hints are free.
4. Save plantings to earn more points. Replays preserve the best score instead of farming points.

| Seed | Placement | Effect |
| --- | --- | --- |
| Willow | Beside a pond; away from planted pines | Waters all eight neighbors |
| Sunpine | Dry soil, away from ponds and willows | Shades all eight neighbors |
| Glowcap | Soil with both water and shade | Wakes spirits on its own tile and all eight neighbors |

You have two of each seed and at most six valid plantings. Ponds provide natural water; old trees provide shade. Invalid moves cost nothing. Full instructions, keyboard controls and scoring are in the in-game **Field guide** and [game instructions](artifacts/GAME_GUIDE.md).

## Live data and forest memory

`GET https://api.squeekchain.com/v1/core` is the sole data source. The app validates the supported schema, network, numeric bounds, settlement hashes, safe frontier and block-unit arithmetic before using a height. Verification means validation of the documented public API, not an independent Ethereum proof. Connection badges say **LIVE**, **STALE**, or **OFFLINE**. A fixed-seed puzzle always says **PRACTICE**, even if the connection is live.

The first reading unlocks the current 60-block milestone. A later observed confirmed milestone unlocks another puzzle. Each unlock retains its first height/hash evidence; later refreshes cannot change it. Previously unlocked puzzles remain replayable in the Grove journal. Missed milestones and missing historical measurements are never invented.

One additional visual growth tree appears every **60 settled Squeek blocks**; a new grove begins every **1,200**. Forest memory compares the last locally recorded observation from the previous page visit with the current observation, only within the same deployment and a non-regressing frontier. The latest 100 verified snapshots are kept; the latest 20 are displayed and all retained snapshots can be exported as JSON. Puzzle anchors and best scores are retained separately. Practice creates no verified snapshots or blockchain unlocks.

See [data sources and verification](artifacts/DATA_SOURCES.md) for the complete rules and trust limits.

## Check the implementation

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium webkit
npm run test:browser
npm run check:export
```

Playwright also needs its platform's browser system libraries. A Chromium-only run is available with `SEEDKEEPER_BROWSER=chromium npm run test:browser`. The script serves the production export beneath `/preview/`, validates real interactions, and writes temporary results to `test/scratch/browser-validation/`. Those scratch files are not part of the submitted source.

Actual build, test and review outcomes are recorded in [validation](artifacts/validation.md), with preserved machine-readable results and selected screenshots. Tests use a captured API fixture, clearly isolated under `test/fixtures/`; fixture mutations never enter the runtime bundle. The live endpoint was also checked separately in the browser.

The optional pinned design probe can be rerun where its assignment input is present:

```sh
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

That input is removed after the assignment. Its actual results are preserved in `artifacts/design-probe.json`. [DESIGN.md](DESIGN.md) documents the final tokens and components without requiring the input guides.

## Source map

- `src/game.ts`: versioned generator, placement rules, environment, hints and deterministic scoring.
- `src/data.ts`: public API validation, freshness and exact growth comparisons.
- `src/storage.ts`: local snapshots, puzzle anchors, legal save restoration and best scores.
- `src/App.tsx`: complete game, journal, memory, field guide, data evidence and state handling.
- `src/components/`: newly drawn pixel sprites and procedural canvas forest.
- `src/styles.css`: responsive design tokens, game states and accessibility treatments.
- `vite.config.ts`: relative static export and content-versioned offline shell generation.
- `test/` and `scripts/`: reproducible engine, data, persistence, export and browser validation.

## Delivery status

The implementation, source, lockfile and production export are prepared for the assignment's Git submission bundle. A hosted site alone would not fulfill this brief. **A new public source repository, linked pull request and final IMD site URL have not been produced or verified in this session.** No repository publishing connector or GitHub CLI is available. The job's post-submission publishing step can serve the delivered export, but this README does not claim that publication already happened. [Delivery record](artifacts/DELIVERY.md) and [ready PR description](artifacts/PULL_REQUEST.md) make that remaining work explicit.

## Rights and attribution

The new implementation is licensed under [MIT](LICENSE). This does not relicense the original SQUEEKFOREST. Silkscreen is under the SIL Open Font License. See [third-party notices](artifacts/THIRD_PARTY.md).
