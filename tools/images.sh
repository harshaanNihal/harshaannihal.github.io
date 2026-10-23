#!/bin/sh
# Rebuild every optimized image in assets/media from the originals in _src/. macOS only (uses sips).
#   _src/hero.jpg       the portrait, becomes hero-480 and hero-720 (AVIF with a JPEG fallback)
#   _src/sky.jpg       the top 16:9 band of hero.jpg, the source of the hero wash
#   _src/work/NAME.jpg  project and study screenshots, become work/NAME.avif and work/NAME.jpg at 720 px
# It also writes _includes/hero-wash.txt, a tiny inline image of the sky that paints the hero background.
set -eu
cd "$(dirname "$0")/.."
out=assets/media
mkdir -p "$out/work"

encode() { # encode <source> <target-without-extension> <width> <avif-quality> <jpeg-quality>
  sips --resampleWidth "$3" -s format avif -s formatOptions "$4" "$1" --out "$2.avif" >/dev/null
  sips --resampleWidth "$3" -s format jpeg -s formatOptions "$5" "$1" --out "$2.jpg" >/dev/null
}

encode _src/hero.jpg "$out/hero-480" 480 48 70
encode _src/hero.jpg "$out/hero-720" 720 48 70
for src in _src/work/*.jpg; do
  name=$(basename "$src" .jpg)
  encode "$src" "$out/work/$name" 720 50 70
done

# The wash is only the sky (_src/sky.jpg is the top 16:9 band of hero.jpg), so the face and shirt do not muddy it.
tmp=$(mktemp -t wash).jpg
sips -Z 36 -s format jpeg -s formatOptions 35 _src/sky.jpg --out "$tmp" >/dev/null
printf 'data:image/jpeg;base64,%s' "$(base64 < "$tmp" | tr -d '\n')" > _includes/hero-wash.txt
rm -f "$tmp"

ls -l "$out"/hero-* "$out"/work/* | awk '{print $5, $9}'
