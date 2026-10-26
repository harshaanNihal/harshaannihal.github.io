// The contribution calendar: a day's note on hover, its count and date, worked out from the week's counts and the
// calendar's first Sunday, and whether it's in the longest streak. On a narrow screen the calendar scrolls, and it
// opens on the longest streak (or on the latest weeks, without one). While it's on screen the year twinkles.
import { hasIntersectionObserver, reduceMotion } from './env';

/* Halfway through, a twinkling day is the colour the stylesheet gives it (--twinkle), in its own hue. */
const TWINKLE: Keyframe[] = [{ backgroundColor: 'var(--twinkle)', offset: 0.45 }];

/* Every so often a day with contributions dims for a moment and comes back, like a star in the painting, and the
   streak's gold days catch the light more often than the rest: a few at a time, only while the calendar is on
   screen and the tab is in view, and never when the visitor asks for less motion. */
function twinkle(calendar: HTMLElement) {
  const days = [...calendar.querySelectorAll('.gh__grid i:not(.l0)')];
  const streak = [...calendar.querySelectorAll('.gh__grid i[data-streak]')];
  if (!days.length || !hasIntersectionObserver) return;
  let timer = 0;
  let onScreen = false;
  const next = () => {
    const pool = streak.length && Math.random() < 0.25 ? streak : days;
    pool[Math.floor(Math.random() * pool.length)]!.animate(TWINKLE, { duration: 1600, easing: 'ease-in-out' });
    timer = window.setTimeout(next, 80 + Math.random() * 120);
  };
  const update = () => {
    clearTimeout(timer);
    if (onScreen && !document.hidden && !reduceMotion.matches) next();
  };
  new IntersectionObserver(([entry]) => {
    onScreen = !!entry?.isIntersecting;
    update();
  }).observe(calendar);
  document.addEventListener('visibilitychange', update);
  reduceMotion.addEventListener?.('change', update);
}

export function initCalendar() {
  const calendar = document.querySelector<HTMLElement>('[data-calendar]');
  if (!calendar) return;
  const first = new Date(`${calendar.getAttribute('data-start')}T00:00:00`);
  const weeks = [...calendar.querySelectorAll('.gh__week')];
  let tip: HTMLDivElement | null = null;
  const hide = () => { if (tip) tip.hidden = true; };

  calendar.addEventListener('pointerover', (event) => {
    const cell = (event.target as Element | null)?.closest?.('i');
    const week = cell?.parentElement;
    if (!cell || !week) return hide();
    const w = weeks.indexOf(week);
    const d = [...week.children].indexOf(cell);
    const count = +(week.getAttribute('data-c')!.split(',')[d] || 0);
    const day = new Date(first.getTime());
    day.setDate(day.getDate() + w * 7 + d);
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'gh__tip';
      document.body.appendChild(tip);
    }
    const streak = cell.hasAttribute('data-streak') ? ' · in the longest streak' : '';
    tip.textContent = `${count ? `${count} ${count === 1 ? 'contribution' : 'contributions'}` : 'No contributions'} on ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${streak}`;
    const r = cell.getBoundingClientRect();
    tip.style.left = `${r.left + r.width / 2}px`;
    tip.style.top = `${r.top}px`;
    tip.hidden = false;
  });
  /* A finger "leaves" as it lifts, so a tapped day's note stays until the year or the page scrolls, or the visitor
     taps somewhere else. */
  calendar.addEventListener('pointerleave', (event) => { if (event.pointerType !== 'touch') hide(); });
  document.addEventListener('pointerdown', (event) => { if (!calendar.contains(event.target as Node)) hide(); });
  calendar.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('scroll', hide, { passive: true });

  const lit = calendar.querySelectorAll<HTMLElement>('.gh__grid i[data-streak]');
  const middle = lit[lit.length >> 1];
  calendar.scrollLeft = middle ? middle.offsetLeft + middle.offsetWidth / 2 - calendar.clientWidth / 2 : calendar.scrollWidth;
  twinkle(calendar);
}
