// Full-screen screenshot viewer: a tilted card stack. The current shot is the
// top card; the next ones wait behind it (smaller, turned a little, blurred
// deeper the further back); seen ones are thrown off to the side. Behind the
// stack, the current shot becomes the room's light: shrunk to a coarse grid,
// smoothly enlarged and grained, so you sense soft cells rather than a smear.
// Every input retargets mid-flight (CSS transitions run from where they are):
//   ←/→ · wheel (either axis) · drag/throw the top card · click a card
//   Esc · × · click outside · swipe down · browser Back → it flies back into the strip
// html.is-lightbox pauses the page engine, swipe-back and the carousel.
import './lightbox.css';
import { play } from './sound';

interface Shot { lo: string; hi: string; alt: string }

const EASE = 'cubic-bezier(0.785, 0.135, 0.15, 0.86)';
const GRID = 14; // ambient: columns of the colour grid

export function initLightbox(section: HTMLElement) {
  const strip = section.querySelector<HTMLElement>('.gallery__strip');
  if (!strip) return;
  const originals = Array.from(strip.querySelectorAll<HTMLAnchorElement>('li:not([data-clone]) .gallery__shot'));
  if (!originals.length) return;
  const shots: Shot[] = originals.map((a) => {
    const img = a.querySelector('img')!;
    return { lo: img.currentSrc || img.src, hi: a.href, alt: img.alt };
  });
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L = { close: section.dataset.close || 'Close', prev: section.dataset.prev || 'Previous', next: section.dataset.next || 'Next' };
  const rtl = () => html.dir === 'rtl';

  let lb: HTMLElement | null = null;
  let items: HTMLElement[] = [];
  let ambients: HTMLCanvasElement[] = [];
  let count: HTMLElement;
  let idx = 0;
  let pos = 0;
  let W = 0, H = 0;
  let closing: Animation[] = [];
  let origin: HTMLImageElement | null = null; // the thumbnail it flew out of
  let openedAt = 0;

  // ---- the stack --------------------------------------------------------------
  const measure = () => {
    const ratio = 720 / 1091;
    H = Math.min(innerHeight * 0.84, innerHeight - 120);
    W = H * ratio;
    if (W > innerWidth * 0.8) { W = innerWidth * 0.8; H = W / ratio; }
    lb!.style.setProperty('--w', `${W}px`);
    lb!.style.setProperty('--h', `${H}px`);
  };
  const place = (t: number, instant: boolean) => {
    const s = rtl() ? -1 : 1;
    const throwX = W * 0.78 + innerWidth * 0.12;
    items.forEach((el, i) => {
      const d = i - t;
      let tx = 0, ty = 0, tz = 0, rot = 0, sc = 1, blur = 0, bright = 1, op = 1;
      if (d >= 0) {
        // waiting behind: peek up and toward the reading end, turned and softened
        const n = d;
        tx = s * n * Math.min(30, innerWidth * 0.025);
        ty = -n * 16;
        tz = -n * 70;
        rot = s * n * 2.6;
        sc = 1 - n * 0.05;
        blur = n * 2.4;
        bright = 1 - n * 0.14;
        op = n > 4.5 ? 0 : 1;
      } else {
        // seen: thrown off toward the reading start, tilting as it goes
        const n = -d, k = Math.min(1, n);
        tx = -s * (k * throwX + Math.max(0, n - 1) * 40);
        ty = k * 26;
        rot = -s * (k * 16 + Math.max(0, n - 1) * 4);
        sc = 1 - k * 0.12;
        blur = k * 3;
        bright = 1 - k * 0.35;
        op = n > 1.6 ? 0 : 1 - Math.max(0, n - 1) * 1.4 - k * 0.35;
      }
      el.style.transition = instant ? 'none' : '';
      el.style.transform = `translate3d(${tx}px,${ty}px,${tz}px) rotate(${rot}deg) scale(${sc})`;
      el.style.filter = `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})`;
      el.style.opacity = String(Math.max(0, op));
      el.style.zIndex = String(100 - Math.round(Math.abs(d) * 4) - (d < 0 ? 50 : 0));
      el.classList.toggle('is-active', Math.abs(d) < 0.5);
      el.setAttribute('aria-hidden', String(Math.abs(d) >= 0.5));
    });
  };

  // ---- ambient: the current shot as soft coloured cells ---------------------------
  const ambientFor = (img: HTMLImageElement) => {
    const c = document.createElement('canvas');
    const rows = Math.round(GRID * (innerHeight / innerWidth) * 1.4) || 10;
    c.width = GRID;
    c.height = rows;
    c.className = 'lb__ambient';
    const ctx = c.getContext('2d');
    if (ctx && img.complete && img.naturalWidth) {
      // cover-fit the image into the tiny grid: each cell becomes one colour
      const r = Math.max(GRID / img.naturalWidth, rows / img.naturalHeight);
      const w = img.naturalWidth * r, h = img.naturalHeight * r;
      ctx.drawImage(img, (GRID - w) / 2, (rows - h) / 2, w, h);
    }
    return c;
  };
  const setAmbient = (i: number) => {
    if (!lb) return;
    const img = items[i]?.querySelector('img');
    if (!img) return;
    const paint = () => {
      if (!lb) return;
      const c = ambientFor(img);
      lb.querySelector('.lb__room')!.append(c);
      requestAnimationFrame(() => c.classList.add('is-on'));
      const old = ambients;
      ambients = [c];
      old.forEach((o) => { o.classList.remove('is-on'); setTimeout(() => o.remove(), 900); });
    };
    if (img.complete) paint(); else img.addEventListener('load', paint, { once: true });
  };

  const sharpen = (i: number) => {
    for (const j of [i, i + 1, i - 1, i + 2]) {
      const el = items[j];
      if (!el || el.dataset.hi) continue;
      el.dataset.hi = '1';
      const im = new Image();
      im.src = shots[j].hi;
      im.decode().then(() => { el.querySelector('img')!.src = shots[j].hi; }).catch(() => {});
    }
  };
  const go = (i: number) => {
    const n = Math.max(0, Math.min(shots.length - 1, i));
    const changed = n !== idx;
    idx = n;
    pos = n;
    place(n, reduce);
    count.textContent = `${String(n + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
    sharpen(n);
    if (changed) setAmbient(n);
    if (changed && lb && !closing.length && items.length && idx >= 0 && pos === n && openedAt && performance.now() - openedAt > 300) play('flip');
  };

  // ---- open / close -------------------------------------------------------------
  const build = () => {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', section.querySelector('h2')?.textContent || '');
    const p = getComputedStyle(section).getPropertyValue('--p').trim();
    if (p) lb.style.setProperty('--p', p);
    lb.innerHTML = `<div class="lb__room"></div><div class="lb__grain"></div><div class="lb__stage"></div>
      <p class="lb__count label" aria-live="polite"></p>
      <button type="button" class="lb__btn lb__close" aria-label="${L.close}">×</button>
      <button type="button" class="lb__btn lb__prev" aria-label="${L.prev}"></button>
      <button type="button" class="lb__btn lb__next" aria-label="${L.next}"></button>`;
    const stage = lb.querySelector<HTMLElement>('.lb__stage')!;
    count = lb.querySelector('.lb__count')!;
    items = shots.map((sh, i) => {
      const el = document.createElement('figure');
      el.className = 'lb__item';
      el.dataset.i = String(i);
      el.innerHTML = '<div class="lb__tilt"><img alt="" draggable="false"/><span class="lb__shine"></span></div>';
      const im = el.querySelector('img')!;
      im.src = sh.lo;
      im.alt = sh.alt;
      stage.append(el);
      return el;
    });
    document.body.append(lb);
    lb.querySelector('.lb__close')!.addEventListener('click', () => close());
    lb.querySelector('.lb__prev')!.addEventListener('click', () => go(idx + (rtl() ? 1 : -1)));
    lb.querySelector('.lb__next')!.addEventListener('click', () => go(idx + (rtl() ? -1 : 1)));
    wire(lb);
  };

  const teardown = () => {
    closing.forEach((a) => a.cancel());
    closing = [];
    lb?.remove();
    lb = null;
    items = [];
    ambients = [];
    html.classList.remove('is-lightbox');
  };

  const open = (i: number, from: HTMLImageElement) => {
    teardown();
    origin = from;
    openedAt = 0; // no page-flip sound for the opening card itself
    html.classList.add('is-lightbox');
    build();
    measure();
    idx = -1;
    go(i);
    place(i, true);
    history.pushState({ ...(history.state ?? {}), lb: true }, '');
    openedAt = performance.now();
    play('unfold');
    lb!.querySelector<HTMLElement>('.lb__close')!.focus({ preventScroll: true });
    if (reduce) return;
    const a = from.getBoundingClientRect();
    const b = items[i].getBoundingClientRect();
    items[i].animate(
      [{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }],
      { duration: 640, easing: EASE }
    );
    items.forEach((el, j) => {
      if (j === i) return;
      el.animate([{ opacity: 0, translate: '0 40px' }, { opacity: el.style.opacity, translate: '0 0' }], { duration: 620, delay: 160 + Math.abs(j - i) * 70, easing: EASE, fill: 'backwards' });
    });
    lb!.querySelector('.lb__room')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'ease-out' });
  };

  const close = () => {
    if (!lb) return;
    if (history.state?.lb) history.back();
    else animateClose();
  };
  // fly back to a thumbnail of the shot now on top, if one is on screen
  const thumbFor = (i: number): HTMLImageElement | null => {
    if (origin && i === Number(origin.closest('a')?.dataset.n)) return origin;
    const vw = innerWidth;
    let best: HTMLImageElement | null = null, bd = Infinity;
    strip.querySelectorAll<HTMLImageElement>(`.gallery__shot[data-n="${i}"] img`).forEach((im) => {
      const r = im.getBoundingClientRect();
      if (r.right < 0 || r.left > vw) return;
      const d = Math.abs(r.left + r.width / 2 - vw / 2);
      if (d < bd) { bd = d; best = im; }
    });
    return best;
  };
  const animateClose = () => {
    if (!lb || closing.length) return;
    const el = items[idx];
    const thumb = thumbFor(idx);
    const link = thumb?.closest('a') as HTMLElement | null;
    const done = () => { teardown(); link?.focus({ preventScroll: true }); };
    if (reduce) return done();
    lb.classList.add('is-closing');
    play('whoosh', { dir: -1, level: 0.6 });
    const room = lb.querySelector('.lb__room')!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: 'ease-in', fill: 'forwards' });
    const bg = lb.animate([{ backgroundColor: '#070708' }, { backgroundColor: 'rgba(7,7,8,0)' }], { duration: 480, easing: 'ease-in', fill: 'forwards' });
    const rest = items.filter((x) => x !== el).map((x) => x.animate([{ opacity: x.style.opacity }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }));
    let fly: Animation;
    if (thumb) {
      const a = el.getBoundingClientRect();
      const b = thumb.getBoundingClientRect();
      fly = el.animate(
        [{ transform: el.style.transform, transformOrigin: '0 0' }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width})`, transformOrigin: '0 0' }],
        { duration: 520, easing: EASE, fill: 'forwards' }
      );
    } else {
      fly = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });
    }
    closing = [fly, room, bg, ...rest];
    fly.finished.then(done).catch(() => {});
  };
  addEventListener('popstate', () => { if (lb) animateClose(); });
  addEventListener('resize', () => { if (lb && !closing.length) { measure(); place(idx, true); } });

  // ---- input -------------------------------------------------------------------------
  function wire(root: HTMLElement) {
    root.addEventListener('keydown', (e) => {
      const fwd = rtl() ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl() ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === 'Escape') close();
      else if (e.key === fwd || e.key === 'ArrowDown' || e.key === 'PageDown') go(idx + 1);
      else if (e.key === back || e.key === 'ArrowUp' || e.key === 'PageUp') go(idx - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(shots.length - 1);
      else return;
      e.preventDefault();
    });

    // wheel, either axis: one card per ~70 px; fast scrolling flips several, smoothly
    let acc = 0, lastStep = 0;
    root.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (closing.length) return;
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      let d = (horiz ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : 1);
      if (horiz && rtl()) d = -d;
      acc += d;
      const now = performance.now();
      if (Math.abs(acc) >= 70 && now - lastStep > 90) {
        go(idx + Math.sign(acc));
        acc = 0;
        lastStep = now;
      }
    }, { passive: false });

    // hover tilt + light on the top card
    root.addEventListener('pointermove', (e) => {
      const top = items[idx];
      if (!top || reduce || e.pointerType !== 'mouse') return;
      const r = top.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
      const inside = Math.abs(u) < 0.6 && Math.abs(v) < 0.6;
      const tilt = top.querySelector<HTMLElement>('.lb__tilt')!;
      tilt.style.setProperty('--rx', `${inside ? (-v * 7).toFixed(2) : 0}deg`);
      tilt.style.setProperty('--ry', `${inside ? (u * 9).toFixed(2) : 0}deg`);
      tilt.style.setProperty('--sx', `${((u + 0.5) * 100).toFixed(1)}%`);
      tilt.style.setProperty('--sy', `${((v + 0.5) * 100).toFixed(1)}%`);
      tilt.classList.toggle('is-lit', inside);
    });

    // drag: throw the top card (it follows the finger); swipe down closes
    let x0 = 0, y0 = 0, t0 = 0, mode: 'none' | 'x' | 'y' | 'tap' = 'none', pid = -1;
    root.addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('.lb__btn') || closing.length) return;
      x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); mode = 'tap'; pid = e.pointerId;
    });
    root.addEventListener('pointermove', (e) => {
      if (mode === 'none' || e.pointerId !== pid) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (mode === 'tap') {
        if (Math.hypot(dx, dy) < 8) return;
        mode = Math.abs(dx) > Math.abs(dy) ? 'x' : dy > 0 ? 'y' : 'none';
        try { root.setPointerCapture(pid); } catch { /* gone */ }
      }
      if (mode === 'x') {
        const s = rtl() ? -1 : 1;
        pos = Math.max(-0.35, Math.min(shots.length - 0.65, idx - (s * dx) / (W * 0.9)));
        place(pos, true);
      } else if (mode === 'y') {
        const p = Math.max(0, dy) / innerHeight;
        const stage = root.querySelector<HTMLElement>('.lb__stage')!;
        stage.style.transition = 'none';
        stage.style.transform = `translateY(${dy * 0.6}px) scale(${1 - p * 0.3})`;
        root.querySelector<HTMLElement>('.lb__room')!.style.opacity = String(1 - p * 1.6);
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - x0, dy = e.clientY - y0, dt = Math.max(1, performance.now() - t0);
      const was = mode;
      mode = 'none';
      if (was === 'x') {
        const v = (dx / dt) * (rtl() ? -1 : 1);
        go(Math.round(pos - v * 0.4));
      } else if (was === 'y') {
        const stage = root.querySelector<HTMLElement>('.lb__stage')!;
        stage.style.transition = '';
        stage.style.transform = '';
        root.querySelector<HTMLElement>('.lb__room')!.style.opacity = '';
        if (dy > 110 || dy / dt > 0.6) close();
      } else if (was === 'tap') {
        const fig = (e.target as Element).closest<HTMLElement>('.lb__item');
        if (!fig) close();
        else if (Number(fig.dataset.i) !== idx) go(Number(fig.dataset.i));
      }
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
  }

  // ---- entry: any shot in the strip, originals or carousel clones -------------------
  strip.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('.gallery__shot');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open(Number(a.dataset.n), a.querySelector('img')!);
  });
}
