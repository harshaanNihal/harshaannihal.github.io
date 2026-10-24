// Writes _includes/hero-wash.txt (night) and _includes/hero-wash-day.txt: the sky band of the portrait
// (_src/sky.jpg) as a tiny inline image behind the hero and Contact, its light and dark mapped onto one ramp
// per theme.
//   node tools/wash.mjs        (macOS: sips resizes the source and encodes the JPEGs)
// Blurred in full color, the painting's yellows smeared into its blues as olive and mauve. Mapped onto one hue,
// the wash keeps the painting's swirls of light and dark, and the painted strokes above it carry its other
// colors, side by side. The mapping happens here and not in an SVG filter on the page, because that filter
// cost a half-second paint on a throttled phone; the page only blurs the image.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ramps = {
  /* From the rooms' midnight, through the owner's midnight navy, to cobalt. */
  '': ['#061033', '#021861', '#0c2a85', '#1d4cb8', '#3a6fd8'],
  /* Arles daylight: cream, warming to the gold of the stars where the painting is brightest. */
  '-day': ['#f8f1dc', '#f8f1dc', '#f6e7bd', '#f1d68a', '#ebc35a'],
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function along(stops, t) {
  const x = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const [a, b] = [rgb(stops[i]), rgb(stops[i + 1])];
  return a.map((v, k) => Math.round(v + (b[k] - v) * (x - i)));
}

const dir = mkdtempSync(join(tmpdir(), 'wash-'));
const sips = (...args) => execFileSync('sips', args, { stdio: 'ignore' });
/* 96 px: the browser blows it up to the hero's size, so more source pixels means a softer wash. */
sips('-Z', '96', '-s', 'format', 'bmp', join(root, '_src/sky.jpg'), '--out', join(dir, 'sky.bmp'));
const bmp = readFileSync(join(dir, 'sky.bmp'));
if (bmp.readUInt16LE(28) !== 24) throw new Error('expected the 24-bit BMP that sips writes');
const offset = bmp.readUInt32LE(10);
const width = bmp.readInt32LE(18);
const height = Math.abs(bmp.readInt32LE(22));
const stride = Math.ceil((width * 3) / 4) * 4;

for (const [suffix, stops] of Object.entries(ramps)) {
  const out = Buffer.from(bmp);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = offset + y * stride + x * 3;
      const light = (0.2126 * bmp[p + 2] + 0.7152 * bmp[p + 1] + 0.0722 * bmp[p]) / 255;
      const [r, g, b] = along(stops, light);
      out[p] = b;
      out[p + 1] = g;
      out[p + 2] = r;
    }
  }
  writeFileSync(join(dir, 'mapped.bmp'), out);
  /* q75: at q35 the stretched JPEG blocks showed as gray mud on a wide screen. */
  sips('-s', 'format', 'jpeg', '-s', 'formatOptions', '75', join(dir, 'mapped.bmp'), '--out', join(dir, 'mapped.jpg'));
  const uri = 'data:image/jpeg;base64,' + readFileSync(join(dir, 'mapped.jpg')).toString('base64');
  writeFileSync(join(root, `_includes/hero-wash${suffix}.txt`), uri);
  console.log(`wrote _includes/hero-wash${suffix}.txt (${uri.length} bytes)`);
}
rmSync(dir, { recursive: true });
