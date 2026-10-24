// Turning raw events into totals, as pure functions so they can be tested without a database. Used by the
// nightly roll-up (one day at a time) and by the weekly digest.
import { networkKind } from './networks';

export interface EventRow {
  day: string;
  name: string;
  path: string;
  referrer: string | null;
  ref: string | null;
  source: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  asn: number | null;
  network: string | null;
  visitor: string;
  duration: number | null;
  detail: string | null;
}

export const dimensions = ['all', 'path', 'country', 'referrer', 'ref', 'device', 'browser', 'network'] as const;
export type Dimension = (typeof dimensions)[number];

export interface Total {
  day: string;
  dimension: Dimension;
  value: string;
  views: number;
  visitors: number;
}

/* Signs that a person was there: they stayed ten seconds, or did something. */
const interactions = new Set(['case_open', 'email_click', 'email_copy', 'form_sent', 'outbound', 'theme']);
const HUMAN_MS = 10_000;

/* Cloud networks are mostly bots: their visitors count only when they show human signs. A visitor is a day's
   hash, so this is decided per day. */
export function people(events: EventRow[]): EventRow[] {
  const human = new Set<string>();
  const cloud = new Set<string>();
  for (const e of events) {
    const id = `${e.day}|${e.visitor}`;
    if (networkKind(e.asn, e.network) === 'cloud') cloud.add(id);
    if (interactions.has(e.name) || (e.name === 'leave' && (e.duration ?? 0) >= HUMAN_MS)) human.add(id);
  }
  return events.filter((e) => {
    const id = `${e.day}|${e.visitor}`;
    return !cloud.has(id) || human.has(id);
  });
}

/* What a network shows as in reports: a business keeps its name, home internet and clouds are only their kind. */
export function networkLabel(asn: number | null, name: string | null): string {
  const kind = networkKind(asn, name);
  return kind === 'business' ? name! : kind === 'home' ? 'home or mobile internet' : 'cloud';
}

function valueOf(e: EventRow, dimension: Dimension): string {
  switch (dimension) {
    case 'all': return '';
    case 'network': return networkLabel(e.asn, e.network);
    default: return e[dimension] ?? '';
  }
}

/* Views and unique visitors, per day, for every value of every dimension. */
export function totals(events: EventRow[]): Total[] {
  const groups = new Map<string, { total: Total; visitors: Set<string> }>();
  for (const e of people(events)) {
    for (const dimension of dimensions) {
      const value = valueOf(e, dimension);
      const key = `${e.day}|${dimension}|${value}`;
      let group = groups.get(key);
      if (!group) {
        group = { total: { day: e.day, dimension, value, views: 0, visitors: 0 }, visitors: new Set() };
        groups.set(key, group);
      }
      if (e.name === 'view') group.total.views++;
      group.visitors.add(e.visitor);
    }
  }
  return [...groups.values()].map(({ total, visitors }) => ({ ...total, visitors: visitors.size }));
}
