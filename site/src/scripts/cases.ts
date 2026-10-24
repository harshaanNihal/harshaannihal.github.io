// A link to a case study (from the Experience ledger, or a #case- address) opens it.
function open(hash: string | null) {
  if (!hash || !hash.startsWith('#case-')) return;
  const more = document.getElementById(hash.slice(1))?.querySelector('details');
  if (more) more.open = true;
}

export function initCases() {
  document.querySelectorAll('[data-open-case]').forEach((link) => {
    link.addEventListener('click', () => open(link.getAttribute('href')));
  });
  open(location.hash);
}
