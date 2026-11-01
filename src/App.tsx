import { useCallback, useEffect, useRef, useState } from 'react';
import { ADJACENCY, coord, environment, hint, LIMIT, litSpirits, placementError, practicePuzzle, score, SEEDS, STOCK, type Plant, type Puzzle, type Seed } from './game';
import { API_DOCS, API_URL, comparable, deploymentKey, fetchCore, FRESH_MS, growth, watchFrontier, type Feed, type FrontierWatch, type Snapshot } from './data';
import { archivedPuzzle, completeGame, emptyMemory, loadMemory, recordSnapshot, saveMemory, validPlants, type Memory } from './storage';
import { Forest } from './components/Forest';
import { Icon, Pixel } from './components/Pixel';
const nf = (n: number) => n.toLocaleString('en-US');
const date = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
function readInitial() { try { return loadMemory(); } catch { return { memory: emptyMemory(), error: 'Local storage is unavailable. Progress stays in this tab.' }; } }
function choosePuzzle(m: Memory): Puzzle {
  const current = m.archive.find(e => e.id === m.active);
  return current ? archivedPuzzle(current) : practicePuzzle(m.practiceIndex);
}
export default function App() {
  const [initial] = useState(readInitial);
  const [memory, setMemory] = useState(initial.memory);
  const memoryRef = useRef(memory); memoryRef.current = memory;
  const [storageError, setStorageError] = useState<string | null>(initial.error);
  const previousVisit = useRef<Snapshot | null>(initial.memory.snapshots.at(-1) ?? null);
  const lastSaved = initial.memory.snapshots.at(-1);
  const frontier = useRef<FrontierWatch | null>(lastSaved ? { identity: deploymentKey(lastSaved), block: lastSaved.safeBlock, advancedAt: lastSaved.checkedAt } : null);
  const [feed, setFeed] = useState<Feed>({ status: initial.memory.snapshots.length ? 'STALE' : 'OFFLINE', snapshot: initial.memory.snapshots.at(-1) ?? null, error: null, fetching: true });
  const feedRef = useRef(feed); feedRef.current = feed;
  const [puzzle, setPuzzle] = useState(() => choosePuzzle(initial.memory));
  const [plants, setPlants] = useState<Plant[]>(() => { const p = choosePuzzle(initial.memory); return validPlants(p, initial.memory.games[p.id]?.plants ?? []); });
  const [selected, setSelected] = useState<Seed>('willow');
  const [message, setMessage] = useState('Choose a seed, then a marked soil tile.');
  const [tab, setTab] = useState<'grove' | 'memory' | 'archive'>('grove');
  const [paused, setPaused] = useState(false);
  const [focusCell, setFocusCell] = useState(0);
  const [showTiles, setShowTiles] = useState(true);
  const [help, setHelp] = useState(false);
  const [details, setDetails] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const recordedThisLoad = useRef(false);
  const starterUnchanged = useRef(!initial.memory.active && !initial.memory.archive.length);
  const persist = useCallback((m: Memory) => {
    memoryRef.current = m; setMemory(m);
    try { const error = saveMemory(m); if (error) setStorageError(error); } catch { setStorageError('Local storage is unavailable. Progress stays in this tab.'); }
  }, []);
  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    setFeed(f => ({ ...f, fetching: true }));
    try {
      const snap = await fetchCore(controller.signal);
      const last = feedRef.current.snapshot;
      if (last && comparable(last, snap) && (snap.height < last.height || snap.safeBlock < last.safeBlock)) throw new Error('The settlement frontier moved backward. Cached progress is retained; retry verification.');
      frontier.current = watchFrontier(frontier.current, snap);
      setFeed({ status: 'LIVE', snapshot: snap, error: null, fetching: false });
      const before = memoryRef.current, updated = recordSnapshot(before, snap, recordedThisLoad.current);
      if (updated.snapshots !== before.snapshots) recordedThisLoad.current = true;
      persist(updated);
      if (starterUnchanged.current) {
        const newest = updated.archive.at(-1);
        if (newest) { const next = archivedPuzzle(newest); setPuzzle(next); setPlants([]); persist({ ...updated, active: next.id }); setMessage('A verified grove is ready. Choose a seed to begin.'); }
        starterUnchanged.current = false;
      }
    } catch (e) {
      setFeed(f => ({ ...f, fetching: false, status: f.snapshot ? 'STALE' : 'OFFLINE', error: controller.signal.aborted ? 'The API did not respond in 12 seconds. Retry or keep playing practice.' : e instanceof Error ? e.message : 'The public API could not be reached. Retry or play practice.' }));
    } finally { clearTimeout(timer); busy.current = false; }
  }, [persist]);
  useEffect(() => {
    void sync();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, 30_000);
    const freshness = setInterval(() => setFeed(f => f.status === 'LIVE' && f.snapshot && Date.now() - f.snapshot.checkedAt > FRESH_MS ? { ...f, status: 'STALE', error: 'Verification is older than 90 seconds. Refresh to check the public API.' } : f), 5000);
    const online = () => void sync();
    const offline = () => setFeed(f => ({ ...f, status: f.snapshot ? 'STALE' : 'OFFLINE', error: 'This browser is offline. Cached groves and practice still work.' }));
    addEventListener('online', online); addEventListener('offline', offline);
    return () => { clearInterval(timer); clearInterval(freshness); removeEventListener('online', online); removeEventListener('offline', offline); };
  }, [sync]);
  useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close(); }, [help]);
  const awake = litSpirits(puzzle, plants);
  const won = awake.length === puzzle.spirits.length;
  const exhausted = plants.length === LIMIT && !won;
  const points = score(puzzle, plants);
  const best = memory.games[puzzle.id]?.best ?? 0;
  const snapshot = feed.snapshot;
  const delta = growth(previousVisit.current, snapshot);
  const newest = memory.archive.at(-1);
  const puzzleEvidence = memory.archive.find(e => e.id === puzzle.id)?.evidence;
  const replaying = puzzle.mode === 'verified' && newest && newest.id !== puzzle.id;
  const status = puzzle.mode === 'practice' ? 'PRACTICE' : feed.status;
  const verifiedTotal = memory.archive.reduce((sum, e) => sum + (memory.games[e.id]?.best ?? 0), 0);
  const unplayed = [...memory.archive].reverse().find(e => e.id !== puzzle.id && !memory.games[e.id]?.best);
  const practiceTotal = Object.entries(memory.games).filter(([k]) => k.startsWith('practice-')).reduce((sum, [, g]) => sum + g.best, 0);
  function openPuzzle(p: Puzzle) {
    starterUnchanged.current = false;
    setPuzzle(p); setPlants(validPlants(p, memoryRef.current.games[p.id]?.plants ?? [])); setSelected('willow'); setMessage('Choose a seed, then a marked soil tile.'); setTab('grove'); setFocusCell(0);
    persist({ ...memoryRef.current, active: p.id });
  }
  function updatePlants(next: Plant[]) { setPlants(next); persist(completeGame(memoryRef.current, puzzle, next)); }
  function plant(cell: number) {
    starterUnchanged.current = false;
    const error = placementError(puzzle, plants, cell, selected);
    if (error) { setMessage(error); return; }
    const next = [...plants, { cell, seed: selected }]; updatePlants(next);
    const lit = litSpirits(puzzle, next);
    setMessage(lit.length === puzzle.spirits.length ? 'All three spirits are awake. This grove is restored.' : `${SEEDS[selected].name} planted at ${coord(cell)}. ${SEEDS[selected].effect}`);
  }
  function undo() {
    if (!plants.length) return;
    const last = plants.at(-1)!; updatePlants(plants.slice(0, -1)); setMessage(`Removed ${SEEDS[last.seed].name} from ${coord(last.cell)}. Your seed is back in the satchel.`);
  }
  function restart() { updatePlants([]); setMessage('The grove is reset. Your best score is kept.'); }
  function tileKey(event: React.KeyboardEvent<HTMLButtonElement>, cell: number) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };
    if (event.key in offsets) { event.preventDefault(); const next = Math.max(0, Math.min(24, cell + offsets[event.key])); setFocusCell(next); document.getElementById(`tile-${next}`)?.focus(); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const next = event.key === 'Home' ? 0 : 24; setFocusCell(next); document.getElementById(`tile-${next}`)?.focus(); }
  }
  function nextPractice() { const index = (memoryRef.current.practiceIndex + 1) % 10000; persist({ ...memoryRef.current, practiceIndex: index }); openPuzzle(practicePuzzle(index)); }
  function downloadMemory() {
    const blob = new Blob([JSON.stringify({ game: 'SQUEEKFOREST: SEEDKEEPER', version: 1, exportedAt: new Date().toISOString(), snapshots: memory.snapshots, archive: memory.archive }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'squeekforest-memory.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <a className="skip" href="#game">Skip to game</a>
    <div className="scene" aria-hidden="true"><Forest trees={snapshot ? Math.floor(snapshot.height / 60) : null} paused={paused}/></div>
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" onClick={() => setTab('grove')} aria-label="Squeekforest home"><Pixel kind="sprout"/><span>Squeekforest</span></a>
        <div className="header-tools">
          <button className="icon-button motion-button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play firefly animation' : 'Pause firefly animation'} aria-pressed={paused}><Icon name={paused ? 'play' : 'pause'}/></button>
          <button className="help-button" aria-label="Field guide" onClick={() => setHelp(true)}><Icon name="book"/><span>Field guide</span></button>
        </div>
      </header>
      <div className="title-row"><div><h1>Seedkeeper<span className="title-star" aria-hidden="true">✦</span></h1><p>A moonlit puzzle. A little forest to restore.</p></div><div className="keeper-score"><Pixel kind="lantern"/><div><strong>{nf(verifiedTotal)}</strong><span>local forest points</span></div></div></div>
      <nav className="tabs" aria-label="Forest views">
        <button className={tab === 'grove' ? 'active' : ''} onClick={() => setTab('grove')} aria-current={tab === 'grove' ? 'page' : undefined}><Pixel kind="leaf"/>The grove</button>
        <button className={tab === 'memory' ? 'active' : ''} onClick={() => setTab('memory')} aria-current={tab === 'memory' ? 'page' : undefined}>Forest memory</button>
        <button className={tab === 'archive' ? 'active' : ''} onClick={() => setTab('archive')} aria-current={tab === 'archive' ? 'page' : undefined}>Grove journal<span className="journal-count">{memory.archive.length}</span></button>
      </nav>
      <main id="game" tabIndex={-1}>
        {tab === 'grove' && <>
          <div className="game-topline"><div className="grove-name"><h2>{puzzle.name}</h2><span>{puzzle.mode === 'practice' ? `Practice grove ${memory.practiceIndex + 1}` : `${replaying ? 'Replaying block' : 'Block'} milestone ${nf(puzzle.milestone)}`}</span></div><span className={`status ${status.toLowerCase()}`}><i/>{status}</span></div>
          <div className="game-layout">
            <aside className="mission">
              <div className="mission-icon"><Pixel kind="spirit" lit={won}/></div>
              <h3>Wake the forest</h3><p className="mission-copy">Bring a Glowcap’s light to every sleeping spirit.</p>
              <div className="mission-goal"><span><strong>{awake.length}</strong> / 3 spirits awake</span><div className="spirit-progress" aria-hidden="true">{puzzle.spirits.map(i => <Pixel key={i} kind="spirit" lit={awake.includes(i)}/>)}</div></div>
              <div className="move-summary"><span>Plantings left</span><strong>{LIMIT - plants.length}<span> / {LIMIT}</span></strong></div>
              <div className="move-dots" aria-hidden="true">{Array.from({ length: LIMIT }, (_, i) => <i key={i} className={i >= plants.length ? 'remaining' : ''}/>)}</div>
              <div className="score-summary"><span>Grove points</span><strong>{nf(points.total)}</strong></div><div className="best-score">Personal best <strong>{best || '—'}</strong></div>
              <button className="hint-button" onClick={() => setMessage(hint(puzzle, plants))}><Icon name="help"/>Find a little guidance</button>
              <p className="local-note">Points live in this browser. {puzzle.mode === 'practice' ? 'Practice is scored separately.' : 'Replays keep your highest score.'}</p>
            </aside>
            <div className="board-area">
              <div className="mobile-objective"><span><Pixel kind="spirit" lit={won}/><strong>{awake.length}/3</strong> spirits awake</span><span><strong>{LIMIT - plants.length}</strong> plantings left</span></div>
              <div className="board-frame">
                <div className="column-labels" aria-hidden="true">{['A', 'B', 'C', 'D', 'E'].map(x => <span key={x}>{x}</span>)}</div>
                <div className="row-labels" aria-hidden="true">{[1,2,3,4,5].map(x => <span key={x}>{x}</span>)}</div>
                <div className={`board ${won ? 'restored' : ''}`} role="group" aria-label="Five by five forest puzzle" aria-describedby="board-directions">
                  {puzzle.terrain.map((terrain, cell) => {
                    const planted = plants.find(x => x.cell === cell);
                    const spirit = puzzle.spirits.includes(cell);
                    const lit = awake.includes(cell);
                    const env = environment(puzzle, plants, cell);
                    const legal = !placementError(puzzle, plants, cell, selected);
                    return <button id={`tile-${cell}`} key={cell} tabIndex={focusCell === cell ? 0 : -1} className={`tile ${terrain} ${planted ? 'planted' : ''} ${env.water ? 'wet' : ''} ${env.shade ? 'shaded' : ''} ${showTiles && legal ? 'legal' : ''} ${lit ? 'illuminated' : ''}`} onFocus={() => setFocusCell(cell)} onKeyDown={e => tileKey(e, cell)} onClick={() => plant(cell)} aria-label={`${coord(cell)}, ${planted ? SEEDS[planted.seed].name : terrain === 'stump' ? 'old tree' : terrain}, ${env.water ? 'watered' : 'dry'}, ${env.shade ? 'shaded' : 'unshaded'}${spirit ? lit ? ', spirit awake' : ', sleeping spirit' : ''}${legal ? `, can plant ${SEEDS[selected].name}` : ''}`}>
                      {terrain !== 'soil' && <Pixel kind={terrain}/>}
                      {planted && <Pixel kind={planted.seed}/>}
                      {spirit && <Pixel kind="spirit" lit={lit} className={planted ? 'tile-spirit planted-spirit' : 'tile-spirit'}/>}
                      {!planted && terrain === 'soil' && <span className="soil-specks" aria-hidden="true"/>}
                      {terrain === 'soil' && <span className="environment" aria-hidden="true">{env.water && <span className="water-mark">·</span>}{env.shade && <span className="shade-mark">⌁</span>}</span>}
                    </button>;
                  })}
                </div>
              </div>
              <div className="board-caption"><span><span className="legal-key">+</span> Available soil</span><label><input type="checkbox" checked={showTiles} onChange={e => setShowTiles(e.target.checked)}/>Show planting hints</label></div>
              <div className="board-actions"><button onClick={undo} disabled={!plants.length}><Icon name="undo"/>Undo</button><button onClick={restart} disabled={!plants.length}><Icon name="reset"/>Restart</button><button className="mobile-hint" onClick={() => setMessage(hint(puzzle, plants))}><Icon name="help"/>Hint</button><span>{puzzle.mode === 'practice' ? 'Practice points' : 'Grove points'} <strong>{points.total}</strong></span></div>
            </div>
            <aside className="satchel">
              <div className="satchel-heading"><h3>Seed satchel</h3><span>2 of each</span></div>
              <div className="seed-options" role="group" aria-label="Choose a seed">{(Object.keys(SEEDS) as Seed[]).map(seed => { const left = STOCK[seed] - plants.filter(p => p.seed === seed).length; return <button key={seed} className={`seed-option ${selected === seed ? 'selected' : ''}`} aria-pressed={selected === seed} onClick={() => { setSelected(seed); setMessage(`${SEEDS[seed].name} selected. ${SEEDS[seed].rule}`); }}><Pixel kind={seed}/><span className="seed-text"><strong>{SEEDS[seed].name}</strong><span>{SEEDS[seed].short}</span></span><span className={`seed-stock ${left === 0 ? 'empty' : ''}`} aria-label={`${left} seeds left`}>{left}</span></button>; })}</div>
              <div className="seed-rule"><h4><Pixel kind={selected}/>{SEEDS[selected].name}</h4><p>{SEEDS[selected].rule}</p><p className="effect">{SEEDS[selected].effect}</p><span className="adjacency">Includes diagonal neighbors.</span></div>
              <p id="board-directions" className="directions">Select a seed, then select a soil tile. Keyboard: arrow keys to move, Enter to plant.</p>
            </aside>
          </div>
          <div className={`game-message ${won ? 'success' : exhausted ? 'warning' : ''}`} role="status"><Pixel kind={won ? 'lantern' : 'leaf'}/><div><strong>{won ? 'A little light, returned.' : exhausted ? 'The forest is still sleeping.' : 'One seed at a time.'}</strong><p>{message}</p>{won && <p className="score-breakdown">{points.spirits} spirit points + {points.saved} saved planting points + {points.diversity} seed variety points{best > points.total ? ` · Best remains ${best}` : ''}</p>}{exhausted && <p>Undo or restart to try another arrangement.</p>}</div>{won && <div className="message-actions">{puzzle.mode === 'verified' && unplayed && <button className="primary" onClick={() => openPuzzle(archivedPuzzle(unplayed))}>Open next verified grove<Icon name="arrow"/></button>}<button className={puzzle.mode === 'verified' && unplayed ? '' : 'primary'} onClick={nextPractice}>{puzzle.mode === 'verified' ? 'Try a practice grove' : 'Play another grove'}<Icon name="arrow"/></button></div>}</div>
          {puzzle.mode === 'practice' && <div className="practice-note"><span>Offline practice uses a fixed game seed. No blockchain data powers this puzzle.</span>{newest && <button onClick={() => openPuzzle(archivedPuzzle(newest))}>Play verified grove<Icon name="arrow"/></button>}{!won && <button onClick={nextPractice}>Try another practice grove<Icon name="arrow"/></button>}</div>}
          {puzzle.mode === 'verified' && newest && newest.id !== puzzle.id && <div className="practice-note"><span>A new block milestone has unlocked a grove.</span><button className="primary" onClick={() => openPuzzle(archivedPuzzle(newest))}>Open new grove<Icon name="arrow"/></button></div>}
        </>}
        {tab === 'memory' && <section className="memory-view"><div className="view-title"><div><h2>A forest that remembers</h2><p>Only observed, verified snapshots. Nothing filled in between.</p></div><button onClick={downloadMemory} disabled={!memory.snapshots.length}>Export snapshots<Icon name="arrow"/></button></div>
          <Forest trees={snapshot ? Math.floor(snapshot.height / 60) : null} paused={paused} small/>
          {snapshot ? <><div className="memory-stats"><div><strong>{nf(snapshot.height)}</strong><span>settled Squeek blocks</span></div><div><strong>{nf(Math.floor(snapshot.height / 60))}</strong><span>growth trees across all groves</span></div><div><strong>{nf(Math.floor(snapshot.height / 1200) + 1)}</strong><span>current grove · {Math.floor(snapshot.height % 1200 / 60)}/20 trees</span></div></div>
            <div className="visit-note"><Pixel kind="sprout"/><div><h3>{delta ? previousVisit.current ? 'Since your previous recorded visit' : 'Your first recorded visit' : 'A new forest memory begins'}</h3><p>{delta ? `${nf(delta.blocks)} additional settled ${delta.blocks === 1 ? 'block' : 'blocks'} · ${nf(delta.trees)} additional growth ${delta.trees === 1 ? 'tree' : 'trees'} · ${nf(delta.groves)} new ${delta.groves === 1 ? 'grove' : 'groves'}.` : previousVisit.current ? 'The deployment changed or height regressed. These observations cannot be compared.' : 'This is your first verified snapshot. Return later to measure actual growth.'}</p>{previousVisit.current && <p className="muted">Previous observation: {date(previousVisit.current.checkedAt)}, height {nf(previousVisit.current.height)}. {feed.status !== 'LIVE' ? 'Current evidence is cached.' : ''}</p>}</div></div>
            <h3>Recorded observations</h3><p className="muted">Latest 20 observations shown; up to 100 kept locally.</p><div className="snapshot-table"><table><thead><tr><th scope="col">Verified at</th><th scope="col">Squeek height</th><th scope="col">Safe Ethereum block</th></tr></thead><tbody>{[...memory.snapshots].reverse().slice(0,20).map((s, i) => <tr key={`${s.checkedAt}-${i}`}><td>{date(s.checkedAt)}</td><td>{nf(s.height)}</td><td>{nf(s.safeBlock)}</td></tr>)}</tbody></table></div></> : <div className="empty-state"><Pixel kind="sprout"/><h3>Your forest memory starts here</h3><p>Connect to the public API to record a real settled block height. Practice never adds forest measurements.</p><button className="primary" disabled={feed.fetching} onClick={() => void sync()}>{feed.fetching ? 'Checking public API…' : 'Verify forest data'}<Icon name="refresh"/></button></div>}
        </section>}
        {tab === 'archive' && <section className="journal-view"><div className="view-title"><div><h2>Your grove journal</h2><p>Revisit an unlocked grove and improve your planting plan.</p></div><Pixel kind="lantern"/></div><div className="journal-intro"><p>A confirmed 60-block milestone unlocks a new puzzle when you visit. Missed milestones are not invented. Your first visit unlocks the current milestone.</p><span>{nf(verifiedTotal)} local forest points · {nf(practiceTotal)} practice points</span></div>
          {memory.archive.length ? <div className="journal-list">{[...memory.archive].reverse().map(e => { const p = archivedPuzzle(e), saved = memory.games[e.id]; return <div className="journal-entry" key={e.id}><Pixel kind={saved?.best ? 'lantern' : 'sprout'}/><div><h3>{p.name}</h3><p>Milestone {nf(e.milestone)} · observed at {nf(e.evidence.height)}</p><span>{date(e.evidence.checkedAt)} · {saved?.best ? `Restored · best ${saved.best} points` : 'Awaiting a Seedkeeper'}</span></div><button onClick={() => openPuzzle(p)}>{saved?.best ? 'Replay grove' : 'Play grove'}<Icon name="arrow"/></button></div>; })}</div> : <div className="empty-state"><Pixel kind="lantern"/><h3>No verified groves yet</h3><p>The first verified API reading unlocks a grove. You can play practice while the public feed is unavailable.</p><button className="primary" onClick={() => openPuzzle(practicePuzzle(memory.practiceIndex))}>Play practice<Icon name="arrow"/></button></div>}
          <button className="text-button" onClick={nextPractice}>Explore a practice grove<Icon name="arrow"/></button>
        </section>}
        <section className="data-bar" aria-label="Public data connection"><div className="connection-line"><span className={`status ${feed.status.toLowerCase()}`}><i/>{feed.status}</span><span>{feed.fetching ? 'Checking settled forest data…' : snapshot ? `${nf(snapshot.height)} settled blocks · Grove ${Math.floor(snapshot.height / 1200) + 1}` : 'No verified block height yet'}</span><button className="refresh-button" onClick={() => void sync()} disabled={feed.fetching}><Icon name="refresh"/>{feed.fetching ? 'Checking…' : 'Refresh'}</button></div>
          <div className="data-secondary"><span>{snapshot ? `Last verified ${date(snapshot.checkedAt)}${snapshot.paused ? ' · settlement paused' : ''}` : 'Practice is always available.'}</span><button className="text-button" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? 'Hide data evidence' : 'View data evidence'}<span aria-hidden="true">{details ? '−' : '+'}</span></button></div>
          <p className="feed-error" role="status">{feed.error ?? ''}</p>
          {details && <div className="evidence"><p>Read-only <a href={API_URL} target="_blank" rel="noreferrer">SqueekCore public API</a> · <a href={API_DOCS} target="_blank" rel="noreferrer">API documentation</a></p><p>LIVE means the documented API response passed schema, Sepolia chain, address format, 12-confirmation frontier and block-unit checks within 90 seconds. A safe frontier that stops advancing for 3 minutes is marked stale. It is API verification, not an independent onchain proof. STALE retains prior evidence; OFFLINE has none. PRACTICE describes the puzzle, separately from the connection.</p>{snapshot && <dl><dt>Deployment</dt><dd>{snapshot.installation}</dd><dt>Core address</dt><dd>{snapshot.coreAddress}</dd><dt>Safe Ethereum block</dt><dd>{nf(snapshot.safeBlock)}</dd><dt>Settlement block</dt><dd>{nf(snapshot.sourceBlock)}</dd><dt>Settlement hash</dt><dd>{snapshot.blockHash}</dd><dt>Transaction</dt><dd><a href={`https://sepolia.etherscan.io/tx/${snapshot.transactionHash}`} target="_blank" rel="noreferrer">{snapshot.transactionHash}</a></dd><dt>Settled round</dt><dd>{nf(snapshot.round)}</dd><dt>Active puzzle</dt><dd>{puzzle.mode === 'practice' ? 'Practice seed; no block evidence' : `Milestone ${nf(puzzle.milestone)}. Generated from the milestone and deployment identity, so every visitor gets the same grove.`}</dd>{puzzleEvidence && <><dt>Grove unlocked here at</dt><dd>{nf(puzzleEvidence.height)} · observed {date(puzzleEvidence.checkedAt)}</dd><dt>Unlock settlement hash</dt><dd>{puzzleEvidence.blockHash}</dd><dt>Unlock transaction</dt><dd>{puzzleEvidence.transactionHash}</dd></>}</dl>}<p>One growth tree per 60 settled blocks. A new grove every 1,200. Local scores, saves, and snapshots can be changed or cleared by your browser; they are not public attestations.</p></div>}
        </section>
        {storageError && <p className="storage-error" role="alert">{storageError}</p>}
      </main>
      <footer><div><Pixel kind="sprout"/><span>Rooted in <a href="https://github.com/Peymanworship/squeekforest" target="_blank" rel="noreferrer">SQUEEKFOREST</a> by <a href="https://x.com/AhoteSpirit" target="_blank" rel="noreferrer">@AhoteSpirit</a>.</span></div><p>An independent community game. No wallet, tokens, payments, or official endorsement. Genesis approval is not guaranteed.</p></footer>
    </div>
    <dialog ref={dialog} onCancel={() => setHelp(false)} onClose={() => setHelp(false)} onClick={e => { if (e.target === dialog.current) setHelp(false); }} aria-labelledby="guide-title"><div className="dialog-content"><div className="dialog-head"><h2 id="guide-title">A Seedkeeper’s field guide</h2><button className="icon-button" aria-label="Close field guide" onClick={() => setHelp(false)}><Icon name="close"/></button></div><p>Wake all three spirits with six plantings or fewer. A spirit wakes when a Glowcap grows on its tile or next to it.</p><ol><li>Choose a seed from the satchel.</li><li>Select a marked soil tile to plant it.</li><li>Build water and shade, then plant your Glowcaps.</li></ol><div className="guide-seeds">{(Object.keys(SEEDS) as Seed[]).map(s => <div key={s}><Pixel kind={s}/><div><h3>{SEEDS[s].name}</h3><p>{SEEDS[s].rule} {SEEDS[s].effect}</p></div></div>)}</div><p>{ADJACENCY} Ponds provide water; old trees provide shade. Water and shade markers appear along the bottom of soil tiles.</p><h3>Every choice counts</h3><p>Each awakened spirit gives 100 points. Restore the whole grove to earn 40 for each unused planting and 20 for each seed type used. Invalid placements cost nothing. Undo and restart are free. Replays keep your highest score, so replaying never farms extra points.</p><h3>Grown from settled blocks</h3><p>A verified reading unlocks the current 60-block milestone. Later confirmed milestones unlock new groves. Already unlocked groves stay in your journal. Practice uses fixed seeds and has its own points.</p><p>One visual growth tree appears every 60 settled Squeek blocks; every 1,200 starts a new grove. The forest memory compares actual observations on this browser. No past measurements are invented.</p><button className="primary" onClick={() => setHelp(false)}>Return to the grove<Icon name="arrow"/></button></div></dialog>
  </>;
}
