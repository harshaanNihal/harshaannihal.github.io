// The experiments are tabs: click or arrow keys pick a file, and only its panel shows. Without JavaScript the
// tabs are hidden and every panel reads in turn.
export function initFileView() {
  const view = document.querySelector('[data-repo-view]');
  if (!view) return;
  const tabs = [...view.querySelectorAll<HTMLElement>('[role="tab"]')];
  const pick = (tab: HTMLElement, focus: boolean) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')!)?.classList.toggle('is-shown', on);
    });
    if (focus) tab.focus();
  };
  const keys: Record<string, (i: number) => number> = {
    ArrowDown: (i) => i + 1,
    ArrowRight: (i) => i + 1,
    ArrowUp: (i) => i - 1,
    ArrowLeft: (i) => i - 1,
    Home: () => 0,
    End: () => tabs.length - 1,
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => pick(tab, false));
    tab.addEventListener('keydown', (event) => {
      const next = keys[event.key]?.(i);
      if (next === undefined) return;
      event.preventDefault();
      pick(tabs[(next + tabs.length) % tabs.length]!, true);
    });
  });
}
