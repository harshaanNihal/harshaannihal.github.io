// Writes _includes/sky-defs.html: the brushwork of the painted sky, as SVG symbols.
//   node tools/painted-sky.mjs
// Everything is made of dabs: short, slightly curved strokes with round ends, laid along a flow the way
// Van Gogh laid paint. A painted star is a cream core inside a halo of dabs that run around it; the halo is
// cut into four layers by radius so the page can turn each layer at its own speed. The swirl is a river of
// dabs that runs in from the left and curls around a star. Seeded, so every run writes the same file.
// Colors are CSS custom properties (--ps-*, --sw-*), set per theme in site.css.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../_includes/sky-defs.html', import.meta.url));
const n = (v) => Math.round(v * 10) / 10;

function random(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const between = (rand, [a, b]) => a + rand() * (b - a);

/* Dabs are grouped by color and width, so each group is a single path. */
function paths(groups) {
  return [...groups].map(([key, d]) => {
    const [color, width] = key.split('|');
    return `<path style="stroke:var(${color})" stroke-width="${width}" d="${d.join('')}"/>`;
  }).join('');
}

function add(groups, color, width, d) {
  const key = color + '|' + width;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(d);
}

/* Dabs that run around the center between radii r0 and r1. Positions are stratified (one per cell of a
   rings-by-sectors grid, jittered) so the halo is evenly covered with no ring-shaped gaps, and each dab
   drifts in or out along its length so it slants across its neighbors. */
function halo({ seed, r0, r1, rings, perRing, len, widths, colors, drift = 6 }) {
  const rand = random(seed);
  const groups = new Map();
  for (let i = 0; i < rings; i++) {
    const offset = rand() * Math.PI * 2;
    for (let j = 0; j < perRing; j++) {
      const r = r0 + (i + rand()) / rings * (r1 - r0);
      const th = offset + (j + rand() * 0.8) / perRing * Math.PI * 2;
      const half = between(rand, len) / 2 / r;
      const d = (rand() - 0.5) * drift;
      const ra = r - d / 2;
      const rb = r + d / 2;
      add(groups, pick(rand, colors), pick(rand, widths),
        `M${n(ra * Math.cos(th - half))} ${n(ra * Math.sin(th - half))}A${n(r)} ${n(r)} 0 0 1 ${n(rb * Math.cos(th + half))} ${n(rb * Math.sin(th + half))}`);
    }
  }
  return paths(groups);
}

const star = {
  core: `<circle r="10" style="fill:var(--ps-core)"/>`
    + halo({ seed: 7, r0: 11, r1: 25, rings: 2, perRing: 9, len: [9, 16], widths: [6, 7], colors: ['--ps-core', '--ps-a', '--ps-a'], drift: 3 }),
  b2: halo({ seed: 23, r0: 25, r1: 43, rings: 3, perRing: 12, len: [11, 20], widths: [6, 7, 8], colors: ['--ps-a', '--ps-b', '--ps-b', '--ps-core'], drift: 7 }),
  b3: halo({ seed: 37, r0: 43, r1: 63, rings: 3, perRing: 15, len: [12, 22], widths: [5, 6, 7], colors: ['--ps-b', '--ps-c', '--ps-a', '--ps-c'], drift: 9 }),
  b4: halo({ seed: 53, r0: 63, r1: 93, rings: 3, perRing: 15, len: [12, 26], widths: [4, 5, 6], colors: ['--ps-c', '--ps-d', '--ps-d'], drift: 12 }),
};

/* The swirl's center line: a wave from the left edge that rises into a clockwise spiral. */
const W = 1000;
const H = 340;
const C = { x: 760, y: 166 };
function centerLine() {
  const pts = [];
  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  const r0 = 142;
  const start = { x: C.x - r0, y: C.y };
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    pts.push({ x: bez(-20, 240, start.x - 60, start.x, t), y: bez(210, 80, start.y + 140, start.y, t) });
  }
  const turns = 1.08;
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const th = Math.PI + t * turns * Math.PI * 2;
    const r = r0 - (r0 - 66) * Math.pow(t, 0.9);
    pts.push({ x: C.x + r * Math.cos(th), y: C.y + r * Math.sin(th) });
  }
  /* Resample by arc length, so a step along the line is the same distance everywhere. */
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = acc[acc.length - 1];
  const at = (s) => {
    const want = s * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < want) i++;
    const k = (want - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k;
    const y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k;
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) || 1;
    return { x, y, tx: (pts[i].x - pts[i - 1].x) / len, ty: (pts[i].y - pts[i - 1].y) / len };
  };
  return { at, total, pts };
}

/* The river of dabs. Each dab follows the line's direction at its spot, set off to one side by up to
   half the river's width, which swells in the middle and tapers at both ends like a loaded brush. */
function river({ seed, count, half, len, widths, colors }) {
  const rand = random(seed);
  const groups = new Map();
  for (let i = 0; i < count; i++) {
    const s = (i + rand()) / count;
    const swell = Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.55);
    const o = (rand() * 2 - 1) * half * Math.max(0.18, swell);
    const L = between(rand, len) / line.total;
    const a = line.at(Math.max(0, s - L / 2));
    const m = line.at(s);
    const b = line.at(Math.min(1, s + L / 2));
    const off = (p) => ({ x: p.x - p.ty * o, y: p.y + p.tx * o });
    const pa = off(a);
    const pm = off(m);
    const pb = off(b);
    add(groups, pick(rand, colors), pick(rand, widths), `M${n(pa.x)} ${n(pa.y)}Q${n(pm.x)} ${n(pm.y)} ${n(pb.x)} ${n(pb.y)}`);
  }
  return paths(groups);
}

const line = centerLine();
const swirl = river({ seed: 101, count: 230, half: 26, len: [22, 46], widths: [5, 6, 7, 8], colors: ['--sw-1', '--sw-2', '--sw-3', '--sw-3', '--sw-4', '--sw-5'] });

/* The center line, for the mask that lays the swirl down. Whole units are plenty for that. */
const centerPath = 'M' + line.pts.filter((p, i) => i % 3 === 0 || i === line.pts.length - 1).map((p) => Math.round(p.x) + ' ' + Math.round(p.y)).join('L');

const symbol = (id, viewBox, body) => `<symbol id="${id}" viewBox="${viewBox}" fill="none" stroke-linecap="round">${body}</symbol>`;
const SV = '-100 -100 200 200'; /* drawn around the center; pstar.html shows them in a 0 0 200 200 box */
const html = `<!-- Generated by tools/painted-sky.mjs. Edit the script, not this file. -->
<svg class="sky-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>`
  + symbol('ps-core', SV, star.core)
  + symbol('ps-b2', SV, star.b2)
  + symbol('ps-b3', SV, star.b3)
  + symbol('ps-b4', SV, star.b4)
  + symbol('swirl', `0 0 ${W} ${H}`, swirl)
  + `<path id="swirl-line" pathLength="1" d="${centerPath}"/>`
  + `</defs></svg>\n`;

writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} bytes); swirl center at ${(C.x / W * 100).toFixed(2)}% ${(C.y / H * 100).toFixed(2)}%`);
