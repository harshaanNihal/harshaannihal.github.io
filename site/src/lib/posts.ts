// Posts on this site and stories on Medium, as one newest-first list for the blog. A Medium story that a local
// post points at with canonical_url is shown once, as the local post.
import { getCollection, type CollectionEntry } from 'astro:content';
import { medium, type Story } from './data';
import { readingMinutes, stripHtml, truncateWords } from './format';

export type Post = CollectionEntry<'posts'>;

export interface Entry {
  onSite: boolean;
  href: string;
  /** The Medium original of a post republished here. */
  alt?: string;
  title: string;
  date: Date;
  minutes: number;
  excerpt: string;
  cover?: string;
}

export const twinOf = (post: Post): Story | undefined =>
  post.data.canonical_url ? medium.posts.find((s) => s.url === post.data.canonical_url) : undefined;

export const minutesOf = (post: Post) => readingMinutes(post.rendered?.html ?? '');

/* The post's first paragraph as plain text: Jekyll's excerpt, which stood in for a missing description. */
export function leadOf(post: Post): string {
  const first = /<p>([\s\S]*?)<\/p>/.exec(post.rendered?.html ?? '')?.[1] ?? '';
  return stripHtml(first).replace(/\s+/g, ' ').trim();
}

/* The description, or the first paragraph cut to 40 words. */
const excerptOf = (post: Post) => post.data.description ?? truncateWords(leadOf(post), 40);

/* Oldest first, as Jekyll's site.posts ran for previous and next. */
export async function postsByDate(): Promise<Post[]> {
  return (await getCollection('posts')).sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}

export async function blogEntries(): Promise<Entry[]> {
  const posts = await postsByDate();
  const local: Entry[] = posts.map((post) => ({
    onSite: true,
    href: `/blog/${post.id}`,
    alt: post.data.canonical_url,
    title: post.data.title,
    date: post.data.date,
    minutes: minutesOf(post),
    excerpt: excerptOf(post),
    cover: post.data.cover ?? twinOf(post)?.cover,
  }));
  const twins = new Set(posts.map((p) => p.data.canonical_url).filter(Boolean));
  const stories: Entry[] = medium.posts.filter((s) => !twins.has(s.url)).map((s) => ({
    onSite: false,
    href: s.url,
    title: s.title,
    date: s.date,
    minutes: s.minutes,
    excerpt: s.excerpt,
    cover: s.cover,
  }));
  return [...local, ...stories].sort((a, b) => b.date.getTime() - a.date.getTime());
}
