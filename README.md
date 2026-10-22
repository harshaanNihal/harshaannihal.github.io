# harshaannihal.github.io

Portfolio and blog of Harshaan Nihal Khan, built with [Jekyll](https://jekyllrb.com/) and served by GitHub Pages.

**Live:** https://harshaannihal.github.io/

## Edit the content

Everything the home page says lives in [`_data/profile.yml`](_data/profile.yml): the hero line, about text, skills, featured projects, open source highlights, UI experiments and lab links. Change the YAML, not the templates.

The GitHub numbers (repos, followers, merged pull requests) live in `_data/github.yml`. Refresh them with the [GitHub CLI](https://cli.github.com/), then review and commit the diff:

```sh
tools/update-github-data.sh
```

Blog posts go in `_posts/` as `YYYY-MM-DD-title.markdown`. An optional `image:` in the front matter becomes the post's share image.

Project screenshots live in `assets/media/work/`. Each one is a 1200 by 750 JPEG.

## Layout

| Path | What it holds |
| --- | --- |
| `_layouts/` | `default` (page shell), `home`, `page` and `post` |
| `_includes/home/` | One file per home page section |
| `_includes/` | `head`, `header`, `footer` and the `icon` helper |
| `assets/css/site.css` | All styles. Tokens for the dark and light themes sit at the top |
| `assets/js/site.js` | Theme toggle, mobile menu, scroll reveal, count-up, hero particles. No dependencies |
| `tools/og.html` | Template for the social share image |

## Run locally

```sh
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000/. The Gemfile pins the `github-pages` gem, so local builds use the same Jekyll and plugins as GitHub Pages.

## Design notes

- Dark is the default. The theme follows the system setting until you pick one with the toggle, and the choice is remembered.
- Inter is self-hosted, and Polya is served as provided. The page makes no third-party requests.
- Animation stops when the system asks for reduced motion, and the content is readable with JavaScript off.
- The share image `assets/media/og.png` comes from `tools/og.html`. Re-render it with any headless Chrome:

  ```sh
  chrome --headless --screenshot=assets/media/og.png --window-size=1200,630 tools/og.html
  ```
