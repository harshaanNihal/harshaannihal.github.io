// The rooms with a painted sky: the hero, and the Contact finale. A room is lit the first time it is seen (the
// Contact sky waits for that to play its entrance) and its loops rest while it is off screen. Without
// IntersectionObserver every room is lit at once.
import { hasIntersectionObserver } from './env';

export function initSkyRooms() {
  const hosts = document.querySelectorAll<HTMLElement>('[data-sky-host]');
  if (!hasIntersectionObserver) {
    hosts.forEach((host) => host.classList.add('is-lit'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const host = entry.target;
      if (!entry.isIntersecting) {
        host.setAttribute('data-sky-off', '');
        return;
      }
      host.removeAttribute('data-sky-off');
      const enough = entry.intersectionRatio >= 0.3 || entry.intersectionRect.height > window.innerHeight * 0.45;
      if (!host.classList.contains('is-lit') && enough) {
        host.classList.add('is-lit');
        host.dispatchEvent(new CustomEvent('sky:lit'));
      }
    });
  }, { threshold: [0, 0.15, 0.3, 0.45, 0.6] });
  hosts.forEach((host) => observer.observe(host));
}
