// Horizontal "swipe back": a two-finger trackpad swipe or a finger swipe in the
// back direction (rightward in LTR, leftward in RTL) pulls the view away into
// depth as you go; a chip at the leading edge fills a ring toward the threshold.
// Let go early and it springs back; past the threshold the view falls away and
// onCommit runs. Used where "back" has one obvious meaning (project page → map,
// intro world step → language step); never on the map, where horizontal pans
// time. The browser's own swipe navigation is off on these pages
// (overscroll-behavior), so this is the one back gesture.
import './swipe-back.css';

export interface SwipeBackOptions {
  targets: HTMLElement[]; // what recedes
  fade?: HTMLElement[]; // fixed overlays (a HUD) that only fade: a transform would unpin them
  label: () => string; // chip text, e.g. "Map" (read live: the intro relabels in place)
  onCommit: () => void;
  ignore?: string; // a horizontal scroller where sideways means "scroll", not "back"
  enabled?: () => boolean;
  /** same-document commits (the intro) bring the targets back after onCommit */
  restore?: boolean;
}

const WHEEL_PX = 340; // trackpad travel for a full pull
const READY = 0.6; // pull needed to commit
const END_MS = 140; // a wheel gesture ends after this much quiet

export function initSwipeBack(o: SwipeBackOptions) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // screen direction of "back", read live (the intro can switch to Arabic in place)
  let dir = 1;
  let pull = 0; // target, 0..1.15
  let cur = 0; // rendered
  let raf = 0;
  let endTimer = 0;
  let done = false;
  let ready = false;

  // ---- the chip ---------------------------------------------------------
  const chip = document.createElement('div');
  chip.className = 'swipe-back';
  chip.setAttribute('aria-hidden', 'true');
  document.body.append(chip);
  const orient = () => {
    const rtl = document.documentElement.dir === 'rtl';
    dir = rtl ? -1 : 1;
    chip.dataset.side = rtl ? 'right' : 'left';
    chip.innerHTML = `<svg viewBox="0 0 40 40"><circle class="swipe-back__track" cx="20" cy="20" r="17"/><circle class="swipe-back__ring" cx="20" cy="20" r="17" pathLength="1"/><path class="swipe-back__arrow" d="${rtl ? 'M16 13l7 7-7 7' : 'M24 13l-7 7 7 7'}"/></svg><span></span>`;
    chip.querySelector('span')!.textContent = o.label();
  };
  orient();

  const paint = () => {
    const k = reduce ? 0 : cur;
    for (const t of o.targets) {
      t.style.transition = k ? 'none' : ''; // follow the fingers 1:1 (the rAF eases)
      t.style.transform = k ? `translate3d(${dir * k * 7}vw,0,0) scale(${1 - k * 0.1})` : '';
      t.style.opacity = k ? String(1 - k * 0.55) : '';
      t.style.filter = k ? `blur(${(k * 5).toFixed(2)}px)` : '';
    }
    for (const f of o.fade ?? []) f.style.opacity = k ? String(Math.max(0, 1 - k * 1.4)) : '';
    chip.style.setProperty('--p', String(Math.min(1, cur / READY)));
    chip.style.opacity = String(Math.min(1, cur * 2.4));
    const r = cur >= READY;
    if (r !== ready) {
      ready = r;
      chip.classList.toggle('is-ready', r);
      if (r) navigator.vibrate?.(8);
    }
  };
  const tick = () => {
    cur += (pull - cur) * 0.24;
    if (Math.abs(pull - cur) < 0.002) cur = pull;
    paint();
    raf = cur !== pull ? requestAnimationFrame(tick) : 0;
  };
  const set = (v: number) => {
    pull = Math.max(0, Math.min(1.15, v));
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const commit = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    raf = 0;
    chip.classList.add('is-ready');
    if (reduce) { o.onCommit(); return; }
    for (const t of o.targets) {
      t.style.transition = 'transform 460ms var(--ease-strong), opacity 380ms var(--ease), filter 380ms var(--ease)';
      t.style.transform = `translate3d(${dir * 16}vw,0,0) scale(0.72)`;
      t.style.opacity = '0';
      t.style.filter = 'blur(10px)';
    }
    for (const f of o.fade ?? []) { f.style.transition = 'opacity 300ms ease'; f.style.opacity = '0'; }
    chip.style.opacity = '0';
    window.setTimeout(() => {
      o.onCommit();
      if (o.restore) reset(true);
    }, 400);
  };
  const reset = (fadeIn = false) => {
    done = false;
    pull = cur = 0;
    ready = false;
    chip.classList.remove('is-ready');
    for (const t of o.targets) {
      t.style.transition = 'none';
      paint();
      if (fadeIn && !reduce) t.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'ease-out' });
      void t.offsetWidth;
      t.style.transition = '';
    }
    for (const f of o.fade ?? []) { f.style.transition = ''; f.style.opacity = ''; }
    chip.style.opacity = '0';
  };
  // returning to this page from history (bfcache): show it whole again
  addEventListener('pageshow', (e) => { if (e.persisted) reset(); });

  const on = () => !done && (o.enabled?.() ?? true);
  const ignored = (el: EventTarget | null, dx: number) => {
    const s = o.ignore && (el as Element | null)?.closest?.(o.ignore);
    if (!(s instanceof HTMLElement)) return false;
    // sideways inside a scroller scrolls it, until it can't go further that way
    const max = s.scrollWidth - s.clientWidth;
    if (max <= 1) return false;
    const x = Math.abs(s.scrollLeft); // RTL scrollLeft is negative in modern browsers
    return dx * (getComputedStyle(s).direction === 'rtl' ? -1 : 1) > 0 ? x < max - 1 : x > 1;
  };

  // ---- trackpad --------------------------------------------------------
  addEventListener(
    'wheel',
    (e) => {
      if (!on() || e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;
      if (ignored(e.target, e.deltaX)) return;
      e.preventDefault();
      if (pull === 0 && !raf) orient();
      // fingers moving "back" scroll content the other way: deltaX < 0 in LTR
      set(pull + (-e.deltaX * dir) / WHEEL_PX);
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(() => (pull >= READY ? commit() : set(0)), END_MS);
    },
    { passive: false }
  );

  // ---- touch -----------------------------------------------------------
  let x0 = 0, y0 = 0, mode: 'idle' | 'back' | 'no' = 'idle';
  addEventListener('touchstart', (e) => {
    if (!on() || e.touches.length !== 1) { mode = 'no'; return; }
    orient();
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
    mode = o.ignore && (e.target as Element).closest?.(o.ignore) ? 'no' : 'idle';
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (mode === 'no' || !on()) return;
    const dx = (e.touches[0].clientX - x0) * dir, dy = e.touches[0].clientY - y0;
    if (mode === 'idle') {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      mode = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.3 ? 'back' : 'no';
      if (mode === 'no') return;
    }
    e.preventDefault();
    set(dx / (innerWidth * 0.42));
  }, { passive: false });
  addEventListener('touchend', () => {
    if (mode === 'back') (pull >= READY ? commit() : set(0));
    mode = 'idle';
  });
}
