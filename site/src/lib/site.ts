// Site-wide settings that were _config.yml under Jekyll: the address, the default title and description, and
// what the share tags say.
export const site = {
  url: 'https://harshaannihal.github.io',
  title: 'Harshaan Nihal Khan',
  tagline: 'Software Engineer',
  description: 'Software engineer open to new roles. I build web and mobile products with Ruby on Rails, React, Node and React Native. Selected work and writing.',
  twitter: '@klassynihal',
  image: '/assets/media/og.jpg',
  sameAs: ['https://github.com/harshaanNihal', 'https://www.linkedin.com/in/harshaannihal', 'https://twitter.com/klassynihal'],
} as const;

export const absolute = (path: string) => (/^https?:/.test(path) ? path : new URL(path, site.url).href);
