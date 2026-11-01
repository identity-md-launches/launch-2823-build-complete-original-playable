import type { Seed, Terrain } from '../game';
type Kind = Seed | Terrain | 'spirit' | 'sprout' | 'moon' | 'leaf' | 'lantern';
export function Pixel({ kind, className = '', lit = false }: { kind: Kind; className?: string; lit?: boolean }) {
  return <svg className={`pixel ${className}`} viewBox="0 0 24 24" fill="none" shapeRendering="crispEdges" aria-hidden="true">
    {(kind === 'willow' || kind === 'stump') && <><path fill="#86664d" d="M10 9h4v12h-4zM7 13h3v3H7zM14 11h3v3h-3z"/><path fill={kind === 'willow' ? '#65b77a' : '#357a60'} d="M7 3h10v3h3v9h-3V9h-3v3h-4V9H7v8H4V6h3z"/><path fill="#a4d68d" d="M7 3h9v3H7zM4 6h3v3H4z"/><path fill="#3d8d67" d="M7 9h3v6H7zM14 6h3v9h-3z"/></>}
    {kind === 'pine' && <><path fill="#957053" d="M10 16h4v6h-4z"/><path fill="#3e9b78" d="M10 1h4v3h3v4h3v4h3v6H1v-6h3V8h3V4h3z"/><path fill="#79c89a" d="M10 1h4v3h-4zM7 5h3v3H7zM4 10h3v3H4zM1 15h3v3H1z"/><path fill="#276953" d="M14 7h3v4h3v4h3v3H11v-3h6v-3h-3z"/></>}
    {kind === 'glowcap' && <><path fill="#d4e8bc" d="M10 12h4v8h-4zM7 20h10v2H7z"/><path fill="#a6d9ac" d="M7 5h10v3h3v4h2v3H2v-3h2V8h3z"/><path fill="#e8f5bd" d="M7 5h10v3H7zM4 9h3v3H4zM10 9h3v3h-3z"/><path fill="#5eae89" d="M17 8h3v4h2v3H5v-2h12z"/></>}
    {kind === 'pond' && <><path fill="#285b67" d="M5 5h14v3h3v10h-3v3H5v-3H2V8h3z"/><path fill="#5ba0a5" d="M6 8h9v2H6zM11 15h8v2h-8z"/><path fill="#9acbc4" d="M4 12h5v2H4z"/></>}
    {kind === 'rock' && <><path fill="#657d75" d="M7 6h10v3h3v4h2v7H2v-8h3V8h2z"/><path fill="#9bafa0" d="M7 6h10v3H9v4H5v-2h2z"/><path fill="#425a54" d="M17 10h3v4h2v6H12v-3h5z"/></>}
    {kind === 'spirit' && <><path fill={lit ? '#e8efb0' : '#b1b7a6'} d="M8 3h8v3h3v3h3v9h-3v3h-3v-3h-3v3h-3v-3H7v3H4V9h3V6h1z"/><path fill={lit ? '#507e5a' : '#425a54'} d="M8 10h3v4H8zM15 10h3v4h-3z"/><path fill={lit ? '#fbf6d8' : '#d5d8bd'} d="M9 4h6v2H9zM6 8h2v7H6z"/></>}
    {(kind === 'sprout' || kind === 'leaf') && <><path fill="#71995a" d="M11 11h3v11h-3z"/><path fill="#92d594" d="M1 4h7v3h4v6H6v-3H3V7H1zM16 2h7v6h-3v3h-6V5h2z"/><path fill="#c4e7a2" d="M2 4h6v3H2zM17 2h6v3h-6z"/></>}
    {kind === 'moon' && <path fill="#e1e8bc" d="M9 1h8v3h-6v4H8v8h4v4h8v2H8v-3H4v-4H1V7h3V4h5z"/>}
    {kind === 'lantern' && <><path fill="#8ca67e" d="M9 2h6v2h3v5h-3V5H9v4H6V4h3zM5 9h14v3H5zM5 21h14v2H5z"/><path fill="#e6dca3" d="M7 12h10v9H7z"/><path fill="#f7f0c2" d="M10 13h4v6h-4z"/></>}
  </svg>;
}
export function Icon({ name }: { name: 'undo' | 'reset' | 'arrow' | 'close' | 'help' | 'book' | 'refresh' | 'pause' | 'play' | 'check' }) {
  const paths = {
    undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12',
    reset: 'M5 8a9 9 0 1 1-1 9M5 3v5h5', arrow: 'M4 12h16m-6-6 6 6-6 6', close: 'm6 6 12 12M6 18 18 6',
    help: 'M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5M12 17v1', book: 'M12 5v15M3 4h5l4 2 4-2h5v15h-5l-4 2-4-2H3z',
    refresh: 'M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5m-3 9a9 9 0 0 0 15 2l3-3m0 5v-5h-5',
    pause: 'M8 5v14M16 5v14', play: 'm8 4 12 8-12 8z', check: 'm5 12 4 4L19 6',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon" aria-hidden="true"><path d={paths[name]}/></svg>;
}
