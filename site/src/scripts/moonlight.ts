// A soft pool of light follows the pointer across a story card and a button's plate (CSS draws it from --mx and
// --my). A tap or a click places it too, so a finger lights a button where it lands.
import { canHover } from './env';

function place(el: HTMLElement, event: PointerEvent) {
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${Math.round(event.clientX - rect.left)}px`);
  el.style.setProperty('--my', `${Math.round(event.clientY - rect.top)}px`);
}

export function initMoonlight() {
  document.addEventListener('pointerdown', (event) => {
    const button = (event.target as Element | null)?.closest?.<HTMLElement>('.btn');
    if (button) place(button, event);
  }, { passive: true });
  if (!canHover()) return;
  document.addEventListener('pointermove', (event) => {
    const lit = (event.target as Element | null)?.closest?.<HTMLElement>('.story, .btn');
    if (lit) place(lit, event);
  }, { passive: true });
}
