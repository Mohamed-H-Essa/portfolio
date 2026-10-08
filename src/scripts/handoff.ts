// Map → dossier hand-off. The selected project's art lifts out of the map and
// flies to exactly where the dossier will draw its hero art (heroArtRect),
// while the map dissolves behind it; then the browser navigates. The dossier
// starts with its art already there (html.is-handoff), so the swap is
// invisible in every browser (Chrome/Safari also cross-fade the two frames).

import { heroArtRect } from '../lib/hero-rect';
import { play } from './sound';

export interface HandoffTarget {
  slug: string;
  href: string;
  cover: string; // desktop hero image ('' → the project uses a Badge)
  coverPortrait: string; // phone hero image
  rtl: boolean;
  diagram: boolean; // the cover is a code/cloud diagram (natural 16:9 in the hero)
}

const prefetched = new Set<string>();

/** Warm the dossier (and its hero image) so the hand-off lands instantly. */
export function prefetch(t: HandoffTarget) {
  if (prefetched.has(t.href)) return;
  prefetched.add(t.href);
  const l = document.createElement('link');
  l.rel = 'prefetch';
  l.href = t.href;
  document.head.append(l);
  const img = heroImage(t);
  if (img) new Image().src = img;
}

// the same 1×/2× pick the hero's srcset makes, so the landed image is already loaded
const heroImage = (t: HandoffTarget) => {
  const url = innerWidth <= 760 ? t.coverPortrait : t.cover;
  return url && devicePixelRatio > 1.25 ? url.replace(/\.webp$/, '-2x.webp') : url;
};

export function handoff(t: HandoffTarget, from: HTMLElement, stage: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !from.isConnected) { location.href = t.href; return; }
  try { sessionStorage.setItem('handoff', t.slug); } catch { /* fine: the art just animates in */ }

  const a = from.getBoundingClientRect();
  const art = !!t.cover;
  const b = heroArtRect(innerWidth, innerHeight, { art, rtl: t.rtl, diagram: t.diagram });

  const clone = document.createElement('div');
  clone.className = 'handoff';
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    position: 'fixed', zIndex: '200', overflow: 'hidden', pointerEvents: 'none',
    left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    borderRadius: '8px', background: art ? '#0e0f12' : 'transparent', color: getComputedStyle(from).color,
  });
  if (art) {
    // what the card shows now, cross-fading to the hero's own image in flight
    const shown = from.querySelector<HTMLImageElement>('img.is-on, img');
    const mk = (src: string, fit: string) => {
      const im = new Image();
      im.src = src;
      im.alt = '';
      Object.assign(im.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: fit, objectPosition: innerWidth <= 760 ? 'center' : t.rtl ? 'left center' : 'right center' });
      clone.append(im);
      return im;
    };
    if (shown?.src) mk(shown.src, getComputedStyle(shown).objectFit || 'cover');
    const hero = mk(heroImage(t), 'cover');
    hero.animate([{ opacity: shown?.src ? 0 : 1 }, { opacity: 1 }], { duration: 520, delay: 160, fill: 'both', easing: 'ease-out' });
    // the hero's grounding gradient, arriving with the art
    const shade = document.createElement('div');
    const side = t.rtl ? 'to left' : 'to right';
    shade.style.cssText = `position:absolute;inset:0;background:${innerWidth <= 760
      ? 'linear-gradient(to top, #080808 2%, transparent 45%)'
      : `linear-gradient(${side}, #080808 0%, rgba(8,8,8,.55) 22%, transparent 45%), linear-gradient(to top, #080808 0%, transparent 40%)`}`;
    clone.append(shade);
    shade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 300, fill: 'both' });
  } else {
    const svg = from.querySelector('svg');
    if (svg) {
      const c = svg.cloneNode(true) as SVGElement;
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;-webkit-mask-image:radial-gradient(closest-side,#000 72%,transparent);mask-image:radial-gradient(closest-side,#000 72%,transparent)';
      clone.append(c);
    }
  }
  document.body.append(clone);
  stage.classList.add('is-handoff');
  play('whoosh', { dir: 1 });

  const fly = clone.animate(
    [
      { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, borderRadius: '8px' },
      { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, borderRadius: art ? '0px' : '18px' },
    ],
    { duration: 860, easing: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)', fill: 'forwards' }
  );
  fly.finished.then(() => { location.href = t.href; });

  // back from the dossier via bfcache: put the map back as it was
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    clone.remove();
    stage.classList.remove('is-handoff');
  }, { once: true });
}
