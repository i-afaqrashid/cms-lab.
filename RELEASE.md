# Release Checklist

Publishing is tag-driven. The npm publish workflow runs only when a maintainer pushes a tag shaped like `v1.0.0`; the workflow then verifies that every publishable package has the same version as the tag before it can publish.

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

## First npm publish

The public npm names are currently unclaimed:

- `cms-lab`
- `@cms-lab/core`
- `@cms-lab/next`
- `@cms-lab/prismic`
- `@cms-lab/strapi`
- `@cms-lab/directus`
- `@cms-lab/wordpress`
- `@cms-lab/reporter`

For the first publish, npm requires package ownership before Trusted Publishing can be configured for those packages. Use this one-time setup:

1. Log in to npm as Afaq Rashid.
2. Create or claim the npm organization/scope `cms-lab` so `@cms-lab/*` packages can be published.
3. Create a short-lived npm automation/granular token with publish rights for the first release only.
4. Add that token as the GitHub repository secret `NPM_TOKEN`.
5. Push the release tag:

```sh
git checkout main
git pull --ff-only origin main
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

The workflow publishes from the tag only. Do not publish from a branch.

## Trusted Publishing

After the first publish succeeds, configure npm Trusted Publishing for each package:

- Provider: GitHub Actions
- Organization/user: `i-afaqrashid`
- Repository: `cms-lab`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

Then remove the GitHub `NPM_TOKEN` secret and revoke the temporary npm token. For maximum security, set each npm package to require two-factor authentication and disallow tokens after Trusted Publishing is working.

npm Trusted Publishing requires npm CLI `11.5.1` or newer and Node `22.14.0` or newer. The GitHub workflow uses Node `24` and npm's OIDC flow, with `id-token: write` enabled. npm automatically generates provenance for Trusted Publishing from a public repository; the workflow also passes `--provenance` for token-based first publishes from GitHub Actions.

## Release workflow

`.github/workflows/publish.yml` performs this sequence:

1. Install with pnpm `10.33.4`.
2. Verify the tag is stable semver and matches package versions.
3. Run `pnpm verify`.
4. Run `pnpm audit --audit-level moderate`.
5. Run the packaged CLI smoke test.
6. Pack all publishable packages into `.release-packages/`.
7. Publish tarballs in dependency order: core packages first, `cms-lab` last.

The workflow refuses to publish if any `name@version` already exists on npm.
