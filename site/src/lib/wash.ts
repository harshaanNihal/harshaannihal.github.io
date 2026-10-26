// The tiny inline images of the sky behind the hero and Contact, made at build time from the sky band of the
// portrait (src/originals/sky.jpg), with its light and dark mapped onto one ramp per theme.
// Blurred in full color, the painting's yellows smeared into its blues as olive and mauve. Mapped onto one hue,
// the wash keeps the painting's swirls of light and dark, and the painted strokes above it carry its other
// colors, side by side. The mapping happens here, not in an SVG filter on the page, because that filter cost
// a half-second paint on a throttled phone; the page only blurs the image.
import sharp from 'sharp';
import sky from '../originals/sky.jpg?inline';

const ramps = {
  /* Prussian moonlight: from the rooms' blue-black up through Prussian blues. */
  night: ['#021425', '#002545', '#063d6b', '#275d93', '#5a89be'],
  /* Arles daylight: cream, warming to the gold of the stars where the painting is brightest. */
  day: ['#f8f1dc', '#f8f1dc', '#f6e7bd', '#f1d68a', '#ebc35a'],
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function along(stops: number[][], t: number): number[] {
  const x = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return a.map((v, k) => Math.round(v + (b[k]! - v) * (x - i)));
}

/* 96 px wide: the browser blows it up to the hero's size, so more source pixels means a softer wash. */
const { data, info } = await sharp(Buffer.from(sky.slice(sky.indexOf(',') + 1), 'base64'))
  .resize({ width: 96 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

async function mapped(ramp: string[]): Promise<string> {
  const stops = ramp.map(rgb);
  const out = Buffer.alloc(data.length);
  for (let p = 0; p < data.length; p += 3) {
    const light = (0.2126 * data[p]! + 0.7152 * data[p + 1]! + 0.0722 * data[p + 2]!) / 255;
    const [r, g, b] = along(stops, light);
    out[p] = r!;
    out[p + 1] = g!;
    out[p + 2] = b!;
  }
  /* q75: at q35 the stretched JPEG blocks showed as gray mud on a wide screen. */
  const jpeg = await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 75 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

export const wash = { night: await mapped(ramps.night), day: await mapped(ramps.day) };
