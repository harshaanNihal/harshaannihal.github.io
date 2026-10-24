// The code shown beside each experiment in the Code section, cut from the real source at build time, so the
// excerpt and its line numbers can never drift from the file. Each excerpt starts at the first line matching
// `from` and runs to the `blocks`-th line after it that matches `to`, dedented.
import paintedSky from './painted-sky.ts?raw';
import constellation from '../scripts/constellation.ts?raw';
import stylesheet from '../styles/site.css?raw';

export interface Excerpt {
  /** The path in the repository, for the file view's header and its link to GitHub. */
  file: string;
  from: number;
  to: number;
  code: string;
}

const defs = [
  { name: 'painted-sky', file: 'site/src/lib/painted-sky.ts', source: paintedSky, from: /^\/\* The river of dabs/, to: /^}$/ },
  { name: 'constellation', file: 'site/src/scripts/constellation.ts', source: constellation, from: /^ {2}function step\(dt: number\) \{$/, to: /^ {2}}$/ },
  { name: 'notch', file: 'site/src/styles/site.css', source: stylesheet, from: /^\.btn--notch \{$/, to: /^}$/, blocks: 3 },
  { name: 'skills-sky', file: 'site/src/styles/site.css', source: stylesheet, from: /^\.skill-sky__star,$/, to: /^}$/, blocks: 2 },
];

function cut({ name, file, source, from, to, blocks = 1 }: (typeof defs)[number] & { blocks?: number }): Excerpt {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => from.test(line));
  if (start < 0) throw new Error(`Excerpt ${name}: no line in ${file} matches ${from}`);
  let end = start;
  for (let found = 0; found < blocks; end++) {
    if (end >= lines.length) throw new Error(`Excerpt ${name}: ran off the end of ${file}`);
    if (to.test(lines[end]!) && end > start) found++;
    if (found === blocks) break;
  }
  const body = lines.slice(start, end + 1);
  const indent = Math.min(...body.filter((line) => line.trim()).map((line) => /^ */.exec(line)![0].length));
  return { file, from: start + 1, to: end + 1, code: body.map((line) => line.slice(indent)).join('\n') };
}

export const excerpts: Record<string, Excerpt> = Object.fromEntries(defs.map((def) => [def.name, cut(def)]));
