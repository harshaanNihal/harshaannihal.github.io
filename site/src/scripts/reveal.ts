// Sections settle in as they scroll into view. Reduced motion, or no IntersectionObserver, shows them at once.
import { hasIntersectionObserver, reduceMotion } from './env';

export function initReveal() {
  const revealed = document.querySelectorAll('.reveal');
  if (!hasIntersectionObserver || reduceMotion.matches) {
    revealed.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealed.forEach((el) => observer.observe(el));
}
