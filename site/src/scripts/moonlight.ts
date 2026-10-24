// A soft pool of light follows the pointer across a story card (CSS draws it from --mx and --my).
import { canHover } from './env';

export function initMoonlight() {
  if (!canHover()) return;
  document.addEventListener('pointermove', (event) => {
    const card = (event.target as Element | null)?.closest?.<HTMLElement>('.story');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${Math.round(event.clientX - rect.left)}px`);
    card.style.setProperty('--my', `${Math.round(event.clientY - rect.top)}px`);
  }, { passive: true });
}
