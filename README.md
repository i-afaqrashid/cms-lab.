# cms-lab

Catch CMS bugs before deploy.

`cms-lab` is a focused CLI for scanning headless CMS content against Next.js routes. It supports Next.js App Router, config-first route mapping, Prismic/Strapi/Directus/WordPress adapters, terminal output, JSON output, local HTML reports, and release readiness checks.

No hosted cms-lab service is involved. The CLI runs inside your project and talks to your CMS with the credentials you provide.

## Status

The project targets Next.js App Router sites that pull content from Prismic, Strapi, Directus, or WordPress. The `design/` folder remains a non-shipping visual reference, while `apps/site` is the production marketing/docs implementation.

## Install

```sh
pnpm add -D @cms-lab/cli @cms-lab/core @cms-lab/next @cms-lab/prismic @cms-lab/strapi @cms-lab/directus @cms-lab/wordpress
```

Or run without installing after publishing:

```sh
npx @cms-lab/cli scan
```

## Configure

Create `cms-lab.config.ts` in your Next.js project:

```ts
import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName: "my-repo",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => `/${doc.uid}` },
    {
      type: "blog_post",
      pattern: "/blog/:uid",
      getPath: (doc) => `/blog/${doc.uid}`,
    },
  ],
  checks: {
    fields: {
      required: [
        { type: "page", path: "headline" },
        { type: "blog_post", path: "author.name", severity: "warning" },
      ],
    },
  },
});
```

Other CMS adapters use the same route/check model:

```ts
cms: {
  provider: "strapi",
  url: "http://localhost:1337",
  token: process.env.STRAPI_TOKEN,
  collections: [{ type: "page", endpoint: "pages" }],
}

cms: {
  provider: "directus",
  url: "http://localhost:8055",
  token: process.env.DIRECTUS_TOKEN,
  collections: [{ type: "page", collection: "pages" }],
}

cms: {
  provider: "wordpress",
  url: "http://localhost:8080",
  contentTypes: [
    { type: "page", endpoint: "pages" },
    { type: "post", endpoint: "posts" },
  ],
}
```

## Use

```sh
cms-lab scan
cms-lab scan --url https://staging.example.com
cms-lab scan --json
cms-lab scan --json --include-sensitive-output
cms-lab scan --ci
cms-lab scan --report
cms-lab scan --markdown
cms-lab scan --junit
cms-lab scan --slack-webhook "$CMS_LAB_SLACK_WEBHOOK"
cms-lab scan --fail-on warning
cms-lab scan --max-warnings 0
cms-lab scan --max-info 0
cms-lab scan --strict
cms-lab scan --type page
cms-lab scan --only routes
cms-lab scan --skip seo --skip a11y
cms-lab scan --timeout 10000
cms-lab scan --concurrency 4
cms-lab scan --retries 2
cms-lab scan --no-color
cms-lab scan --debug
cms-lab scan --verbose 2
cms-lab doctor
cms-lab doctor --debug --verbose 3
cms-lab explain CMS-ROUTE-404
cms-lab init
```

Checks:

- CMS documents with missing UID values for `:uid` route patterns
- Expected CMS routes that return `404`
- Expected CMS routes that return `5xx`
- Route probes that fail after the site is reachable
- Missing SEO title or description fields, including common Prismic,
  Strapi, Directus, and WordPress SEO field shapes
- Missing or placeholder image alt text, including Prismic `alt`, Strapi
  `alternativeText`, Directus image file `description`, and WordPress
  `alt_text`
- Custom required fields declared in `checks.fields.required`

Adapter normalization keeps the original CMS payload in `document.data`, sets a
stable `id`, uses slug-like fields as `uid` where available, preserves public
permalinks as `url` when the provider exposes one, and treats non-public
statuses such as drafts, archived content, and scheduled WordPress posts as
`draft`.

