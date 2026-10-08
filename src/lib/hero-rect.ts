// Where the dossier hero's art sits, in viewport px, when the dossier runs in
// engine mode (hero frame = full viewport). The map's hand-off animation flies
// the selected card's art to exactly this rect so the page swap is invisible.
// Keep in sync with DossierHero.astro's CSS (the numbers are named the same).

export const PHONE_MAX = 760; // px, the site's phone breakpoint
const ART_START = 0.34; // desktop cover: starts at 34% on the inline axis
const BADGE_END = 0.06, BADGE_VW = 0.42, BADGE_MAX = 520, BADGE_TOP = 0.12, BADGE_BOTTOM = 0.1;
const PHONE_COVER_MAXH = 0.68, PHONE_BADGE_VW = 0.62, PHONE_BADGE_TOP = 96;

export interface Rect { x: number; y: number; w: number; h: number }

/** art: a generated cover exists (else a Badge). diagram: that cover is a
 *  code/cloud diagram, shown at its natural 16:9 instead of filling the height. */
export function heroArtRect(W: number, H: number, o: { art: boolean; rtl: boolean; diagram?: boolean }): Rect {
  if (W <= PHONE_MAX) {
    if (o.art) return { x: 0, y: 0, w: W, h: Math.min(W * 1.25, H * PHONE_COVER_MAXH) };
    const w = W * PHONE_BADGE_VW;
    return { x: (W - w) / 2, y: PHONE_BADGE_TOP, w, h: (w * 128) / 120 };
  }
  if (o.art) {
    const w = W * (1 - ART_START);
    return { x: o.rtl ? 0 : W - w, y: 0, w, h: o.diagram ? Math.min(H, (w * 9) / 16) : H };
  }
  const w = Math.min(W * BADGE_VW, BADGE_MAX);
  const end = W * BADGE_END;
  return { x: o.rtl ? end : W - end - w, y: H * BADGE_TOP, w, h: H * (1 - BADGE_TOP - BADGE_BOTTOM) };
}
