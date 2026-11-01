import { useEffect, useRef } from 'react';
import { rng } from '../game';
/** Original pixel artwork, drawn at a deliberately low resolution. */
export function Forest({ trees, paused, small = false }: { trees: number | null; paused: boolean; small?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const w = 640, h = 280;
    canvas.width = w; canvas.height = h;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0;
    const tree = (x: number, y: number, size: number, color: string, highlight: string) => {
      c.fillStyle = '#243e34'; c.fillRect(x - size / 8, y - size, size / 4, size);
      c.fillStyle = color;
      for (let j = 0; j < 5; j++) { const width = size * (.25 + j * .19); c.fillRect(Math.round(x - width / 2), Math.round(y - size * 1.7 + j * size * .22), Math.round(width), Math.round(size * .33)); }
      c.fillStyle = highlight;
      for (let j = 0; j < 4; j++) c.fillRect(Math.round(x - size * (.11 + j * .08)), Math.round(y - size * 1.7 + j * size * .22), Math.round(size * .11), 2);
    };
    function draw(t: number) {
      if (!c) return;
      const random = rng(4271);
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#102327'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 55; i++) { c.fillStyle = i % 3 ? '#628774' : '#b4c5a0'; c.fillRect(Math.floor(random() * w), Math.floor(random() * 110), 1, 1); }
      c.fillStyle = '#3c5548'; c.fillRect(447, 21, 21, 3); c.fillRect(441, 25, 33, 34); c.fillRect(447, 59, 21, 3);
      c.fillStyle = '#c8d9b0'; c.fillRect(448, 22, 18, 2); c.fillRect(443, 26, 28, 28); c.fillRect(447, 54, 19, 4);
      c.fillStyle = '#a7c19b'; c.fillRect(448, 30, 6, 5); c.fillRect(459, 43, 8, 6);
      c.fillStyle = '#17352f';
      for (let x = 0; x < w; x += 4) c.fillRect(x, 104 + Math.floor(Math.sin(x / 65) * 12), 4, 150);
      for (let i = 0; i < 36; i++) tree(i * 21 - 20, 173 + random() * 23, 32 + random() * 28, '#1b4037', '#244e40');
      c.fillStyle = '#163a2e'; c.fillRect(0, 198, w, h);
      for (let i = 0; i < 24; i++) tree(i * 30 - 25, 221 + random() * 12, 40 + random() * 36, i % 2 ? '#205140' : '#244e3b', '#32634b');
      // A quiet moonlit stream curves into the clearing.
      for (let y = 188; y < h; y += 3) { const width = 4 + (y - 188) * .6; const x = 420 + Math.sin(y / 22) * 12; c.fillStyle = y % 2 ? '#335a51' : '#3e665a'; c.fillRect(Math.floor(x), y, Math.floor(width), 3); }
      const count = trees === null ? 7 : trees % 20;
      for (let i = 0; i < count; i++) { const x = 60 + i * 27; const y = 242 + i % 3 * 10; tree(x, y, 12 + i % 4 * 2, '#4c8760', '#8cb37c'); }
      tree(11, 292, 121, '#17392d', '#28563b'); tree(628, 296, 140, '#183e31', '#2c5b40');
      c.fillStyle = '#2e573d';
      for (let i = 0; i < 220; i++) { const x = random() * w, y = 222 + random() * 58; c.fillRect(Math.floor(x), Math.floor(y), 2, i % 7 ? 1 : 3); }
      for (let i = 0; i < 30; i++) { const x = 45 + random() * 550 + Math.sin(t / 3000 + i) * 5, y = 70 + random() * 180 + Math.cos(t / 4000 + i) * 4; c.fillStyle = '#466b45'; c.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3); c.fillStyle = i % 2 ? '#d4df94' : '#96c77d'; c.fillRect(Math.floor(x), Math.floor(y), 1, 1); }
    }
    const animate = (t: number) => { if (t - previous > 70) { draw(t); previous = t; } frame = requestAnimationFrame(animate); };
    const start = () => { cancelAnimationFrame(frame); draw(0); if (!paused && !reduce.matches) frame = requestAnimationFrame(animate); };
    start(); reduce.addEventListener('change', start);
    return () => { cancelAnimationFrame(frame); reduce.removeEventListener('change', start); };
  }, [trees, paused]);
  return <canvas ref={ref} className={small ? 'forest-canvas small-forest' : 'forest-canvas'} role="img" aria-label={trees === null ? 'Decorative pixel forest with moonlight and fireflies. No verified growth data.' : `Moonlit grove with ${trees % 20} growth trees. ${Math.floor(trees / 20)} earlier groves contain twenty each. Background trees are decorative.`}/>;
}
