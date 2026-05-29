# Release Checklist

Publishing is tag-driven. The npm publish workflow runs only when a maintainer pushes a tag shaped like `v1.0.3`; the workflow then verifies that every publishable package has the same version as the tag before it can publish.

## Local checks

Run this checklist before tagging.

```sh
pnpm install --frozen-lockfile
pnpm verify
pnpm audit
pnpm smoke:pack
```

Then run live Prismic checks:

```sh
pnpm smoke:pack:live
pnpm live:doctor
pnpm live:scan
pnpm -r --filter './packages/*' pack --pack-destination /tmp/cms-lab-pack
```

The pack smoke installs the tarballs into a clean temporary app before running the CLI. The live fixture runs route and required-field checks against a real public Prismic repository and should exit `0` unless the public starter repo or deployment changes.

## Published packages

The public npm packages are:

- `@cms-lab/cli`
- `@cms-lab/core`
- `@cms-lab/next`
- `@cms-lab/prismic`
- `@cms-lab/strapi`
- `@cms-lab/directus`
- `@cms-lab/wordpress`
- `@cms-lab/contentful`
- `@cms-lab/sanity`
- `@cms-lab/payload`
- `@cms-lab/reporter`

These packages are published from GitHub Actions using npm Trusted Publishing.
Do not add npm publish tokens to the repository.

To release, update package versions, merge to `main`, then push the release tag:

```sh
git checkout main
git pull --ff-only origin main
git tag -a v1.0.3 -m "v1.0.3"
git push origin v1.0.3
```

The workflow publishes from the tag only. Do not publish from a branch.

## Trusted Publishing

Each package must keep this npm Trusted Publishing configuration:

- Provider: GitHub Actions
- Organization/user: `i-afaqrashid`
- Repository: `cms-lab`
- Workflow filename: `publish.yml`
- Environment name: `npm`
- Allowed action: `npm publish`

For maximum security, keep npm two-factor authentication enabled for account
changes and package publishing.

Use npm CLI `11.10.0` or newer when managing Trusted Publisher settings from
the terminal. The GitHub workflow uses Node `24`, an `npm` environment, and
npm's OIDC flow with `id-token: write` enabled.

## Release workflow

`.github/workflows/publish.yml` performs this sequence:

1. Install with pnpm `10.33.4`.
2. Verify the tag is stable semver and matches package versions.
3. Run `pnpm verify`.
4. Run `pnpm audit --audit-level moderate`.
5. Run the packaged CLI smoke test.
6. Pack all publishable packages into `.release-packages/`.
7. Publish tarballs in dependency order: adapter/core packages first, `@cms-lab/cli` next.
8. Generate a CycloneDX SBOM (`sbom.json`), upload it as a workflow artifact, and
   attach it to the GitHub release for the tag. This step is best-effort and
   never blocks an already-published release; npm provenance (`--provenance`,
   `id-token: write`) remains the primary supply-chain signal.

The workflow does not use dependency or Next.js caches during release publishes.
It refuses to publish if any `name@version` already exists on npm.
Use `npx @cms-lab/cli ...` for one-off runs; npm rejected the unscoped
`cms-lab` package name as too similar to an existing package.

## Release notes

Keep release notes in sync across:

- `CHANGELOG.md` in the repository
- the GitHub Release body for the tag
- package README links published to npm

For ordinary releases, copy the matching `CHANGELOG.md` entry into the GitHub
Release and add verification details after npm publishes. If a tag is partial
or superseded, document that plainly instead of hiding the tag.
