// A #case- address opens that case study: a role's system in the Experience ledger, or a product in Work.
export function initCases() {
  if (!location.hash.startsWith('#case-')) return;
  const target = document.getElementById(location.hash.slice(1));
  const more = target instanceof HTMLDetailsElement ? target : target?.querySelector('details');
  if (more) more.open = true;
}
