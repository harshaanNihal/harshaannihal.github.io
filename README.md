# harshaannihal.github.io

Portfolio and blog of Harshaan Nihal Khan, built with [Jekyll](https://jekyllrb.com/) and served by GitHub Pages.

**Live:** https://harshaannihal.github.io/

## Layout

- `_layouts/home.html` is the one-page portfolio: hero, about, skills, projects, blog, contact.
- `_layouts/page.html` wraps the About and Blog pages. `_includes/` holds the shared nav and footer.
- `_posts/` holds blog posts. Add a post with a `YYYY-MM-DD-title.markdown` file. An optional `image:` in the front matter shows on the home page card.
- The project tiles on the home page link to demos in the [html_css_practice](https://github.com/harshaanNihal/html_css_practice) site.
- `assets/stylesheets/style.css` is the main stylesheet. `pages.css` adds the About, Blog and footer styles.

## Run locally

```sh
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000/. The Gemfile pins the `github-pages` gem so local builds match what GitHub Pages runs.
