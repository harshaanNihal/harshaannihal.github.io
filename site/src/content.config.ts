// Posts written on this site, in Markdown. Each is served at /blog/<file name without its date>, the URL Jekyll
// gave it, with the case kept.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parseJekyllDate } from './lib/format';

const posts = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.union([z.date(), z.string()]).transform(parseJekyllDate),
    description: z.string().optional(),
    /** The original, when the post was first published elsewhere (Medium). It becomes the canonical address. */
    canonical_url: z.url().optional(),
    /** The share image, a path on this site. */
    image: z.string().optional(),
    /** The cover, a path under /assets/media with no extension. A post with a Medium twin borrows its cover. */
    cover: z.string().optional(),
    redirect_from: z.array(z.string()).optional(),
  }),
});

export const collections = { posts };
