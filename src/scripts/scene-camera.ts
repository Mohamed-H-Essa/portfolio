import { initPanelFx } from './panel-fx';
import { handoff, prefetch, type HandoffTarget } from './handoff';
import { play } from './sound';
import { LANE_W } from '../lib/scene';

// Camera + interaction for the layered 3D map (Scene.astro).
// The scene's geometry is static CSS 3D from SSR; this only drives a handful of
// CSS variables on the stage (--fx --fy --fz --yaw --pitch --zoom) every frame,
// plus selection state, the info panel, the year rail and the dust canvas.
// x = across the lanes, y = time (down = later), z = up.

interface PanelItem {
  code: string; title: string; impact: string; role: string; years: string;
  stack: string[]; layer: string; cover: string; coverPortrait: string; screens: boolean; gallery: string[]; href: string;
  appStore: string; playStore: string; live: string;
}
interface SceneJson {
  panel: Record<string, PanelItem>;
  strings: { phases: Record<string, string> };
  camera: {
    x: number; y: number; yaw: number; pitch: number;
    xRange: [number, number]; yRange: [number, number]; lanes: number[]; rtl: boolean;
  };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const RAD = Math.PI / 180;

export function initScene(stage: HTMLElement) {
  const json = JSON.parse(stage.querySelector('[data-scene-json]')!.textContent || '{}') as SceneJson;
  const viewport = stage.querySelector<HTMLElement>('.viewport')!;
  const cards = Array.from(stage.querySelectorAll<HTMLAnchorElement>('.card'));
  const panel = stage.querySelector<HTMLElement>('[data-panel]')!;
  const rail = Array.from(stage.querySelectorAll<HTMLButtonElement>('.rail__year'));
  const hint = stage.querySelector<HTMLElement>('[data-hint]');
  const index = stage.querySelector<HTMLElement>('[data-index]')!;
  const indexOpen = stage.querySelector<HTMLButtonElement>('[data-index-open]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = initPanelFx(stage.querySelector<HTMLElement>('[data-panel]')!, reduce);

  // ---- camera state ---------------------------------------------------------
  const cam0 = json.camera;
  const home = { fx: cam0.x, fy: cam0.y, fz: 160, yaw: cam0.yaw, pitch: cam0.pitch, zoomUser: 1 };
  const cur = { ...home };
  const tgt = { ...home };
  let fit = 0.7;
  let vx = 0; // inertia (world px / frame) across lanes
  let vy = 0; // ...and along time
  const [xMin, xMax] = cam0.xRange;
  const [yMin, yMax] = cam0.yRange;
  const lanes = cam0.lanes;
  // phones show one lane at a time (its neighbours peek in at the sides)
  const narrow = () => stage.clientWidth <= 760;
  const laneOf = (x: number) => lanes.reduce((b, c) => (Math.abs(c - x) < Math.abs(b - x) ? c : b), lanes[0]);

  // Desktop: all lanes fit beside the panel. Phone: one lane fills ~70% of the width.
  const computeFit = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    const base = parseFloat(getComputedStyle(stage).getPropertyValue('--fit-zoom')) || 0.7;
    const span = (lanes[lanes.length - 1] - lanes[0]) + LANE_W + 140;
    fit = narrow()
      ? clamp((w * 0.7) / LANE_W, 0.45, 0.8)
      : Math.min(base * clamp(h / 860, 0.8, 1.25), Math.max(0.42, (w - 460) / span));
  };
  computeFit();

  const write = () => {
    const s = stage.style;
    s.setProperty('--fx', cur.fx.toFixed(2));
    s.setProperty('--fy', cur.fy.toFixed(2));
    s.setProperty('--fz', cur.fz.toFixed(2));
    s.setProperty('--yaw', `${cur.yaw.toFixed(3)}deg`);
    s.setProperty('--pitch', `${cur.pitch.toFixed(3)}deg`);
    s.setProperty('--zoom', (fit * cur.zoomUser).toFixed(4));
  };

  // ---- input: drag to pan, shift/right-drag to orbit, pinch to zoom --------
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let moved = 0;
  let orbit = false;
  let last = { x: 0, y: 0, t: 0 };
  let pinchDist = 0;
  let lastInteraction = performance.now();
  const touched = () => {
    lastInteraction = performance.now();
    hint?.classList.add('is-gone');
  };

  viewport.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      return;
    }
    dragging = true;
    moved = 0;
    orbit = e.shiftKey || e.button === 2;
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    vx = vy = 0;
    touched();
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) tgt.zoomUser = cur.zoomUser = clamp(cur.zoomUser * (d / pinchDist), 0.5, 2.4);
      pinchDist = d;
      moved = 99;
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    const now = performance.now();
    const wasClick = moved <= 5;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 5 && wasClick) {
      // a real drag begins: capture now (capturing on press would eat card clicks)
      viewport.classList.add('is-grabbing');
      try { viewport.setPointerCapture(e.pointerId); } catch { /* pointer gone */ }
    }
    const zoom = fit * cur.zoomUser;
    if (orbit) {
      tgt.yaw = cur.yaw = clamp(cur.yaw + dx * 0.18, -50, 50);
      tgt.pitch = cur.pitch = clamp(cur.pitch + dy * 0.14, 18, 64);
    } else {
      // the floor is tilted away: a screen px down covers 1/cos(pitch) world px of time
      const ddx = -dx / (zoom * Math.max(0.35, Math.cos(cur.yaw * RAD)));
      const ddy = -dy / (zoom * Math.max(0.35, Math.cos(cur.pitch * RAD)));
      tgt.fx = cur.fx = clamp(cur.fx + ddx, xMin, xMax);
      tgt.fy = cur.fy = clamp(cur.fy + ddy, yMin, yMax);
      const dt = Math.max(8, now - last.t) / 16.7;
      vx = ddx / dt;
      vy = ddy / dt;
    }
    last = { x: e.clientX, y: e.clientY, t: now };
    touched();
  });

  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) {
      dragging = false;
      viewport.classList.remove('is-grabbing');
      if (reduce || performance.now() - last.t > 80) vx = vy = 0; // released while still: no fling
      // phones: settle on a lane, the one a sideways flick was heading for
      if (narrow() && !orbit) {
        tgt.fx = laneOf(cur.fx + vx * 14);
        vx = 0;
      }
    }
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());

  // Trackpads send deltaX; plain mice only deltaY. Wheel / two-finger scroll
  // down → later in time; trackpad sideways → across lanes. Ctrl/⌘ (and
  // trackpad pinch) → zoom.
  let trackpad = false;
  viewport.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      touched();
      if (e.deltaX !== 0) trackpad = true;
      const zoom = fit * cur.zoomUser;
      if (e.ctrlKey || e.metaKey) {
        tgt.zoomUser = clamp(tgt.zoomUser * Math.exp(-e.deltaY * 0.0022), 0.5, 2.4);
        return;
      }
      const k = e.deltaMode === 1 ? 32 : 1;
      if (trackpad && !narrow()) tgt.fx = clamp(tgt.fx + (e.deltaX * k) / zoom, xMin, xMax);
      tgt.fy = clamp(tgt.fy + (e.deltaY * k) / (zoom * Math.cos(cur.pitch * RAD)), yMin, yMax);
    },
    { passive: false }
  );

  viewport.addEventListener('keydown', (e) => {
    const step = 160 / (fit * cur.zoomUser);
    const m: Record<string, () => void> = {
      ArrowLeft: () => (tgt.fx = narrow() ? laneOf(tgt.fx - LANE_W) : clamp(tgt.fx - step, xMin, xMax)),
      ArrowRight: () => (tgt.fx = narrow() ? laneOf(tgt.fx + LANE_W) : clamp(tgt.fx + step, xMin, xMax)),
      ArrowUp: () => (tgt.fy = clamp(tgt.fy - step, yMin, yMax)),
      ArrowDown: () => (tgt.fy = clamp(tgt.fy + step, yMin, yMax)),
      '+': () => (tgt.zoomUser = clamp(tgt.zoomUser * 1.2, 0.5, 2.4)),
      '=': () => (tgt.zoomUser = clamp(tgt.zoomUser * 1.2, 0.5, 2.4)),
      '-': () => (tgt.zoomUser = clamp(tgt.zoomUser / 1.2, 0.5, 2.4)),
    };
    if (m[e.key]) { m[e.key](); e.preventDefault(); touched(); }
  });

  // ---- selection, hover lighting, panel ----------------------------------
  const neighbours = new Map<string, Set<string>>();
  stage.querySelectorAll<HTMLElement>('.beam').forEach((b) => {
    const [a, c] = (b.dataset.for || '').split(' ');
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    if (!neighbours.has(c)) neighbours.set(c, new Set());
    neighbours.get(a)!.add(c);
    neighbours.get(c)!.add(a);
  });
  const litEls = Array.from(stage.querySelectorAll<HTMLElement>('[data-for]'));
  let selected = '';

  const light = (slug: string) => {
    stage.classList.toggle('has-focus', !!slug);
    for (const el of litEls) el.classList.toggle('is-lit', !!slug && (el.dataset.for || '').split(' ').includes(slug));
    const near = neighbours.get(slug) ?? new Set();
    for (const c of cards) c.classList.toggle('is-lit', c.dataset.slug === slug || near.has(c.dataset.slug!));
  };

  const setP = (key: string, fn: (el: HTMLElement) => void) =>
    panel.querySelectorAll<HTMLElement>(`[data-p="${key}"]`).forEach(fn);

  const fillPanel = (slug: string) => {
    const d = json.panel[slug];
    if (!d) return;
    panel.dataset.layer = d.layer;
    fx.show({ slug, cover: d.cover, gallery: d.gallery });
    setP('code', (el) => (el.textContent = d.code));
    setP('years', (el) => (el.textContent = d.years));
    setP('title', (el) => (el.textContent = d.title));
    setP('impact', (el) => (el.textContent = d.impact));
    setP('stack', (el) => (el.innerHTML = d.stack.map((s) => `<li>${s.replace(/</g, '&lt;')}</li>`).join('')));
    for (const k of ['href', 'appStore', 'playStore', 'live'] as const) {
      setP(k, (el) => {
        const v = d[k];
        el.toggleAttribute('hidden', !v);
        if (v) (el as HTMLAnchorElement).href = v;
      });
    }
    panel.classList.add('is-open');
  };

  // Centre the whole card (not its foot) at the screen focus. The card is a
  // billboard standing on its anchor (x, y, z + lift) and rising cardH screen
  // px; world z maps to screen y by zoom·sin(pitch), so lift the focus by half
  // the card's on-screen height expressed in world units. Across the lanes:
  // phones go to the card's lane; desktop keeps every lane in view unless zoomed in.
  const flyTo = (card: HTMLElement) => {
    const k = parseFloat(getComputedStyle(stage).getPropertyValue('--card-k')) || 1;
    const zoom = fit * tgt.zoomUser;
    const halfH = (card.offsetHeight * k) / 2;
    const x = Number(card.dataset.x);
    tgt.fx = narrow() ? laneOf(x) : tgt.zoomUser > 1.15 ? clamp(x, xMin, xMax) : home.fx;
    tgt.fy = clamp(Number(card.dataset.y), yMin, yMax);
    tgt.fz = Number(card.dataset.z) + halfH / (zoom * Math.sin(tgt.pitch * RAD));
    vx = vy = 0;
  };

  const select = (slug: string, fly = true) => {
    selected = slug;
    for (const c of cards) c.classList.toggle('is-selected', c.dataset.slug === slug);
    light(slug);
    fillPanel(slug);
    const card = cards.find((c) => c.dataset.slug === slug);
    if (fly && card) flyTo(card);
    prefetch(target(slug));
  };

  // ---- opening a project: the hand-off ---------------------------------
  const target = (slug: string): HandoffTarget => {
    const d = json.panel[slug];
    return { slug, href: d.href, cover: d.cover, coverPortrait: d.coverPortrait, rtl: cam0.rtl, diagram: !d.screens };
  };
  const plainClick = (e: MouseEvent) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
  const panelArt = panel.querySelector<HTMLElement>('.panel__art')!;
  // the whole card opens the project; only its own links (stores) keep their job
  panel.addEventListener('click', (e) => {
    if (!selected || !plainClick(e) || (e.target as Element).closest('a, button')) return;
    handoff(target(selected), panelArt, stage);
  });
  panel.querySelectorAll<HTMLAnchorElement>('[data-p="href"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (!selected || !plainClick(e)) return;
      e.preventDefault();
      handoff(target(selected), panelArt, stage);
    })
  );

  for (const card of cards) {
    card.addEventListener('click', (e) => {
      if (moved > 5) { e.preventDefault(); return; } // it was a drag
      if (!card.classList.contains('is-selected')) {
        e.preventDefault(); // first click selects; second click opens
        select(card.dataset.slug!);
        touched();
      } else if (plainClick(e)) {
        e.preventDefault();
        handoff(target(card.dataset.slug!), card.querySelector<HTMLElement>('.card__img')!, stage);
      }
    });
    card.addEventListener('pointerenter', (e) => { if (dragging) return; light(card.dataset.slug!); if (e.pointerType === 'mouse') play('tick', { level: 0.7 }); });
    card.addEventListener('pointerleave', () => light(selected));
    // keyboard focus selects (Enter then opens); mouse focus is handled by click
    card.addEventListener('focus', () => card.matches(':focus-visible') && select(card.dataset.slug!));
  }

  // ---- year rail, controls, index ----------------------------------------
  for (const b of rail) {
    b.addEventListener('click', () => {
      // the year line a little above centre, so that year's projects fill the view
      tgt.fy = clamp(Number(b.dataset.y) + 220, yMin, yMax);
      vy = 0;
      touched();
    });
  }
  const updateRail = () => {
    let best: HTMLButtonElement | null = null;
    let bestD = Infinity;
    for (const b of rail) {
      // the year whose start is at or before the focus
      const y = Number(b.dataset.y);
      const passed = y <= cur.fy + 1;
      const d = Math.abs(cur.fy - y);
      if (passed && d < bestD) { bestD = d; best = b; }
    }
    for (const b of rail) b.classList.toggle('is-active', b === best);
  };

  stage.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      tgt.zoomUser = clamp(tgt.zoomUser * (b.dataset.zoom === 'in' ? 1.25 : 0.8), 0.5, 2.4);
      touched();
    })
  );
  stage.querySelector('[data-reset]')?.addEventListener('click', () => {
    Object.assign(tgt, home);
    vx = vy = 0;
    if (json.panel[stage.dataset.start || '']) select(stage.dataset.start!);
  });
  const toggleIndex = (open: boolean) => {
    index.classList.toggle('is-open', open);
    indexOpen.setAttribute('aria-expanded', String(open));
    if (open) index.querySelector<HTMLElement>('a')?.focus();
    else indexOpen.focus();
  };
  indexOpen.addEventListener('click', () => toggleIndex(true));
  stage.querySelector('[data-index-close]')?.addEventListener('click', () => toggleIndex(false));
  index.addEventListener('click', (e) => e.target === index && toggleIndex(false));
  addEventListener('keydown', (e) => e.key === 'Escape' && index.classList.contains('is-open') && toggleIndex(false));

  // ---- dust: slow motes with parallax, behind everything -----------------
  const canvas = stage.querySelector<HTMLCanvasElement>('.dust')!;
  const ctx = canvas.getContext('2d')!;
  const motes: { x: number; y: number; d: number; s: number; v: number }[] = [];
  const sizeCanvas = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = stage.clientWidth * dpr;
    canvas.height = stage.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = stage.clientWidth < 760 ? 45 : 110;
    motes.length = 0;
    for (let i = 0; i < n; i++)
      motes.push({ x: Math.random(), y: Math.random(), d: 0.2 + Math.random() * 0.8, s: 0.4 + Math.random() * 1.3, v: (Math.random() - 0.5) * 0.00006 });
  };
  sizeCanvas();
  const drawDust = (t: number) => {
    const w = stage.clientWidth, h = stage.clientHeight;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      if (!reduce) m.y += m.v * 16;
      const px = (((m.x * w - cur.fx * 0.05 * m.d - cur.yaw * 4 * m.d) % w) + w) % w;
      const py = (((m.y * h - cur.fy * 0.05 * m.d) % h) + h) % h;
      const a = 0.08 + 0.22 * m.d * (0.6 + 0.4 * Math.sin(t * 0.0006 + m.x * 40));
      ctx.fillStyle = `rgba(237,230,214,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, m.s * m.d, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // ---- the loop ----------------------------------------------------------
  let raf = 0;
  const tick = (t: number) => {
    if (!dragging && !reduce) {
      // fling
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        tgt.fx = clamp(tgt.fx + vx, xMin, xMax);
        tgt.fy = clamp(tgt.fy + vy, yMin, yMax);
        vx *= 0.92;
        vy *= 0.92;
      }
    }
    const k = reduce ? 1 : dragging ? 1 : 0.1;
    cur.fx += (tgt.fx - cur.fx) * k;
    cur.fz += (tgt.fz - cur.fz) * k;
    cur.fy += (tgt.fy - cur.fy) * k;
    cur.zoomUser += (tgt.zoomUser - cur.zoomUser) * (reduce ? 1 : 0.14);
    if (!dragging) {
      // gentle idle sway once the visitor has been still for a moment
      const idle = performance.now() - lastInteraction > 2500 && !reduce;
      const sway = idle ? Math.sin(t * 0.00028) * 3.2 : 0;
      cur.yaw += (tgt.yaw + sway - cur.yaw) * (reduce ? 1 : 0.04);
      cur.pitch += (tgt.pitch - cur.pitch) * (reduce ? 1 : 0.08);
    }
    write();
    updateRail();
    drawDust(t);
    raf = requestAnimationFrame(tick);
  };

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(tick);
  });
  addEventListener('resize', () => {
    computeFit();
    sizeCanvas();
    if (narrow()) tgt.fx = laneOf(tgt.fx);
  });

  // start framed on the featured project (or ?p=<slug> when coming back from
  // a dossier), without animating the first frame
  const back = new URLSearchParams(location.search).get('p');
  // coming back from a project: the map rises out of the depth it fell into
  const arrive = () => {
    if (reduce) return;
    stage.classList.remove('is-return');
    void stage.offsetWidth;
    stage.classList.add('is-return');
  };
  if (back) arrive();
  addEventListener('pageshow', (e) => { if (e.persisted) arrive(); });
  const first = back && json.panel[back] ? back : stage.dataset.start;
  if (first) {
    select(first, true);
    cur.fx = tgt.fx;
    cur.fy = tgt.fy;
    cur.fz = tgt.fz;
  }
  write();
  raf = requestAnimationFrame(tick);
}
