# harshaannihal.github.io

Portfolio of Harshaan Nihal Khan, built with [Jekyll](https://jekyllrb.com/) and served by GitHub Pages. The design takes its cues from the portrait on the home page: Van Gogh's *The Starry Night*, in a night theme and a day theme. Headings are set in Polya, a wireframe display face. The hero has a constellation of floating stars that sits behind the text and the portrait.

**Live:** https://harshaannihal.github.io/

## Edit the content

Everything the home page says lives in [`_data/profile.yml`](_data/profile.yml): the hero line, about text, skills, featured work and UI studies. Change the YAML, not the templates.

The Writing section comes from Medium. Refresh it after publishing a story, then review and commit the diff:

```sh
tools/update-medium.py          # reads medium.com/feed/@klassynihal
```

It rewrites `_data/medium.yml` and downloads each cover into `assets/media/writing/` as AVIF plus a JPEG fallback. The covers need macOS `sips`. Pass a different handle as the first argument.

## The blog

Posts live in `_posts/` and show up on [/blog/](https://harshaannihal.github.io/blog/) next to the Medium stories, newest first. Add a post by dropping `YYYY-MM-DD-title.markdown` in `_posts/` with `layout: post`, a `title` and a `date`. A post that was also published on Medium can set `canonical_url` and gets an "Also on Medium" link. Old post URLs keep working through `redirect_from` in the front matter.

## Fonts

Polya (by Adrien Coquet) is the display face. `tools/font.sh` rebuilds `assets/fonts/polya-latin.woff2` from `_src/fonts/POLYA.otf` (needs fonttools and brotli). Polya has no lowercase and lacks a few symbols, so those fall back to the next font in the stack. Body text uses the system font.

## Images

Originals live in `_src/`, which never publishes. `tools/images.sh` rebuilds every optimized image from them (macOS `sips`):

- `_src/hero.jpg` becomes `assets/media/hero-480`, `hero-720` and `hero-1152`, each as AVIF with a JPEG fallback.
- `_src/sky.jpg` is the top band of the portrait. It becomes the small inline wash behind the hero, in `_includes/hero-wash.txt`.
- `_src/work/NAME.jpg` becomes `assets/media/work/NAME.avif` and `.jpg` at 720 px wide.

Add a project screenshot by dropping a 1200 by 750 JPEG in `_src/work/`, running the script, and pointing an entry in `profile.yml` at `work/NAME`.

## Layout

| Path | What it holds |
| --- | --- |
| `_layouts/` | `default` (page shell), `home`, `blog` (the archive), `page` and `post` |
| `_includes/home/` | One file per home page section |
| `_includes/site.css` | All styles, inlined into every page. Tokens for the two themes sit at the top |
| `_includes/site.js` | Theme toggle, mobile menu, scroll reveal, copy-email and the constellations in the hero and contact skies, inlined into every page |
| `_includes/sky-defs.html` | The painted sky's brushwork (star halos and the swirl) as SVG symbols, written by `tools/painted-sky.mjs`. `pstar.html` and `swirl.html` place them |
| `_includes/` | `head`, `header`, `footer`, `picture`, the `icon` helper and `btn` (the button link, see below) |
| `tools/og.html` | Template for the social share image |

## The notch button

`{% include btn.html href="#work" label="See my work" icon="arrow-right" variant="notch" %}` draws a bordered button whose border has two gaps. On hover or keyboard focus the gaps slide to the opposite ends, the border turns crimson, the box is shaded in with pencil hatching, and the arrow moves: it turns down for a jump within the page and leans forward for anything else. The border is a clipped pseudo-element, so the gaps are real holes. Other variants are `primary` and `ghost`.

## Run locally

```sh
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000/. The Gemfile pins the `github-pages` gem, so local builds use the same Jekyll and plugins as GitHub Pages.

## Performance notes

Looks come first here, and the numbers are still good. Measured on this build with Lighthouse: mobile 97 performance, desktop 100, and 100 for accessibility, best practices and SEO on both. Layout shift is 0.

- A first visit on a phone is 4 requests and about 190 KB: the page, the Polya font (70 KB), and the hero portrait as AVIF (100 KB).
- CSS and JavaScript are inlined, the body text uses the system font, and there are no third-party requests.
- The hero background is a small inline copy of the painting, stretched and softened. The hero and the contact each have a constellation canvas that pauses when it is off screen and stops for reduced motion. The painted stars turn on the compositor and rest while their section is off screen.
- Content is readable with JavaScript off, and animation stops when the system asks for reduced motion.
- The share image `assets/media/og.jpg` comes from `tools/og.html`. The header of that file has the render commands.
