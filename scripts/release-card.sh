#!/usr/bin/env bash
# Publish the Home Assistant cards as a release of the HACS repository.
#
#   npm run release:card                 # release v<cardVersion> from package.json
#   npm run release:card -- notes.md     # with release notes from a file
#   npm run release:card -- --dry-run    # check and build, publish nothing
#
# Raise cardVersion and commit before running. Uses your gh login, which needs
# push access to the cards repository.
set -euo pipefail

cards_repo=fatcat/ephemeris-cards

dry_run=0
notes_in=
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    -*) echo "Unknown option: $arg" >&2; exit 1 ;;
    *) notes_in=$(realpath "$arg") ;;
  esac
done
if [[ -n "$notes_in" && ! -f "$notes_in" ]]; then
  echo "No notes file at $notes_in" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

fail() {
  echo "$1" >&2
  exit 1
}

[[ -z "$(git status --porcelain)" ]] || fail "Commit or stash your changes first; a release must match a commit."

version=$(node -p "require('./package.json').cardVersion")
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "cardVersion in package.json must look like 1.2.3, not \"$version\"."
tag="v$version"
if gh release view "$tag" --repo "$cards_repo" >/dev/null 2>&1; then
  fail "$cards_repo already has $tag. Raise cardVersion in package.json."
fi

sha=$(git rev-parse HEAD)
git fetch --quiet origin
[[ -n "$(git branch -r --contains "$sha")" ]] || fail "Push this commit first, so the release can link to its source."
source_repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

npm test
npm run check
EPHEMERIS_CARD_RELEASE=1 npm run build:card
[[ -f dist-card/ephemeris-cards.js ]] || fail "The build made no dist-card/ephemeris-cards.js."

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

notes="$work/notes.md"
{
  if [[ -n "$notes_in" ]]; then
    cat "$notes_in"
    echo
  fi
  echo "Built from https://github.com/$source_repo/commit/$sha"
} >"$notes"

# The repository's own files come from hacs/ here, so they're edited in one place
gh repo clone "$cards_repo" "$work/repo" -- --quiet --depth 1
cp hacs/README.md hacs/hacs.json LICENSE "$work/repo/"
git -C "$work/repo" add -A
files_changed=0
git -C "$work/repo" diff --cached --quiet || files_changed=1

echo
echo "Release $tag of $cards_repo, from ${sha:0:7}"
ls -l dist-card/*.js
if ((files_changed)); then
  git -C "$work/repo" status --short
fi

if ((dry_run)); then
  echo
  echo "Dry run: nothing published."
  exit 0
fi

if ((files_changed)); then
  git -C "$work/repo" commit --quiet -m "docs: update from $source_repo@${sha:0:7}"
  git -C "$work/repo" push --quiet origin HEAD:main
fi
gh release create "$tag" dist-card/*.js --repo "$cards_repo" --target main --title "$tag" --notes-file "$notes"
