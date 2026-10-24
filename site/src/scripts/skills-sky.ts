// The skills sky. Each role in Experience names the skills it used (data-skills). The role being read (or
// hovered, or picked with a pill) lights those stars, and one line joins them top to bottom into that role's own
// constellation. The line waits, hidden, until the sky is first on screen, then draws itself in.
import { canHover, hasIntersectionObserver, reduceMotion } from './env';

export function initSkillsSky() {
  const sky = document.querySelector('[data-skill-sky]');
  const field = sky?.querySelector<HTMLElement>('.skill-sky__field');
  const line = sky?.querySelector<SVGPolylineElement>('.skill-sky__lines polyline');
  if (!sky || !field || !line) return;
  const stars = [...sky.querySelectorAll<HTMLElement>('[data-skill]')];
  const roles = [...document.querySelectorAll<HTMLElement>('[data-role]')];
  const pills = [...sky.querySelectorAll<HTMLElement>('[data-show-role]')];
  let active: HTMLElement | null = null;
  let seen = !hasIntersectionObserver;

  const join = (draw: boolean) => {
    const box = field.getBoundingClientRect();
    const points = stars.filter((star) => star.classList.contains('is-lit')).map((star) => {
      /* The star sits on the label's inner edge, the one facing the middle of the oval. The line ends on the
         side of the star that faces the middle, so a chord between two stars on one arc clears the unlit
         stars between them. */
      const r = star.getBoundingClientRect();
      const left = star.classList.contains('is-left');
      return { x: (left ? r.right + 6 : r.left - 6) - box.left, y: r.top + r.height / 2 - box.top };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    line.ownerSVGElement?.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    line.setAttribute('points', points.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' '));
    const length = points.length > 1 ? line.getTotalLength() : 0;
    const animate = draw && seen && !reduceMotion.matches;
    line.style.transition = 'none';
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(seen && !animate ? 0 : length);
    if (animate) {
      line.getBoundingClientRect(); /* commit the hidden line before it draws */
      line.style.transition = '';
      line.style.strokeDashoffset = '0';
    }
  };

  const light = (role: HTMLElement | null) => {
    if (!role || role === active) return;
    active = role;
    const skills = role.getAttribute('data-skills')!.split(' ');
    stars.forEach((star) => star.classList.toggle('is-lit', skills.includes(star.getAttribute('data-skill')!)));
    roles.forEach((r) => r.classList.toggle('is-active', r === role));
    pills.forEach((pill) => pill.setAttribute('aria-pressed', String(pill.getAttribute('data-show-role') === role.id)));
    join(true);
  };

  pills.forEach((pill) => pill.addEventListener('click', () => light(document.getElementById(pill.getAttribute('data-show-role')!))));
  if (canHover()) roles.forEach((role) => role.addEventListener('pointerenter', () => light(role)));
  light(roles[0] ?? null);

  if (!seen) {
    /* The role crossing a band just above the middle of the screen is the one being read. */
    const reading = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) light(entry.target as HTMLElement); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    roles.forEach((role) => reading.observe(role));

    const firstLook = new IntersectionObserver((entries) => {
      if (!entries[entries.length - 1]!.isIntersecting) return;
      seen = true;
      firstLook.disconnect();
      join(true);
    }, { threshold: 0.35 });
    firstLook.observe(field);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => join(false)).observe(field);
}
