// The sitemap at the address jekyll-sitemap used, so search engines keep finding it: the home page, the blog
// and every post (posts with their dates).
import type { APIRoute } from 'astro';
import { xmlSchema } from '../lib/format';
import { postsByDate } from '../lib/posts';
import { absolute } from '../lib/site';

export const GET: APIRoute = async () => {
  const posts = await postsByDate();
  const urls = [
    ...posts.map((post) => `<url>\n<loc>${absolute(`/blog/${post.id}`)}</loc>\n<lastmod>${xmlSchema(post.data.date)}</lastmod>\n</url>`),
    `<url>\n<loc>${absolute('/blog/')}</loc>\n</url>`,
    `<url>\n<loc>${absolute('/')}</loc>\n</url>`,
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
