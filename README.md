# harshaannihal.github.io

Portfolio of Harshaan Nihal Khan, built with [Jekyll](https://jekyllrb.com/) and served by GitHub Pages. The design takes its cues from the portrait on the home page: Van Gogh's *The Starry Night*, in a night theme and a day theme.

**Live:** https://harshaannihal.github.io/

## Edit the content

Everything the home page says lives in [`_data/profile.yml`](_data/profile.yml): the hero line, about text, skills, featured work and UI studies. Change the YAML, not the templates.

The Writing section comes from Medium. Refresh it after publishing a story, then review and commit the diff:

```sh
tools/update-medium.py          # reads medium.com/feed/@klassynihal
```

It rewrites `_data/medium.yml` and downloads each cover into `assets/media/writing/` as AVIF plus a JPEG fallback. The covers need macOS `sips`. Pass a different handle as the first argument.

## Images

Originals live in `_src/`, which never publishes. `tools/images.sh` rebuilds every optimized image from them (macOS `sips`):

- `_src/hero.jpg` becomes `assets/media/hero-480` and `hero-720`, each as AVIF with a JPEG fallback.
- `_src/sky.jpg` is the top band of the portrait. It becomes the small inline wash behind the hero, in `_includes/hero-wash.txt`.
- `_src/work/NAME.jpg` becomes `assets/media/work/NAME.avif` and `.jpg` at 720 px wide.

Add a project screenshot by dropping a 1200 by 750 JPEG in `_src/work/`, running the script, and pointing an entry in `profile.yml` at `work/NAME`.

## Layout

| Path | What it holds |
| --- | --- |
| `_layouts/` | `default` (page shell), `home`, `page` and `post` |
| `_includes/home/` | One file per home page section |
| `_includes/site.css` | All styles, inlined into every page. Tokens for the two themes sit at the top |
| `_includes/site.js` | Theme toggle, mobile menu, scroll reveal and copy-email, inlined into every page |
| `_includes/` | `head`, `header`, `footer`, `picture` and the `icon` helper |
| `tools/og.html` | Template for the social share image |

## Run locally

```sh
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000/. The Gemfile pins the `github-pages` gem, so local builds use the same Jekyll and plugins as GitHub Pages.

## Performance notes

- A first visit on a phone is 4 requests and about 99 KB: the page, one font, and the hero image as AVIF.
- CSS and JavaScript are inlined, the body text uses the system font, and DM Serif Display is the only web font (a Latin subset, 18 KB).
- The hero background is a 2 KB inline thumbnail of the painting, stretched. There are no third-party requests.
- Animation stops when the system asks for reduced motion, and the content is readable with JavaScript off.
- The share image `assets/media/og.jpg` comes from `tools/og.html`. The header of that file has the render commands.
