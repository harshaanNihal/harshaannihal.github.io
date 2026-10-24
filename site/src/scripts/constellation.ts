// The constellation: gold stars joined by faint lines, drawn on a canvas inside each room's .sky. The canvas sits
// behind the content in the stacking order, so nothing here can paint over text or the portrait. Without
// JavaScript the canvas stays empty and the sky is already finished.
// The first time a room is seen, the constellation joins up in a wave that spreads from the painted star in the
// swirl, timed to the moment that star ignites. A click or tap on empty sky adds a star.
import { hasIntersectionObserver, reduceMotion, root } from './env';

type RGB = [number, number, number];

interface Star {
  x: number;
  y: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
  rate: number;
  fade: number;
  lit: number;
  born: number;
}

const MAX_STARS = 70;
const MAX_DPR = 2;
const FADE_EDGE = 56;       /* stars fade out this close to the edge, so wrapping never pops */
const REPEL_RADIUS = 150;
const MIN_FRAME_MS = 15;    /* about 60 fps even on 120 Hz screens */
const WAVE_SPEED = 820;     /* px per second */
const WAVE_EDGE = 170;      /* how far behind the wave front a star reaches full light */
const MAX_OWN = 12;         /* stars added by clicking; the oldest goes first */

function parseColor(value: string, fallback: RGB): RGB {
  const v = (value || '').trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (m) {
    const h = m[1]!.length === 3 ? m[1]!.replace(/./g, '$&$&') : m[1]!;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v);
  return m ? [+m[1]!, +m[2]!, +m[3]!] : fallback;
}

function makeStar(x: number, y: number): Star {
  const angle = Math.random() * Math.PI * 2;
  const speed = 4 + Math.random() * 9;
  const bright = Math.random();
  return {
    x, y,
    bx: Math.cos(angle) * speed, by: Math.sin(angle) * speed,
    vx: 0, vy: 0,
    r: 0.7 + bright * bright * 1.5,
    a: 0.5 + Math.random() * 0.45,
    phase: Math.random() * 6.28,
    rate: 0.5 + Math.random() * 1.1,
    fade: 1,
    lit: 1,
    born: 0,
  };
}

