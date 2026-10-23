#!/bin/sh
# Rebuild every optimized image in assets/media from the originals in _src/. macOS only (uses sips).
#   _src/hero.jpg       the portrait, becomes hero-480, hero-720 and hero-1152 (AVIF with a JPEG fallback)
#   _src/sky.jpg       the top 16:9 band of hero.jpg, the source of the hero wash
#   _src/work/NAME.jpg  previews of this site's experiments (captured from the site), become work/NAME.avif
#                       and work/NAME.jpg at 720 px
# It also writes _includes/hero-wash.txt, a tiny inline image of the sky that paints the hero background.
set -eu
cd "$(dirname "$0")/.."
out=assets/media
mkdir -p "$out/work"

encode() { # encode <source> <target-without-extension> <width> <avif-quality> <jpeg-quality>
  sips --resampleWidth "$3" -s format avif -s formatOptions "$4" "$1" --out "$2.avif" >/dev/null
  sips --resampleWidth "$3" -s format jpeg -s formatOptions "$5" "$1" --out "$2.jpg" >/dev/null
}

# The portrait shows up to 420 CSS px wide, so a 2x screen needs about 840 px: 1152 covers that and 3x phones.
# AVIF q60 and JPEG q78 keep the brush strokes and the dark red shirt free of blocking when judged at 2x.
for width in 480 720 1152; do
  encode _src/hero.jpg "$out/hero-$width" "$width" 60 78
done
for src in _src/work/*.jpg; do
  name=$(basename "$src" .jpg)
  encode "$src" "$out/work/$name" 720 50 70
done

# The wash is only the sky (_src/sky.jpg is the top 16:9 band of hero.jpg), so the face and shirt do not muddy it.
tmp=$(mktemp -t wash).jpg
# 96 px at q75: at 36 px and q35 the stretched JPEG blocks showed as gray mud on a wide screen.
# The browser blows this up to the hero size, so more source pixels means a softer, richer wash.
sips -Z 96 -s format jpeg -s formatOptions 75 _src/sky.jpg --out "$tmp" >/dev/null
printf 'data:image/jpeg;base64,%s' "$(base64 < "$tmp" | tr -d '\n')" > _includes/hero-wash.txt
rm -f "$tmp"

ls -l "$out"/hero-* "$out"/work/* | awk '{print $5, $9}'
