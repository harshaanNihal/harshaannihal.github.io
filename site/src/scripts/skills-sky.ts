// The skills sky. Each role in Experience names the skills it used (data-skills). A role lights those stars, and
// one line joins them top to bottom, star centre to star centre, into that role's own constellation, with the
// role's name lettered in the middle where the line leaves room. The line draws itself in and each star lights as the
// pen reaches it; the first time, the sky waits until it is on screen. Changing role fades the old line as the new
// one draws. The Experience sky (data-follow) lights the role being read or hovered as well as the one picked with a
// pill, and marks that role in the ledger; the copy in Code answers its pills only.
import { canHover, hasIntersectionObserver, reduceMotion } from './env';

const DRAW_MS = 900; /* the line's draw in site.css: stroke-dashoffset 0.9s var(--ease-draw) */

/* The moment the line's ease, cubic-bezier(0.65, 0, 0.35, 1), has drawn a share p of it, as a share of the time. */
function timeFor(p: number): number {
  const at = (s: number, a: number, b: number) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const s = (lo + hi) / 2;
    if (at(s, 0, 1) < p) lo = s; else hi = s;
  }
  return at((lo + hi) / 2, 0.65, 0.35);
}

interface Vertex { x: number; y: number; star: HTMLElement }
interface Box { l: number; t: number; r: number; b: number }

/* Whether the segment a-b passes through the box (Liang-Barsky clipping). */
function hits(a: Vertex, b: Vertex, box: Box): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, a.x - box.l], [dx, box.r - a.x], [-dy, a.y - box.t], [dy, box.b - a.y]] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return true;
}

/* Heights for the role's name, nearest the middle first, as shares of the field. */
const NAME_AT = [0.5, 0.44, 0.56, 0.38, 0.62, 0.32, 0.68, 0.26, 0.74];

