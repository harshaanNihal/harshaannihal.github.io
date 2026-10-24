// What every feature reads: the page root (it carries data-theme) and the visitor's motion preference.
export const root = document.documentElement;
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const canHover = () => window.matchMedia('(hover: hover)').matches;
export const hasIntersectionObserver = 'IntersectionObserver' in window;
