// The nav marks the section in view. A link can stand for several sections (data-nav="work code").
import { hasIntersectionObserver } from './env';

export function initNavSpy() {
  const links: Record<string, Element> = {};
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.getAttribute('data-nav')!.split(' ').forEach((id) => { links[id] = link; });
  });
  const sections = Object.keys(links).map((id) => document.getElementById(id)).filter((s): s is HTMLElement => !!s);
  if (!sections.length || !hasIntersectionObserver) return;

  let inBand: string | null = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) inBand = entry.target.id;
      else if (inBand === entry.target.id) inBand = null;
    });
    Object.values(links).forEach((link) => link.removeAttribute('aria-current'));
    if (inBand) links[inBand]!.setAttribute('aria-current', 'true');
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((section) => observer.observe(section));
}
