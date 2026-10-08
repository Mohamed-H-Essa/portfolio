// The gallery strip as a slow endless carousel: it drifts on its own, pauses
// under the pointer (so a shot is easy to click), speeds toward an edge the
// pointer rests near, and follows sideways wheel / drag with momentum. The
// items are cloned once or twice so the loop never shows a seam. Sideways
// input here never reaches swipe-back (the strip is in its ignore list and
// always claims horizontal gestures). Reduced motion: the plain scroller.

const BASE = 16; // px/s drift
const EDGE = 0.18; // share of the strip width that counts as "near an edge"
const EDGE_MAX = 420; // px/s at the very edge

export function initMarquee(section: HTMLElement) {
  const strip = section.querySelector<HTMLElement>('.gallery__strip');
  if (!strip || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const originals = Array.from(strip.children) as HTMLElement[];
  if (originals.length < 2) return;
  const html = document.documentElement;
  strip.classList.add('is-marquee');

  // clone sets until the content is at least twice the visible width
  const setWidth = () => {
    const a = originals[0].getBoundingClientRect();
    const b = originals[originals.length - 1].getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(strip).columnGap || '0') || 0;
    return Math.abs(b.right - a.left) + (Math.abs(b.left - a.left) > 0 ? gap : 0) || 1;
  };
  const addClones = () => {
    const clone = (li: HTMLElement) => {
      const c = li.cloneNode(true) as HTMLElement;
      c.dataset.clone = '';
      c.removeAttribute('data-rv');
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
      strip.append(c);
    };
    let sets = 1;
    // always one clone set (the loop needs the next set ready), more on wide screens
    do { originals.forEach(clone); sets++; } while (sets < 3 && setWidth() * sets < strip.clientWidth * 2.2);
  };
  addClones();

  let W = setWidth();
  let x = 0; // current offset (px, negative = content moved toward the start side)
  let speed = BASE;
  let target = BASE;
  let vel = 0; // momentum from wheel / drag, px/frame
  let pending = 0; // arrow-button steps, consumed smoothly
  // drift direction on screen: items move left in LTR, right in RTL (clones
  // sit after the originals in reading order, so that's where the loop is)
  const dir = () => (html.dir === 'rtl' ? 1 : -1);

  const write = () => strip.style.setProperty('--mx', `${x.toFixed(2)}px`);
  // keep the offset inside one set so the clones always cover the view
  const wrap = () => {
    if (dir() < 0) { while (x <= -W) x += W; while (x > 0) x -= W; }
    else { while (x >= W) x -= W; while (x < 0) x += W; }
  };

  // ---- pointer: pause on a shot, accelerate near an edge, drag ---------------
  let hovering = false;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  strip.addEventListener('pointermove', (e) => {
    hovering = true;
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      x += dx;
      vel = dx;
      return;
    }
    const r = strip.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    if (u < EDGE) target = EDGE_MAX * (1 - u / EDGE); // reveal what's on the left
    else if (u > 1 - EDGE) target = -EDGE_MAX * (1 - (1 - u) / EDGE);
    else target = (e.target as Element).closest('.gallery__shot') ? 0 : BASE * 0.4 * dir();
  });
  strip.addEventListener('pointerleave', () => { hovering = false; target = BASE * dir(); });
  strip.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    vel = 0;
  });
  addEventListener('pointerup', () => { dragging = false; });
  addEventListener('pointercancel', () => { dragging = false; });
  // a drag is not a click on the shot under it
  strip.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // ---- sideways wheel / trackpad scrolls the strip ---------------------------
  strip.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical belongs to the page engine
      e.preventDefault();
      vel -= e.deltaX * 0.35;
    },
    { passive: false }
  );

  // ---- arrow buttons step one shot ------------------------------------------------
  section.querySelectorAll<HTMLButtonElement>('[data-gallery-nav] button').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      const step = originals[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(strip).columnGap) || 0);
      pending += -Number(b.dataset.dir) * step * (html.dir === 'rtl' ? -1 : 1);
    }, true);
  });
  section.querySelector<HTMLElement>('[data-gallery-nav]')?.removeAttribute('hidden');

  // ---- the loop: only while on screen and the viewer is closed ---------------
  let visible = false;
  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(50, now - last) / 1000;
    last = now;
    if (!html.classList.contains('is-lightbox')) {
      if (!hovering) target = BASE * dir();
      speed += (target - speed) * 0.08;
      const p = pending * 0.12;
      pending -= p;
      if (!dragging) {
        x += speed * dt + vel + p;
        vel *= 0.92;
        if (Math.abs(vel) < 0.02) vel = 0;
      }
      wrap();
      write();
    }
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting && !document.hidden;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }).observe(strip);
  addEventListener('resize', () => { W = setWidth(); });
  target = BASE * dir();
  speed = target;
}