function initSky(sky: HTMLElement) {
  const field = sky.querySelector<HTMLElement>('.skill-sky__field');
  const line = sky.querySelector<SVGPolylineElement>('.skill-sky__lines .is-new');
  const old = sky.querySelector<SVGPolylineElement>('.skill-sky__lines .is-old');
  const name = sky.querySelector<HTMLElement>('[data-sky-name]');
  if (!field || !line || !old || !name) return;
  const follow = sky.hasAttribute('data-follow');
  const stars = [...sky.querySelectorAll<HTMLElement>('[data-skill]')];
  const pills = [...sky.querySelectorAll<HTMLElement>('[data-show-role]')];
  const roles = follow ? [...document.querySelectorAll<HTMLElement>('[data-role]')] : [];
  let active: HTMLElement | null = null;
  let skills: string[] = [];
  let seen = !hasIntersectionObserver;
  let fading: Animation | null = null;
  if (!seen) sky.classList.add('is-waiting');

  /* The star sits on the label's inner edge, the one facing the middle of the oval, and the line meets it at its
     centre. Where it passes an unlit star, that star's ring of the page colour lets it read as passing behind. */
  const route = (): Vertex[] => {
    const box = field.getBoundingClientRect();
    return stars.filter((star) => skills.includes(star.getAttribute('data-skill')!)).map((star) => {
      const r = star.getBoundingClientRect();
      return { x: (star.classList.contains('is-left') ? r.right : r.left) - box.left, y: r.top + r.height / 2 - box.top, star };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
  };

  /* The name sits as near the middle as it can without the line or a star running through it. Where the oval is too
     narrow for it (a phone), it stays out: the pressed button already names the role. */
  const placeName = (path: Vertex[], box: DOMRect) => {
    /* A word too long for the box overflows it, so the name's ink is the wider of the two. */
    const w = Math.max(name.offsetWidth, name.scrollWidth) / 2 + 8;
    const h = name.offsetHeight / 2 + 4;
    const dots = stars.map((star) => {
      const r = star.getBoundingClientRect();
      const x = (star.classList.contains('is-left') ? r.right : r.left) - box.left;
      return { x, y: r.top + r.height / 2 - box.top };
    });
    const at = NAME_AT.find((share) => {
      const y = share * box.height;
      const zone = { l: box.width / 2 - w, r: box.width / 2 + w, t: y - h, b: y + h };
      return path.every((pt, k) => !k || !hits(path[k - 1]!, pt, zone))
        && dots.every((d) => d.x < zone.l - 10 || d.x > zone.r + 10 || d.y < zone.t - 10 || d.y > zone.b + 10);
    });
    name.toggleAttribute('data-crowded', at === undefined);
    name.style.setProperty('--name-at', `${(at ?? 0.5) * 100}%`);
  };

  /* Lays the line along the route. Drawn, it is hidden and then drawn in, and each star is told (--at) when the pen
     reaches it. */
  const join = (draw: boolean) => {
    const box = field.getBoundingClientRect();
    const path = route();
    line.ownerSVGElement?.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    line.setAttribute('points', path.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' '));
    placeName(path, box);
    const length = path.length > 1 ? line.getTotalLength() : 0;
    const animate = draw && seen && !reduceMotion.matches;
    let run = 0;
    path.forEach((pt, k) => {
      if (k) run += Math.hypot(pt.x - path[k - 1]!.x, pt.y - path[k - 1]!.y);
      pt.star.style.setProperty('--at', `${animate && length ? Math.round(timeFor(run / length) * DRAW_MS) : 0}ms`);
    });
    line.style.transition = 'none';
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = String(seen && !animate ? 0 : length);
    if (animate) {
      line.getBoundingClientRect(); /* commit the hidden line before it draws */
      line.style.transition = '';
      line.style.strokeDashoffset = '0';
    }
  };

  /* The line on screen hands over to the old one, which fades while the new one draws. */
  const fadeOut = () => {
    fading?.cancel();
    if (!seen || reduceMotion.matches || !line.getAttribute('points')) return;
    old.setAttribute('points', line.getAttribute('points')!);
    fading = old.animate([{ opacity: 0.7 }, { opacity: 0 }], { duration: 250, easing: 'ease-out', fill: 'forwards' });
  };

  const label = (role: HTMLElement) => pills.find((pill) => pill.getAttribute('data-show-role') === role.id)?.textContent?.trim() ?? '';

  const light = (role: HTMLElement | null) => {
    if (!role || role === active) return;
    active = role;
    fadeOut();
    skills = role.getAttribute('data-skills')!.split(' ');
    name.textContent = label(role);
    join(true); /* sets each star's --at before it is lit, so its light waits for the pen */
    stars.forEach((star) => star.classList.toggle('is-lit', skills.includes(star.getAttribute('data-skill')!)));
    roles.forEach((r) => r.classList.toggle('is-active', r === role));
    pills.forEach((pill) => pill.setAttribute('aria-pressed', String(pill.getAttribute('data-show-role') === role.id)));
    if (seen && !reduceMotion.matches) name.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
  };
  const roleOf = (pill: HTMLElement | undefined) => (pill ? document.getElementById(pill.getAttribute('data-show-role')!) : null);

  pills.forEach((pill) => pill.addEventListener('click', () => light(roleOf(pill))));
  if (follow && canHover()) roles.forEach((role) => role.addEventListener('pointerenter', () => light(role)));
  light(follow ? roles[0] ?? null : roleOf(pills[0]));

  if (!seen) {
    if (follow) {
      /* The role crossing a band just above the middle of the screen is the one being read. */
      const reading = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) light(entry.target as HTMLElement); });
      }, { rootMargin: '-40% 0px -55% 0px' });
      roles.forEach((role) => reading.observe(role));
    }

    /* The first look draws the constellation in; off screen, the stars stop catching the light. */
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]!;
      sky.toggleAttribute('data-sky-off', !entry.isIntersecting);
      if (seen || entry.intersectionRatio < 0.35) return;
      seen = true;
      join(true);
      sky.classList.remove('is-waiting');
    }, { threshold: [0, 0.35] }).observe(field);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => join(false)).observe(field);
}

export function initSkillsSky() {
  document.querySelectorAll<HTMLElement>('[data-skill-sky]').forEach(initSky);
}
