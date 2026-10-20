# Phase 12: HACS Packaging

## Goal

Install and update the Home Assistant cards through HACS instead of copying files by hand.

## Context

Phases 9 to 11 built the cards. Until now they were copied to `/config/www/` with
`deploy:card` and added as a resource by hand, with a `?v=` to bump on every update.

## Decisions

- **A HACS custom repository, type Dashboard,** not a Home Assistant App. Apps (renamed from
  add-ons in 2026.2) are Docker containers run by the Supervisor; a card is one JS file.
- **A separate repository that only holds releases:** `fatcat/ephemeris-cards`. The cards
  import `src/lib/astronomy/`, so their source stays here, with the app. The other
  repository has a README, `hacs.json`, LICENSE and GitHub releases, which is all HACS reads.
- **Its files are kept here, in `hacs/`,** and the release script copies them over, so the
  card docs are edited in one place. The main README links to them.
- **The name fits HACS as is.** HACS wants a `.js` named after the repository, and the build
  already makes `ephemeris-cards.js`. It downloads every `.js` in the release, so the land
  chunk comes along. `hide_default_branch` is on, since the default branch has no JS.
- **Released from the developer's machine** with `npm run release:card` and the `gh` login.
  No CI token to store. A GitHub Action can take over later without other changes.
- **Cards are versioned apart from the app:** `cardVersion` in `package.json`, starting at
  1.0.0. The bundle logs `Ephemeris cards <version>` to the browser console. Builds outside
  the release script say `<version>-dev`, so a test copy can't pass for a release.
- **The release script refuses** a dirty tree, an unpushed commit, a version that is already
  released or not in `1.2.3` form, and failing tests or type check. Release notes end with a
  link to the source commit. `--dry-run` does everything but publish.

## Files Created/Modified

| File | Change |
|---|---|
| `hacs/README.md`, `hacs/hacs.json` | New. The cards repository's README and HACS manifest |
| `scripts/release-card.sh` | New. Checks, builds, syncs the repository files, creates the release |
| `package.json` | `cardVersion`; `release:card` script |
| `vite.card.config.ts` | `__CARD_VERSION__`, with `-dev` outside releases |
| `src/ha-card/build.d.ts` | Was `geo/virtual.d.ts`; now declares every value the card build supplies |
| `src/ha-card/index.ts` | Logs the version |
| `src/ha-card/defineCard.ts` | Editor documentation link goes to the cards repository |
| `README.md` | Card section points to `hacs/README.md`; test and release steps |

## Acceptance Criteria

- [x] Dev build logs `Ephemeris cards 1.0.0-dev`, release build `1.0.0`
- [x] Card picker's documentation link goes to the cards repository
- [x] `npm test` (113), `npm run check` pass
- [ ] `fatcat/ephemeris-cards` created: public, description, topics
- [ ] `npm run release:card -- --dry-run` passes every check and publishes nothing
- [ ] Release v1.0.0 has `ephemeris-cards.js` and the land chunk
- [ ] In HA: added as a custom repository, downloaded, resource registered, both cards load
- [ ] Console in HA shows `Ephemeris cards 1.0.0`
