// The Monday email: last week's visitors and what they did, and the messages that came in.
import { escapeHtml, type Mail } from './email';
import { people, totals, type Dimension, type EventRow, type Total } from './report';

export interface MessageRow {
  received_at: string;
  name: string;
  email: string;
  country: string | null;
  emailed: number;
}

interface Section {
  title: string;
  rows: [string, string][];
}

/* Daily uniques, summed over the week: a person who came back on two days counts twice, by design. */
function top(all: Total[], dimension: Dimension, by: 'views' | 'visitors', limit = 8): [string, string][] {
  const sums = new Map<string, number>();
  for (const t of all) {
    if (t.dimension !== dimension || !t.value) continue;
    sums.set(t.value, (sums.get(t.value) ?? 0) + t[by]);
  }
  return [...sums].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value, n]) => [value, String(n)]);
}

function countBy(events: EventRow[], name: string): [string, string][] {
  const counts = new Map<string, number>();
  for (const e of events) if (e.name === name) counts.set(e.detail ?? '', (counts.get(e.detail ?? '') ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([detail, n]) => [detail || '(no detail)', String(n)]);
}

export function digest(events: EventRow[], messages: MessageRow[], from: string, to: string): Mail {
  const all = totals(events);
  const kept = people(events);
  const sum = (by: 'views' | 'visitors') => all.filter((t) => t.dimension === 'all').reduce((n, t) => n + t[by], 0);
  const sections: Section[] = [
    { title: 'Pages (views)', rows: top(all, 'path', 'views') },
    { title: 'Countries (visitors)', rows: top(all, 'country', 'visitors') },
    { title: 'Came from (visitors)', rows: top(all, 'referrer', 'visitors') },
    { title: 'Ref tags (visitors)', rows: top(all, 'ref', 'visitors') },
    { title: 'Networks (visitors)', rows: top(all, 'network', 'visitors') },
    { title: 'Devices (visitors)', rows: top(all, 'device', 'visitors') },
    { title: 'Case studies opened', rows: countBy(kept, 'case_open') },
    { title: 'Links followed', rows: countBy(kept, 'outbound') },
    { title: 'Email links clicked', rows: countBy(kept, 'email_click') },
    { title: 'Email address copied', rows: countBy(kept, 'email_copy') },
    {
      title: 'Messages',
      rows: messages.map((m): [string, string] => [`${m.name} <${m.email}>${m.country ? `, ${m.country}` : ''}`, m.emailed ? m.received_at.slice(0, 10) : `${m.received_at.slice(0, 10)}, email failed`]),
    },
  ].filter((s) => s.rows.length);

  const headline = `${sum('visitors')} visitors and ${sum('views')} page views, ${from} to ${to}`;
  const text = [headline, '', ...sections.flatMap((s) => [s.title, ...s.rows.map(([k, v]) => `  ${k}: ${v}`), ''])].join('\n');
  const html = `<p><strong>${escapeHtml(headline)}</strong></p>`
    + sections.map((s) => `<h3>${escapeHtml(s.title)}</h3><table>${s.rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td align="right">${escapeHtml(v)}</td></tr>`).join('')}</table>`).join('')
    + '<p style="color:#666">Visitors are counted once a day; a person who came back on two days counts twice.</p>';
  return { subject: `Portfolio: ${headline}`, text, html };
}
