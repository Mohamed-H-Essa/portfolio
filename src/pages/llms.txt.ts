import type { APIRoute } from 'astro';
import { loadProjects } from '../lib/content';
import { llmsTxt } from '../lib/llms';

export const GET: APIRoute = async () =>
  new Response(llmsTxt(await loadProjects()), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
