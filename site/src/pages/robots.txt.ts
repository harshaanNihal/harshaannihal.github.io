import type { APIRoute } from 'astro';
import { absolute } from '../lib/site';

export const GET: APIRoute = () => new Response(`Sitemap: ${absolute('/sitemap.xml')}\n`, { headers: { 'Content-Type': 'text/plain' } });
