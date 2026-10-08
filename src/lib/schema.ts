// schema.org JSON-LD for search engines and AI readers. Facts only from the
// content files and the owner's CV; nothing here is invented. See docs/seo-and-ai.md.
import { loc, t, url, type Locale } from '../i18n';
import type { Project } from './content';

const site = (p: string) => new URL(p, import.meta.env.SITE).href;
export const PERSON_ID = () => site('/#person');

export function personLd(locale: Locale, skills: string[] = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID(),
    name: 'Mohamed H. Essa',
    alternateName: 'Mohamed Essa',
    jobTitle: t(locale, 'track.all.hero'),
    description: t(locale, 'site.tagline'),
    url: site(url(locale)),
    image: site(url('icon-512.png').replace(/\/$/, '')),
    address: { '@type': 'PostalAddress', addressLocality: 'Cairo', addressCountry: 'EG' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Benha University' },
    knowsLanguage: ['ar', 'en', 'de'],
    knowsAbout: skills,
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: 'AWS Certified Solutions Architect – Associate (SAA-C03)',
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: 'Amazon Web Services' },
      url: 'https://www.credly.com/badges/45f25e39-0963-4c17-823b-53c8c5076c58/public_url',
    },
    sameAs: ['https://www.linkedin.com/in/mohamed-hosny-essa', 'https://github.com/Mohamed-H-Essa'],
  };
}

export function websiteLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mohamed Essa',
    url: site(url()),
    inLanguage: ['en', 'de', 'ar'],
    author: { '@id': PERSON_ID() },
    description: t(locale, 'site.tagline'),
  };
}

/** A project page: a MobileApplication when it ships on a store, else a CreativeWork. */
export function projectLd(p: Project, locale: Locale, canonical: string, image?: string) {
  const d = p.data;
  const stores = [d.links?.appStore, d.links?.playStore].filter(Boolean) as string[];
  const os = [d.links?.appStore && 'iOS', d.links?.playStore && 'Android'].filter(Boolean).join(', ');
  const description = [d.impact?.line, d.built].map((f) => (f ? loc(f, locale, d.slug) : '')).filter(Boolean).join(' — ');
  return {
    '@context': 'https://schema.org',
    '@type': stores.length ? 'MobileApplication' : d.kind === 'cert' ? 'EducationalOccupationalCredential' : 'CreativeWork',
    name: loc(d.title, locale, d.slug),
    description,
    url: canonical,
    inLanguage: locale,
    ...(stores.length && { operatingSystem: os, applicationCategory: 'BusinessApplication', sameAs: stores }),
    ...(d.links?.github && { codeRepository: d.links.github }),
    ...(image && { image }),
    dateCreated: d.start,
    keywords: d.stack.join(', '),
    [d.kind === 'cert' ? 'about' : 'author']: { '@id': PERSON_ID() },
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}
