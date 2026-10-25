// The visit counter: a beacon per page view, one when the page is left, and a few clicks worth knowing about
// (a case study opened, the email copied or clicked, a link followed, the theme switched, the form sent). It
// stores nothing on the device to recognise anyone. It stays silent without an API, when the browser sends
// Global Privacy Control or Do Not Track, and after the visitor turns counting off on the privacy page.
import type { PageEvent } from '@portfolio/contract';
import { apiUrl } from '../lib/api';

/* The one thing kept in the browser, and only when the visitor asks: their choice not to be counted. */
export const OPT_OUT_KEY = 'count-visits';

export function counting(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (!apiUrl || nav.globalPrivacyControl || navigator.doNotTrack === '1') return false;
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== 'no';
  } catch {
    return true;
  }
}

let on = false;

function send(event: PageEvent) {
  const url = `${apiUrl}/e`;
  const body = JSON.stringify(event);
  if (!navigator.sendBeacon?.(url, body)) fetch(url, { method: 'POST', body, keepalive: true, credentials: 'omit' }).catch(() => {});
}

export function track(name: PageEvent['name'], detail?: string) {
  if (on) send({ name, path: location.pathname, ...(detail ? { detail: detail.slice(0, 100) } : {}) });
}

/* Which part of the page a click came from: a section's id, or the first class of the ask band, the sign-off
   or the footer. */
function area(el: Element): string | undefined {
  const part = el.closest('section, aside, footer');
  return part?.id || part?.classList[0];
}

export function initBeacon() {
  on = counting();
  if (!on) return;
  send({ name: 'view', path: location.pathname, referrer: document.referrer || undefined, query: location.search || undefined, width: window.innerWidth });

  const opened = performance.now();
  let left = false;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || left) return;
    left = true;
    send({ name: 'leave', path: location.pathname, duration: Math.round(performance.now() - opened) });
  });

  /* A details element's toggle doesn't bubble, so listen while it travels down. */
  document.addEventListener('toggle', (event) => {
    const details = event.target;
    if (details instanceof HTMLDetailsElement && details.open && details.dataset.case) track('case_open', details.dataset.case);
  }, true);

  document.addEventListener('click', (event) => {
    const el = event.target as Element | null;
    if (!el?.closest) return;
    if (el.closest('[data-copy]')) return track('email_copy', area(el));
    /* The theme script has already switched it, so this is the theme picked. */
    if (el.closest('[data-theme-toggle]')) return track('theme', document.documentElement.dataset.theme);
    const link = el.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    if (link.protocol === 'mailto:') track('email_click', area(link));
    else if (link.host && link.host !== location.host) track('outbound', link.host);
  });
}
