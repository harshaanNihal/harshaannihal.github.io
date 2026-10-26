#!/bin/sh
# Rebuild the optimized images in public/assets/media from the originals in src/originals/. macOS only (sips).
#   src/originals/hero.jpg       the portrait, becomes hero-480, hero-720 and hero-1152 (AVIF with a JPEG fallback)
# The sky washes behind the hero and Contact are made at build time from src/originals/sky.jpg (src/lib/wash.ts).
set -eu
cd "$(dirname "$0")/.."
out=public/assets/media

encode() { # encode <source> <target-without-extension> <width> <avif-quality> <jpeg-quality>
  sips --resampleWidth "$3" -s format avif -s formatOptions "$4" "$1" --out "$2.avif" >/dev/null
  sips --resampleWidth "$3" -s format jpeg -s formatOptions "$5" "$1" --out "$2.jpg" >/dev/null
}

# The portrait shows up to 420 CSS px wide, so a 2x screen needs about 840 px: 1152 covers that and 3x phones.
# AVIF q60 and JPEG q78 keep the brush strokes and the dark red shirt free of blocking when judged at 2x.
for width in 480 720 1152; do
  encode src/originals/hero.jpg "$out/hero-$width" "$width" 60 78
done

ls -l "$out"/hero-* | awk '{print $5, $9}'
