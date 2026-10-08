// Plain-markdown summaries for AI assistants (llms.txt convention): who the
// owner is and every project, generated from the same content as the site.
import { loc, t, url } from '../i18n';
import type { Project } from './content';
import { yearSpan } from './dossier';

const site = (p: string) => new URL(p, import.meta.env.SITE).href;
const lane = { mobile: 'Mobile', origin: 'Platform', cloud: 'Cloud' } as const;

function header(): string {
  return `# Mohamed Essa

> ${t('en', 'track.all.hero')} in Cairo, Egypt. ${t('en', 'site.tagline')}

${t('en', 'track.mobile.sub')} ${t('en', 'track.cloud.sub')}

- Site (English / Deutsch / العربية): ${site(url('en'))}
- LinkedIn: https://www.linkedin.com/in/mohamed-hosny-essa
- GitHub: https://github.com/Mohamed-H-Essa
- Email: mhosnytech@gmail.com
- Education: B.Sc. Computer Engineering, Benha University (2019–2024)
- Languages: Arabic (native), English (fluent), German (learning)
- The site has three views of the same work: Mobile (${site(url('en', 'mobile'))}), Cloud (${site(url('en', 'cloud'))}) and Both (${site(url('en', 'all'))}).
`;
}

const line = (p: Project) => {
  const d = p.data;
  const raw = d.impact?.line ? loc(d.impact.line, 'en') : '';
  const impact = raw && !/[.!?]$/.test(raw) ? `${raw}.` : raw;
  return `- [${loc(d.title, 'en')}](${site(url('en', 'all', 'p', d.slug))}) (${lane[d.worlds[0]]}, ${yearSpan(d.start, d.end, 'present')}): ${impact}${d.stack.length ? ` Stack: ${d.stack.join(', ')}.` : ''}`;
};

export function llmsTxt(projects: Project[]): string {
  const certs = projects.filter((p) => p.data.kind === 'cert');
  const work = projects.filter((p) => p.data.kind !== 'cert');
  return `${header()}
## Projects

${work.map(line).join('\n')}

## Certifications

${certs.map(line).join('\n')}

## Optional

- [Every project in full (problem, what was built, result, links)](${site(url('llms-full.txt').replace(/\/$/, ''))})
`;
}

export function llmsFullTxt(projects: Project[]): string {
  const block = (p: Project) => {
    const d = p.data;
    const f = (k: 'problem' | 'built' | 'result') => (d[k] ? loc(d[k], 'en') : '');
    const { extra = [], ...main } = d.links ?? {};
    const links = [
      ...Object.entries(main).filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`),
      ...extra.map((x) => `- ${loc(x.label, 'en')}: ${x.href}`),
    ];
    return `## ${loc(d.title, 'en')}

- Page: ${site(url('en', 'all', 'p', d.slug))}
- Layer: ${lane[d.worlds[0]]} · ${yearSpan(d.start, d.end, 'present')}${d.role ? ` · Role: ${loc(d.role, 'en')}` : ''}
${d.impact?.line ? `- Impact: ${loc(d.impact.line, 'en')}\n` : ''}${d.stack.length ? `- Stack: ${d.stack.join(', ')}\n` : ''}${links.join('\n')}${links.length ? '\n' : ''}
${f('problem') ? `**Problem.** ${f('problem')}\n\n` : ''}${f('built') ? `**What was built.** ${f('built')}\n\n` : ''}${f('result') ? `**Result.** ${f('result')}\n` : ''}`;
  };
  return `${header()}\n${projects.map(block).join('\n')}`;
}
