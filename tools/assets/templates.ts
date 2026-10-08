// HTML templates for each output kind. Playwright loads these at a fixed
// viewport and screenshots the single root element. Screenshots are embedded as
// data URIs so the page needs no file server.
//
// The "ground" (near-black field + accent glow + grain + sigil watermark) is
// shared; only the device composition differs per kind.

export interface Screen {
  dataUri: string; // data:image/png;base64,...
  w: number;
  h: number;
}

export interface GroundOpts {
  accent: string;
  sigilSvg?: string; // optional inline SVG string, drawn faint, bled off edge
  rtl?: boolean;
}

function ground({ accent, sigilSvg, rtl }: GroundOpts): string {
  return `
  <div class="ground">
    <div class="glow"></div>
    <div class="grain"></div>
    ${sigilSvg ? `<div class="watermark">${sigilSvg}</div>` : ''}
  </div>
  <style>
    .ground { position:absolute; inset:0; background:#080808; overflow:hidden; }
    .glow {
      position:absolute; inset:-20%;
      background: radial-gradient(42% 42% at ${rtl ? '22%' : '74%'} 28%, ${accent}2e, transparent 70%);
    }
    .grain {
      position:absolute; inset:0; opacity:.05; mix-blend-mode:screen;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
    }
    .watermark {
      position:absolute; ${rtl ? 'left' : 'right'}:-8%; bottom:-14%;
      width:52%; opacity:.05; color:${accent};
      transform: rotate(${rtl ? 12 : -12}deg);
    }
    .watermark svg { width:100%; height:auto; }
  </style>`;
}

/** A tilted device with a soft drop shadow and a thin accent rim. */
function device(s: Screen, cls: string, extraStyle = ''): string {
  return `
  <div class="dev ${cls}" style="${extraStyle}">
    <img src="${s.dataUri}" alt="" />
  </div>`;
}

const DEVICE_CSS = `
  .dev { position:absolute; border-radius:11% / 5.2%; overflow:hidden;
         box-shadow: 0 40px 90px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.5);
         outline:1px solid rgba(255,255,255,.08); outline-offset:-1px; }
  .dev img { display:block; width:100%; height:100%; object-fit:cover; }
`;

