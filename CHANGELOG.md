# Changelog

All notable cms-lab changes are recorded here. GitHub Releases should use the
same summaries, and npm package READMEs link back to this file so the public
history stays consistent across GitHub and npm.

## 1.0.10 - 2026-05-26

### Fixed

- Reduced Strapi image-alt noise by skipping generated media variants under
  `formats`. cms-lab now checks the editable parent media field instead of
  reporting `formats.thumbnail`, `formats.small`, `formats.medium`, or
  `formats.large` as separate CMS images.

### Verification

- Added a regression test for Strapi media with useful parent alt text and
  generated responsive variants.
- Verified against the public Strapi LaunchPad demo with Next.js: 11 documents,
  0 errors, 80 warnings, and no generated `formats.*` image-alt diagnostics.

## 1.0.9 - 2026-05-25

### Documentation

- Added versioned release history for every public tag and npm publish attempt.
- Added release-history links to package READMEs so npm package pages point to
  the same changelog and GitHub release list.
- Replaced the stale release draft with a reusable GitHub release template.

### Notes

- No scanner, adapter, report, or CLI command behavior changed in this release.

## 1.0.8 - 2026-05-25

### Publishing

- Published all 10 public packages through npm Trusted Publishing using GitHub
  Actions OIDC and npm provenance.
- Removed the redundant post-publish `npm access set status=public` call. The
  publish workflow already passes `--access public` and `--provenance`.
- Updated the moving GitHub Action tag `v1` to the stable `1.0.8` commit.

### Verification

- GitHub publish workflow completed successfully.
- npm showed `1.0.8` as latest for all public `@cms-lab/*` packages.
- `npx -y @cms-lab/cli@latest --version` returned `1.0.8`.

## 1.0.7 - 2026-05-25

### Release Note

- Partial release attempt. `@cms-lab/core@1.0.7` was published, then the
  workflow failed on a redundant npm package-access call.
- The CLI and remaining packages were not published at `1.0.7`.
- Superseded by `1.0.8`; use `1.0.8` or newer.

## 1.0.6 - 2026-05-25

### Publishing

- Published the public npm release as scoped packages under `@cms-lab/*`.
- Confirmed `npx @cms-lab/cli scan` as the supported one-off command.
- Removed the blocked unscoped wrapper package after npm rejected `cms-lab` as
  too similar to an existing package name.
- Kept the installed binary name as `cms-lab` when `@cms-lab/cli` is installed.

### Documentation

- Updated README, docs, launch notes, agent-context output, and social preview
  assets to use the supported scoped CLI command.

### Verification

- GitHub publish workflow passed.
- npm registry showed all 10 public packages at `1.0.6`.
- `npx @cms-lab/cli@latest --version` returned `1.0.6`.
- Published CLI passed the public Prismic fixture scan.

## 1.0.5 - 2026-05-25

### Added

- Added Contentful and Sanity packages to the public package set.
- Added launch growth assets and short wrapper experiments.

### Notes

- Superseded by `1.0.6`, which removed the blocked unscoped wrapper path and
  standardized public install copy on `npx @cms-lab/cli`.

## 1.0.4 - 2026-05-24

### Publishing

- Kept npmjs.com as the only package distribution path.
- Confirmed the GitHub Packages alias stayed removed to avoid confusing install
  commands.
- Published the public scoped package set at `1.0.4`.

## 1.0.3 - 2026-05-24

### Publishing

- Public npm release for the scoped CLI package.
- Published `@cms-lab/cli`, `@cms-lab/core`, `@cms-lab/next`,
  `@cms-lab/prismic`, `@cms-lab/strapi`, `@cms-lab/directus`,
  `@cms-lab/wordpress`, and `@cms-lab/reporter`.
- Confirmed `@cms-lab/cli` exposes the installed `cms-lab` binary.

### Install

```sh
npx @cms-lab/cli scan
```

## 1.0.2 - 2026-05-24

### Release Note

- Release-pipeline fix attempt for npm public access handling.
- `@cms-lab/core@1.0.2` was published, but this was not a complete CLI release.
- Superseded by `1.0.3`.

## 1.0.1 - 2026-05-24

### Publishing

- Moved the public CLI package to the scoped package name `@cms-lab/cli`.
- Published the main scanner packages under the `@cms-lab/*` scope.

### Notes

- Superseded by `1.0.3`, which completed the first usable public scoped CLI
  release.

## 1.0.0 - 2026-05-24

### Release Infrastructure

- Added the tag-gated npm publish workflow.
- Published initial core and adapter packages while the public CLI package name
  was still being resolved.

### Notes

- This was not a complete public CLI release. Use the latest published version.
