// Background for the ∞ intro: the lemniscate's own family of curves. The ∞ is
// the Cassini oval |p−f1|·|p−f2| = c² with c at the foci distance; drawing
// other values of c gives rings inside each lobe and ovals around the whole
// figure. The pointer is a soft lens that bends the curves near it. Contours
// come from marching squares on a coarse grid, redrawn only while the lens
// moves (idle = no work). Reduced motion: drawn once, no lens.

const LEVEL_STEP = 0.2; // spacing of the curves in log(d1·d2)
const INNER = 6; // curves inside the lobes (smaller than the ∞'s own level)
const LENS = 0.42; // lens strength (log units)
const LENS_R = 170; // lens radius, px

export function initField(canvas: HTMLCanvasElement, fig: HTMLElement, reduce: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let W = 0, H = 0, dpr = 1, cell = 9, nx = 0, ny = 0;
  let vals = new Float32Array(0);
  let f1 = { x: 0, y: 0 }, f2 = { x: 0, y: 0 }, base = 0;
  const lens = { x: -9999, y: -9999, tx: -9999, ty: -9999, k: 0, tk: 0 };
  let raf = 0;
  let grad: CanvasGradient | null = null;

  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    cell = W < 760 ? 8 : 9;
    nx = Math.ceil(W / cell) + 1;
    ny = Math.ceil(H / cell) + 1;
    vals = new Float32Array(nx * ny);
    // foci of the ∞ in canvas px: the figure's centre ± a/√2 (a = half-width)
    const c = canvas.getBoundingClientRect();
    const r = fig.getBoundingClientRect();
    const a = (r.width * 100) / 220;
    const cx = r.left - c.left + r.width / 2, cy = r.top - c.top + r.height / 2;
    f1 = { x: cx - a / Math.SQRT2, y: cy };
    f2 = { x: cx + a / Math.SQRT2, y: cy };
    base = Math.log((a * a) / 2); // the ∞'s own level
    grad = ctx.createLinearGradient(f1.x - a, 0, f2.x + a, 0);
    grad.addColorStop(0, 'rgb(232,178,58)');
    grad.addColorStop(0.5, 'rgb(237,230,214)');
    grad.addColorStop(1, 'rgb(93,184,214)');
    draw();
  };

  const field = () => {
    const r2 = LENS_R * LENS_R;
    const lk = LENS * lens.k;
    for (let j = 0; j < ny; j++) {
      const y = j * cell;
      for (let i = 0; i < nx; i++) {
        const x = i * cell;
        const d1 = (x - f1.x) ** 2 + (y - f1.y) ** 2;
        const d2 = (x - f2.x) ** 2 + (y - f2.y) ** 2;
        let v = 0.5 * Math.log(d1 * d2 + 1e-6);
        if (lk) v -= lk * Math.exp(-((x - lens.x) ** 2 + (y - lens.y) ** 2) / r2);
        vals[j * nx + i] = v;
      }
    }
  };

  // one Path2D of every contour segment (marching squares, linear interpolation)
  const contours = () => {
    const p = new Path2D();
    const lo = base - INNER * LEVEL_STEP;
    const lerp = (a: number, b: number, l: number) => (l - a) / (b - a);
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = vals[j * nx + i], b = vals[j * nx + i + 1];
        const c = vals[(j + 1) * nx + i + 1], d = vals[(j + 1) * nx + i];
        const mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
        let n = Math.max(0, Math.ceil((mn - lo) / LEVEL_STEP));
        for (let l = lo + n * LEVEL_STEP; l < mx; l += LEVEL_STEP, n++) {
          const x = i * cell, y = j * cell;
          const pts: number[] = [];
          if ((a < l) !== (b < l)) pts.push(x + cell * lerp(a, b, l), y);
          if ((b < l) !== (c < l)) pts.push(x + cell, y + cell * lerp(b, c, l));
          if ((c < l) !== (d < l)) pts.push(x + cell * lerp(d, c, l), y + cell);
          if ((d < l) !== (a < l)) pts.push(x, y + cell * lerp(a, d, l));
          for (let q = 0; q + 3 < pts.length; q += 4) {
            p.moveTo(pts[q], pts[q + 1]);
            p.lineTo(pts[q + 2], pts[q + 3]);
          }
        }
      }
    }
    return p;
  };

  function draw() {
    field();
    const path = contours();
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, W, H);
    ctx!.lineWidth = 0.7;
    ctx!.strokeStyle = grad!;
    ctx!.globalAlpha = 0.075;
    ctx!.stroke(path);
    if (lens.k > 0.01) {
      // the curves light up a little where the lens is
      ctx!.save();
      const g = ctx!.createRadialGradient(lens.x, lens.y, 0, lens.x, lens.y, LENS_R * 1.4);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.beginPath();
      ctx!.arc(lens.x, lens.y, LENS_R * 1.4, 0, Math.PI * 2);
      ctx!.clip();
      ctx!.globalAlpha = 0.16 * lens.k;
      ctx!.stroke(path);
      ctx!.restore();
    }
    ctx!.globalAlpha = 1;
  }

  const tick = () => {
    const e = 0.12;
    lens.x += (lens.tx - lens.x) * e;
    lens.y += (lens.ty - lens.y) * e;
    lens.k += (lens.tk - lens.k) * 0.06;
    draw();
    const moving = Math.abs(lens.tx - lens.x) > 0.3 || Math.abs(lens.ty - lens.y) > 0.3 || Math.abs(lens.tk - lens.k) > 0.004;
    raf = moving ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  size();
  new ResizeObserver(size).observe(canvas);
  if (reduce) return;
  addEventListener('pointermove', (e) => {
    const c = canvas.getBoundingClientRect();
    if (lens.k < 0.01 && lens.tk === 0) { lens.x = e.clientX - c.left; lens.y = e.clientY - c.top; }
    lens.tx = e.clientX - c.left;
    lens.ty = e.clientY - c.top;
    lens.tk = 1;
    wake();
  });
  document.documentElement.addEventListener('pointerleave', () => { lens.tk = 0; wake(); });
}
