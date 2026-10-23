/* Portfolio behavior. Vanilla JS, inlined into every page. Every feature is optional:
   the page reads fine without any of it. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Theme: night by default, day on request, remembered. */
  var toggle = document.querySelector('[data-theme-toggle]');
  var themeColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (themeColor) themeColor.setAttribute('content', theme === 'light' ? '#f8f1dc' : '#0a1329');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(theme === 'light'));
      toggle.setAttribute('aria-label', theme === 'light' ? 'Switch to night theme' : 'Switch to day theme');
    }
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch (e) { /* private mode */ }
    }
  }

  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
  if (toggle) {
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    });
  }

  /* Mobile menu. */
  var header = document.querySelector('[data-header]');
  var navToggle = document.querySelector('[data-nav-toggle]');

  function setMenu(open) {
    header.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (header && navToggle) {
    navToggle.addEventListener('click', function () {
      setMenu(!header.classList.contains('nav-open'));
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && header.classList.contains('nav-open')) {
        setMenu(false);
        navToggle.focus();
      }
    });
    header.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }

  /* Reveal sections as they scroll into view. */
  var revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealed.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }

  /* Mark the section in view in the nav. */
  var links = {};
  document.querySelectorAll('[data-nav]').forEach(function (link) { links[link.getAttribute('data-nav')] = link; });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(links).forEach(function (key) { links[key].removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { navObserver.observe(section); });
  }

  /* Copy the email address. */
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    var label = button.querySelector('[data-copy-label]');
    var original = label ? label.textContent : '';
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy');
      var done = function () {
        if (label) label.textContent = 'Copied';
        setTimeout(function () { if (label) label.textContent = original; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this email:', text); });
      } else {
        window.prompt('Copy this email:', text);
      }
    });
  });
})();
