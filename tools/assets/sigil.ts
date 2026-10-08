// Deterministic per-project sigil: project initials inside a triquetra-arc
// fragment, rotated by a hash of the slug. Same slug -> same mark, always.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function initials(title: string): string {
  const words = title.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean);
  if (!words.length) return '··';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function sigilSvg(slug: string, title: string, color = 'currentColor'): string {
  const rot = hash(slug) % 360;
  const text = initials(title);
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none">
  <g transform="rotate(${rot} 60 60)" stroke="${color}" stroke-width="2" opacity="0.9">
    <circle cx="60" cy="44" r="26"/>
    <circle cx="38" cy="78" r="26"/>
    <circle cx="82" cy="78" r="26"/>
  </g>
  <text x="60" y="68" text-anchor="middle" font-family="ui-monospace, monospace"
        font-size="30" font-weight="600" fill="${color}">${text}</text>
</svg>`;
}
