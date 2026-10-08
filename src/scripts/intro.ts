// Behaviour for the ∞ intro (Intro.astro). Without this the page is a static,
// self-drawing ∞ with plain links. With it: a light that draws the loop and
// keeps orbiting (trail on canvas), a hint that cycles through the three
// languages, language choice relabelled in place (no page load), lobe hover
// confining the light, and a zoom-into-the-lobe hand-off to the map.
import { point, confine, type Lobe } from '../lib/lemniscate';
import { initField } from './intro-field';

type Lang = 'en' | 'de' | 'ar';
interface IntroJson { strings: Record<Lang, Record<string, string>>; base: string; labels: Record<Lang, string> }

const LANGS: Lang[] = ['en', 'de', 'ar'];
const RGB = { mobile: [232, 178, 58], origin: [237, 230, 214], cloud: [93, 184, 214] };
const LOBE_AT: Record<string, [number, number]> = { mobile: [25.5, 50], cloud: [74.5, 50], all: [50, 50] };
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export function initIntro(root: HTMLElement) {
  const json = JSON.parse(root.querySelector('[data-intro-json]')!.textContent || '{}') as IntroJson;
  const fig = root.querySelector<HTMLElement>('[data-fig]')!;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-light]')!;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  const langLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-lang]'));
  const lobes = Array.from(root.querySelectorAll<HTMLAnchorElement>('.lobe'));
  const again = root.querySelector<HTMLAnchorElement>('[data-again]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let locale = root.dataset.locale as Lang;

  // the full entrance every time: the owner wants the logo to replay it
  const k = 1;

  // ---- text ------------------------------------------------------------
  const str = (l: Lang, key: string) => json.strings[l]?.[key] ?? json.strings.en[key] ?? key;
  const href = (...p: string[]) => `${json.base}${p.join('/')}/`;

  let hintTimer = 0;
  const setHint = (key: string, l: Lang) => {
    hint.classList.add('is-out');
    window.setTimeout(() => {
      hint.textContent = str(l, key);
      hint.lang = l;
      hint.dir = l === 'ar' ? 'rtl' : 'ltr';
      hint.dataset.t = key;
      hint.classList.remove('is-out');
    }, reduce ? 0 : 420);
  };
  const cycleHint = (from: Lang) => {
    window.clearInterval(hintTimer);
    if (reduce) return;
    let i = LANGS.indexOf(from);
    hintTimer = window.setInterval(() => setHint('intro.lang', LANGS[(i = (i + 1) % LANGS.length)]), 2600);
  };

  const relabel = (l: Lang) => {
    locale = l;
    root.dataset.locale = l;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    root.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
      if (el !== hint) el.textContent = str(l, el.dataset.t!);
    });
    const skip = document.querySelector<HTMLElement>('.skip-link');
    if (skip) skip.textContent = str(l, 'skip');
    lobes.forEach((a) => (a.href = href(l, a.dataset.track!)));
    root.querySelector<HTMLAnchorElement>('[data-href="cv"]')!.href = href(l, 'cv', 'all');
    root.querySelector('[data-langname]')!.textContent = json.labels[l];
    langLinks.forEach((a) => a.classList.toggle('is-current', a.dataset.lang === l));
  };

  const showAgain = () => {
    const l = store.get('lang') as Lang | null;
    const tr = store.get('track');
    if (!l || !LANGS.includes(l) || !tr || !['mobile', 'cloud', 'all'].includes(tr)) return;
    again.textContent = `${str(locale, 'intro.again')}: ${str(l, `world.${tr}.name`)} · ${json.labels[l]}`;
    again.href = href(l, tr);
    again.hidden = false;
  };

  // ---- step 1: language --------------------------------------------------
  const detect = (): Lang => {
    for (const c of navigator.languages ?? [navigator.language]) {
      const two = String(c).slice(0, 2).toLowerCase() as Lang;
      if (LANGS.includes(two)) return two;
    }
    return 'en';
  };

  const startLangStep = () => {
    // a returning visitor's own choice beats the browser's guess
    const saved = store.get('lang') as Lang | null;
    const guess = root.dataset.step === 'lang' && location.pathname === json.base
      ? (saved && LANGS.includes(saved) ? saved : detect())
      : locale;
    langLinks.forEach((a) => {
      a.classList.remove('is-dissolving', 'is-suggested');
      a.style.removeProperty('opacity');
      a.classList.toggle('is-suggested', a.dataset.lang === guess);
    });
    setHint('intro.lang', guess);
    cycleHint(guess);
  };

  const chooseLang = (l: Lang) => {
    window.clearInterval(hintTimer);
    const r = fig.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    langLinks.forEach((a) => {
      const b = a.getBoundingClientRect();
      a.style.setProperty('--dx', `${cx - (b.left + b.width / 2)}px`);
      a.style.setProperty('--dy', `${cy - (b.top + b.height / 2)}px`);
      if (a.dataset.lang !== l) a.classList.add('is-dissolving');
    });
    burst = 1;
    store.set('lang', l);
    history.pushState({ intro: l }, '', href(l));
    window.setTimeout(() => {
      langLinks.find((a) => a.dataset.lang === l)?.classList.add('is-dissolving');
    }, reduce ? 0 : 260);
    window.setTimeout(() => {
      relabel(l);
      root.classList.add('is-live');
      root.dataset.step = 'world';
      setHint('intro.world', l);
      showAgain();
    }, reduce ? 0 : 640);
  };

  langLinks.forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      chooseLang(a.dataset.lang as Lang);
    })
  );
  root.querySelector('[data-change-lang]')!.addEventListener('click', (e) => {
    e.preventDefault();
    root.dataset.step = 'lang';
    history.pushState({ intro: '' }, '', json.base);
    startLangStep();
  });
  addEventListener('popstate', () => location.reload());

  // ---- step 2: world -----------------------------------------------------
  let mode: Lobe | null = null;
  lobes.forEach((a) => {
    const tr = a.dataset.track!;
    const on = () => { root.dataset.hover = tr; mode = tr === 'all' ? null : (tr as Lobe); };
    const off = () => { delete root.dataset.hover; mode = null; };
    a.addEventListener('pointerenter', on);
    a.addEventListener('focus', on);
    a.addEventListener('pointerleave', off);
    a.addEventListener('blur', off);
    a.addEventListener('click', (e) => {
      store.set('track', tr);
      store.set('lang', locale);
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const [px, py] = LOBE_AT[tr];
      const r = fig.getBoundingClientRect();
      root.style.setProperty('--zx', `${px}%`);
      root.style.setProperty('--zy', `${py}%`);
      root.style.setProperty('--wx', `${r.left + (r.width * px) / 100}px`);
      root.style.setProperty('--wy', `${r.top + (r.height * py) / 100}px`);
      root.style.setProperty('--wc', `var(--${tr === 'all' ? 'origin' : tr})`);
      root.classList.add('is-leaving');
      burst = 1;
      window.setTimeout(() => (location.href = a.href), 620);
    });
  });
  // coming back from the map via bfcache: undo the hand-off
  addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('is-leaving'); });

  // ---- the light ---------------------------------------------------------
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  };
  // canvas is the figure box grown by 8% each side; the SVG viewBox is 220×120
  const toPx = (x: number, y: number) => {
    const fw = W / 1.16, fh = H / 1.16;
    return [((x + 110) / 220) * fw + 0.08 * fw, ((y + 60) / 120) * fh + 0.08 * fh];
  };
  const colourAt = (x: number) => {
    const u = Math.max(-1, Math.min(1, x / 100));
    const [a, b] = u < 0 ? [RGB.origin, RGB.mobile] : [RGB.origin, RGB.cloud];
    const f = Math.abs(u);
    return a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',');
  };

  const DRAW_START = 200 * k, DRAW_MS = 2100 * k;
  const CRUISE = (Math.PI * 2) / 7000; // rad per ms: one loop in 7 s
  const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const trail: { x: number; y: number; c: string }[] = [];
  const t0 = performance.now();
  let t = -Math.PI / 2;
  let speed = 0;
  let burst = 0;
  let last = t0;
  let raf = 0;

  const frame = (now: number) => {
    const dt = Math.min(48, now - last);
    last = now;
    const el = now - t0 - DRAW_START;
    if (el < DRAW_MS) {
      // ride the draw head: same easing as the stroke-dashoffset animation
      t = -Math.PI / 2 + easeInOut(Math.max(0, el) / DRAW_MS) * Math.PI * 2;
    } else {
      speed += (CRUISE * (1 + burst * 3) - speed) * 0.04;
      burst *= 0.97;
      t += speed * dt;
      if (mode) t = confine(t, mode);
    }
    const a = point(t, 100);
    const [x, y] = toPx(a.x, a.y);
    trail.push({ x, y, c: colourAt(a.x) });
    if (trail.length > 54) trail.shift();

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const f = i / trail.length;
        ctx.strokeStyle = `rgba(${trail[i].c},${(f * f * 0.75).toFixed(3)})`;
        ctx.lineWidth = 0.6 + f * 2.6;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      const head = trail[trail.length - 1];
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 26);
      g.addColorStop(0, `rgba(255,255,255,0.95)`);
      g.addColorStop(0.12, `rgba(${head.c},0.85)`);
      g.addColorStop(1, `rgba(${head.c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };

  // ---- background: develops once the loop is whole --------------------------
  initField(root.querySelector<HTMLCanvasElement>('[data-field]')!, fig, reduce);
  window.setTimeout(() => root.classList.add('is-drawn'), reduce ? 0 : DRAW_START + DRAW_MS);

  // ---- go ------------------------------------------------------------------
  if (root.dataset.step === 'lang') startLangStep();
  else window.setTimeout(() => root.classList.add('is-live'), 2200 * k);
  showAgain();

  if (!reduce && ctx) {
    size();
    new ResizeObserver(size).observe(canvas);
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
  }
}