`--json` redacts raw CMS document `data`, document URLs, document UIDs, and
absolute project paths by default so CI logs do not leak CMS content or local
machine details. Use `--include-sensitive-output` only when a private script
explicitly needs full document payloads and raw paths.

`--report` writes `.cms-lab/report.html` by default. Use `--report path/to/report.html` to choose a different file.

`--markdown` writes `.cms-lab/summary.md` by default for GitHub step summaries,
PR comments, and release notes. `--junit` writes `.cms-lab/junit.xml` by
default for CI systems that understand test reports.

`--slack-webhook <url>` posts a compact, redacted summary to a Slack incoming
webhook. It sends counts and diagnostic codes only; it does not send raw CMS
document data, local project paths, webhook URLs, CMS tokens, or full JSON
output. Use `--notify-on always`, `--notify-on failure`, or
`--notify-on diagnostics` to control when the message is sent. The default is
`failure`.

`--fail-on` controls the exit threshold:

- `error` default: exit `1` when errors exist
- `warning`: exit `1` when errors or warnings exist
- `never`: always exit `0` after a completed scan

For stricter CI gates, use numeric diagnostic budgets:

- `--max-warnings <count>`: exit `1` when warnings exceed the count
- `--max-info <count>`: exit `1` when info diagnostics exceed the count
- `--strict`: fail on warnings and info diagnostics, equivalent to `--fail-on warning --max-info 0`

Pretty terminal output uses color only when stdout is an interactive terminal.
Use `--no-color`, set `NO_COLOR`, set `TERM=dumb`, or use `--ci` for plain
output. When diagnostics are present outside CI mode, the terminal output
suggests the first `cms-lab explain <code>` command to run next.

Debug output is written to stderr, so `--json` remains safe to parse from stdout.
`--debug` enables level `1`. `--verbose <level>` accepts:

- `0`: off
- `1`: command phases, config path, CMS provider, document count, summary
- `2`: level 1 plus option details and phase timings
- `3`: level 2 plus document type counts

## Workspace

```txt
packages/core      config, types, diagnostics, checks
packages/cli       cms-lab binary and output
packages/next      Next.js project detection
packages/prismic   Prismic document adapter
packages/strapi    Strapi document adapter
packages/directus  Directus document adapter
packages/wordpress WordPress REST document adapter
packages/reporter  local HTML report renderer
apps/site          marketing site and docs
test-fixtures/     live public Prismic fixture
design/            visual/copy reference source
```

## Development

```sh
pnpm install
pnpm test
pnpm bench
pnpm typecheck
pnpm build
pnpm site:build
pnpm lint
pnpm verify
pnpm smoke:pack
```

Run the marketing/docs site locally on port 2677:

```sh
pnpm site:dev
```

To run against a real public Prismic repository and deployed Next.js starter:

```sh
pnpm build
pnpm live:doctor
pnpm live:scan
pnpm smoke:pack:live
```

`pnpm smoke:pack` packs the publishable packages, installs the tarballs into a clean temporary app, and runs the installed `cms-lab` binary. `pnpm smoke:pack:live` does the same package smoke and then runs the installed binary against the real public Prismic fixture.

`pnpm bench` runs the Vitest benchmark suite for scan orchestration, CMS adapter normalization, and HTML report rendering. Benchmark output is intentionally local-only and not used as a release gate.

To run Prismic's official local Slice Machine UI:

```sh
pnpm prismic:local
```

## Local Testing

See [TESTING.md](./TESTING.md) for the local tester workflow, including how to run the built CLI against a real Next.js project.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR. Security reports go through [SECURITY.md](./SECURITY.md), and project conduct is covered in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Open Source

cms-lab is MIT licensed. See [LICENSE](./LICENSE) for the full license text, [OPEN_SOURCE.md](./OPEN_SOURCE.md) for open-source project expectations, [SUPPORT.md](./SUPPORT.md) for support paths, and [GOVERNANCE.md](./GOVERNANCE.md) for maintainer/release ownership.
