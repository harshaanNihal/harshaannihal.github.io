// The portfolio, built to static files that GitHub Pages serves as they are.
import { defineConfig } from 'astro/config';
import { codeTheme, codeTransformers } from './src/lib/code-theme.ts';

export default defineConfig({
  site: 'https://harshaannihal.github.io',
  build: {
    /* Pages keep the file names Jekyll wrote (blog/index.html, blog/<slug>.html, 404.html), so every URL stays
       the same, including /blog/A-Noobs-Guide-For-CSS-Box-Model with no extension. */
    format: 'preserve',
    /* One request for the page: the stylesheet is inlined, as it was. */
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  markdown: { shikiConfig: { theme: codeTheme, transformers: codeTransformers } },
  /* Old addresses that still work. Each becomes a page that sends the visitor on (src/pages/about/ is the third). */
  redirects: {
    '/jekyll/update/2018/09/02/welcome-to-jekyll': '/blog/welcome-to-jekyll',
    '/jekyll/update/2018/09/02/blog': '/blog/welcome-to-jekyll',
  },
});
