# Contributing To cms-lab

Thanks for taking the time to improve cms-lab. This project is a CLI-first tool for catching CMS-driven Next.js failures before deploy. Contributions should keep that promise sharp: predictable CLI behavior, honest docs, reliable adapters, and useful reports.

## Project Scope

cms-lab currently focuses on:

- Next.js App Router projects.
- Config-first CMS route mapping.
- Prismic, Strapi, Directus, WordPress, Contentful, and Sanity adapters.
- Terminal output, JSON output, local HTML reports, debug logs, tests, and benchmarks.

Avoid adding hosted-service assumptions, fake product claims, hidden network dependencies, or UI/report features that the CLI cannot actually produce.

## Prerequisites

- Node.js `>=20.10`
- pnpm `10.33.4`
- Docker Desktop, only if you are testing local real CMS fixtures.

Install dependencies:

```sh
pnpm install
```

Build packages:

```sh
pnpm build
```

## Repository Map

```txt
packages/core       config, types, diagnostics, scan orchestration
packages/cli        cms-lab binary, flags, output, exit codes
packages/next       Next.js project detection
packages/prismic    Prismic adapter
packages/strapi     Strapi adapter
packages/directus   Directus adapter
packages/wordpress  WordPress REST adapter
packages/contentful Contentful adapter
packages/sanity     Sanity adapter
packages/reporter   local HTML report renderer
apps/site           marketing and docs site
benchmarks          Vitest benchmark suite
test-fixtures       live/public fixtures
design              visual and copy reference only
```

## Development Workflow

1. Create a focused branch.
2. Make the smallest coherent change.
3. Add or update tests for behavior changes.
4. Run the relevant verification commands.
5. Open a PR with the problem, solution, and verification evidence.

For code changes, prefer test-first work. At minimum, a behavior change should include a failing test that would have caught the old behavior.

## Test Expectations

Use the smallest useful check while iterating:

```sh
pnpm vitest run packages/cli/src/cli.test.ts
pnpm vitest run packages/core/src/scan.test.ts
pnpm vitest run packages/strapi/src/strapi.test.ts
```

Before opening a PR, run the same checks CI runs:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm site:build
pnpm smoke:pack
pnpm audit --audit-level moderate
```

GitHub Actions runs format, lint, typecheck, and tests on Node.js 20, 22, and 24. Package build, site build, smoke packaging, and dependency audit run as
separate PR checks so failures stay easy to read.

For public fixture changes, also run:

```sh
pnpm live:doctor
pnpm live:scan
```

For performance-sensitive changes, also run:

```sh
pnpm bench
```

Benchmark results vary by machine, so include relative observations rather than hard claims.

## Local Real CMS Testing

Real CMS testing is optional for most PRs, but expected for adapter changes. Current local verification uses:

- Directus on `http://127.0.0.1:2680`
- WordPress on `http://127.0.0.1:2681`
- Strapi on `http://127.0.0.1:2682`
- Local target site on `http://127.0.0.1:2689`

Runtime files live under `.cms-lab/runtime/local-cms/` and are intentionally ignored by git. See [TESTING.md](./TESTING.md) for exact commands and report paths.

## CLI Contracts

Keep these stable unless the PR explicitly changes the public contract:

- `scan` exits `0` when the scan completes under the fail threshold.
- `scan` exits `1` when diagnostics meet the fail threshold.
- Config/load errors exit `2`.
- CMS connectivity/auth errors exit `3`.
- Site connectivity errors exit `4`.
- JSON output goes to stdout.
- Debug logs and errors go to stderr.
- Secrets and access tokens must not be logged.

## Coding Style

- Follow the existing TypeScript style.
- Keep packages small and focused.
- Prefer explicit config validation over permissive parsing.
- Do not add dependencies unless they remove real complexity.
- Keep comments sparse and useful.
- Run Prettier instead of hand-formatting.

## Adapter Guidelines

Adapters should:

- Normalize provider records into `CMSDocument`.
- Preserve enough original data for checks.
- Support pagination where the provider API exposes it.
- Send auth headers only when configured.
- Throw `CmsFetchError` for CMS/network failures.
- Avoid logging tokens or credential-bearing URLs.

## Report Guidelines

HTML report changes should:

- Keep output static and local.
- Preserve usable filters.
- Escape user/CMS content.
- Work with zero diagnostics and large diagnostic sets.
- Avoid fake future features such as hosted dashboards or unavailable buttons.

## Docs And Copy

Docs should be accurate to what the CLI ships today. Do not add fake stars, fake adapter maturity, unreleased flags, or claims like "no external services" when the CLI is talking to a user's CMS. Use "no cms-lab hosted service" when describing the architecture.

## Pull Requests

PRs should include:

- What changed.
- Why it changed.
- How it was verified.
- Any known limitations or follow-up work.

Small PRs are easier to review. Split unrelated changes.

## License

cms-lab is MIT licensed. By contributing to this repository, you agree that your contributions can be distributed under the MIT license. See [OPEN_SOURCE.md](./OPEN_SOURCE.md) for the broader open-source policy.

## Releases

Release work is maintainer-owned. Before publishing, run:

```sh
pnpm release:check
```

Do not change package versions, lock release notes, or publish packages unless release ownership has been agreed in the PR.
