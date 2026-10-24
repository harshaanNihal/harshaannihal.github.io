// Small formatters that reproduce what the Jekyll templates printed, so the pages read the same.

/* Jekyll's `slugify`: lowercase, every run of other characters becomes one hyphen. "HTML/CSS" → "html-css". */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* Posts carry the author's offset (+0530); dates in the data files are plain days, read as UTC. */
export const SITE_ZONE = 'Asia/Kolkata';

function parts(date: Date, zone: string): Record<string, string> {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(fields.map((p) => [p.type, p.value]));
}

const month = (date: Date, zone: string, style: 'short' | 'long') =>
  new Intl.DateTimeFormat('en-US', { timeZone: zone, month: style }).format(date);

/* "%b %Y": Jul 2024 */
export const monthYear = (date: Date, zone = 'UTC') => `${month(date, zone, 'short')} ${parts(date, zone).year}`;

/* "%Y-%m": 2024-07 */
export const isoMonth = (date: Date, zone = 'UTC') => { const p = parts(date, zone); return `${p.year}-${p.month}`; };

/* "%Y-%m-%d": 2025-12-17 */
export const isoDay = (date: Date, zone = 'UTC') => { const p = parts(date, zone); return `${p.year}-${p.month}-${p.day}`; };

/* "%b %-d, %Y": Dec 17, 2025 */
export const shortDate = (date: Date, zone = 'UTC') => `${month(date, zone, 'short')} ${+parts(date, zone).day}, ${parts(date, zone).year}`;

/* "%B %-d, %Y": September 28, 2018 */
export const longDate = (date: Date, zone = SITE_ZONE) => `${month(date, zone, 'long')} ${+parts(date, zone).day}, ${parts(date, zone).year}`;

/* Jekyll's date_to_xmlschema in the site's zone: 2018-09-28T04:20:00+05:30 */
export function xmlSchema(date: Date, zone = SITE_ZONE): string {
  const p = parts(date, zone);
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offset = Math.round((local - date.getTime()) / 60000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${hh}:${mm}`;
}

/* Jekyll front matter dates such as "2018-09-02 12:21:34 +0530". */
export function parseJekyllDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(value.trim());
  if (!m) throw new Error(`Unreadable date: ${value}`);
  const [, y, mo, d, h = '00', mi = '00', s = '00', zone] = m;
  const offset = !zone || zone === 'Z' ? '+00:00' : zone.length === 5 ? `${zone.slice(0, 3)}:${zone.slice(3)}` : zone;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${zone ? offset : '+05:30'}`);
}

/* Liquid's strip_html: drops script and style blocks, comments, then every tag. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[\s\S]*?>/g, '');
}

/* The read time the templates printed: words over 200, rounded up, at least one minute. */
export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/* Liquid's truncatewords: the first n words and "..." when there are more. */
export function truncateWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > n ? `${words.slice(0, n).join(' ')}...` : text;
}

/* A float the way Liquid printed it (Ruby's Float#to_s): 0.0, -0.9, 0.064. */
export function rubyFloat(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

export const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

/* Typographic quotes, as jekyll-seo-tag printed titles: Noob's becomes Noob’s. */
export function smartQuotes(text: string): string {
  return text
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s([])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s([])'/g, '$1‘').replace(/'/g, '’');
}
