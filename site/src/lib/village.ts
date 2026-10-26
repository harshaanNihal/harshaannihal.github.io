// The village under the sky at the foot of every page, as the painting has Saint-Remy under its stars: low hills, a
// cypress, rooftops round a church with a tall spire, and lit windows. Drawn once per build from a seed (as
// painted-sky.ts draws the swirl), in a 2400 by 120 box whose bottom edge is the ground the footer stands on.

type Rand = () => number;

function random(seed: number): Rand {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const W = 2400;
const G = 120;
const n = (v: number) => Math.round(v * 10) / 10;

/* The hills behind the village: two slow waves, closed down to the ground. */
const hills = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 24) pts.push(`${x} ${n(78 + 9 * Math.sin(x / 270) + 5 * Math.sin(x / 97 + 1.3))}`);
  return `M0 ${G}L${pts.join('L')}L${W} ${G}Z`;
})();

interface House { x: number; w: number; h: number; roof: number }

/* Houses side by side, taller towards the church, some stepping back behind their neighbours. */
function houses(rand: Rand, from: number, to: number, church: number): House[] {
  const out: House[] = [];
  for (let x = from; x < to;) {
    const w = 34 + rand() * 52;
    const near = 1 - Math.min(1, Math.abs(x + w / 2 - church) / 700);
    out.push({ x, w, h: 12 + rand() * 18 + near * 18, roof: rand() < 0.15 ? 0 : 6 + rand() * 14 });
    x += w * (0.6 + rand() * 0.3); /* each overlaps the last, so no sky shows between them */
  }
  return out;
}

const rand = random(42);
const CHURCH = 1250;
const street = [...houses(rand, 744, CHURCH - 60, CHURCH), ...houses(rand, CHURCH + 66, 1960, CHURCH)];

const house = ({ x, w, h, roof }: House) => roof
  ? `M${n(x)} ${G}V${n(G - h)}L${n(x + w / 2)} ${n(G - h - roof)}L${n(x + w)} ${n(G - h)}V${G}Z`
  : `M${n(x)} ${G}V${n(G - h)}H${n(x + w)}V${G}Z`;

/* The church: its nave, then a tower with the tall spire the painting's church has. */
const church = `M${CHURCH - 52} ${G}V82L${CHURCH - 16} 66L${CHURCH + 20} 82V${G}Z`
  + `M${CHURCH + 14} ${G}V50L${CHURCH + 25} 44L${CHURCH + 36} 50V${G}Z`
  + `M${CHURCH + 17} 46L${CHURCH + 25} 6L${CHURCH + 33} 46Z`;

/* A closed curve through the points, smoothed: each point is a control and the line runs through the midpoints. */
function smooth(pts: [number, number][]): string {
  const mid = (a: [number, number], b: [number, number]) => `${n((a[0] + b[0]) / 2)} ${n((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[pts.length - 1]!, pts[0]!)}`;
  pts.forEach((p, i) => { d += `Q${n(p[0])} ${n(p[1])} ${mid(p, pts[(i + 1) % pts.length]!)}`; });
  return `${d}Z`;
}

/* The cypress: a tall dark flame standing a little apart at the western end of the village, narrow at the foot,
   fullest a fifth of the way up, then drawn up to a point, leaning one way and back as it rises, with small swells
   along its edges as Van Gogh brushed it. */
const cypress = (() => {
  const base = 690;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = G - t * 118;
    const lean = 7 * Math.sin(t * 3.4);
    const half = 23 * Math.min(1, 0.5 + t * 2.4) * Math.pow(1 - t, 1.25);
    const swell = (i % 2 ? 2.5 : -1.5) * (1 - t);
    left.push([base + lean - half - swell, y]);
    right.unshift([base + lean + half + swell, y]);
  }
  return smooth([[base - 10, G], ...left, ...right, [base + 10, G]]);
})();

/* Lit windows: one or two on most houses, small and warm. Each takes a turn (--w) to come on, in a shuffled order. */
const lights = street.filter((h) => h.h > 20).flatMap((h) => {
  const count = h.w > 60 ? 2 : 1;
  return Array.from({ length: count }, (_, k) => ({ x: h.x + h.w * (count === 1 ? 0.35 + rand() * 0.3 : 0.25 + 0.5 * k) - 2.5, y: G - 9 - rand() * (h.h - 18) }));
}).filter(() => rand() > 0.18);
const turns = lights.map((_, i) => i);
for (let i = turns.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [turns[i], turns[j]] = [turns[j]!, turns[i]!];
}

export const village = `<svg class="village" viewBox="0 0 ${W} ${G}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">`
  + `<path class="village__hills" d="${hills}"/>`
  + `<path class="village__town" d="${street.map(house).join('')}${church}${cypress}"/>`
  + lights.map((l, i) => `<rect class="village__window" x="${n(l.x)}" y="${n(l.y)}" width="5" height="6" style="--w:${turns[i]}"/>`).join('')
  + `</svg>`;
