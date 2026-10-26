// The hero moon's halo: rings of brush dabs round the moon, drawn once per build from seeds (as painted-sky.ts draws
// the swirl and the stars), each ring its own SVG layer so it can turn at its own speed. Colours are custom properties
// (--ring-1 to --ring-3), set in site.css from the theme's tokens.

type Rand = () => number;

function random(seed: number): Rand {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/* Rows of dabs between radii r0 and r1, round the centre of a -200..200 box, one row per colour. */
function ring(seed: number, r0: number, r1: number, per: number, len: [number, number], widths: number[], colors: string[]): string {
  const rand = random(seed);
  const groups = new Map<string, string[]>();
  const rows = colors.length;
  for (let i = 0; i < rows; i++) {
    const offset = rand() * Math.PI * 2;
    const n = Math.round(per * (r0 + (i + 0.5) * (r1 - r0) / rows) / r0);
    const key = `${colors[i]}|${widths[i % widths.length]}`;
    for (let j = 0; j < n; j++) {
      const r = r0 + (i + 0.2 + rand() * 0.6) / rows * (r1 - r0);
      const th = offset + (j + rand() * 0.6) / n * Math.PI * 2;
      const half = (len[0] + rand() * (len[1] - len[0])) / 2 / r;
      /* Each dab drifts in or out along its length, so it slants across its neighbours. At this radius a chord
         draws the same as an arc. */
      const drift = (rand() - 0.5) * 4;
      const ax = Math.round((r - drift / 2) * Math.cos(th - half));
      const ay = Math.round((r - drift / 2) * Math.sin(th - half));
      const bx = Math.round((r + drift / 2) * Math.cos(th + half)) - ax;
      const by = Math.round((r + drift / 2) * Math.sin(th + half)) - ay;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(`M${ax} ${ay}l${bx} ${by}`.replace(/ -/g, '-'));
    }
  }
  return [...groups].map(([key, d]) => {
    const [color, width] = key.split('|');
    return `<path style="stroke:var(${color})" stroke-width="${width}" d="${d.join('')}"/>`;
  }).join('');
}

const layer = (n: number, body: string) =>
  `<svg class="moon__ring moon__ring--${n}" viewBox="-200 -200 400 400" focusable="false"><g fill="none" stroke-linecap="round">${body}</g></svg>`;

/* Two rings: a close one in the moon's gold and a wider, sparser one in its pale light. */
export const moonHalo = [
  layer(1, ring(71, 100, 128, 20, [16, 26], [8, 7], ['--ring-1', '--ring-2', '--ring-1'])),
  layer(2, ring(83, 128, 156, 18, [18, 30], [7, 6], ['--ring-2', '--ring-3'])),
].join('');
