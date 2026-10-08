// Camera + interaction for the layered 3D map (Scene.astro).
// The scene's geometry is static CSS 3D from SSR; this only drives a handful of
// CSS variables on the stage (--fx --fz --yaw --pitch --zoom) every frame, plus
// selection state, the info panel, the year rail and the dust canvas.

interface PanelItem {
  code: string; title: string; impact: string; role: string; years: string;
  stack: string[]; layer: string; cover: string; href: string;
  appStore: string; playStore: string; live: string;
}
interface SceneJson {
  panel: Record<string, PanelItem>;
  strings: { phases: Record<string, string> };
  camera: { x: number; z: number; yaw: number; xRange: [number, number]; rtl: boolean };
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

  // ---- camera state ---------------------------------------------------------
  const cam0 = json.camera;
  const home = { fx: cam0.x, fz: 0, yaw: cam0.yaw, pitch: 54, zoomUser: 1 };
  const cur = { ...home };
  const tgt = { ...home };
  let fit = 0.78;
  let vx = 0; // inertia (world px / frame) on x
  let vz = 0;
  const [xMin, xMax] = cam0.xRange;
  const zMin = -360, zMax = 360;

  const computeFit = () => {
    const base = parseFloat(getComputedStyle(stage).getPropertyValue('--fit-zoom')) || 0.78;
    fit = base * clamp(stage.clientHeight / 860, 0.72, 1.25);
  };
  computeFit();

  const write = () => {
    const s = stage.style;
    s.setProperty('--fx', cur.fx.toFixed(2));
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
    vx = vz = 0;
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
      tgt.pitch = cur.pitch = clamp(cur.pitch + dy * 0.14, 28, 74);
    } else {
      const ddx = -dx / (zoom * Math.max(0.35, Math.cos(cur.yaw * RAD)));
      const ddz = dy / (zoom * Math.max(0.35, Math.sin(cur.pitch * RAD)));
      tgt.fx = cur.fx = clamp(cur.fx + ddx, xMin, xMax);
      tgt.fz = cur.fz = clamp(cur.fz + ddz, zMin, zMax);
      const dt = Math.max(8, now - last.t) / 16.7;
      vx = ddx / dt;
      vz = ddz / dt;
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
      if (reduce || performance.now() - last.t > 80) vx = vz = 0; // released while still: no fling
    }
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());

  // Trackpads send deltaX; plain mice only deltaY. Mouse wheel → time,
  // trackpad → x/z like a drag. Ctrl/⌘ (and trackpad pinch) → zoom.
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
      if (trackpad) {
        tgt.fx = clamp(tgt.fx + (e.deltaX * k) / zoom, xMin, xMax);
        tgt.fz = clamp(tgt.fz - (e.deltaY * k) / zoom, zMin, zMax);
      } else {
        tgt.fx = clamp(tgt.fx + ((cam0.rtl ? -1 : 1) * e.deltaY * k) / zoom, xMin, xMax);
      }
    },
    { passive: false }
  );

  viewport.addEventListener('keydown', (e) => {
    const step = 160 / (fit * cur.zoomUser);
    const m: Record<string, () => void> = {
      ArrowLeft: () => (tgt.fx = clamp(tgt.fx - step, xMin, xMax)),
      ArrowRight: () => (tgt.fx = clamp(tgt.fx + step, xMin, xMax)),
      ArrowUp: () => (tgt.fz = clamp(tgt.fz + step * 0.6, zMin, zMax)),
      ArrowDown: () => (tgt.fz = clamp(tgt.fz - step * 0.6, zMin, zMax)),
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
    setP('cover', (el) => ((el as HTMLImageElement).src = d.cover || ''));
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

  const flyTo = (card: HTMLElement) => {
    tgt.fx = clamp(Number(card.dataset.x), xMin, xMax);
    tgt.fz = Number(card.dataset.z) * 0.55;
    vx = vz = 0;
  };

  const select = (slug: string, fly = true) => {
    selected = slug;
    for (const c of cards) c.classList.toggle('is-selected', c.dataset.slug === slug);
    light(slug);
    fillPanel(slug);
    const card = cards.find((c) => c.dataset.slug === slug);
    if (fly && card) flyTo(card);
  };

  for (const card of cards) {
    card.addEventListener('click', (e) => {
      if (moved > 5) { e.preventDefault(); return; } // it was a drag
      if (!card.classList.contains('is-selected')) {
        e.preventDefault(); // first click selects; second click opens
        select(card.dataset.slug!);
        touched();
      }
    });
    card.addEventListener('pointerenter', () => !dragging && light(card.dataset.slug!));
    card.addEventListener('pointerleave', () => light(selected));
    // keyboard focus selects (Enter then opens); mouse focus is handled by click
    card.addEventListener('focus', () => card.matches(':focus-visible') && select(card.dataset.slug!));
  }

  // ---- year rail, controls, index ----------------------------------------
  for (const b of rail) {
    b.addEventListener('click', () => {
      tgt.fx = clamp(Number(b.dataset.x), xMin, xMax);
      vx = 0;
      touched();
    });
  }
  const updateRail = () => {
    let best: HTMLButtonElement | null = null;
    let bestD = Infinity;
    for (const b of rail) {
      // the year whose start is at or before the focus (time-wise)
      const x = Number(b.dataset.x);
      const passed = cam0.rtl ? x >= cur.fx - 1 : x <= cur.fx + 1;
      const d = Math.abs(cur.fx - x);
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
    vx = vz = 0;
    if (json.panel[stage.dataset.start || '']) select(stage.dataset.start!, false);
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
      const py = (((m.y * h + cur.fz * 0.04 * m.d) % h) + h) % h;
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
      if (Math.abs(vx) > 0.05 || Math.abs(vz) > 0.05) {
        tgt.fx = clamp(tgt.fx + vx, xMin, xMax);
        tgt.fz = clamp(tgt.fz + vz, zMin, zMax);
        vx *= 0.92;
        vz *= 0.92;
      }
    }
    const k = reduce ? 1 : dragging ? 1 : 0.1;
    cur.fx += (tgt.fx - cur.fx) * k;
    cur.fz += (tgt.fz - cur.fz) * k;
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
  addEventListener('resize', () => { computeFit(); sizeCanvas(); });

  // start framed on the featured project, without animating the first frame
  if (stage.dataset.start) {
    select(stage.dataset.start, true);
    cur.fx = tgt.fx;
    cur.fz = tgt.fz;
  }
  write();
  raf = requestAnimationFrame(tick);
}
