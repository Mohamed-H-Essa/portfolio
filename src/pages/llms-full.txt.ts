import type { APIRoute } from 'astro';
import { loadProjects } from '../lib/content';
import { llmsFullTxt } from '../lib/llms';

export const GET: APIRoute = async () =>
  new Response(llmsFullTxt(await loadProjects()), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
