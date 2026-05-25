# cms-lab Launch README

This is the practical launch checklist for cms-lab. Keep it boring: release from a clean main branch, let GitHub Actions publish from a tag, verify npm, then announce the package with real usage instructions.

## What Is Live

- GitHub repository: `i-afaqrashid/cms-lab`
- npm packages: `@cms-lab/cli`, `@cms-lab/core`, `@cms-lab/next`, `@cms-lab/prismic`, `@cms-lab/strapi`, `@cms-lab/directus`, `@cms-lab/wordpress`, `@cms-lab/contentful`, `@cms-lab/sanity`, `@cms-lab/reporter`
- Docs site target: `https://cmslab.afaqrashid.com`
- License: MIT
- Maintainer identity: Afaq Rashid

## Release Checklist

Start from a clean, updated main branch:

```sh
git checkout main
git pull --ff-only origin main
git status --short
```

Install and verify:

```sh
pnpm install --frozen-lockfile
pnpm release:check
```

Bump package versions in the workspace. Keep the root package, all package manifests, the CLI version string, and CLI version tests aligned.

Open a PR for the version bump and wait for:

- PR Checks
- CodeQL
- Any required branch protection checks

After the PR is merged, create and push an annotated tag:

```sh
git checkout main
git pull --ff-only origin main
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The `Publish to npm` workflow publishes only from tags that look like `vX.Y.Z`.
It uses npm Trusted Publishing through the `npm` GitHub environment, so do not
push release tags until npm has trusted `i-afaqrashid/cms-lab` and
`.github/workflows/publish.yml` for every `@cms-lab/*` package.

## Post-Release Verification

Check the GitHub Actions publish run first. Then verify npm:

```sh
npm view @cms-lab/cli version
npm dist-tag ls @cms-lab/cli
npm view @cms-lab/core version
npm view @cms-lab/prismic version
npm view @cms-lab/strapi version
npm view @cms-lab/directus version
npm view @cms-lab/wordpress version
npm view @cms-lab/contentful version
npm view @cms-lab/sanity version
npm view @cms-lab/reporter version
```

Check the published CLI through npm:

```sh
npx @cms-lab/cli --version
npx @cms-lab/cli --help
```

Run the public fixture after npm has propagated:

```sh
pnpm live:doctor
pnpm live:scan
```

If npm propagation is slow, retry with a fresh npm cache before assuming the publish failed.

## Launch Smoke App

Keep one outside-repo app for launch checks. It should install the public package from npm, run a local CMS API, run a Next.js app, and verify the CLI exactly like a user would.

Minimum outside-app checks:

```sh
npm audit --audit-level moderate
npm run build
cms-lab --version
cms-lab doctor --debug --verbose 2
cms-lab scan --ci --report --markdown --junit --json
cms-lab scan --ci --fail-on never
cms-lab scan --ci --only routes
```

Expected behavior:

- `doctor` exits `0`
- the normal scan exits `1` when the fixture has deliberate CMS failures
- `--fail-on never` exits `0` while still writing diagnostics
- HTML, Markdown, JUnit, and JSON artifacts are created

## Launch Step 4

After GitHub, npm, CI, docs, and the outside-app smoke test are green, announce it quietly and ask for real usage:

1. Publish a GitHub Release with the exact package version and short changelog.
2. Update the repo description, topics, and website URL.
3. Deploy the docs site to `cmslab.afaqrashid.com`.
4. Publish the GitHub Action to GitHub Marketplace.
5. Share the package with a small group of Next.js and headless CMS developers before making broader posts.
6. Ask testers for one concrete result: the CMS provider, framework version, config shape, and first diagnostic they saw.

Do not overclaim. Say what works today: local CLI scans for Next.js App Router and Pages Router projects using Prismic, Strapi, Directus, or WordPress, with terminal, JSON, Markdown, JUnit, Slack, and HTML report output.

## GitHub Marketplace Follow-Up

Publishing the GitHub Action is highly recommended because it makes the CI path
discoverable from GitHub's Actions UI, not only from README snippets.

Current action entrypoint:

```yaml
- uses: i-afaqrashid/cms-lab@v1
  with:
    config: cms-lab.config.ts
    report: true
```

Before publishing:

- Use the latest stable version tag, not a partial or superseded tag.
- Keep `v1` pointing at the same commit as the latest stable release.
- Confirm `action.yml` still has accurate `name`, `description`, `author`,
  inputs, outputs, and branding.
- Use categories such as `Continuous integration` and `Code quality`.
- Do not create a discussion by default; keep release discussion in GitHub
  Discussions unless there is a clear reason to split comments per release.

If GitHub blocks Marketplace publishing from the monorepo because it contains
workflow files, create a small dedicated `i-afaqrashid/cms-lab-action`
repository that contains only the action metadata, wrapper script, license, and
README, then publish that repository to Marketplace.

## Public Copy

Short description:

> Catch CMS bugs before deploy.

Longer description:

> cms-lab scans headless CMS content against the routes and fields your Next.js app expects, then writes local reports for terminal use and CI.

Install copy:

```sh
pnpm add -D @cms-lab/cli @cms-lab/core
pnpm cms-lab init
pnpm cms-lab doctor
pnpm cms-lab scan --ci --report
```

## Rollback

If a publish is bad:

1. Do not delete tags unless the release leaked private material.
2. Publish a fixed patch version.
3. Deprecate the bad npm version with a direct message.

```sh
npm deprecate cms-lab@X.Y.Z "Use X.Y.Z+1 instead."
npm deprecate @cms-lab/cli@X.Y.Z "Use X.Y.Z+1 instead."
```

Repeat for any affected package.

## Private Material Check

Before every release:

```sh
rg -n "TOKEN|SECRET|PASSWORD|PRISMIC_ACCESS_TOKEN|STRAPI_TOKEN|DIRECTUS_TOKEN|WEBHOOK" .
```

Expected results are example environment variable names only. No private planning files, personal paths, access tokens, or old identity strings should be committed.
