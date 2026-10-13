// Pages that are linked from the chrome but not built yet (plan Phase 7).
// Their links stay hidden until the page exists, so no visitor meets a 404.
export const FEATURES = {
  cv: true, // the "CV" button → downloads the right résumé PDF per track (cvFile)
  colophon: false, // /{lang}/colophon/ + the footer link
} as const;

import type { Track } from '../i18n';

// The owner keeps two real résumés in public/cv/ (static, committed, served as-is).
// The Flutter/mobile CV is the default everywhere (intro, "all", mobile); only a
// visitor who explicitly picks the Cloud track gets the cloud/DevOps CV.
// These are language-independent files; the UI label is localized.
const CV_CLOUD = 'cv/Mohamed-Essa-Cloud-DevOps.pdf';
const CV_MOBILE = 'cv/Mohamed-Essa-Mobile-Engineer.pdf';

const CV_BY_TRACK: Record<Track, string> = {
  mobile: CV_MOBILE,
  cloud: CV_CLOUD,
  all: CV_MOBILE,
};

/** Public path (relative, for the asset() helper) of the CV PDF for a track. */
export function cvFile(track: Track): string {
  return CV_BY_TRACK[track] ?? CV_MOBILE;
}
