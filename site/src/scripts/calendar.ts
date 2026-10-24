// The contribution calendar: a day's note on hover, its count and date, worked out from the week's counts and the
// calendar's first Sunday. On a narrow screen the calendar starts scrolled to the latest weeks, as GitHub's does.
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
    tip.textContent = `${count ? `${count} ${count === 1 ? 'contribution' : 'contributions'}` : 'No contributions'} on ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const r = cell.getBoundingClientRect();
    tip.style.left = `${r.left + r.width / 2}px`;
    tip.style.top = `${r.top}px`;
    tip.hidden = false;
  });
  calendar.addEventListener('pointerleave', hide);
  window.addEventListener('scroll', hide, { passive: true });
  calendar.scrollLeft = calendar.scrollWidth;
}