function constellation(canvas: HTMLCanvasElement) {
  const host = canvas.closest<HTMLElement>('[data-sky-host]');
  const ctx = canvas.getContext('2d');
  if (!ctx || !host) return;
  const origin = host.querySelector('[data-sky-origin]');

  const stars: Star[] = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let linkDistance = 130;
  const colors = { star: [255, 224, 138] as RGB, glow: [242, 193, 78] as RGB, line: [207, 226, 255] as RGB, lineAlpha: 0.22 };
  const sprite = document.createElement('canvas');
  const pointer = { x: 0, y: 0, active: false };
  const wave = { armed: false, start: -1, done: false, ox: 0, oy: 0, max: 0 };
  let inView = true;
  let running = false;
  let lastTime = 0;
  let resizeTimer = 0;

  /* One glowing star, painted once and stamped for every star. Rebuilt when the theme changes. */
  function buildSprite() {
    const size = 64;
    sprite.width = sprite.height = size;
    const g = sprite.getContext('2d')!;
    g.clearRect(0, 0, size, size);
    const s = colors.star.join(',');
    const o = colors.glow.join(',');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${s},1)`);
    grad.addColorStop(0.13, `rgba(${s},0.95)`);
    grad.addColorStop(0.2, `rgba(${o},0.4)`);
    grad.addColorStop(0.45, `rgba(${o},0.12)`);
    grad.addColorStop(1, `rgba(${o},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }

  function readColors() {
    const style = getComputedStyle(canvas);
    colors.star = parseColor(style.getPropertyValue('--c-star'), colors.star);
    colors.glow = parseColor(style.getPropertyValue('--c-glow'), colors.glow);
    colors.line = parseColor(style.getPropertyValue('--c-line'), colors.line);
    const a = parseFloat(style.getPropertyValue('--c-line-a'));
    colors.lineAlpha = a > 0 ? a : colors.lineAlpha;
    buildSprite();
  }

  function layout(): boolean {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return false;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (stars.length && w === width && h === height && ratio === dpr) return true;
    dpr = ratio;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(18, Math.min(MAX_STARS, Math.round((w * h) / 14000)));
    if (!stars.length) {
      /* A jittered grid spreads the first stars evenly, with no clumps. */
      const cols = Math.ceil(Math.sqrt(count * w / h));
      const rows = Math.ceil(count / cols);
      for (let i = 0; i < count; i++) {
        stars.push(makeStar(((i % cols) + Math.random()) * w / cols, (Math.floor(i / cols) + Math.random()) * h / rows));
      }
    } else {
      stars.forEach((s) => { s.x *= w / width; s.y *= h / height; });
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
    const r = canvas.getBoundingClientRect();
    const o = origin?.getBoundingClientRect();
    wave.ox = o && o.width ? o.left + o.width / 2 - r.left : width / 2;
    wave.oy = o && o.width ? o.top + o.height / 2 - r.top : height / 3;
    wave.max = Math.sqrt(Math.max(wave.ox, width - wave.ox) ** 2 + Math.max(wave.oy, height - wave.oy) ** 2) + WAVE_EDGE;
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
    let wait = 0;
    const glow = origin?.querySelector('.pstar__glow');
    glow?.getAnimations?.().forEach((a) => {
      if ((a as CSSAnimation).animationName !== 'ignite' || !a.effect) return;
      const t = a.effect.getTiming();
      wait = Math.max(0, (t.delay || 0) + 0.35 * (Number(t.duration) || 0) - (Number(a.currentTime) || 0));
    });
    window.setTimeout(startWave, wait);
  }

  function reveal(x: number, y: number, now: number): number {
    if (wave.done) return 1;
    if (wave.start < 0) return 0;
    const front = (now - wave.start) / 1000 * WAVE_SPEED;
    if (front > wave.max) {
      wave.done = true;
      return 1;
    }
    const dx = x - wave.ox;
    const dy = y - wave.oy;
    const k = (front - Math.sqrt(dx * dx + dy * dy)) / WAVE_EDGE;
    return k <= 0 ? 0 : k >= 1 ? 1 : k;
  }

  function step(dt: number) {
    let px = 0;
    let py = 0;
    if (pointer.active) {
      const rect = canvas.getBoundingClientRect();
      px = pointer.x - rect.left;
      py = pointer.y - rect.top;
    }
    const settle = 1 - Math.exp(-2 * dt);
    for (const s of stars) {
      if (pointer.active) {
        const dx = s.x - px;
        const dy = s.y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < REPEL_RADIUS && d > 0.01) {
          const push = (1 - d / REPEL_RADIUS) ** 2 * 480 * dt;
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

  function draw(now: number) {
    const c = ctx!;
    const n = stars.length;
    const seconds = now / 1000;
    const reach2 = linkDistance * linkDistance;
    c.clearRect(0, 0, width, height);
    for (const s of stars) s.lit = reveal(s.x, s.y, now);
    c.lineWidth = 1;
    c.strokeStyle = `rgb(${colors.line.join(',')})`;
    for (let i = 0; i < n; i++) {
      const p = stars[i]!;
      if (!p.lit) continue;
      for (let j = i + 1; j < n; j++) {
        const q = stars[j]!;
        if (!q.lit) continue;
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= reach2) continue;
        const alpha = colors.lineAlpha * (1 - Math.sqrt(d2) / linkDistance) * Math.min(p.fade, q.fade) * Math.min(p.lit, q.lit);
        if (alpha < 0.01) continue;
        c.globalAlpha = alpha;
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(q.x, q.y);
        c.stroke();
      }
    }
    for (const s of stars) {
      if (!s.lit) continue;
      const twinkle = 0.72 + 0.28 * Math.sin(seconds * s.rate + s.phase);
      /* A star flares as the wave (or a click) lights it, then settles to its own size. */
      let flare = 1 + 1.6 * (1 - s.lit);
      if (s.born) {
        const age = (now - s.born) / 700;
        if (age < 1) flare += 2.4 * (1 - age) * (1 - age);
      }
      c.globalAlpha = s.a * twinkle * s.fade * s.lit;
      const size = s.r * 12 * flare;
      c.drawImage(sprite, s.x - size / 2, s.y - size / 2, size, size);
    }
    c.globalAlpha = 1;
  }

  function tick(now: number) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (now - lastTime < MIN_FRAME_MS) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
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
    const should = inView && !document.hidden && !reduceMotion.matches;
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
  function addStar(event: PointerEvent) {
    const target = event.target as Element | null;
    if (event.button > 0 || !target?.closest || target.closest('a, button, h1, h2, h3, p, li, figure, img, label')) return;
    const rect = canvas.getBoundingClientRect();
    const s = makeStar(event.clientX - rect.left, event.clientY - rect.top);
    s.r = 1.9;
    s.a = 0.95;
    s.born = performance.now();
    stars.push(s);
    const own = stars.filter((star) => star.born);
    if (own.length > MAX_OWN) stars.splice(stars.indexOf(own[0]!), 1);
    if (!running) draw(s.born);
  }

  if (!layout()) return;
  readColors();
  canvas.classList.add('is-on');

  /* The canvas ignores the pointer, so its room listens for it. */
  host.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = !reduceMotion.matches;
  });
  host.addEventListener('pointerleave', () => { pointer.active = false; });
  host.addEventListener('pointerdown', addStar);

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  };
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(host);

  /* The theme is a data-theme attribute on <html>, so watch it and recolor the stars. */
  new MutationObserver(() => {
    readColors();
    if (!running) still();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  document.addEventListener('visibilitychange', update);
  reduceMotion.addEventListener?.('change', update);
  if (hasIntersectionObserver) {
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1]!.isIntersecting;
      update();
    }).observe(host);
  }
  if (host.classList.contains('is-lit') || !hasIntersectionObserver) armWave();
  else host.addEventListener('sky:lit', armWave);
  update();
  still();
}

/* Start once the page has settled, so first paint and the portrait never wait on the sky. */
export function initConstellations() {
  const boot = () => document.querySelectorAll<HTMLCanvasElement>('[data-constellation]').forEach(constellation);
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1200 });
  else setTimeout(boot, 200);
}
