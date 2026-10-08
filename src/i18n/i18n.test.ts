import { describe, it, expect } from 'vitest';
import { t, loc, url } from './index';

describe('t()', () => {
  it('returns the locale string when present', () => {
    expect(t('de', 'nav.cv')).toBe('Lebenslauf');
  });
  it('falls back to en for a missing locale value', () => {
    // every key exists in en; force a missing one by using an en-only check
    expect(t('ar', 'dossier.appStore')).toBe('App Store');
  });
  it('returns the key itself for an unknown key (never empty)', () => {
    expect(t('en', 'does.not.exist')).toBe('does.not.exist');
  });
});

describe('loc()', () => {
  it('reads the requested locale', () => {
    expect(loc({ en: 'Hi', de: 'Hallo', ar: 'مرحبا' }, 'de')).toBe('Hallo');
  });
  it('falls back to en when a locale is missing or empty', () => {
    expect(loc({ en: 'Hi', de: '' }, 'de')).toBe('Hi');
    expect(loc({ en: 'Hi' }, 'ar')).toBe('Hi');
  });
  it('returns empty string for an undefined field', () => {
    expect(loc(undefined, 'en')).toBe('');
  });
});

describe('url()', () => {
  it('joins parts with a trailing slash', () => {
    expect(url('en', 'mobile')).toBe('/en/mobile/');
  });
  it('trims stray slashes in parts', () => {
    expect(url('/en/', '/mobile/', 'p', 'aratc')).toBe('/en/mobile/p/aratc/');
  });
  it('ignores empty parts', () => {
    expect(url('en', '', 'cv')).toBe('/en/cv/');
  });
  it('returns base for no parts', () => {
    expect(url()).toBe('/');
  });
});
