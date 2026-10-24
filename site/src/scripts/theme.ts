// Theme: night by default, day on request, remembered. The head script sets data-theme before first paint;
// this keeps the toggle, the browser bar color and the stored choice in step with it.
import { reduceMotion, root } from './env';

type Theme = 'light' | 'dark';

export function initTheme() {
  const toggle = document.querySelector<HTMLElement>('[data-theme-toggle]');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  const apply = (theme: Theme, persist: boolean) => {
    root.setAttribute('data-theme', theme);
    themeColor?.setAttribute('content', theme === 'light' ? '#f8f1dc' : '#061033');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(theme === 'light'));
      toggle.setAttribute('aria-label', theme === 'light' ? 'Switch to night theme' : 'Switch to day theme');
    }
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch { /* private mode */ }
    }
  };

  const current = (): Theme => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  apply(current(), false);
  if (!toggle) return;
  let shiftTimer = 0;
  toggle.addEventListener('click', () => {
    /* Colors cross-fade for a moment (dusk or daybreak) while the dial turns. */
    if (!reduceMotion.matches) {
      root.classList.add('theme-shift');
      clearTimeout(shiftTimer);
      shiftTimer = window.setTimeout(() => root.classList.remove('theme-shift'), 700);
    }
    apply(current() === 'light' ? 'dark' : 'light', true);
  });
}
