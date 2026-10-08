// Pages that are linked from the chrome but not built yet (plan Phase 7).
// Their links stay hidden until the page exists, so no visitor meets a 404.
export const FEATURES = {
  cv: false, // /{lang}/cv/{track}/ + the "CV" button
  colophon: false, // /{lang}/colophon/ + the footer link
} as const;
