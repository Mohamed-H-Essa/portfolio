// Locale + track definitions. Keep in sync with astro.config.mjs i18n.locales.

export const LOCALES = ['en', 'de', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const TRACKS = ['mobile', 'cloud', 'all'] as const;
export type Track = (typeof TRACKS)[number];

export const LOCALE_META: Record<Locale, { label: string; dir: 'ltr' | 'rtl'; htmlLang: string }> = {
  en: { label: 'English', dir: 'ltr', htmlLang: 'en' },
  de: { label: 'Deutsch', dir: 'ltr', htmlLang: 'de' },
  ar: { label: 'العربية', dir: 'rtl', htmlLang: 'ar' },
};

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}
export function isTrack(v: string): v is Track {
  return (TRACKS as readonly string[]).includes(v);
}

export function dir(locale: Locale): 'ltr' | 'rtl' {
  return LOCALE_META[locale].dir;
}
