#!/usr/bin/env bash
# Make the project site's images from the originals in docs/.
# Run after replacing a screenshot or the logo, then commit site/img/.
set -euo pipefail
cd "$(dirname "$0")/.."
out=site/img
mkdir -p "$out"

# The logo is a JPEG on an uneven off-white panel. Keep the centered mark and
# wordmark and push the panel to pure white; the page then blends it away with
# mix-blend-mode: multiply.
magick "docs/ephemeris logo.jpg" -crop 700x560+354+108 +repage -level 0%,95% -resize 900x -quality 88 "$out/logo.jpg"

magick "docs/ephemeris 2.png" -resize 1600x -quality 80 "$out/app.webp"

# For the seasons, only the map and sky dome panels (right of the globe, left of the controls)
season() {
  magick "docs/$1" -crop 780x1180+808+56 +repage -resize 600x -quality 80 "$out/$2.webp"
}
season "ephemeris jun sol.png" june-solstice
season "ephemeris equinox.png" equinox
season "ephemeris dec sol.png" december-solstice

# Link previews in chat apps and social sites
magick "docs/ephemeris 2.png" -resize 1200x -gravity north -crop 1200x630+0+0 +repage -quality 82 "$out/preview.jpg"

ls -l "$out"
