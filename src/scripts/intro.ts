// Behaviour for the ∞ intro (Intro.astro). Without this the page is a static,
// self-drawing ∞ with plain links. With it: a light that draws the loop and
// keeps orbiting (trail on canvas), a hint that cycles through the three
// languages, language choice relabelled in place (no page load), lobe hover
// confining the light, and a zoom-into-the-lobe hand-off to the map.
import { point, confine, type Lobe } from '../lib/lemniscate';
import { initField } from './intro-field';
import { initSwipeBack } from './swipe-back';
import { play, unlockNow, setSound, soundWanted, canPlayWithoutGesture } from './sound';

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
    const cv = root.querySelector<HTMLAnchorElement>('[data-href="cv"]');
    if (cv) cv.href = href(l, 'cv', 'all');
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
    play('unfold');
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
    const on = () => { root.dataset.hover = tr; mode = tr === 'all' ? null : (tr as Lobe); play('tick', { level: 0.8 }); };
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
      play('whoosh', { dir: 1 });
      play('swell', { level: 0.8 });
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
  let t0 = performance.now();
  let gated = root.classList.contains('is-gated'); // waiting for the entrance choice
  let t = -Math.PI / 2;
  let speed = 0;
  let burst = 0;
  let last = t0;
  let raf = 0;

  const frame = (now: number) => {
    const dt = Math.min(48, now - last);
    last = now;
    const el = now - t0 - DRAW_START;
    if (gated) {
      t = -Math.PI / 2; // the light waits at the crossing, breathing
      trail.length = 0;
    } else if (el < DRAW_MS) {
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
      const R = gated ? 26 * (1.05 + 0.22 * Math.sin(now / 520)) : 26;
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, R);
      g.addColorStop(0, `rgba(255,255,255,0.95)`);
      g.addColorStop(0.12, `rgba(${head.c},0.85)`);
      g.addColorStop(1, `rgba(${head.c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, R, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };

  // ---- swipe back: the world step → the language step (in place) ------------
  initSwipeBack({
    targets: [fig, root.querySelector<HTMLElement>('.intro__copy')!],
    label: () => str(locale, 'intro.changeLang'),
    enabled: () => root.dataset.step === 'world' && !root.classList.contains('is-leaving'),
    onCommit: () => root.querySelector<HTMLElement>('[data-change-lang]')!.click(),
    restore: true,
  });

  // ---- background: develops once the loop is whole --------------------------
  initField(root.querySelector<HTMLCanvasElement>('[data-field]')!, fig, reduce);

  // ---- go: everything is timed from the moment the entrance is chosen --------
  const begin = (sound: boolean) => {
    gated = false;
    root.classList.remove('is-gated');
    t0 = performance.now();
    last = t0;
    if (sound) play('intro');
    window.setTimeout(() => root.classList.add('is-drawn'), reduce ? 0 : DRAW_START + DRAW_MS);
    if (root.dataset.step === 'lang') startLangStep();
    else window.setTimeout(() => root.classList.add('is-live'), 2200 * k);
  };
  showAgain();

  // ---- the entrance gate: sound needs one click, so ask once, quietly ------
  // (skipped when the visitor muted before, or the browser already allows sound)
  const gateFor = () => {
    const lang: Lang = root.dataset.step === 'lang' ? ((store.get('lang') as Lang) || detect()) : locale;
    const gate = document.createElement('div');
    gate.className = 'gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-label', str(lang, 'intro.soundNote'));
    gate.lang = lang;
    gate.dir = lang === 'ar' ? 'rtl' : 'ltr';
    gate.innerHTML = `<button type="button" class="gate__enter" data-sound-own><span class="gate__label">${str(lang, 'intro.enter')}</span></button>
      <p class="gate__note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>${str(lang, 'intro.soundNote')}</p>
      <button type="button" class="gate__silent" data-sound-own>${str(lang, 'intro.silent')}</button>`;
    const r = fig.getBoundingClientRect(), rr = root.getBoundingClientRect();
    gate.style.setProperty('--gx', `${r.left - rr.left + r.width / 2}px`);
    gate.style.setProperty('--gy', `${r.top - rr.top + r.height / 2}px`);
    root.append(gate);
    const leave = (sound: boolean) => {
      if (gate.classList.contains('is-out')) return;
      if (sound) { unlockNow(); setSound(true); } else setSound(false);
      gate.classList.add('is-out');
      begin(sound);
      window.setTimeout(() => gate.remove(), 900);
      removeEventListener('keydown', onKey, true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); leave(false); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); leave(true); }
    };
    addEventListener('keydown', onKey, true);
    gate.addEventListener('click', (e) => leave(!(e.target as Element).closest('.gate__silent')));
    gate.querySelector<HTMLElement>('.gate__enter')!.focus({ preventScroll: true });
  };
  // ?gate forces it (to preview; headless browsers always allow sound)
  const force = new URLSearchParams(location.search).has('gate');
  if (!gated) begin(false);
  else if (force) gateFor();
  else if (!soundWanted()) begin(false);
  else canPlayWithoutGesture().then((ok) => (ok ? (unlockNow(), begin(true)) : gateFor()));

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
