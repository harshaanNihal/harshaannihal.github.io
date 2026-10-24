import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { networkKind } from '../src/networks';
import { networkLabel, totals, type EventRow } from '../src/report';
import { forgetSalt, today, visitorId } from '../src/visitor';

const SITE = 'https://harshaannihal.github.io';
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const IP = '203.0.113.7';

type Init = RequestInit<Partial<IncomingRequestCfProperties>>;

async function call(path: string, init: Init) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`https://api.test${path}`, init as RequestInit) as Request<unknown, IncomingRequestCfProperties>, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

const contact = (fields: Record<string, string>, headers: Record<string, string> = {}): Init => ({
  method: 'POST',
  body: new URLSearchParams(fields),
  headers: { Origin: SITE, 'User-Agent': CHROME, 'CF-Connecting-IP': IP, Accept: 'application/json', ...headers },
  cf: { country: 'DE' },
});

const beacon = (event: object, headers: Record<string, string> = {}, cf: Partial<IncomingRequestCfProperties> = { country: 'DE', asn: 64500, asOrganization: 'Acme Corp' }): Init => ({
  method: 'POST',
  body: JSON.stringify(event),
  headers: { Origin: SITE, 'User-Agent': CHROME, 'CF-Connecting-IP': IP, 'Accept-Language': 'en-IN,en;q=0.9', ...headers },
  cf,
});

const ada = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Would you like to talk about a role?' };

let mails: Record<string, unknown>[] = [];

beforeEach(async () => {
  await env.DB.batch(['messages', 'events', 'daily'].map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
  for (const { name } of (await env.KV.list()).keys) await env.KV.delete(name);
  forgetSalt();
  mails = [];
  vi.restoreAllMocks();
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    mails.push(JSON.parse(String(init?.body)));
    return new Response('{"id":"test"}', { status: 200 });
  });
});

const rows = async (table: string) => (await env.DB.prepare(`SELECT * FROM ${table}`).all<Record<string, unknown>>()).results;

describe('POST /contact', () => {
  it('stores the message and emails the owner, with Reply-To set to the sender', async () => {
    const response = await call('/contact', contact(ada));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: 'sent' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    const [row] = await rows('messages');
    expect(row).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', country: 'DE', emailed: 1 });
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ to: ['owner@example.com'], reply_to: 'ada@example.com', from: env.MAIL_FROM });
  });

  it('escapes what the sender typed in the email', async () => {
    await call('/contact', contact({ ...ada, name: '<b>Ada</b>' }));
    expect(mails[0]!.html).toContain('&lt;b&gt;Ada&lt;/b&gt;');
    expect(mails[0]!.html).not.toContain('<b>Ada</b>');
  });

  it('answers a filled honeypot as sent, and keeps nothing', async () => {
    const response = await call('/contact', contact({ ...ada, website: 'https://spam.example' }));
    expect(await response.json()).toEqual({ outcome: 'sent' });
    expect(await rows('messages')).toHaveLength(0);
    expect(mails).toHaveLength(0);
  });

  it('ignores a form sent faster than a person types', async () => {
    await call('/contact', contact({ ...ada, shown: String(Date.now()) }));
    expect(await rows('messages')).toHaveLength(0);
  });

  it('accepts a form that was open long enough', async () => {
    await call('/contact', contact({ ...ada, shown: String(Date.now() - 10_000) }));
    expect(await rows('messages')).toHaveLength(1);
  });

  it('rejects an address that is not an email', async () => {
    const response = await call('/contact', contact({ ...ada, email: 'not-an-email' }));
    expect(response.status).toBe(400);
    expect(await rows('messages')).toHaveLength(0);
  });

  it('turns away a fourth message within the hour', async () => {
    for (let i = 0; i < 3; i++) expect((await call('/contact', contact(ada))).status).toBe(200);
    const fourth = await call('/contact', contact(ada));
    expect(fourth.status).toBe(429);
    expect(await rows('messages')).toHaveLength(3);
  });

  it('refuses a form posted from another site', async () => {
    const response = await call('/contact', contact(ada, { Origin: 'https://evil.example' }));
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(await rows('messages')).toHaveLength(0);
  });

  it('sends a plain form post, without JavaScript, on to the sent page', async () => {
    const response = await call('/contact', contact({ ...ada, website: '', shown: '' }, { Accept: 'text/html' }));
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe(`${SITE}/contact/sent/`);
    expect(await rows('messages')).toHaveLength(1);
  });

  it('still stores the message when the email fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('down', { status: 503 }));
    await call('/contact', contact(ada));
    expect(await rows('messages')).toMatchObject([{ email: 'ada@example.com', emailed: 0 }]);
  });
});

