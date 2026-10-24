// The scheduled jobs. Nightly: roll yesterday's events into daily totals, then delete what has aged out (raw events
// after 30 days, network names after 12 months, totals after 25 months, messages after 90 days). Mondays: the
// weekly digest. The daily salts need no job: KV deletes each one minutes after its day ends.
import { digest, type MessageRow } from './digest';
import { sendMail } from './email';
import { totals, type EventRow } from './report';

const COLUMNS = 'day, name, path, referrer, ref, source, country, device, browser, asn, network, visitor, duration, detail';

const shiftDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export async function rollUp(env: Env, day: string) {
  const { results } = await env.DB.prepare(`SELECT ${COLUMNS} FROM events WHERE day = ?`).bind(day).all<EventRow>();
  const rows = totals(results);
  const insert = env.DB.prepare('INSERT OR REPLACE INTO daily (day, dimension, value, views, visitors) VALUES (?, ?, ?, ?, ?)');
  if (rows.length) await env.DB.batch(rows.map((t) => insert.bind(t.day, t.dimension, t.value, t.views, t.visitors)));
}

export async function forget(env: Env, today: string) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE day < ?').bind(shiftDays(today, -30)),
    env.DB.prepare("DELETE FROM daily WHERE dimension = 'network' AND day < date(?, '-12 months')").bind(today),
    env.DB.prepare("DELETE FROM daily WHERE day < date(?, '-25 months')").bind(today),
    env.DB.prepare('DELETE FROM messages WHERE received_at < ?').bind(`${shiftDays(today, -90)}T00:00:00.000Z`),
  ]);
}

export async function weekly(env: Env, today: string) {
  const from = shiftDays(today, -7);
  const to = shiftDays(today, -1);
  const { results: events } = await env.DB.prepare(`SELECT ${COLUMNS} FROM events WHERE day BETWEEN ? AND ?`).bind(from, to).all<EventRow>();
  const { results: messages } = await env.DB.prepare('SELECT received_at, name, email, country, emailed FROM messages WHERE received_at >= ? ORDER BY received_at')
    .bind(`${from}T00:00:00.000Z`).all<MessageRow>();
  await sendMail(env, digest(events, messages, from, to));
}

export async function scheduled(controller: ScheduledController, env: Env) {
  const today = new Date(controller.scheduledTime).toISOString().slice(0, 10);
  if (controller.cron === '30 3 * * 1') return weekly(env, today);
  await rollUp(env, shiftDays(today, -1));
  await forget(env, today);
}
