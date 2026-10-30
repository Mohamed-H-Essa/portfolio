// The track page's timeline (Timeline.astro). Without this it is a complete, plain
// page. With it: a light travels down the line with the reader, coloured by the
// project in view, and that project's year lights up; connected projects are
// joined by threads; ?p=<slug> (a shared link, or back from a project page) lands
// on its project; and opening a card flies its art into the project page.
import { handoff, prefetch, type HandoffTarget } from './handoff';

const NS = 'http://www.w3.org/2000/svg';

export function initTimeline(root: HTMLElement) {
  const tl = root.querySelector<HTMLElement>('.tl')!;
  const line = root.querySelector<HTMLElement>('.tl__line')!;
  const light = root.querySelector<HTMLElement>('.tl__light')!;
  const svg = root.querySelector<SVGSVGElement>('.tl__threads')!;
  const entries = Array.from(root.querySelectorAll<HTMLElement>('.entry'));
  const years = Array.from(root.querySelectorAll<HTMLElement>('.yr'));
  const bySlug = new Map(entries.map((e) => [e.dataset.slug!, e]));
  const rtl = document.documentElement.dir === 'rtl';
  const laneOf = (e: HTMLElement) => getComputedStyle(e).getPropertyValue('--lane').trim();
  if (!entries.length) return;

  // ---- threads between connected projects ---------------------------------
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    for (const to of (e.dataset.connects ?? '').split(' ').filter(Boolean)) {
      const key = [e.dataset.slug, to].sort().join('|');
      if (!bySlug.has(to) || seen.has(key)) continue;
      seen.add(key);
      pairs.push([e.dataset.slug!, to]);
    }
  }
  const paths = pairs.map(([a]) => {
    const p = document.createElementNS(NS, 'path');
    p.style.setProperty('--c', laneOf(bySlug.get(a)!));
    svg.append(p);
    return p;
  });
  const drawThreads = () => {
    if (!paths.length || getComputedStyle(svg).display === 'none') return;
    const base = tl.getBoundingClientRect();
    const dot = (slug: string) => {
      const r = bySlug.get(slug)!.querySelector('.entry__dot')!.getBoundingClientRect();
      return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
    };
    // longer spans bow further out, so the threads nest instead of crossing
    const ends = pairs.map(([a, b]) => [dot(a), dot(b)] as const);
    const order = ends.map((e, i) => [Math.abs(e[0].y - e[1].y), i]).sort((x, y) => x[0] - y[0]);
    order.forEach(([, i], rank) => {
      const [A, B] = ends[i];
      const k = (26 + rank * 13) * (rtl ? 1 : -1); // towards the years column
      paths[i].setAttribute('d', `M ${A.x} ${A.y} C ${A.x + k} ${A.y}, ${B.x + k} ${B.y}, ${B.x} ${B.y}`);
    });
  };
  const light_up = (slug: string) => {
    entries.forEach((e) => e.classList.remove('is-linked'));
    pairs.forEach(([a, b], i) => {
      const on = a === slug || b === slug;
      paths[i].classList.toggle('is-lit', on);
      if (on) bySlug.get(a === slug ? b : a)!.classList.add('is-linked');
    });
  };

  // ---- the light, and the project / year in view ---------------------------
  let current: HTMLElement | null = null;
  let hovered: string | null = null;
  let raf = 0;
  const update = () => {
    raf = 0;
    const focus = innerHeight * 0.42;
    let best = entries[0];
    let bd = Infinity;
    for (const e of entries) {
      const r = e.getBoundingClientRect();
      const d = Math.abs(r.top + Math.min(r.height, 180) / 2 - focus);
      if (d < bd) { bd = d; best = e; }
    }
    // the light's bright point follows the reader, resting on the first / last dot
    const lr = line.getBoundingClientRect();
    const dotY = (e: HTMLElement) => {
      const r = e.querySelector('.entry__dot')!.getBoundingClientRect();
      return r.top + r.height / 2 - lr.top;
    };
    const y = Math.max(dotY(entries[0]), Math.min(dotY(entries[entries.length - 1]), focus - lr.top));
    light.style.setProperty('--light-y', `${y - light.offsetHeight * 0.88}px`);
    if (best !== current) {
      current?.classList.remove('is-current');
      best.classList.add('is-current');
      current = best;
      root.style.setProperty('--light-c', laneOf(best));
      const yr = best.closest('.yr');
      years.forEach((y) => y.classList.toggle('is-current', y === yr));
      if (!hovered) light_up(best.dataset.slug!);
    }
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', ask, { passive: true });

  // ---- ?p=<slug>: land on that project ---------------------------------------
  const want = new URLSearchParams(location.search).get('p');
  const target = want ? bySlug.get(want) : undefined;
  if (target) {
    target.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    target.classList.add('is-target');
  }

  // the one entrance: the light runs down from the top of the line to where the
  // reader is (the newest project, on a fresh visit), then just follows
  light.style.setProperty('--light-y', `${-light.offsetHeight}px`);
  root.classList.add('is-entering');
  drawThreads();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('is-live');
    update();
    window.setTimeout(() => root.classList.remove('is-entering'), 1500);
  }));
  new ResizeObserver(() => { drawThreads(); ask(); }).observe(tl);
  document.fonts?.ready.then(drawThreads);

  // ---- cards: hover lights their threads, a click flies into the project -----
  for (const e of entries) {
    e.addEventListener('pointerenter', () => { hovered = e.dataset.slug!; light_up(hovered); });
    e.addEventListener('pointerleave', () => { hovered = null; if (current) light_up(current.dataset.slug!); });
  }
  root.querySelectorAll<HTMLAnchorElement>('a[data-card]').forEach((a) => {
    const target = (): HandoffTarget => ({
      slug: a.closest<HTMLElement>('.entry')!.dataset.slug!,
      href: a.href,
      cover: a.dataset.cover ?? '',
      coverPortrait: a.dataset.coverPortrait ?? '',
      rtl,
      diagram: a.dataset.diagram === '1',
    });
    a.addEventListener('pointerenter', () => prefetch(target()));
    a.addEventListener('focus', () => prefetch(target()));
    a.addEventListener('click', (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      ev.preventDefault();
      handoff(target(), a.querySelector<HTMLElement>('[data-art]') ?? a, root);
    });
  });
}