describe('POST /e', () => {
  const view = { name: 'view', path: '/', referrer: 'https://www.linkedin.com/feed/', query: '?ref=Acme&utm_source=LinkedIn', width: 1512 };

  it('stores a page view with coarse details and a daily visitor hash', async () => {
    expect((await call('/e', beacon(view))).status).toBe(204);
    const [row] = await rows('events');
    expect(row).toMatchObject({
      name: 'view', path: '/', day: today(), referrer: 'www.linkedin.com', ref: 'acme', source: 'linkedin', country: 'DE',
      device: 'desktop', browser: 'Chrome', os: 'macOS', lang: 'en-IN', width: 'desktop', asn: 64500, network: 'Acme Corp',
    });
    expect(row!.visitor).toMatch(/^[0-9a-f]{16}$/);
  });

  it('never stores the IP address, in D1 or in KV', async () => {
    await call('/e', beacon(view));
    await call('/contact', contact(ada));
    const stored = JSON.stringify([await rows('events'), await rows('messages'), await rows('daily')]);
    expect(stored).not.toContain(IP);
    for (const { name } of (await env.KV.list()).keys) {
      expect(name).not.toContain(IP);
      expect(await env.KV.get(name)).not.toContain(IP);
    }
  });

  it('counts the same browser once a day', async () => {
    await call('/e', beacon(view));
    await call('/e', beacon({ ...view, path: '/blog/' }));
    const [a, b] = await rows('events');
    expect(a!.visitor).toBe(b!.visitor);
  });

  it('cannot link a visitor across days, because each day has its own salt', async () => {
    const host = new URL(SITE).host;
    const monday = await visitorId(env.KV, '2026-10-26', host, IP, CHROME);
    forgetSalt();
    const tuesday = await visitorId(env.KV, '2026-10-27', host, IP, CHROME);
    forgetSalt();
    expect(await visitorId(env.KV, '2026-10-26', host, IP, CHROME)).toBe(monday);
    expect(tuesday).not.toBe(monday);
  });

  it('drops the referrer when it is the site itself', async () => {
    await call('/e', beacon({ ...view, referrer: `${SITE}/blog/` }));
    expect((await rows('events'))[0]!.referrer).toBeNull();
  });

  it('does not count a visitor whose browser asks not to be tracked', async () => {
    await call('/e', beacon(view, { 'Sec-GPC': '1' }));
    await call('/e', beacon(view, { DNT: '1' }));
    expect(await rows('events')).toHaveLength(0);
  });

  it('does not count bots', async () => {
    await call('/e', beacon(view, { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }));
    await call('/e', beacon(view, { 'User-Agent': 'Mozilla/5.0 HeadlessChrome/141.0.0.0' }));
    expect(await rows('events')).toHaveLength(0);
  });

  it('ignores events from other sites, and rejects malformed ones', async () => {
    await call('/e', beacon(view, { Origin: 'https://evil.example' }));
    expect(await rows('events')).toHaveLength(0);
    expect((await call('/e', beacon({ name: 'evil', path: '/' }))).status).toBe(400);
  });
});

describe('networks', () => {
  it('sorts networks into cloud, home and business', () => {
    expect(networkKind(16509, 'Amazon.com, Inc.')).toBe('cloud');
    expect(networkKind(24940, 'Hetzner Online GmbH')).toBe('cloud');
    expect(networkKind(55836, 'Reliance Jio Infocomm Limited')).toBe('home');
    expect(networkKind(7922, 'Comcast Cable Communications, LLC')).toBe('home');
    expect(networkKind(64500, 'Acme Corp')).toBe('business');
    expect(networkKind(null, null)).toBe('home');
  });

  it('names business networks only', () => {
    expect(networkLabel(64500, 'Acme Corp')).toBe('Acme Corp');
    expect(networkLabel(55836, 'Reliance Jio Infocomm Limited')).toBe('home or mobile internet');
    expect(networkLabel(16509, 'Amazon.com, Inc.')).toBe('cloud');
  });
});

