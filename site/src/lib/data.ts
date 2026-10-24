// The site's data files, read once at build time and checked against their schemas, so a typo in profile.yml
// fails the build with its path instead of quietly breaking a section.
import { parse } from 'yaml';
import { z } from 'astro/zod';
import profileSource from '../data/profile.yml?raw';
import mediumSource from '../data/medium.yml?raw';
import githubSource from '../data/github.yml?raw';

/* Plain days (2024-07-01) are YAML 1.1 timestamps, as Jekyll read them. */
const read = (source: string): unknown => parse(source, { customTags: ['timestamp'] });

const text = z.string().min(1);
const link = z.object({ text, url: z.url(), press: z.boolean().optional() });

const position = z.object({
  title: text,
  case: text.optional(),
  notes: z.array(text),
  press: z.object({ match: text, url: z.url() }).optional(),
  tech: z.array(text),
});

const caseStudy = z.object({
  id: text,
  when: text,
  company: text,
  title: text,
  summary: text,
  role: text,
  tools: z.array(text).optional(),
  outcome: text,
  links: z.array(link).optional(),
  nodes: z.array(z.object({ label: text, x: z.number(), y: z.number(), side: z.enum(['above', 'below', 'left', 'right']) })),
  edges: z.array(z.tuple([z.number().int(), z.number().int()])),
});

const profileSchema = z.object({
  name: text,
  role: text,
  email: z.email(),
  github: text,
  linkedin: text,
  twitter: text,
  hero: z.object({ eyebrow: text, lead: text }),
  about: z.object({
    paragraphs: z.array(text),
    facts: z.array(z.object({ label: text, value: text.optional(), links: z.array(link).optional() })),
  }),
  experience: z.array(z.object({ company: text, start: z.date(), end: z.date(), positions: z.array(position) })),
  side_projects: z.object({ title: text, since: z.number().int(), text, tech: z.array(text) }),
  skills: z.array(z.object({ group: text, items: z.array(text) })).length(4),
  featured: z.array(z.object({ match: text, text, url: z.url() })),
  case_studies: z.array(caseStudy),
  site_experiments: z.array(z.object({
    id: text,
    title: text,
    text,
    tags: z.array(text),
    image: text.optional(),
    alt: text.optional(),
    live: z.literal('notch').optional(),
    excerpt: text,
    lang: z.enum(['javascript', 'css']),
  })),
  repos_show: z.number().int().nonnegative(),
  repos: z.array(z.object({ name: text, text, language: text, url: z.url(), demo: z.url().optional() })),
}).superRefine((p, ctx) => {
  /* The skills sky only works if every stack names a skill exactly, and every skill lights for some role. */
  const skills = new Set(p.skills.flatMap((g) => g.items));
  const stacks = [
    ...p.experience.flatMap((job) => job.positions.map((pos) => ({ where: `${job.company}: ${pos.title}`, tech: pos.tech }))),
    { where: 'side_projects', tech: p.side_projects.tech },
  ];
  const used = new Set<string>();
  for (const { where, tech } of stacks) {
    for (const t of tech) {
      used.add(t);
      if (!skills.has(t)) ctx.addIssue({ code: 'custom', message: `${where} uses "${t}", which is not under skills` });
    }
  }
  for (const s of skills) {
    if (!used.has(s)) ctx.addIssue({ code: 'custom', message: `The skill "${s}" never lights: no role lists it` });
  }
  const cases = new Set(p.case_studies.map((c) => c.id));
  for (const job of p.experience) {
    for (const pos of job.positions) {
      if (pos.case && !cases.has(pos.case)) ctx.addIssue({ code: 'custom', message: `${job.company} links to a missing case study "${pos.case}"` });
      if (pos.press && !pos.notes.some((n) => n.includes(pos.press!.match))) {
        ctx.addIssue({ code: 'custom', message: `${job.company}: no note contains the press text "${pos.press.match}"` });
      }
    }
  }
  for (const c of p.case_studies) {
    for (const [a, b] of c.edges) {
      if (!c.nodes[a] || !c.nodes[b]) ctx.addIssue({ code: 'custom', message: `Case "${c.id}" has an edge to a missing node: [${a}, ${b}]` });
    }
  }
});

const mediumSchema = z.object({
  profile: z.url(),
  updated: z.date(),
  posts: z.array(z.object({
    title: text,
    url: z.url(),
    date: z.date(),
    minutes: z.number().int().positive(),
    excerpt: z.string(),
    cover: text.optional(),
    tags: z.array(text),
  })),
});

const githubSchema = z.object({
  handle: text,
  total: text,
  start: z.date(),
  end: z.date(),
  weeks: z.array(z.object({ l: z.string().regex(/^[0-4]{1,7}$/), c: z.string().regex(/^\d+(,\d+)*$/) })),
  months: z.array(z.object({ label: text, week: z.number().int() })),
  monthly: z.array(z.object({ month: text, total: z.number().int(), days: z.number().int() })),
});

function check<T>(schema: z.ZodType<T>, source: string, file: string): T {
  const result = schema.safeParse(read(source));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`${file} does not match its schema:\n${lines.join('\n')}`);
  }
  return result.data;
}

export const profile = check(profileSchema, profileSource, 'src/data/profile.yml');
export const medium = check(mediumSchema, mediumSource, 'src/data/medium.yml');
export const github = check(githubSchema, githubSource, 'src/data/github.yml');

export type Profile = typeof profile;
export type CaseStudy = Profile['case_studies'][number];
export type Repo = Profile['repos'][number];
export type Story = typeof medium.posts[number];
