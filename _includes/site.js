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
    if (themeColor) themeColor.setAttribute('content', theme === 'light' ? '#f8f1dc' : '#061033');
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
    var shiftTimer = 0;
    toggle.addEventListener('click', function () {
      /* Colors cross-fade for a moment (dusk or daybreak) while the dial turns. */
      if (!reduceMotion.matches) {
        root.classList.add('theme-shift');
        clearTimeout(shiftTimer);
        shiftTimer = setTimeout(function () { root.classList.remove('theme-shift'); }, 700);
      }
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

  /* Mark the section in view in the nav. A link can stand for several sections (data-nav="work code"). */
  var links = {};
  document.querySelectorAll('[data-nav]').forEach(function (link) {
    link.getAttribute('data-nav').split(' ').forEach(function (id) { links[id] = link; });
  });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var inBand = null;
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) inBand = entry.target.id;
        else if (inBand === entry.target.id) inBand = null;
      });
      Object.keys(links).forEach(function (key) { links[key].removeAttribute('aria-current'); });
      if (inBand) links[inBand].setAttribute('aria-current', 'true');
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { navObserver.observe(section); });
  }

  /* A link to a case study (from the Experience ledger, or a #case- address) opens it. */
  function openCase(hash) {
    var row = hash && hash.indexOf('#case-') === 0 && document.getElementById(hash.slice(1));
    var more = row && row.querySelector('details');
    if (more) more.open = true;
  }
  document.querySelectorAll('[data-open-case]').forEach(function (link) {
    link.addEventListener('click', function () { openCase(link.getAttribute('href')); });
  });
  openCase(location.hash);

  /* Copy the email address. The icon turns into a check and screen readers hear it. */
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    var label = button.querySelector('[data-copy-label]');
    var status = button.parentNode.querySelector('[data-copy-status]');
    var original = label ? label.textContent : '';
    var timer = 0;
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy');
      var done = function () {
        if (label) label.textContent = 'Copied';
        if (status) status.textContent = 'Email address copied';
        button.classList.add('is-copied');
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (label) label.textContent = original;
          if (status) status.textContent = '';
          button.classList.remove('is-copied');
        }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this email:', text); });
      } else {
        window.prompt('Copy this email:', text);
      }
    });
  });

  /* ---------- Skills sky ---------- */
  /* Each role in Experience names the skills it used. The role being read (or hovered, or picked with a
     pill) lights those stars, and one line joins them top to bottom into that role's own constellation.
     The line waits, hidden, until the sky is first on screen, then draws itself in. */
  var sky = document.querySelector('[data-skill-sky]');
  if (sky) {
    var field = sky.querySelector('.skill-sky__field');
    var skyLine = sky.querySelector('.skill-sky__lines polyline');
    var skyStars = [].slice.call(sky.querySelectorAll('[data-skill]'));
    var skyRoles = [].slice.call(document.querySelectorAll('[data-role]'));
    var pills = [].slice.call(sky.querySelectorAll('[data-show-role]'));
    var activeRole = null;
    var skySeen = !('IntersectionObserver' in window);

    var joinStars = function (draw) {
      var box = field.getBoundingClientRect();
      var points = skyStars.filter(function (star) {
        return star.classList.contains('is-lit');
      }).map(function (star) {
        /* The star sits on the label's inner edge, the one facing the middle of the oval. The line ends on
           the side of the star that faces the middle, so a chord between two stars on one arc clears the
           unlit stars between them. */
        var r = star.getBoundingClientRect();
        var left = star.classList.contains('is-left');
        return { x: (left ? r.right + 6 : r.left - 6) - box.left, y: r.top + r.height / 2 - box.top };
      }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      skyLine.ownerSVGElement.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      skyLine.setAttribute('points', points.map(function (pt) { return pt.x.toFixed(1) + ',' + pt.y.toFixed(1); }).join(' '));
      var length = points.length > 1 ? skyLine.getTotalLength() : 0;
      var animate = draw && skySeen && !reduceMotion.matches;
      skyLine.style.transition = 'none';
      skyLine.style.strokeDasharray = length;
      skyLine.style.strokeDashoffset = skySeen && !animate ? 0 : length;
      if (animate) {
        skyLine.getBoundingClientRect(); /* commit the hidden line before it draws */
        skyLine.style.transition = '';
        skyLine.style.strokeDashoffset = 0;
      }
    };

    var lightRole = function (role) {
      if (!role || role === activeRole) return;
      activeRole = role;
      var skills = role.getAttribute('data-skills').split(' ');
      skyStars.forEach(function (star) {
        star.classList.toggle('is-lit', skills.indexOf(star.getAttribute('data-skill')) > -1);
      });
      skyRoles.forEach(function (r) { r.classList.toggle('is-active', r === role); });
      pills.forEach(function (pill) {
        pill.setAttribute('aria-pressed', String(pill.getAttribute('data-show-role') === role.id));
      });
      joinStars(true);
    };

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        lightRole(document.getElementById(pill.getAttribute('data-show-role')));
      });
    });
    if (window.matchMedia('(hover: hover)').matches) {
      skyRoles.forEach(function (role) {
        role.addEventListener('pointerenter', function () { lightRole(role); });
      });
    }
    lightRole(skyRoles[0]);

    if (!skySeen) {
      /* The role crossing a band just above the middle of the screen is the one being read. */
      var readObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) lightRole(entry.target);
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      skyRoles.forEach(function (role) { readObserver.observe(role); });

      var skyObserver = new IntersectionObserver(function (entries) {
        if (!entries[entries.length - 1].isIntersecting) return;
        skySeen = true;
        skyObserver.disconnect();
        joinStars(true);
      }, { threshold: 0.35 });
      skyObserver.observe(field);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { joinStars(false); }).observe(field);
    }
  }

  /* ---------- Moonlight on stories ---------- */
  /* A soft pool of light follows the pointer across a story (CSS draws it from --mx and --my). */
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (event) {
      var card = event.target.closest && event.target.closest('.story');
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', Math.round(event.clientX - rect.left) + 'px');
      card.style.setProperty('--my', Math.round(event.clientY - rect.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Sky rooms: the hero, and the contact finale ---------- */
  /* A room is lit the first time it is seen (the contact's sky waits for that to play its entrance)
     and its loops rest while it is off screen. Without IntersectionObserver every room is lit at once. */
  var skyHosts = document.querySelectorAll('[data-sky-host]');
  if ('IntersectionObserver' in window) {
    var roomObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var host = entry.target;
        if (!entry.isIntersecting) {
          host.setAttribute('data-sky-off', '');
          return;
        }
        host.removeAttribute('data-sky-off');
        if (!host.classList.contains('is-lit') && (entry.intersectionRatio >= 0.3 || entry.intersectionRect.height > window.innerHeight * 0.45)) {
          host.classList.add('is-lit');
          host.dispatchEvent(new CustomEvent('sky:lit'));
        }
      });
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6] });
    skyHosts.forEach(function (host) { roomObserver.observe(host); });
  } else {
    skyHosts.forEach(function (host) { host.classList.add('is-lit'); });
  }

  /* ---------- Constellation ---------- */
  /* Gold stars joined by faint lines, drawn on a canvas inside each room's .sky. The canvas sits behind
     the content in the stacking order, so nothing here can paint over text or the portrait. Without
     JavaScript the canvas stays empty and the sky is already finished.
     The first time a room is seen, the constellation joins up in a wave that spreads from the painted
     star in the swirl, timed to the moment that star ignites. A click or tap on empty sky adds a star. */
  function constellation(canvas) {
    var host = canvas.closest('[data-sky-host]');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx || !host) return;
    var origin = host.querySelector('[data-sky-origin]');

    var MAX_STARS = 70;
    var MAX_DPR = 2;
    var FADE_EDGE = 56;       /* stars fade out this close to the edge, so wrapping never pops */
    var REPEL_RADIUS = 150;
    var MIN_FRAME_MS = 15;    /* about 60 fps even on 120 Hz screens */
    var WAVE_SPEED = 820;     /* px per second */
    var WAVE_EDGE = 170;      /* how far behind the wave front a star reaches full light */
    var MAX_OWN = 12;         /* stars added by clicking; the oldest goes first */

    var stars = [];
    var width = 0;
    var height = 0;
    var dpr = 1;
    var linkDistance = 130;
    var colors = { star: [255, 224, 138], glow: [242, 193, 78], line: [207, 226, 255], lineAlpha: 0.22 };
    var sprite = null;
    var pointer = { x: 0, y: 0, active: false };
    var wave = { armed: false, start: -1, done: false, ox: 0, oy: 0, max: 0 };
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
        fade: 1,
        lit: 1,
        born: 0
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
      if (wave.start >= 0) placeWave();
      return true;
    }

    /* ---- The wave: the constellation joins up outward from the swirl's star. ---- */
    function placeWave() {
      var r = canvas.getBoundingClientRect();
      var o = origin && origin.getBoundingClientRect();
      wave.ox = o && o.width ? o.left + o.width / 2 - r.left : width / 2;
      wave.oy = o && o.width ? o.top + o.height / 2 - r.top : height / 3;
      wave.max = Math.sqrt(Math.pow(Math.max(wave.ox, width - wave.ox), 2) + Math.pow(Math.max(wave.oy, height - wave.oy), 2)) + WAVE_EDGE;
    }

    function startWave() {
      if (wave.start >= 0 || wave.done) return;
      placeWave();
      wave.start = performance.now();
      if (!running) still();
    }

    /* Wait for the swirl's star to reach the peak of its ignition, then start. */
    function armWave() {
      if (wave.armed) return;
      wave.armed = true;
      if (reduceMotion.matches) {
        wave.done = true;
        return;
      }
      var wait = 0;
      var glow = origin && origin.querySelector('.pstar__glow');
      if (glow && glow.getAnimations) {
        glow.getAnimations().forEach(function (a) {
          if (a.animationName !== 'ignite' || !a.effect) return;
          var t = a.effect.getTiming();
          wait = Math.max(0, (t.delay || 0) + 0.35 * (t.duration || 0) - (a.currentTime || 0));
        });
      }
      setTimeout(startWave, wait);
    }

    function reveal(x, y, now) {
      if (wave.done) return 1;
      if (wave.start < 0) return 0;
      var front = (now - wave.start) / 1000 * WAVE_SPEED;
      if (front > wave.max) {
        wave.done = true;
        return 1;
      }
      var dx = x - wave.ox;
      var dy = y - wave.oy;
      var k = (front - Math.sqrt(dx * dx + dy * dy)) / WAVE_EDGE;
      return k <= 0 ? 0 : k >= 1 ? 1 : k;
    }

    function step(dt) {
      var px = 0;
      var py = 0;
      if (pointer.active) {
        var rect = canvas.getBoundingClientRect();
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

    function draw(now) {
      var n = stars.length;
      var seconds = now / 1000;
      var reach2 = linkDistance * linkDistance;
      var i;
      ctx.clearRect(0, 0, width, height);
      for (i = 0; i < n; i++) stars[i].lit = reveal(stars[i].x, stars[i].y, now);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgb(' + colors.line.join(',') + ')';
      for (i = 0; i < n; i++) {
        var p = stars[i];
        if (!p.lit) continue;
        for (var j = i + 1; j < n; j++) {
          var q = stars[j];
          if (!q.lit) continue;
          var dx = p.x - q.x;
          var dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= reach2) continue;
          var alpha = colors.lineAlpha * (1 - Math.sqrt(d2) / linkDistance) * Math.min(p.fade, q.fade) * Math.min(p.lit, q.lit);
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
        if (!s.lit) continue;
        var twinkle = 0.72 + 0.28 * Math.sin(seconds * s.rate + s.phase);
        /* A star flares as the wave (or a click) lights it, then settles to its own size. */
        var flare = 1 + 1.6 * (1 - s.lit);
        if (s.born) {
          var age = (now - s.born) / 700;
          if (age < 1) flare += 2.4 * (1 - age) * (1 - age);
        }
        ctx.globalAlpha = s.a * twinkle * s.fade * s.lit;
        var size = s.r * 12 * flare;
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
      draw(now);
    }

    /* One still frame, for reduced motion, a hidden tab or a room off screen. */
    function still() {
      if (width) draw(wave.done || wave.start < 0 ? 0 : performance.now());
    }

    /* Run only while the room is on screen, the tab is visible and motion is welcome. */
    function update() {
      var should = inView && !document.hidden && !reduceMotion.matches;
      if (should && !running) {
        running = true;
        lastTime = 0;
        requestAnimationFrame(tick);
      } else if (!should) {
        running = false;
        still();
      }
    }

    function resize() {
      if (layout()) {
        if (!running) still();
        canvas.classList.add('is-on');
      }
    }

    /* The hidden detail: click or tap on empty sky (not on text or a control) to add a star. */
    function addStar(event) {
      if (event.button > 0 || !event.target.closest || event.target.closest('a, button, h1, h2, h3, p, li, figure, img, label')) return;
      var rect = canvas.getBoundingClientRect();
      var s = makeStar(event.clientX - rect.left, event.clientY - rect.top);
      s.r = 1.9;
      s.a = 0.95;
      s.born = performance.now();
      stars.push(s);
      var own = stars.filter(function (star) { return star.born; });
      if (own.length > MAX_OWN) stars.splice(stars.indexOf(own[0]), 1);
      if (!running) draw(s.born);
    }

    function boot() {
      if (!layout()) return;
      readColors();
      canvas.classList.add('is-on');

      /* The canvas ignores the pointer, so its room listens for it. */
      host.addEventListener('pointermove', function (event) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = !reduceMotion.matches;
      });
      host.addEventListener('pointerleave', function () { pointer.active = false; });
      host.addEventListener('pointerdown', addStar);

      var onResize = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
      };
      window.addEventListener('resize', onResize);
      if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(host);

      /* The theme is a data-theme attribute on <html>, so watch it and recolor the stars. */
      new MutationObserver(function () {
        readColors();
        if (!running) still();
      }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

      document.addEventListener('visibilitychange', update);
      if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', update);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          update();
        }).observe(host);
      }
      if (host.classList.contains('is-lit') || !('IntersectionObserver' in window)) armWave();
      else host.addEventListener('sky:lit', armWave);
      update();
      still();
    }

    boot();
  }

  /* Start once the page has settled, so first paint and the portrait never wait on the sky. */
  function bootSkies() {
    document.querySelectorAll('[data-constellation]').forEach(constellation);
  }
  if ('requestIdleCallback' in window) requestIdleCallback(bootSkies, { timeout: 1200 });
  else setTimeout(bootSkies, 200);

  /* ---------- Code: the contribution calendar and the experiments file view ---------- */
  /* A day's note on hover: its count and date, worked out from the week's counts and the calendar's first
     Sunday. On a narrow screen the calendar starts scrolled to the latest weeks, as GitHub's does. */
  var calendar = document.querySelector('[data-calendar]');
  if (calendar) {
    var first = new Date(calendar.getAttribute('data-start') + 'T00:00:00');
    var weeks = [].slice.call(calendar.querySelectorAll('.gh__week'));
    var tip = null;
    var hideTip = function () { if (tip) tip.hidden = true; };
    calendar.addEventListener('pointerover', function (event) {
      var cell = event.target.closest && event.target.closest('i');
      if (!cell) return hideTip();
      var week = cell.parentNode;
      var w = weeks.indexOf(week);
      var d = [].indexOf.call(week.children, cell);
      var count = +(week.getAttribute('data-c').split(',')[d] || 0);
      var day = new Date(first.getTime());
      day.setDate(day.getDate() + w * 7 + d);
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'gh__tip';
        document.body.appendChild(tip);
      }
      tip.textContent = (count ? count + (count === 1 ? ' contribution' : ' contributions') : 'No contributions') + ' on ' +
        day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var r = cell.getBoundingClientRect();
      tip.style.left = r.left + r.width / 2 + 'px';
      tip.style.top = r.top + 'px';
      tip.hidden = false;
    });
    calendar.addEventListener('pointerleave', hideTip);
    window.addEventListener('scroll', hideTip, { passive: true });
    calendar.scrollLeft = calendar.scrollWidth;
  }

  /* The experiments are tabs: click or arrow keys pick a file, and only its panel shows. Without JavaScript
     the tabs are hidden and every panel reads in turn. */
  var view = document.querySelector('[data-repo-view]');
  if (view) {
    var tabs = [].slice.call(view.querySelectorAll('[role="tab"]'));
    var pick = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-shown', on);
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { pick(tab, false); });
      tab.addEventListener('keydown', function (event) {
        var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        pick(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
  }

  /* For anyone who opens the console. */
  if (window.console && console.log) {
    console.log('%cHi, fellow engineer.%c Everything that moves on this page is hand-written CSS, SVG and a 2D canvas, no libraries. Have a role, a project or a question in mind? My inbox is open: {{ site.data.profile.email }}', 'color:#c9a227;font-weight:700', '');
  }
})();
