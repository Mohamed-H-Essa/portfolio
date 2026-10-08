import { describe, it, expect } from 'vitest';
import { heroArtRect } from './hero-rect';

describe('heroArtRect (where the dossier hero art sits in engine mode)', () => {
  it('desktop cover: the inline-end two thirds, full height; mirrored in RTL', () => {
    const close = (r: ReturnType<typeof heroArtRect>, e: [number, number, number, number]) =>
      [r.x, r.y, r.w, r.h].forEach((v, i) => expect(v).toBeCloseTo(e[i], 6));
    close(heroArtRect(1440, 900, { art: true, rtl: false }), [489.6, 0, 950.4, 900]);
    close(heroArtRect(1440, 900, { art: true, rtl: true }), [0, 0, 950.4, 900]);
  });
  it('desktop diagram cover (cloud/code projects): natural 16:9 at the top', () => {
    const r = heroArtRect(1440, 900, { art: true, rtl: false, diagram: true });
    expect(r.w).toBeCloseTo(950.4, 6);
    expect(r.h).toBeCloseTo((950.4 * 9) / 16, 6);
    expect(r.y).toBe(0);
  });
  it('desktop badge: capped width, floating on the inline-end side', () => {
    const r = heroArtRect(1440, 900, { art: false, rtl: false });
    expect(r.w).toBe(520);
    expect(r.x + r.w).toBeCloseTo(1440 - 1440 * 0.06, 6);
    expect(r.y).toBeCloseTo(108, 6);
    expect(r.h).toBeCloseTo(900 * 0.78, 6);
    const l = heroArtRect(1440, 900, { art: false, rtl: true });
    expect(l.x).toBeCloseTo(1440 * 0.06, 6);
  });
  it('phone cover: full width at the top, 4:5 capped at 68% of the height', () => {
    expect(heroArtRect(390, 844, { art: true, rtl: false })).toEqual({ x: 0, y: 0, w: 390, h: 487.5 });
    expect(heroArtRect(390, 600, { art: true, rtl: false }).h).toBeCloseTo(408, 6);
  });
  it('phone badge: 62vw, centred, 96px from the top', () => {
    const r = heroArtRect(390, 844, { art: false, rtl: false });
    expect(r.w).toBeCloseTo(241.8, 6);
    expect(r.x).toBeCloseTo((390 - 241.8) / 2, 6);
    expect(r.y).toBe(96);
  });
});
