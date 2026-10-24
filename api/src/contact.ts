// POST /contact: a message from the form. It works with and without JavaScript: the page script asks for JSON and
// shows the result in place; a plain form post is sent on to the site's "sent" or "error" page.
import { contactMessage, type ContactMessage } from '@portfolio/contract';
import { escapeHtml, sendMail } from './email';
import { allowedOrigin, json, redirect, withCors } from './http';
import { today, visitorId } from './visitor';

const PER_HOUR = 3;
/* Faster than this from the form appearing to its sending is a script, not a person. */
const MIN_FILL_MS = 3000;

type Outcome = 'sent' | 'invalid' | 'limited' | 'error';

export async function handleContact(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const origin = allowedOrigin(request, env);
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');
  const reply = (outcome: Outcome, status: number) =>
    withCors(wantsJson ? json({ outcome }, status) : redirect(`${env.SITE_ORIGIN}/contact/${outcome === 'sent' ? 'sent' : 'error'}/`), origin);

  /* Only the site's own pages may send a message. */
  if (!origin) return reply('invalid', 403);

  let fields: Record<string, string>;
  try {
    fields = Object.fromEntries([...(await request.formData())].map(([k, v]) => [k, String(v)]));
  } catch {
    return reply('invalid', 400);
  }
  const parsed = contactMessage.safeParse(fields);
  if (!parsed.success) return reply('invalid', 400);
  const message = parsed.data;

  /* A filled honeypot, or a form sent faster than anyone types: answer as if it was sent, and keep nothing. */
  if (message.website || (message.shown && Date.now() - message.shown < MIN_FILL_MS)) return reply('sent', 200);

  const visitor = await visitorId(env.KV, today(), new URL(env.SITE_ORIGIN).host, request.headers.get('CF-Connecting-IP') ?? '', request.headers.get('User-Agent') ?? '');
  const key = `rate:${visitor}`;
  const sentThisHour = Number(await env.KV.get(key)) || 0;
  if (sentThisHour >= PER_HOUR) return reply('limited', 429);
  await env.KV.put(key, String(sentThisHour + 1), { expirationTtl: 3600 });

  const country = (request.cf as IncomingRequestCfProperties | undefined)?.country ?? null;
  const row = await env.DB.prepare('INSERT INTO messages (received_at, name, email, message, country) VALUES (?, ?, ?, ?, ?) RETURNING id')
    .bind(new Date().toISOString(), message.name, message.email, message.message, country)
    .first<{ id: number }>();
  if (!row) return reply('error', 500);
  ctx.waitUntil(notify(env, row.id, message, country));
  return reply('sent', 200);
}

async function notify(env: Env, id: number, m: ContactMessage, country: string | null) {
  const from = country ? `, from ${country}` : '';
  const sent = await sendMail(env, {
    subject: `Portfolio: a message from ${m.name}`,
    text: `${m.name} <${m.email}>${from} wrote:\n\n${m.message}\n\nReply to this email to answer them.`,
    html: `<p><strong>${escapeHtml(m.name)}</strong> &lt;${escapeHtml(m.email)}&gt;${escapeHtml(from)} wrote:</p>`
      + `<p style="white-space:pre-wrap">${escapeHtml(m.message)}</p><p>Reply to this email to answer them.</p>`,
    replyTo: m.email,
  });
  if (sent) await env.DB.prepare('UPDATE messages SET emailed = 1 WHERE id = ?').bind(id).run();
}
