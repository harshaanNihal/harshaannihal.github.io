#!/bin/sh
# Rebuild assets/fonts/polya-latin.woff2 from _src/fonts/POLYA.otf.
# Needs fonttools and brotli (pip install fonttools brotli). Point PYFTSUBSET at the binary if it is not on PATH.
#
# Polya is a thin wireframe face by Adrien Coquet. It has no $ % [ ] { } | ~ and no em dash, bullet or arrows,
# so those characters fall back to the next font in the stack. The subset keeps every Latin glyph it does have.
set -eu
cd "$(dirname "$0")/.."

src=_src/fonts/POLYA.otf
out=assets/fonts/polya-latin.woff2
subset=${PYFTSUBSET:-pyftsubset}

# Basic Latin, Latin-1, OE ligatures, modifiers, dashes, curly quotes, bullet, ellipsis, arrows, minus, euro, trademark.
unicodes='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2039-203A,U+2044,U+20AC,U+2122,U+2190-2193,U+2197,U+2212'

"$subset" "$src" \
  --unicodes="$unicodes" \
  --layout-features='*' \
  --flavor=woff2 \
  --no-hinting \
  --desubroutinize \
  --output-file="$out"

ls -l "$out" | awk '{print $5, $9}'
