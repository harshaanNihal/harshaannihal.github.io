// How code is highlighted, in the Code section and in posts alike. Shiki colors each token with one of the
// page's theme variables, so code follows night and day: comments muted and italic, keywords and tags red,
// properties and functions blue, values gold. The <pre> keeps only the class site.css styles: no inline colors,
// and no tabindex, since its frame is the scroll region.
import type { ShikiTransformer, ThemeRegistration } from 'shiki';

export const codeTheme: ThemeRegistration = {
  name: 'site',
  type: 'dark',
  fg: 'var(--text)',
  bg: 'transparent',
  colors: { 'editor.foreground': 'var(--text)', 'editor.background': 'transparent' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: 'var(--muted)', fontStyle: 'italic' } },
    {
      scope: ['keyword', 'storage', 'entity.name.tag', 'entity.other.attribute-name.pseudo-class', 'entity.other.attribute-name.pseudo-element', 'variable.language'],
      settings: { foreground: 'var(--tok-tag)' },
    },
    {
      scope: ['support.type.property-name', 'entity.name.function', 'support.function', 'variable.other.property', 'meta.object-literal.key', 'variable.css', 'variable.argument.css', 'entity.other.attribute-name'],
      settings: { foreground: 'var(--sky-text)' },
    },
    { scope: ['string', 'constant', 'support.constant', 'keyword.other.unit', 'variable.other.constant'], settings: { foreground: 'var(--gold-text)' } },
  ],
};

export const codeTransformers: ShikiTransformer[] = [{ pre(node) { node.properties = { class: 'highlight' }; } }];
