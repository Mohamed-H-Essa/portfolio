// Dossier engine: the page doesn't scroll; the engine moves between
// full-screen frames (engine.css) on wheel / trackpad / swipe / keys / HUD,
// like a game's camera moving between views. A frame taller than the screen
// scrolls inside itself first and only then hands over to the next frame.
// Runs only when the inline head script has set html.is-engine.
import { initSwipeBack } from './swipe-back';

const LOCK_MS = 950; // one transition; input is ignored meanwhile
const QUIET_MS = 200; // a trackpad flick's inertia must stop before the next move
const WHEEL_STEP = 40; // accumulated delta that counts as "go"
const SWIPE = 56; // px
const LIGHT: [number, number][] = [[82, 18], [18, 30], [70, 80], [30, 70], [85, 55]];

export function initEngine(root: HTMLElement) {
  const html = document.documentElement;
  if (!html.classList.contains('is-engine')) return;
  const frames = Array.from(root.querySelectorAll<HTMLElement>('[data-frame]'));
  const hud = document.querySelector<HTMLElement>('[data-hud]')!;
  const ticks = Array.from(hud.querySelectorAll<HTMLButtonElement>('[data-go]'));
  const next = hud.querySelector<HTMLButtonElement>('[data-next]')!;
  const nextLabel = hud.querySelector<HTMLElement>('[data-next-label]')!;
  const count = hud.querySelector<HTMLElement>('[data-count]')!;
  const json = JSON.parse(document.querySelector('[data-engine-json]')?.textContent || '{}') as { next: string; map: string; back: string; labels: string[] };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the footer (contact) becomes the end of the last frame
  const footer = document.querySelector<HTMLElement>('body > .site-footer');
  if (footer) frames[frames.length - 1].append(footer);

  // stagger: mark what rises in when a frame becomes active
  for (const f of frames) {
    const items = Array.from(f.querySelectorAll<HTMLElement>('h1, h2, p, .btn, .chips li, .node, .flow__step, .gallery__strip li'))
      .filter((el) => !el.closest('.hero__art') && !el.parentElement?.closest('[data-rv]'));
    items.slice(0, 18).forEach((el, i) => { el.dataset.rv = ''; el.style.setProperty('--i', String(i)); });
    f.tabIndex = -1;
  }

  let idx = Math.max(0, frames.findIndex((f) => `#${f.id}` === location.hash));
  let lockUntil = 0;

  const apply = (from: number) => {
    frames.forEach((f, j) => {
      f.dataset.pos = j < idx ? 'before' : j > idx ? 'after' : 'active';
      f.classList.toggle('is-active', j === idx);
      f.inert = j !== idx;
    });
    const f = frames[idx];
    // coming back up lands at the bottom of a long frame, going down at its top
    f.scrollTop = from > idx ? f.scrollHeight : 0;
    ticks.forEach((t, j) => {
      t.classList.toggle('is-active', j === idx);
      if (j === idx) t.setAttribute('aria-current', 'step');
      else t.removeAttribute('aria-current');
    });
    count.textContent = String(idx + 1).padStart(2, '0');
    // the ambient light drifts to a new spot per frame, like a camera moving
    const spot = LIGHT[idx % LIGHT.length];
    root.style.setProperty('--ax', `${spot[0]}%`);
    root.style.setProperty('--ay', `${spot[1]}%`);
    const last = idx === frames.length - 1;
    next.hidden = last;
    if (!last) nextLabel.textContent = `${json.next}: ${json.labels[idx + 1]}`;
    history.replaceState(history.state, '', idx ? `#${f.id}` : location.pathname + location.search);
  };

  const go = (i: number) => {
    i = Math.max(0, Math.min(frames.length - 1, i));
    if (i === idx) return;
    const from = idx;
    const hadFocus = frames[from].contains(document.activeElement);
    idx = i;
    lockUntil = performance.now() + (reduce ? 200 : LOCK_MS);
    apply(from);
    if (hadFocus) frames[idx].focus({ preventScroll: true });
  };

  const canScroll = (f: HTMLElement, dir: number) =>
    dir > 0 ? f.scrollTop + f.clientHeight < f.scrollHeight - 2 : f.scrollTop > 2;

  // ---- wheel / trackpad ----------------------------------------------------
  let acc = 0;
  let lastWheel = 0;
  let needQuiet = false;
  addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // zoom / horizontal (gallery)
      const dir = Math.sign(e.deltaY);
      if (!dir) return;
      const now = performance.now();
      const quiet = now - lastWheel > QUIET_MS;
      lastWheel = now;
      if (quiet) { needQuiet = false; acc = 0; }
      if (canScroll(frames[idx], dir) && now >= lockUntil) return; // let the frame scroll itself
      e.preventDefault();
      if (now < lockUntil || needQuiet) return;
      acc += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
      if (Math.abs(acc) >= WHEEL_STEP) {
        acc = 0;
        needQuiet = true;
        go(idx + dir);
      }
    },
    { passive: false }
  );

  // ---- keys -----------------------------------------------------------------
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable]')) return;
    const f = frames[idx];
    const step = (dir: number, page: boolean) => {
      e.preventDefault();
      if (!page && canScroll(f, dir)) f.scrollBy({ top: dir * f.clientHeight * 0.6, behavior: reduce ? 'auto' : 'smooth' });
      else if (performance.now() >= lockUntil) go(idx + dir);
    };
    if (e.key === 'ArrowDown') step(1, false);
    else if (e.key === 'ArrowUp') step(-1, false);
    else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && !t.closest('button, a'))) step(1, true);
    else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) step(-1, true);
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(frames.length - 1); }
  });

  // ---- touch: swipe past a frame's edge ------------------------------------
  let y0 = 0, x0 = 0, edgeDown = false, edgeUp = false;
  addEventListener('touchstart', (e) => {
    const p = e.touches[0];
    y0 = p.clientY; x0 = p.clientX;
    edgeDown = !canScroll(frames[idx], 1);
    edgeUp = !canScroll(frames[idx], -1);
  }, { passive: true });
  addEventListener('touchend', (e) => {
    const p = e.changedTouches[0];
    const dy = y0 - p.clientY, dx = x0 - p.clientX;
    if (Math.abs(dy) < SWIPE || Math.abs(dy) < Math.abs(dx) * 1.2 || performance.now() < lockUntil) return;
    if (dy > 0 && edgeDown) go(idx + 1);
    else if (dy < 0 && edgeUp) go(idx - 1);
  }, { passive: true });

  // ---- HUD -------------------------------------------------------------------
  ticks.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.go))));
  next.addEventListener('click', () => go(idx + 1));

  // swipe back (horizontal) → the map, opened on this project. When we came
  // from that map, step back in history instead, so its camera is where it was.
  initSwipeBack({
    targets: [root],
    fade: [hud],
    label: () => json.map,
    ignore: '.gallery__strip',
    onCommit: () => {
      const back = new URL(json.back, location.href);
      let ref: URL | null = null;
      try { ref = document.referrer ? new URL(document.referrer) : null; } catch { /* none */ }
      if (ref && ref.origin === back.origin && ref.pathname === back.pathname && history.length > 1) history.back();
      else location.href = back.href;
    },
  });

  apply(idx);
  // after the landing, frames transition normally again
  window.setTimeout(() => html.classList.remove('is-landing'), 1200);
}
