#!/usr/bin/env bash
# Build the Home Assistant card bundle and copy it to an HA instance over SSH.
#
#   HA_DEPLOY_TARGET=root@homeassistant.local:/config/www/ephemeris npm run deploy:card
#
# Copies with tar over ssh, so the remote side only needs a shell and tar
# (true of HA's SSH add-ons). Optional: HA_DEPLOY_PORT (default 22).
set -euo pipefail

target="${HA_DEPLOY_TARGET:-}"
if [[ "$target" != *:/* ]]; then
  echo "Set HA_DEPLOY_TARGET to user@host:/absolute/path, e.g." >&2
  echo "  HA_DEPLOY_TARGET=root@homeassistant.local:/config/www/ephemeris" >&2
  exit 1
fi
host="${target%%:*}"
dir="${target#*:}"
port="${HA_DEPLOY_PORT:-22}"

cd "$(dirname "$0")/.."
npm run build:card

# printf %q quotes the path for the remote shell
remote_dir=$(printf '%q' "$dir")
tar -C dist-card -cf - . | ssh -p "$port" "$host" "mkdir -p $remote_dir && tar -C $remote_dir -xf -"

# A timestamp, so uncommitted rebuilds get a new cache key too
version=$(date +%Y%m%d%H%M)
case "$dir" in
  /config/www/*) url="/local/${dir#/config/www/}/ephemeris-cards.js" ;;
  *) url="(your /local/ path)/ephemeris-cards.js" ;;
esac
echo
echo "Copied to $target"
echo "Dashboard resource (JavaScript module): ${url}?v=${version}"
echo "Change ?v= after each deploy, or the browser keeps the old file."
