// The selected-project card on the map (Scene's .panel): it notices the
// pointer. On hover it lifts and tilts toward the cursor with a moving sheen,
// faint white sparkles trail the pointer, and the art cycles through the
// project's screens with story-style progress bars. Touch devices cycle on
// their own and get a sparkle burst on touch. Reduced motion: static.

export interface PanelMedia { slug: string; cover: string; gallery: string[] }

interface Star { x: number; y: number; vx: number; vy: number; age: number; life: number; s: number }

const STEP_MS = 1700;

export function initPanelFx(panel: HTMLElement, reduce: boolean) {
  const frames = panel.querySelector<HTMLElement>('[data-frames]')!;
  const bars = panel.querySelector<HTMLElement>('[data-bars]')!;
  const canvas = panel.querySelector<HTMLCanvasElement>('[data-stars]')!;
  const ctx = canvas.getContext('2d');
  const touch = matchMedia('(hover: none)').matches;

  // ---- art: cover + gallery, cross-fading --------------------------------
  let imgs: HTMLImageElement[] = [];
  let idx = 0;
  let timer = 0;

  const mark = () => {
    imgs.forEach((im, i) => im.classList.toggle('is-on', i === idx));
    Array.from(bars.children).forEach((b, i) => {
      b.classList.toggle('is-done', i < idx);
      b.classList.remove('is-run');
      if (i === idx && timer) {
        void (b as HTMLElement).offsetWidth; // restart the fill animation
        b.classList.add('is-run');
      }
    });
  };
  const stop = (reset: boolean) => {
    window.clearInterval(timer);
    timer = 0;
    if (reset) idx = 0;
    mark();
  };
  const start = () => {
    if (reduce || imgs.length < 2 || timer) return;
    imgs.forEach((im) => { if (!im.src) im.src = im.dataset.src!; });
    timer = window.setInterval(() => { idx = (idx + 1) % imgs.length; mark(); }, STEP_MS);
    mark();
  };

  const show = (m: PanelMedia) => {
    stop(true);
    frames.replaceChildren();
    bars.replaceChildren();
    const urls = m.cover ? [m.cover, ...m.gallery] : [];
    panel.classList.toggle('has-badge', !urls.length);
    if (!urls.length) {
      const tpl = document.querySelector<HTMLTemplateElement>(`template[data-badge="${m.slug}"]`);
      if (tpl) frames.append(tpl.content.cloneNode(true));
    }
    imgs = urls.map((u, i) => {
      const im = new Image();
      im.alt = '';
      im.decoding = 'async';
      im.dataset.src = u;
      im.dataset.kind = i === 0 ? 'cover' : 'screen';
      if (i === 0) im.src = u; // the rest load on first hover
      frames.append(im);
      return im;
    });
    if (imgs.length > 1) for (let i = 0; i < imgs.length; i++) bars.append(document.createElement('span'));
    mark();
    if (touch) start();
  };

  // ---- tilt, sheen, sparkles ---------------------------------------------
  const stars: Star[] = [];
  let raf = 0;
  let hovering = false;
  let last: { x: number; y: number } | null = null;
  let ambient = 0;

  const spawn = (x: number, y: number, spread: number, n: number) => {
    for (let i = 0; i < n && stars.length < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.08 + Math.random() * 0.25;
      stars.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.18, // they rise, a little
        age: 0,
        life: 700 + Math.random() * 900,
        s: 1.2 + Math.random() * 2.6,
      });
    }
    wake();
  };

  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = panel.offsetWidth * dpr;
    canvas.height = panel.offsetHeight * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let prev = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(48, now - prev);
    prev = now;
    if (hovering && (ambient += dt) > 260) {
      ambient = 0;
      spawn(Math.random() * panel.offsetWidth, Math.random() * panel.offsetHeight, 0, 1);
    }
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.age += dt;
        if (s.age > s.life) { stars.splice(i, 1); continue; }
        s.x += s.vx * dt * 0.06;
        s.y += s.vy * dt * 0.06;
        const p = s.age / s.life;
        const a = Math.sin(p * Math.PI) * 0.9; // twinkle in, fade out
        const r = s.s * (0.6 + 0.4 * Math.sin(p * Math.PI));
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(s.x - r * 2.2, s.y); ctx.lineTo(s.x + r * 2.2, s.y);
        ctx.moveTo(s.x, s.y - r * 2.2); ctx.lineTo(s.x, s.y + r * 2.2);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    raf = stars.length || hovering ? requestAnimationFrame(frame) : 0;
  };
  function wake() {
    if (!raf && !reduce) { prev = performance.now(); raf = requestAnimationFrame(frame); }
  }

  const local = (e: PointerEvent) => {
    const r = panel.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * panel.offsetWidth, y: ((e.clientY - r.top) / r.height) * panel.offsetHeight, u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height };
  };

  panel.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !panel.classList.contains('is-open')) return;
    hovering = true;
    last = null;
    panel.classList.add('is-hover');
    size();
    start();
    wake();
  });
  panel.addEventListener('pointermove', (e) => {
    if (!hovering) return;
    const p = local(e);
    panel.style.setProperty('--mx', `${(p.u * 100).toFixed(1)}%`);
    panel.style.setProperty('--my', `${(p.v * 100).toFixed(1)}%`);
    if (!reduce) {
      panel.style.setProperty('--ry', `${((p.u - 0.5) * 7).toFixed(2)}deg`);
      panel.style.setProperty('--rx', `${((0.5 - p.v) * 5).toFixed(2)}deg`);
    }
    const moved = last ? Math.hypot(p.x - last.x, p.y - last.y) : 0;
    if (!last || moved > 14) { spawn(p.x, p.y, 10, 1 + (moved > 40 ? 1 : 0)); last = p; }
  });
  panel.addEventListener('pointerleave', () => {
    if (!hovering) return;
    hovering = false;
    panel.classList.remove('is-hover');
    panel.style.setProperty('--rx', '0deg');
    panel.style.setProperty('--ry', '0deg');
    stop(true);
  });
  panel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    size();
    const p = local(e);
    spawn(p.x, p.y, 30, 10);
  });

  return { show };
}
