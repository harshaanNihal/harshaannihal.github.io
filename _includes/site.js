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

  /* ---------- Constellation ---------- */
  /* Gold stars joined by faint blue-white lines, drawn on a canvas inside .sky. The canvas sits
     behind the hero content in the stacking order, so nothing here can paint over text or the
     portrait. Without JavaScript the canvas stays empty and the hero is already finished. */
  (function () {
    var canvas = document.querySelector('[data-constellation]');
    var hero = canvas && canvas.closest('.hero');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx || !hero) return;

    var MAX_STARS = 70;
    var MAX_DPR = 2;
    var FADE_EDGE = 56;       /* stars fade out this close to the hero edge, so wrapping never pops */
    var REPEL_RADIUS = 150;
    var MIN_FRAME_MS = 15;    /* about 60 fps even on 120 Hz screens */

    var stars = [];
    var width = 0;
    var height = 0;
    var dpr = 1;
    var linkDistance = 130;
    var colors = { star: [255, 224, 138], glow: [242, 193, 78], line: [207, 226, 255], lineAlpha: 0.22 };
    var sprite = null;
    var pointer = { x: 0, y: 0, active: false };
    var inView = true;
    var running = false;
    var lastTime = 0;
    var resizeTimer = 0;

    function parseColor(value, fallback) {
      var v = (value || '').trim();
      var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
      if (m) {
        var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v);
      return m ? [+m[1], +m[2], +m[3]] : fallback;
    }

    /* One glowing star, painted once and stamped for every star. Rebuilt when the theme changes. */
    function buildSprite() {
      var size = 64;
      var c = sprite || document.createElement('canvas');
      c.width = c.height = size;
      var g = c.getContext('2d');
      g.clearRect(0, 0, size, size);
      var s = colors.star.join(',');
      var o = colors.glow.join(',');
      var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(' + s + ',1)');
      grad.addColorStop(0.13, 'rgba(' + s + ',0.95)');
      grad.addColorStop(0.2, 'rgba(' + o + ',0.4)');
      grad.addColorStop(0.45, 'rgba(' + o + ',0.12)');
      grad.addColorStop(1, 'rgba(' + o + ',0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      sprite = c;
    }

    function readColors() {
      var style = getComputedStyle(canvas);
      colors.star = parseColor(style.getPropertyValue('--c-star'), colors.star);
      colors.glow = parseColor(style.getPropertyValue('--c-glow'), colors.glow);
      colors.line = parseColor(style.getPropertyValue('--c-line'), colors.line);
      var a = parseFloat(style.getPropertyValue('--c-line-a'));
      colors.lineAlpha = a > 0 ? a : colors.lineAlpha;
      buildSprite();
    }

    function makeStar(x, y) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 4 + Math.random() * 9;
      var bright = Math.random();
      return {
        x: x, y: y,
        bx: Math.cos(angle) * speed, by: Math.sin(angle) * speed,
        vx: 0, vy: 0,
        r: 0.7 + bright * bright * 1.5,
        a: 0.5 + Math.random() * 0.45,
        phase: Math.random() * 6.28,
        rate: 0.5 + Math.random() * 1.1,
        fade: 1
      };
    }

    function layout() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      if (!w || !h) return false;
      var ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      if (stars.length && w === width && h === height && ratio === dpr) return true;
      dpr = ratio;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.max(18, Math.min(MAX_STARS, Math.round((w * h) / 14000)));
      if (!stars.length) {
        /* A jittered grid spreads the first stars evenly, with no clumps. */
        var cols = Math.ceil(Math.sqrt(count * w / h));
        var rows = Math.ceil(count / cols);
        for (var i = 0; i < count; i++) {
          stars.push(makeStar(((i % cols) + Math.random()) * w / cols, (Math.floor(i / cols) + Math.random()) * h / rows));
        }
      } else {
        stars.forEach(function (s) { s.x *= w / width; s.y *= h / height; });
        while (stars.length > count) stars.pop();
        while (stars.length < count) stars.push(makeStar(Math.random() * w, Math.random() * h));
      }
      width = w;
      height = h;
      linkDistance = Math.max(100, Math.min(170, Math.sqrt((w * h) / count) * 1.25));
      return true;
    }

    function step(dt) {
      var px = 0;
      var py = 0;
      if (pointer.active) {
        var rect = hero.getBoundingClientRect();
        px = pointer.x - rect.left;
        py = pointer.y - rect.top;
      }
      var settle = 1 - Math.exp(-2 * dt);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (pointer.active) {
          var dx = s.x - px;
          var dy = s.y - py;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < REPEL_RADIUS && d > 0.01) {
            var push = 1 - d / REPEL_RADIUS;
            push = push * push * 480 * dt;
            s.vx += (dx / d) * push;
            s.vy += (dy / d) * push;
          }
        }
        /* Velocity eases back to the star's own slow drift after a push. */
        s.vx += (s.bx - s.vx) * settle;
        s.vy += (s.by - s.vy) * settle;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < 0) s.x += width; else if (s.x > width) s.x -= width;
        if (s.y < 0) s.y += height; else if (s.y > height) s.y -= height;
        s.fade = Math.min(1, Math.min(s.x, width - s.x, s.y, height - s.y) / FADE_EDGE);
      }
    }

    function draw(seconds) {
      var n = stars.length;
      var reach2 = linkDistance * linkDistance;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgb(' + colors.line.join(',') + ')';
      for (var i = 0; i < n; i++) {
        var p = stars[i];
        for (var j = i + 1; j < n; j++) {
          var q = stars[j];
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= reach2) continue;
          var alpha = colors.lineAlpha * (1 - Math.sqrt(d2) / linkDistance) * Math.min(p.fade, q.fade);
          if (alpha < 0.01) continue;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      for (var k = 0; k < n; k++) {
        var s = stars[k];
        var twinkle = 0.72 + 0.28 * Math.sin(seconds * s.rate + s.phase);
        ctx.globalAlpha = s.a * twinkle * s.fade;
        var size = s.r * 12;
        ctx.drawImage(sprite, s.x - size / 2, s.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (now - lastTime < MIN_FRAME_MS) return;
      var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
      lastTime = now;
      step(dt);
      draw(now / 1000);
    }

    /* Run only while the hero is on screen, the tab is visible and motion is welcome.
       Otherwise draw one still frame, so the sky is never empty. */
    function update() {
      var should = inView && !document.hidden && !reduceMotion.matches;
      if (should && !running) {
        running = true;
        lastTime = 0;
        requestAnimationFrame(tick);
      } else if (!should) {
        running = false;
        if (width) draw(0);
      }
    }

    function resize() {
      if (layout()) {
        draw(running ? performance.now() / 1000 : 0);
        canvas.classList.add('is-on');
      }
    }

    function boot() {
      if (!layout()) return;
      readColors();
      draw(0);
      canvas.classList.add('is-on');

      /* The canvas ignores the pointer, so the hero listens for it. */
      hero.addEventListener('pointermove', function (event) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = !reduceMotion.matches;
      });
      hero.addEventListener('pointerleave', function () { pointer.active = false; });

      var onResize = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
      };
      window.addEventListener('resize', onResize);
      if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);

      /* The theme is a data-theme attribute on <html>, so watch it and recolor the stars. */
      new MutationObserver(function () {
        readColors();
        if (!running) draw(0);
      }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

      document.addEventListener('visibilitychange', update);
      if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', update);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          update();
        }).observe(hero);
      }
      update();
    }

    /* Start once the page has settled, so first paint and the portrait never wait on it. */
    if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1200 });
    else setTimeout(boot, 200);
  })();
})();