describe('totals', () => {
  const base: EventRow = { day: '2026-10-26', name: 'view', path: '/', referrer: null, ref: null, source: null, country: 'DE', device: 'desktop', browser: 'Chrome', asn: 64500, network: 'Acme Corp', visitor: 'a', duration: null, detail: null };

  it('counts views and unique visitors per dimension', () => {
    const t = totals([base, { ...base, path: '/blog/' }, { ...base, visitor: 'b', country: 'IN' }]);
    expect(t.find((r) => r.dimension === 'all')).toMatchObject({ views: 3, visitors: 2 });
    expect(t.find((r) => r.dimension === 'country' && r.value === 'IN')).toMatchObject({ views: 1, visitors: 1 });
  });

  it('leaves out cloud visitors unless they showed human signs', () => {
    const cloud = { ...base, visitor: 'c', asn: 16509, network: 'Amazon.com, Inc.' };
    expect(totals([base, cloud]).find((r) => r.dimension === 'all')).toMatchObject({ visitors: 1 });
    const stayed = { ...cloud, name: 'leave', duration: 45_000 };
    expect(totals([base, cloud, stayed]).find((r) => r.dimension === 'all')).toMatchObject({ visitors: 2 });
  });
});

describe('scheduled jobs', () => {
  const insert = (day: string, extra: Partial<EventRow> = {}) => {
    const e = { name: 'view', path: '/', country: 'DE', device: 'desktop', browser: 'Chrome', asn: 64500, network: 'Acme Corp', visitor: 'v1', ...extra };
    return env.DB.prepare('INSERT INTO events (at, day, name, path, country, device, browser, asn, network, visitor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(`${day}T12:00:00.000Z`, day, e.name, e.path, e.country, e.device, e.browser, e.asn, e.network, e.visitor).run();
  };

  it('rolls up yesterday and deletes what has aged out', async () => {
    await insert('2026-10-25');
    await insert('2026-10-25', { path: '/blog/', visitor: 'v2' });
    await insert('2026-09-01');
    await env.DB.prepare("INSERT INTO daily VALUES ('2025-09-01', 'network', 'Acme Corp', 1, 1)").run();
    await env.DB.prepare("INSERT INTO messages (received_at, name, email, message) VALUES ('2026-06-01T00:00:00.000Z', 'Old', 'old@example.com', 'An old message')").run();

    await worker.scheduled(createScheduledController({ scheduledTime: Date.parse('2026-10-26T00:10:00Z'), cron: '10 0 * * *' }), env);

    const daily = await rows('daily');
    expect(daily).toContainEqual({ day: '2026-10-25', dimension: 'all', value: '', views: 2, visitors: 2 });
    expect(daily).toContainEqual({ day: '2026-10-25', dimension: 'network', value: 'Acme Corp', views: 2, visitors: 2 });
    expect(daily.find((r) => r.day === '2025-09-01')).toBeUndefined();
    expect((await rows('events')).map((r) => r.day)).toEqual(['2026-10-25', '2026-10-25']);
    expect(await rows('messages')).toHaveLength(0);
  });

  it('sends the weekly digest, naming business networks and not home providers', async () => {
    await insert('2026-10-21');
    await insert('2026-10-22', { visitor: 'v2', asn: 55836, network: 'Reliance Jio Infocomm Limited', country: 'IN' });
    await env.DB.prepare("INSERT INTO messages (received_at, name, email, message, emailed) VALUES ('2026-10-23T09:00:00.000Z', 'Ada Lovelace', 'ada@example.com', 'Hello there, about a role', 1)").run();

    await worker.scheduled(createScheduledController({ scheduledTime: Date.parse('2026-10-26T03:30:00Z'), cron: '30 3 * * 1' }), env);

    expect(mails).toHaveLength(1);
    const { subject, text } = mails[0] as { subject: string; text: string };
    expect(subject).toBe('Portfolio: 2 visitors and 2 page views, 2026-10-19 to 2026-10-25');
    expect(text).toContain('Acme Corp: 1');
    expect(text).toContain('home or mobile internet: 1');
    expect(text).not.toContain('Reliance Jio');
    expect(text).toContain('Ada Lovelace <ada@example.com>');
  });
});
