# harshaannihal.github.io

Portfolio of Harshaan Nihal Khan, built with [Astro](https://astro.build/) and TypeScript and served by GitHub Pages, with a small API on Cloudflare Workers for the contact form and a visit counter that uses no cookies. The design takes its cues from the portrait on the home page: Van Gogh's *The Starry Night*, in a night theme and a day theme. Headings are set in Polya, a wireframe display face. The hero has a constellation of floating stars that sits behind the text and the portrait.

**Live:** https://harshaannihal.github.io/

## Run locally

Needs Node 22.12 or later (CI uses 24).

```sh
npm install
npm run dev        # http://localhost:4800, reloads as you edit
npm run check      # type-checks the components, scripts and data
npm run build      # writes the static site to site/dist
npm run preview    # serves site/dist on http://localhost:4800
npm test           # the API's tests
```

The site lives in `site/`, the API in `api/`, and what they send each other in `packages/contract/`. The root `package.json` is an npm workspace, so the commands run from the repository root.

## The API

`api/` is a Cloudflare Worker behind the contact form and the visit counter: messages are stored and emailed to the owner, and visits are counted without cookies, IP addresses or tracking across days. The site builds without it, and gains the form and the counter once `PUBLIC_API_URL` is set (the `API_URL` repository variable in CI). Setting it up, working on it and querying it are in [`api/README.md`](api/README.md). What visitors are told is on [/privacy/](https://harshaannihal.github.io/privacy/).

## Deploy

Pushing to `master` runs `.github/workflows/site.yml`: it type-checks, builds, and publishes `site/dist` to GitHub Pages. Pull requests are checked and built but not published. Changes to the API run `.github/workflows/api.yml`, which tests it and, once it is set up, deploys it. Pages must be set to deploy from GitHub Actions (Settings, Pages, Build and deployment, Source).

## Edit the content

Everything the home page says lives in [`site/src/data/profile.yml`](site/src/data/profile.yml): the hero line, about text, work history with each role's stack, skills, the case studies (with the parts and links each constellation sketch draws), the site's experiments and the GitHub repositories. Change the YAML, not the components.

`site/src/lib/data.ts` checks every data file against a schema on each build. It also checks that every role's stack names skills exactly as they appear under `skills`, that every skill lights for some role, that every case-study link points at a case study, and that every sketch's lines join real stars. A mistake fails the build with the field's path instead of quietly breaking a section.

The Writing section comes from Medium. Refresh it after publishing a story, then review and commit the diff:

```sh
site/tools/update-medium.py     # reads medium.com/feed/@klassynihal
site/tools/update-github.py     # the contribution calendar, from github.com/users/harshaanNihal/contributions
```

`update-medium.py` rewrites `site/src/data/medium.yml` and downloads each cover into `site/public/assets/media/writing/` as AVIF plus a JPEG fallback (the covers need macOS `sips`). `update-github.py` writes `site/src/data/github.yml`: the year's total, each day's level and count, and the monthly totals that the hidden table reads.

The code beside each experiment in the Code section is cut from the real source at build time (`site/src/lib/excerpts.ts`), so it can't drift from the file it shows.

## The blog

Posts live in `site/src/content/posts/` and show up on [/blog/](https://harshaannihal.github.io/blog/) next to the Medium stories, newest first. Add a post as `YYYY-MM-DD-title.md` with a `title` and a `date`; it is served at `/blog/title`. A post that was also published on Medium can set `canonical_url` and gets an "Also on Medium" link and that story's cover. Old addresses keep working through the `redirects` in `site/astro.config.mjs`.

## Fonts

Polya (by Adrien Coquet) is the display face. `site/tools/font.sh` rebuilds `site/public/assets/fonts/polya-latin.woff2` from `site/src/originals/fonts/POLYA.otf` (needs fonttools and brotli). Polya has no lowercase and lacks a few symbols, so those fall back to the next font in the stack. Body text uses the system font.

## Images

Originals live in `site/src/originals/`. `site/tools/images.sh` rebuilds the optimized images from them (macOS `sips`):

- `hero.jpg` becomes `public/assets/media/hero-480`, `hero-720` and `hero-1152`, each as AVIF with a JPEG fallback.
- `work/NAME.jpg` becomes `public/assets/media/work/NAME.avif` and `.jpg` at 720 px wide. The `site-*` captures are this site's own pieces (the painted sky, the constellation, the skills sky), taken from a local build with Playwright for the experiments in the Code section.

`sky.jpg`, the top band of the portrait, becomes the small inline washes behind the hero and Contact at build time (`site/src/lib/wash.ts`, with sharp): one mapped from midnight navy to cobalt for night, one from cream to gold for day. One hue per theme, so the blur never mixes the painting's yellows into its blues.

Add an experiment preview by dropping a 1120 by 700 JPEG in `site/src/originals/work/`, running the script, and pointing an entry under `site_experiments` in `profile.yml` at `work/NAME`.

## Layout

| Path | What it holds |
| --- | --- |
| `site/src/pages/` | The routes: the home page, `blog/index` and `blog/[slug]` for posts, `404`, the `/about/` redirect, `sitemap.xml` and `robots.txt` |
| `site/src/layouts/` | `Base` (the head, header, footer and script for every page) and `Page` (a plain narrow page) |
| `site/src/components/home/` | One component per home page section. `Code.astro` is the GitHub-style section: the contribution calendar, the experiments as a file view with tabs, and the repositories |
| `site/src/components/` | `Header`, `Footer`, `Seo` (title, share tags, structured data), `Icon`, `Btn` (the button link, see below), `EmailCta` (the address as a notch button plus Copy), `Picture`, `Repo`, `SignOff`, and the painted sky's `SkyDefs`, `Pstar` and `Swirl` |
| `site/src/scripts/` | The behaviour, one TypeScript module per feature: theme, menu, reveal, nav spy, case links, copy email, skills sky, moonlight, sky rooms, constellation, calendar, file view. `main.ts` starts them |
| `site/src/styles/site.css` | All styles, inlined into every page. Tokens for the two themes sit at the top |
| `site/src/lib/` | Build-time code: `data.ts` (the data files and their schemas), `painted-sky.ts` (the sky's brushwork, seeded), `wash.ts`, `excerpts.ts`, `posts.ts`, `format.ts`, `code-theme.ts` (code highlighting) and `site.ts` (the site's address and share defaults) |
| `api/` | The Worker: the contact and event endpoints, the cron jobs, the D1 schema and the tests (see `api/README.md`) |
| `packages/contract/` | The shapes of a contact message and a page event, with Zod, shared by the form, the beacon and the API |
| `site/tools/` | Scripts you run by hand: the Medium and GitHub refreshes, `images.sh`, `font.sh`, and `og.html`, the template for the social share image |

## The notch button

`<Btn href="mailto:..." label="Email me" icon="arrow-right" />` draws a bordered button whose border has two gaps. On hover or keyboard focus the gaps slide to the opposite ends, the border turns crimson and the arrow turns a quarter. The border is a clipped pseudo-element, so the gaps are real holes. Other variants are `primary` and `ghost`.

The notch is kept for the one action, emailing, so it always means "write to me". Other links on the home page, the blog and posts are ghost buttons or text links. `<EmailCta />` draws it with the address as the label and a Copy button beside it.

## Performance notes

Looks come first here, and the numbers are still good. Measured with Lighthouse on mobile, served gzipped as GitHub Pages does: 100 for performance, accessibility, best practices and SEO, with LCP at 1.8 s and layout shift at 0.

- A first visit on a phone is 6 requests and about 160 KB: the page with its inlined stylesheet, the behaviour script, the Polya font, the hero portrait as AVIF and the favicon. The experiment previews and the Medium covers load lazily, further down.
- The body text uses the system font, and there are no third-party requests. With the API on, each page also sends one small beacon to it, after the page has loaded.
- The hero background is a small inline copy of the painting, mapped to one hue and softened. The hero and the contact each have a constellation canvas that pauses when it is off screen and stops for reduced motion. The painted stars turn on the compositor and rest while their section is off screen.
- Content is readable with JavaScript off, and animation stops when the system asks for reduced motion. Without JavaScript the case studies still open (they are `details` elements) and the experiments read one after another instead of as tabs.
- The contribution calendar is plain HTML from `site/src/data/github.yml`, so visitors never wait on GitHub.
- The share image `site/public/assets/media/og.jpg` comes from `site/tools/og.html`. The header of that file has the render commands.
