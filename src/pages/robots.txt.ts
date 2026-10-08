// robots.txt: everything is public and meant to be found, by search engines and
// AI assistants alike (a portfolio wants to be read). See docs/seo-and-ai.md.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const sitemap = new URL(`${base}sitemap-index.xml`, site).href;
  const llms = new URL(`${base}llms.txt`, site).href;
  return new Response(
    `# Mohamed Essa — portfolio. All content is public.\nUser-agent: *\nAllow: /\n\n# A plain-markdown summary for AI assistants: ${llms}\nSitemap: ${sitemap}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
};
