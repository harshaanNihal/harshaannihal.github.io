// POST /e: one event from the page's beacon (a page view, the page closing, a click worth counting). Nothing is
// stored on the visitor's device and no IP address is stored anywhere; see visitor.ts for how visitors are told
// apart within a day.
import { pageEvent, type PageEvent } from '@portfolio/contract';
import { browser, device, isBot, language, os, widthBucket } from './agent';
import { allowedOrigin, noContent, withCors } from './http';
import { today, visitorId } from './visitor';

export async function handleEvent(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = allowedOrigin(request, env);
  /* Only the site's own pages are counted. */
  if (!origin) return noContent();
  const ua = request.headers.get('User-Agent') ?? '';
  /* Visitors whose browser asks not to be tracked aren't counted, and neither are bots. */
  const declined = request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1';
  if (declined || isBot(ua)) return withCors(noContent(), origin);

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return withCors(new Response(null, { status: 400 }), origin);
  }
  const parsed = pageEvent.safeParse(body);
  if (!parsed.success) return withCors(new Response(null, { status: 400 }), origin);
  ctx.waitUntil(record(request, env, parsed.data, ua));
  return withCors(noContent(), origin);
}

/* A campaign or ref tag, cut to something safe to store and show. */
const tag = (value: string | null) => value?.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || null;

function referrerHost(referrer: string | undefined, site: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host;
    return host && host !== site && !host.startsWith('localhost') ? host : null;
  } catch {
    return null;
  }
}

async function record(request: Request, env: Env, e: PageEvent, ua: string) {
  const site = new URL(env.SITE_ORIGIN).host;
  const now = new Date();
  const day = today(now);
  const query = new URLSearchParams(e.query ?? '');
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  const visitor = await visitorId(env.KV, day, site, request.headers.get('CF-Connecting-IP') ?? '', ua);
  await env.DB.prepare(
    `INSERT INTO events (at, day, name, path, referrer, source, medium, campaign, ref, country, device, browser, os, lang, width, asn, network, visitor, duration, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    now.toISOString(), day, e.name, e.path.split('?')[0]!.slice(0, 200),
    referrerHost(e.referrer, site), tag(query.get('utm_source')), tag(query.get('utm_medium')), tag(query.get('utm_campaign')), tag(query.get('ref')),
    cf?.country ?? null, device(ua), browser(ua), os(ua), language(request.headers.get('Accept-Language')), widthBucket(e.width),
    cf?.asn ?? null, cf?.asOrganization ?? null, visitor, e.duration ?? null, e.detail ?? null,
  ).run();
}
