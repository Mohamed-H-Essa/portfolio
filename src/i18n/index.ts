import en from './en.json';
import de from './de.json';
import ar from './ar.json';
import { DEFAULT_LOCALE, type Locale } from './config';

export * from './config';

type Dict = Record<string, string>;
const DICTS: Record<Locale, Dict> = { en, de, ar };

// Collect missing keys/fields once and print a single grouped warning at build.
const warned = new Set<string>();
function warn(msg: string) {
  if (warned.has(msg)) return;
  warned.add(msg);
  // Only noisy at build/dev; never throws.
  console.warn(`[i18n] ${msg}`);
}

/** UI string lookup with EN fallback. */
export function t(locale: Locale, key: string): string {
  const hit = DICTS[locale]?.[key];
  if (hit != null) return hit;
  const fallback = DICTS[DEFAULT_LOCALE][key];
  if (fallback != null) {
    if (locale !== DEFAULT_LOCALE) warn(`missing ${locale} string "${key}" — using en`);
    return fallback;
  }
  warn(`unknown string key "${key}"`);
  return key; // visible, never empty
}

/** Build a `t` bound to one locale, for terser templates. */
export function translator(locale: Locale) {
  return (key: string) => t(locale, key);
}

/** A localized content field like { en, de?, ar? }. `en` may be absent on
 *  optional fields; loc() handles that safely. */
export type Localized = { en?: string; de?: string; ar?: string };

/** Read a localized content field with EN fallback. */
export function loc(field: Localized | undefined, locale: Locale, ctx = ''): string {
  if (!field) {
    warn(`missing localized field${ctx ? ` (${ctx})` : ''}`);
    return '';
  }
  const hit = field[locale];
  if (hit != null && hit !== '') return hit;
  if (locale !== DEFAULT_LOCALE) warn(`missing ${locale} value${ctx ? ` for ${ctx}` : ''} — using en`);
  return field.en ?? '';
}

/**
 * Build an internal URL honouring Astro's base path.
 * url('en', 'mobile', 'p', slug) -> `${BASE}en/mobile/p/<slug>/`
 * Always trailing-slashed (matches trailingSlash: 'always').
 */
export function url(...parts: (string | number)[]): string {
  const base = import.meta.env.BASE_URL || '/';
  const path = parts
    .map((p) => String(p).trim())
    .filter((p) => p.length > 0)
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .join('/');
  const joined = `${base.replace(/\/+$/, '')}/${path}`.replace(/\/{2,}/g, '/');
  return path === '' ? `${joined}` : `${joined}/`;
}
