// The mobile menu: the round button opens the links, Escape or a link closes them.
export function initMenu() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const toggle = document.querySelector<HTMLElement>('[data-nav-toggle]');
  if (!header || !toggle) return;

  const set = (open: boolean) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => set(!header.classList.contains('nav-open')));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) {
      set(false);
      toggle.focus();
    }
  });
  header.querySelectorAll('.site-nav a').forEach((link) => link.addEventListener('click', () => set(false)));
}
