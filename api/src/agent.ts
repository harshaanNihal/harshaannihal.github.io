// What the User-Agent says, reduced to coarse buckets (no versions), and whether it is a bot.

const bots = /bot\b|bot\/|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|headless|lighthouse|pagespeed|phantomjs|puppeteer|playwright|selenium|python-requests|python-urllib|aiohttp|curl\/|wget|httpclient|okhttp|go-http-client|java\/|axios|node-fetch|undici|postman|insomnia|scrapy/i;

export const isBot = (ua: string) => !ua || bots.test(ua);

export function device(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function browser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

export function os(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

/* The viewport width, as a bucket. */
export function widthBucket(width: number | undefined): string | null {
  if (width === undefined) return null;
  if (width < 600) return 'phone';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'laptop';
  return 'desktop';
}

/* The first language the browser asks for: "en-IN,en;q=0.9" becomes "en-IN". */
export const language = (header: string | null) => header?.split(',')[0]?.split(';')[0]?.trim().slice(0, 20) || null;
