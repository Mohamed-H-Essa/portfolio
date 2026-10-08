// Full-screen screenshot viewer for a project's gallery. The clicked shot flies
// from its place in the strip to full height; the others fan out on both sides
// like the pages of an open book, angled into depth. Every input retargets the
// layout mid-flight (CSS transitions run from wherever they are), so fast
// scrolling, dragging and closing never wait for an animation:
//   ←/→, wheel / trackpad (either axis), drag or swipe (follows the finger),
//   click a side page · Esc, ×, click outside, swipe down, or browser Back closes
// (the shot flies back into its slot). html.is-lightbox pauses the page engine.
import './lightbox.css';

interface Shot { lo: string; hi: string; alt: string; thumb: HTMLImageElement; link: HTMLAnchorElement }

const EASE = 'cubic-bezier(0.785, 0.135, 0.15, 0.86)';

export function initLightbox(section: HTMLElement) {
  const links = Array.from(section.querySelectorAll<HTMLAnchorElement>('.gallery__shot'));
  if (!links.length) return;
  const shots: Shot[] = links.map((a) => {
    const img = a.querySelector('img')!;
    return { lo: img.currentSrc || img.src, hi: a.href, alt: img.alt, thumb: img, link: a };
  });
  const strip = section.querySelector<HTMLElement>('.gallery__strip')!;
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L = { close: section.dataset.close || 'Close', prev: section.dataset.prev || 'Previous', next: section.dataset.next || 'Next' };

  let lb: HTMLElement | null = null;
  let stage: HTMLElement;
  let items: HTMLElement[] = [];
  let count: HTMLElement;
  let idx = 0;
  let pos = 0; // fractional position while dragging
  let W = 0, H = 0;
  let closing: Animation[] = [];

  // ---- layout: the open book ------------------------------------------------
  const measure = () => {
    const ratio = 720 / 1091;
    H = Math.min(innerHeight * 0.86, innerHeight - 110);
    W = H * ratio;
    if (W > innerWidth * 0.86) { W = innerWidth * 0.86; H = W / ratio; }
    stage.style.setProperty('--w', `${W}px`);
    stage.style.setProperty('--h', `${H}px`);
  };
  const place = (t: number, instant: boolean) => {
    const s = html.dir === 'rtl' ? -1 : 1; // RTL: the next page is on the left
    // a side page hinges on the edge nearest the open one, just outside it, and
    // swings away into depth; further pages stack behind it like a book's leaves
    const edge = W + Math.max(18, innerWidth * 0.015);
    const step = Math.min(46, innerWidth * 0.032);
    items.forEach((el, i) => {
      const d = i - t;
      const n = Math.abs(d);
      const side = Math.sign(d) || 1;
      const k = Math.min(1, n);
      const x = n <= 1 ? n * edge : edge + (n - 1) * step;
      const z = -k * 140 - Math.max(0, n - 1) * 70;
      el.style.transition = instant ? 'none' : '';
      el.style.transformOrigin = side > 0 === s > 0 ? 'left center' : 'right center';
      el.style.transform = `translate3d(${s * side * x}px,0,${z}px) rotateY(${-s * side * 56 * k}deg) scale(${1 - k * 0.06})`;
      el.style.opacity = String(n > 5.5 ? 0 : 1 - Math.max(0, n - 1) * 0.16);
      el.style.filter = `brightness(${1 - k * 0.5})`;
      el.style.zIndex = String(100 - Math.round(n * 4));
      el.classList.toggle('is-active', n < 0.5);
      el.setAttribute('aria-hidden', String(n >= 0.5));
    });
  };
  const sharpen = (i: number) => {
    for (const j of [i, i + 1, i - 1]) {
      const el = items[j];
      if (!el || el.dataset.hi) continue;
      el.dataset.hi = '1';
      const im = new Image();
      im.src = shots[j].hi;
      im.decode().then(() => { el.querySelector('img')!.src = shots[j].hi; }).catch(() => {});
    }
  };
  const go = (i: number) => {
    idx = Math.max(0, Math.min(shots.length - 1, i));
    pos = idx;
    place(idx, reduce);
    count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
    sharpen(idx);
  };

  // ---- open / close ----------------------------------------------------------
  const build = () => {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', section.querySelector('h2')?.textContent || '');
    lb.innerHTML = `<div class="lb__backdrop"></div><div class="lb__stage"></div>
      <p class="lb__count label" aria-live="polite"></p>
      <button type="button" class="lb__btn lb__close" aria-label="${L.close}">×</button>
      <button type="button" class="lb__btn lb__prev" aria-label="${L.prev}"></button>
      <button type="button" class="lb__btn lb__next" aria-label="${L.next}"></button>`;
    // the viewer lives on <body>: carry the project's own colour over
    const p = getComputedStyle(section).getPropertyValue('--p').trim();
    if (p) lb.style.setProperty('--p', p);
    stage = lb.querySelector('.lb__stage')!;
    count = lb.querySelector('.lb__count')!;
    items = shots.map((sh, i) => {
      const el = document.createElement('figure');
      el.className = 'lb__item';
      el.dataset.i = String(i);
      const im = document.createElement('img');
      im.src = sh.lo;
      im.alt = sh.alt;
      im.draggable = false;
      el.append(im);
      stage.append(el);
      return el;
    });
    document.body.append(lb);
    lb.querySelector('.lb__close')!.addEventListener('click', () => close());
    lb.querySelector('.lb__prev')!.addEventListener('click', () => go(idx - (html.dir === 'rtl' ? -1 : 1)));
    lb.querySelector('.lb__next')!.addEventListener('click', () => go(idx + (html.dir === 'rtl' ? -1 : 1)));
    wire(lb);
  };

  const teardown = () => {
    closing.forEach((a) => a.cancel());
    closing = [];
    lb?.remove();
    lb = null;
    items = [];
    html.classList.remove('is-lightbox');
  };

  const open = (i: number) => {
    teardown(); // reopening mid-close: start clean
    html.classList.add('is-lightbox');
    build();
    measure();
    idx = i;
    go(i);
    place(i, true);
    history.pushState({ ...(history.state ?? {}), lb: true }, '');
    lb!.querySelector<HTMLElement>('.lb__close')!.focus({ preventScroll: true });
    if (reduce) return;
    // FLIP the clicked shot from its thumbnail; the rest unfold from depth
    const from = shots[i].thumb.getBoundingClientRect();
    const to = items[i].getBoundingClientRect();
    items[i].animate(
      [{ transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }],
      { duration: 640, easing: EASE }
    );
    items.forEach((el, j) => {
      if (j === i) return;
      el.animate([{ opacity: 0, translate: '0 0 -260px' }, { opacity: 1, translate: '0 0 0' }], { duration: 700, delay: 120 + Math.abs(j - i) * 55, easing: EASE, fill: 'backwards' });
    });
    lb!.querySelector('.lb__backdrop')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
  };

  // close() asks history to go back (so the browser's Back button closes too);
  // the popstate handler runs the animation
  const close = () => {
    if (!lb) return;
    if (history.state?.lb) history.back();
    else animateClose();
  };
  const animateClose = () => {
    if (!lb || closing.length) return;
    const el = items[idx];
    const thumb = shots[idx].thumb;
    // bring its slot into view in the strip, then fly back into it
    const sx = strip.scrollLeft;
    thumb.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
    if (Math.abs(strip.scrollLeft - sx) < 1) { /* already visible */ }
    const done = () => { const link = shots[idx].link; teardown(); link.focus({ preventScroll: true }); };
    if (reduce) return done();
    const from = el.getBoundingClientRect();
    const to = thumb.getBoundingClientRect();
    lb.classList.add('is-closing');
    closing = [
      el.animate(
        [{ transform: el.style.transform, transformOrigin: '0 0' }, { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width})`, transformOrigin: '0 0' }],
        { duration: 520, easing: EASE, fill: 'forwards' }
      ),
      ...items.filter((x) => x !== el).map((x) => x.animate([{ opacity: x.style.opacity }, { opacity: 0, translate: '0 0 -200px' }], { duration: 360, easing: 'ease-in', fill: 'forwards' })),
      lb.querySelector('.lb__backdrop')!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: 'ease-in', fill: 'forwards' }),
    ];
    closing[0].finished.then(done).catch(() => {});
  };
  addEventListener('popstate', () => { if (lb) animateClose(); });
  addEventListener('resize', () => { if (lb && !closing.length) { measure(); place(idx, true); } });

  // ---- input -------------------------------------------------------------------
  function wire(root: HTMLElement) {
    root.addEventListener('keydown', (e) => {
      const fwd = html.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const back = html.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === 'Escape') close();
      else if (e.key === fwd || e.key === 'ArrowDown' || e.key === 'PageDown') go(idx + 1);
      else if (e.key === back || e.key === 'ArrowUp' || e.key === 'PageUp') go(idx - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(shots.length - 1);
      else if (e.key === 'Tab') return; // focus stays inside: only buttons are focusable
      else return;
      e.preventDefault();
    });

    // wheel / trackpad, either axis: every ~70px is a page; fast scrolling flips several
    let acc = 0, lastStep = 0;
    root.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (closing.length) return;
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      let d = (horiz ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : 1);
      if (horiz && html.dir === 'rtl') d = -d;
      acc += d;
      const now = performance.now();
      if (Math.abs(acc) >= 70 && now - lastStep > 70) {
        go(idx + Math.sign(acc));
        acc = 0;
        lastStep = now;
      }
    }, { passive: false });

    // drag / swipe: follows the finger; swipe down closes
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
      const s = html.dir === 'rtl' ? -1 : 1;
      if (mode === 'x') {
        pos = Math.max(-0.4, Math.min(shots.length - 0.6, idx - (s * dx) / (W / 2 + 40)));
        place(pos, true);
      } else if (mode === 'y') {
        const p = Math.max(0, dy) / innerHeight;
        stage.style.transition = 'none';
        stage.style.transform = `translateY(${dy * 0.6}px) scale(${1 - p * 0.3})`;
        lb!.querySelector<HTMLElement>('.lb__backdrop')!.style.opacity = String(1 - p * 1.6);
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - x0, dy = e.clientY - y0, dt = Math.max(1, performance.now() - t0);
      const was = mode;
      mode = 'none';
      if (was === 'x') {
        const v = (dx / dt) * (html.dir === 'rtl' ? -1 : 1); // px per ms
        go(Math.round(pos - v * 0.35));
      } else if (was === 'y') {
        stage.style.transition = '';
        const bd = lb!.querySelector<HTMLElement>('.lb__backdrop')!;
        bd.style.opacity = '';
        if (dy > 110 || dy / dt > 0.6) { stage.style.transform = ''; close(); }
        else stage.style.transform = '';
      } else if (was === 'tap') {
        const fig = (e.target as Element).closest<HTMLElement>('.lb__item');
        if (!fig) close(); // outside the pages
        else if (Number(fig.dataset.i) !== idx) go(Number(fig.dataset.i));
      }
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
  }

  // ---- entry -------------------------------------------------------------------
  shots.forEach((sh, i) =>
    sh.link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      open(i);
    })
  );
}
