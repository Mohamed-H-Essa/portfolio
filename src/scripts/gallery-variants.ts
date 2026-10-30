// The project gallery's switches (DossierGallery.astro): the same screens in another
// language or theme. Every copy of a shot (the marquee clones them) gets the new
// image; lightbox.ts re-reads the strip on `gallery:swap`. Without JS the switches
// stay hidden and the page shows its own language.
export function initVariants(section: HTMLElement) {
  const box = section.querySelector<HTMLElement>('[data-variants]');
  const strip = section.querySelector<HTMLElement>('.gallery__strip');
  if (!box || !strip) return;
  const cfg = JSON.parse(box.dataset.variants!) as { base: string; axes: string[]; count: number };
  const buttons = Array.from(box.querySelectorAll<HTMLButtonElement>('button[data-axis]'));
  const chosen = (axis: string) => buttons.find((b) => b.dataset.axis === axis && b.getAttribute('aria-pressed') === 'true')!.dataset.value!;
  box.hidden = false;

  const swap = () => {
    const key = cfg.axes.map(chosen).join('-');
    strip.classList.add('is-swapping');
    const loads: Promise<unknown>[] = [];
    for (let i = 0; i < cfg.count; i++) {
      const n = String(i + 1).padStart(2, '0');
      strip.querySelectorAll<HTMLAnchorElement>(`.gallery__shot[data-n="${i}"]`).forEach((a) => {
        a.href = `${cfg.base}/${key}/${n}-2x.webp`;
        const img = a.querySelector('img')!;
        img.removeAttribute('srcset');
        img.loading = 'eager';
        img.src = `${cfg.base}/${key}/${n}.webp`;
        loads.push(img.decode().catch(() => undefined));
      });
    }
    Promise.all(loads).then(() => strip.classList.remove('is-swapping'));
    section.dispatchEvent(new CustomEvent('gallery:swap'));
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      buttons.filter((o) => o.dataset.axis === b.dataset.axis).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      swap();
    });
  }
}