const HEAD = (w: number, h: number) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face{font-family:'Space Grotesk';src:local('Space Grotesk');}
  *{margin:0;box-sizing:border-box;}
  html,body{width:${w}px;height:${h}px;overflow:hidden;background:#080808;}
  .stage{position:relative;width:${w}px;height:${h}px;font-family:'Space Grotesk',system-ui,sans-serif;}
  ${DEVICE_CSS}
  .cap{position:absolute;z-index:3;color:#ededed;}
  .cap .code{font-family:ui-monospace,monospace;letter-spacing:.2em;font-size:22px;color:#9a9a9a;text-transform:uppercase;}
  .cap h1{font-size:64px;line-height:1.05;font-weight:600;letter-spacing:-.01em;margin-top:10px;max-width:16ch;}
  .cap p{font-size:30px;color:#b8b8b8;margin-top:18px;max-width:26ch;}
</style></head><body>`;
const FOOT = `</body></html>`;

/** cover.webp 1600x900 — 3 devices, DOF behind the hero, caption in the open side. */
export function coverTemplate(
  hero: Screen,
  back: Screen[],
  g: GroundOpts,
  caption?: { code: string; title: string; impact?: string }
): { html: string; w: number; h: number } {
  const w = 1600, h = 900;
  const rtl = g.rtl;
  const capEl = caption
    ? `<div class="cap" style="top:300px;${rtl ? 'right' : 'left'}:90px;text-align:${rtl ? 'right' : 'left'};">
         <div class="code">${escapeHtml(caption.code)}</div>
         <h1>${escapeHtml(caption.title)}</h1>
         ${caption.impact ? `<p>${escapeHtml(caption.impact)}</p>` : ''}
       </div>`
    : '';
  const heroX = rtl ? 70 : 'auto';
  const heroR = rtl ? 'auto' : 70;
  const backEls = back
    .slice(0, 2)
    .map((s, i) =>
      device(
        s,
        'back',
        `width:300px;height:650px;top:${90 + i * 40}px;${rtl ? 'left' : 'right'}:${430 + i * 230}px;` +
          `filter:blur(2px) brightness(.68);transform:rotate(${rtl ? -1 : 1}deg) rotateY(${rtl ? 14 : -14}deg);z-index:${1 - i};`
      )
    )
    .join('');
  const html =
    HEAD(w, h) +
    `<div class="stage">${ground(g)}
      ${capEl}
      ${backEls}
      ${device(
        hero,
        'hero',
        `width:360px;height:780px;top:150px;${rtl ? `left:${heroX}px` : `right:${heroR}px`};` +
          `transform:rotateY(${rtl ? 14 : -14}deg) rotateZ(${rtl ? -4 : 4}deg);z-index:3;`
      )}
    </div>` +
    FOOT;
  return { html, w, h };
}

/** cover-portrait.webp 1080x1350 — one big hero device bleeding off a corner. */
export function coverPortraitTemplate(hero: Screen, g: GroundOpts): { html: string; w: number; h: number } {
  const w = 1080, h = 1350;
  const rtl = g.rtl;
  const html =
    HEAD(w, h) +
    `<div class="stage">${ground(g)}
      ${device(
        hero,
        'hero',
        `width:620px;height:1340px;top:150px;${rtl ? 'left:-40px' : 'right:-40px'};` +
          `transform:rotateY(${rtl ? 12 : -12}deg) rotateZ(${rtl ? -4 : 4}deg);z-index:3;`
      )}
    </div>` +
    FOOT;
  return { html, w, h };
}

/** thumb.webp 480x600 — a Dark "portrait": top slice of the hero, graded. */
export function thumbTemplate(hero: Screen, g: GroundOpts): { html: string; w: number; h: number } {
  const w = 480, h = 600;
  const html =
    HEAD(w, h) +
    `<div class="stage">${ground({ ...g })}
      <div class="dev" style="width:340px;height:740px;top:70px;left:50%;transform:translateX(-50%) rotate(${g.rtl ? 2 : -2}deg);
           filter:saturate(.72) contrast(1.08);box-shadow:0 30px 60px rgba(0,0,0,.65);
           outline:1px solid ${g.accent}55;outline-offset:-1px;">
        <img src="${hero.dataUri}" alt="" style="object-position:top;"/>
      </div>
      <div style="position:absolute;inset:0;z-index:4;pointer-events:none;
           background:radial-gradient(70% 60% at 50% 20%, transparent 40%, rgba(0,0,0,.55) 100%);"></div>
    </div>` +
    FOOT;
  return { html, w, h };
}

/** gallery/NN.webp 720w — one screen in a flat frame on the ground. */
export function galleryTemplate(s: Screen, g: GroundOpts): { html: string; w: number; h: number } {
  const w = 720;
  const scale = (w * 0.62) / s.w;
  const dh = Math.round(s.h * scale);
  const h = dh + 120;
  const html =
    HEAD(w, h) +
    `<div class="stage">${ground(g)}
      <div class="dev" style="width:${Math.round(s.w * scale)}px;height:${dh}px;top:60px;left:50%;transform:translateX(-50%);">
        <img src="${s.dataUri}" alt=""/>
      </div>
    </div>` +
    FOOT;
  return { html, w, h };
}

/** cover-cloud.webp 1600x900 — terminal + architecture diagram for code repos.
 *  Everything sits in one half (right in LTR, left in RTL) so page text can
 *  occupy the other half without fighting the art. */
export function cloudCoverTemplate(opts: {
  accent: string;
  code: string; // monospace snippet lines, joined with \n
  diagram: { nodes: string[]; edges: [number, number][] };
  title: string;
  rtl?: boolean;
}): { html: string; w: number; h: number } {
  const w = 1600, h = 900;
  const { accent, code, diagram, title, rtl } = opts;
  const lines = code.split('\n').slice(0, 13);
  const x0 = rtl ? 70 : 690; // left edge of the art column
  const colW = 840;
  const NW = 176; // diagram node width
  const n = Math.max(1, diagram.nodes.length);
  const step = n > 1 ? (colW - NW) / (n - 1) : 0;
  const nx = (i: number) => x0 + NW / 2 + i * step;
  const ny = 690;
  const nodeEls = diagram.nodes
    .map(
      (label, i) =>
        `<g transform="translate(${nx(i)},${ny})">
          <rect x="${-NW / 2}" y="-32" width="${NW}" height="64" rx="12" fill="#111214" stroke="${accent}88"/>
          <text x="0" y="6" text-anchor="middle" font-family="ui-monospace,monospace" font-size="17" fill="#ededed">${escapeHtml(label)}</text>
        </g>`
    )
    .join('');
  const edgeEls = diagram.edges
    .map(([a, b]) => {
      const x1 = nx(a) + NW / 2, x2 = nx(b) - NW / 2;
      return `<path d="M ${x1} ${ny} L ${x2} ${ny}" stroke="${accent}" stroke-width="2" fill="none" stroke-dasharray="7 7" opacity=".85"/>`;
    })
    .join('');
  const html =
    HEAD(w, h) +
    `<div class="stage">${ground({ accent, rtl })}
      <div style="position:absolute;top:100px;left:${x0}px;width:${colW}px;height:470px;border-radius:14px;
           background:#0d0e10;border:1px solid rgba(255,255,255,.1);overflow:hidden;
           box-shadow:0 40px 90px rgba(0,0,0,.6);">
        <div style="height:40px;background:#17181b;display:flex;align-items:center;gap:8px;padding:0 16px;">
          <span style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></span>
          <span style="width:12px;height:12px;border-radius:50%;background:#febc2e"></span>
          <span style="width:12px;height:12px;border-radius:50%;background:#28c840"></span>
          <span style="margin-left:12px;font-family:ui-monospace,monospace;font-size:14px;color:#777">${escapeHtml(title)}</span>
        </div>
        <pre style="margin:0;padding:20px 24px;font-family:ui-monospace,monospace;font-size:18px;line-height:1.5;color:#cfd2d6;white-space:pre-wrap;">${lines
          .map((l) => escapeHtml(l))
          .join('\n')}</pre>
      </div>
      <svg width="${w}" height="${h}" style="position:absolute;inset:0;z-index:2;">${edgeEls}${nodeEls}</svg>
    </div>` +
    FOOT;
  return { html, w, h };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
