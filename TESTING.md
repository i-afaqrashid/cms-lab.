# Testing cms-lab Locally

This is the tester path for validating cms-lab locally.

Set this once before running commands that call the built CLI from another
project:

```sh
export CMS_LAB_ROOT=/path/to/cms-lab
```

## From This Repo

```sh
cd "$CMS_LAB_ROOT"
pnpm install
pnpm build
pnpm site:build
pnpm bench
pnpm smoke:pack
pnpm live:doctor
pnpm live:scan
pnpm smoke:pack:live
```

The live commands run against a real public Prismic repository and deployed Next.js starter site.
The pack smoke commands prove the publishable tarballs install into a clean project and that the installed `cms-lab` binary runs outside this monorepo.

## Benchmarks

Use the benchmark suite to watch local performance trends while changing scan, adapter, or report code:

```sh
cd "$CMS_LAB_ROOT"
pnpm bench
```

Current benchmark coverage:

- `scanDocuments` with 500 routed documents and route, SEO, image, and required-field checks.
- Strapi, Directus, and WordPress adapters fetching and normalizing 1,000 REST records.
- HTML report rendering with 500 documents and 250 diagnostics.

Benchmark results vary by machine and current system load, so treat them as local comparison signals rather than hard pass/fail thresholds.

## Marketing And Docs Site

The public site lives in [apps/site](./apps/site). It uses the design folder as reference, but the implementation copy is truth-checked against the current CLI.

```sh
pnpm site:dev
pnpm site:build
```

The dev server uses port `2677`.

## Against A Real Next.js Project

Build the CLI first:

```sh
cd "$CMS_LAB_ROOT"
pnpm build
```

Then run it from the Next.js project you want to scan:

```sh
cd /path/to/your-next-project
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts
```

For JSON output:

```sh
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts --json
```

To narrow a noisy first run:

```sh
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js doctor --config cms-lab.config.ts
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts --type page --only routes
```

For CI-style stable text output:

```sh
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts --ci
```

For debug output without corrupting JSON stdout:

```sh
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts --json --debug --verbose 2
```

To write a local HTML report:

```sh
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts --report
```

To explain a diagnostic code:

```sh
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js explain CMS-ROUTE-404
```

Useful flags:

- `--type <type>`: scan one CMS content type. Repeatable and comma-separated values work.
- `--only <group>`: run only selected check groups. Supported groups: `routes`, `seo`, `a11y`, `images`, `fields`.
- `--skip <group>`: skip selected check groups.
- `--timeout <ms>`: set per-route HTTP timeout.
- `--concurrency <count>`: cap concurrent route probes. Default: `8`.
- `--retries <count>`: retry transient route probe failures. Default: `1`.
- `--fail-on <level>`: `error`, `warning`, or `never`.
- `--report [path]`: write an HTML report. Default: `.cms-lab/report.html`.
- `--debug`: write debug logs to stderr.
- `--verbose <level>`: set debug verbosity from `0` to `3`.

## Live Public Prismic Fixture

The repo also includes [test-fixtures/live-prismic-next](./test-fixtures/live-prismic-next), which scans a real public Prismic repository and deployed Next.js starter site.

```sh
cd "$CMS_LAB_ROOT"
pnpm build
pnpm live:doctor
pnpm live:scan
pnpm smoke:pack:live
```

This fixture depends on public Prismic and Vercel services, so it is not part of
`pnpm verify`.
It intentionally runs only route and required-field checks so the smoke test validates cms-lab against real Prismic without depending on the demo repository's editorial alt text or SEO completeness.

## Local Real CMS Fixtures

The current local real-CMS verification used:

- Directus `11.5.1` on `http://127.0.0.1:2680`
- WordPress `6.7` on `http://127.0.0.1:2681`
- Strapi `5.46.1` on `http://127.0.0.1:2682`
- Local target site on `http://127.0.0.1:2689`
- Report server on `http://127.0.0.1:2688`

Generated configs and reports live under `.cms-lab/runtime/local-cms/`.

```sh
cd "$CMS_LAB_ROOT"/test-fixtures/live-prismic-next
node ../../packages/cli/dist/bin.js doctor --config ../../.cms-lab/runtime/local-cms/configs/directus.config.ts --url http://127.0.0.1:2689
node ../../packages/cli/dist/bin.js scan --config ../../.cms-lab/runtime/local-cms/configs/directus.config.ts --ci --report ../../.cms-lab/runtime/local-cms/reports/directus-report.html --url http://127.0.0.1:2689
node ../../packages/cli/dist/bin.js scan --config ../../.cms-lab/runtime/local-cms/configs/strapi.config.ts --ci --report ../../.cms-lab/runtime/local-cms/reports/strapi-report.html --url http://127.0.0.1:2689
node ../../packages/cli/dist/bin.js scan --config ../../.cms-lab/runtime/local-cms/configs/wordpress.config.ts --ci --report ../../.cms-lab/runtime/local-cms/reports/wordpress-report.html --url http://127.0.0.1:2689
```

## Example Config

Copy [examples/next-prismic/cms-lab.config.ts](./examples/next-prismic/cms-lab.config.ts) into your Next.js project and edit:

- `site.url`
- `cms.repositoryName`
- `routes`
- CMS credentials, if your repo needs them
- `checks.fields.required`, if you want project-specific required CMS fields

  cms-lab expects a Next.js App Router project and CMS documents with route mappings declared in config.
