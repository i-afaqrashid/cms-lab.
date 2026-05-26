# Changelog

All notable cms-lab changes are recorded here. GitHub Releases should use the
same summaries, and npm package READMEs link back to this file so the public
history stays consistent across GitHub and npm.

## 1.2.4 - 2026-05-26

### Added

- Added `cms-lab init --cms directus` for Directus projects. The starter config
  includes branch, menu item, category, and relation-heavy pricing collection
  examples.
- Added `routable: false` support to Directus collection config so junction or
  relation-heavy collections can be checked for fields without producing
  route-unmapped diagnostics.

### Documentation

- Documented Directus init usage, non-routable collection examples, and updated
  the Directus restaurant/catalog docs.

### Verification

- Added CLI, config-schema, and Directus adapter coverage for the new starter
  and non-routable Directus collections.
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm format:check`,
  `pnpm lint`, `pnpm build`, and `pnpm site:build`.

## 1.2.3 - 2026-05-26

### Added

- Added `cms-lab scan --report --share-report` for share-safe HTML reports.
  Share-safe reports redact CMS source IDs and local project paths while keeping
  diagnostic codes, severity, route paths, and field paths visible.
- Added reporter API support for `renderHtmlReport(result, { privacy: "share" })`.

### Documentation

- Documented share-safe report behavior in the README, CLI package README,
  reporter package README, scan docs, CI docs, and troubleshooting docs.

### Verification

- Added reporter and CLI coverage for share-safe report redaction.
- Verified with `pnpm test`, `pnpm typecheck`, `pnpm format:check`,
  `pnpm lint`, `pnpm build`, and `pnpm site:build`.

## 1.2.2 - 2026-05-26

### Added

- Added CMS-only `agent-context` support so backend/CMS repositories with a
  valid cms-lab config can generate `AGENTS.md`, `.cms-lab/agent-context.md`,
  `.cms-lab/agent-prompt.md`, and tool-specific files before a Next.js
  frontend exists.
- Added `cms-lab agent-context --mode auto|next|cms-only`. The default
  `auto` mode falls back to CMS-only context when no Next.js app is detected;
  `--mode next` preserves strict frontend detection.

### Fixed

- Kept runnable example package manifests installable on prerelease branches by
  using published npm `latest` packages instead of unpublished future workspace
  versions.

### Verification

- Added CLI tests for CMS-only agent-context generation, strict Next.js mode,
  and generated all-preset agent files.
- Verified with `pnpm verify` and `pnpm audit --audit-level moderate`.

## 1.2.1 - 2026-05-26

### Fixed

- Updated the GitHub Action Marketplace name to `cms-lab CMS Scan` so the
  action can be published without conflicting with the repository or
  organization name.

### Verification

- Bumped all workspace packages and CLI version output to `1.2.1` for the
  Marketplace metadata patch release.

## 1.2.0 - 2026-05-26

### Added

- Added `site.healthPath` and `site.healthUrl` so localized apps or dedicated
  health endpoints can be used for `doctor` and the initial scan health probe
  without changing normal route checks.
- Added Strapi locale config at the provider, collection, and single-type level.
- Added Strapi relation route helpers for common nested relation slug patterns.
- Added Strapi Pages Router output to `cms-lab init`.
- Added docs for the public tested-with matrix, copy-paste CI setup, real CMS
  bug examples, and Strapi Pages Router setup.

### Changed

- HTML reports now show collection and single-type document counts when adapter
  metadata is available.

### Verification

- Added unit coverage for localized health probes, Strapi locale requests,
  relation route helpers, Strapi init output, doctor URL redaction, and report
  document-kind summaries.

## 1.1.0 - 2026-05-26

### Added

- Added `cms.singleTypes` support to the Strapi adapter so singleton entries
  can be fetched, normalized, and checked with the same SEO, field, and image
  diagnostics as collection entries.

### Changed

- Strapi single-type documents are treated as non-routable by default. They do
  not create `CMS-ROUTE-UNMAPPED` info diagnostics unless a project explicitly
  maps them through normal route config.
- CLI context output now lists Strapi collections and single types separately.
- Updated README, Strapi package docs, and configuration docs with the new
  Strapi config shape.

### Verification

- Added tests for single-type config validation, Strapi singleton
  normalization, and route-unmapped suppression for non-routable CMS documents.
- Verified with a Strapi smoke project: 39 CMS documents fetched, including 7
  single types, with singleton route noise suppressed.

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
