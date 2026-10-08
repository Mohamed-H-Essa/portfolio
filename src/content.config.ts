import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

// A localized string field: en required, de/ar optional (fall back to en).
const localized = z.object({
  en: z.string().min(1),
  de: z.string().optional(),
  ar: z.string().optional(),
});
const localizedOpt = localized.partial().extend({ en: z.string().optional() });

const projects = defineCollection({
  // Ignore files starting with "_" (e.g. _template.yaml).
  loader: glob({ pattern: ['**/[^_]*.yaml', '**/[^_]*.yml'], base: './src/content/projects' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.enum(['project', 'role', 'cert']).default('project'),
    worlds: z.array(z.enum(['mobile', 'cloud', 'origin'])).min(1),
    era: z.enum(['s1', 's2', 's3', 's4']),
    start: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
    end: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal('present')]),
    weight: z.object({
      mobile: z.number().int().min(0).max(3),
      cloud: z.number().int().min(0).max(3),
      all: z.number().int().min(0).max(3),
    }),
    featured: z.boolean().default(false),
    confidential: z.boolean().default(false),
    code: z.string().regex(/^[MCP]\d{2}$/), // M mobile · P platform · C cloud, e.g. M03
    role: localizedOpt.optional(),
    short: localizedOpt.optional(), // ≤14 chars, the name on the 3D map
    title: localized,
    impact: z
      .object({
        line: localizedOpt.optional(),
        metric: z
          .object({ value: z.string().default(''), label: localizedOpt.optional() })
          .optional(),
      })
      .optional(),
    problem: localizedOpt.optional(),
    built: localizedOpt.optional(),
    result: localizedOpt.optional(),
    stack: z.array(z.string()).default([]),
    links: z
      .object({
        appStore: z.string().optional(),
        playStore: z.string().optional(),
        github: z.string().optional(),
        live: z.string().optional(),
        // more store/listing links, e.g. a second app: [{ label: { en: "App Store — Partners" }, href }]
        extra: z.array(z.object({ label: localized, href: z.string() })).optional(),
      })
      .partial()
      .optional(),
    connects: z.array(z.string()).default([]),
    assets: z.union([z.literal('auto'), z.string()]).default('auto'),
    // an extra built-in diagram on the dossier (e.g. the release pipeline flow)
    visual: z.enum(['release-flow']).optional(),
    review: z.object({ de: z.boolean(), ar: z.boolean() }).partial().optional(),
  }),
});

export const collections = { projects };
