# cms-lab

Catch CMS bugs before deploy.

`cms-lab` is a CLI for checking headless CMS content against the routes and fields your Next.js app expects. It runs locally, reads your config, fetches CMS entries, probes your site, and writes terminal, JSON, Markdown, JUnit, Slack, and HTML report output.

There is no hosted cms-lab service. The CLI runs inside your project and talks directly to the CMS endpoints you configure.

## Install

```sh
pnpm add -D @cms-lab/cli @cms-lab/core
```

You can also run it without adding it to the project:

```sh
npx @cms-lab/cli scan
```

## Try It In StackBlitz

Open a public example before wiring cms-lab into your own CMS:

- [Run the broken Prismic demo in StackBlitz](https://stackblitz.com/fork/github/i-afaqrashid/cms-lab/tree/main/examples/broken-prismic-demo?title=cms-lab%20Broken%20Prismic%20demo)
- [Run the Next Prismic config reference in StackBlitz](https://stackblitz.com/fork/github/i-afaqrashid/cms-lab/tree/main/examples/next-prismic?title=cms-lab%20Next%20Prismic%20config)

The default browser starter is also available at
https://cmslab.afaqrashid.com/new.

## Quick Start

Create `cms-lab.config.ts` in a Next.js project:

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

For localized apps where `/` is not the page you want to probe first, keep
routes relative to `site.url` and set a health route separately:

```ts
site: {
  url: "http://localhost:3000",
  healthPath: "/en",
}
```

Run your Next.js app, then scan it:

```sh
pnpm next dev
pnpm cms-lab scan
```

For CI:

```sh
pnpm cms-lab scan --ci --report --markdown --junit
```

Or use the GitHub Action:

```yaml
- uses: i-afaqrashid/cms-lab@v1
  with:
    config: cms-lab.config.ts
    report: true
```

## CMS Adapters

Prismic:

```ts
cms: {
  provider: "prismic",
  repositoryName: "my-repo",
  accessToken: process.env.PRISMIC_ACCESS_TOKEN,
}
```

Strapi:

```ts
import { strapiRelationSlug } from "@cms-lab/core";

cms: {
  provider: "strapi",
  url: "http://localhost:1337",
  token: process.env.STRAPI_TOKEN,
  locale: "en",
  collections: [
    {
      type: "page",
      endpoint: "pages",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
  singleTypes: [
    {
      type: "navbar",
      endpoint: "navbar",
    },
  ],
},

routes: [
  { type: "page", pattern: "/:slug", getPath: (doc) => `/${doc.uid}` },
  {
    type: "article",
    pattern: "/blog/:topic/:slug",
    getPath: (doc) => {
      const topic = strapiRelationSlug(doc.data, "topic") ?? "uncategorized";
      return `/blog/${topic}/${doc.uid}`;
    },
  },
]
```

Directus:

```ts
cms: {
  provider: "directus",
  url: "http://localhost:8055",
  token: process.env.DIRECTUS_TOKEN,
  collections: [
    {
      type: "page",
      collection: "pages",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}
```

WordPress:

```ts
cms: {
  provider: "wordpress",
  url: "http://localhost:8080",
  contentTypes: [
    { type: "page", endpoint: "pages" },
    {
      type: "post",
      endpoint: "posts",
      uidField: "acf.handle",
      urlField: "acf.permalink",
    },
  ],
}
```

Contentful:

```ts
cms: {
  provider: "contentful",
  spaceId: "my-space",
  environment: "master",
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
  contentTypes: [
    {
      type: "page",
      contentType: "page",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}
```

Sanity:

```ts
cms: {
  provider: "sanity",
  projectId: "my-project",
  dataset: "production",
  apiVersion: "2025-02-19",
  token: process.env.SANITY_READ_TOKEN,
  contentTypes: [
    {
      type: "page",
      documentType: "page",
      uidField: "slug.current",
      urlField: "seo.canonical",
    },
  ],
}
```

All adapters normalize content into the same scan model, so route checks, field
checks, SEO checks, report output, and CI behavior stay consistent. Use
`uidField` when your CMS does not expose a plain `uid` or `slug` field. Use
`urlField` when the CMS already stores the public permalink. Both fields read
dotted paths from `document.data`.

## Commands

```sh
cms-lab init
cms-lab init --cms strapi --router pages
cms-lab doctor
cms-lab scan
cms-lab agent-context
cms-lab explain CMS-ROUTE-404
```

Useful scan options:

```sh
cms-lab scan --url https://staging.example.com
cms-lab scan --config ./cms-lab.config.ts
cms-lab scan --json
cms-lab scan --ci
cms-lab scan --report
cms-lab scan --markdown
cms-lab scan --junit
cms-lab scan --slack-webhook "$CMS_LAB_SLACK_WEBHOOK"
cms-lab scan --type page
cms-lab scan --only routes
cms-lab scan --skip seo --skip a11y
cms-lab scan --fail-on warning
cms-lab scan --max-warnings 0
cms-lab scan --strict
cms-lab scan --timeout 10000
cms-lab scan --concurrency 4
cms-lab scan --retries 2
cms-lab scan --debug --verbose 2
```

Generate context files for coding agents:

```sh
cms-lab agent-context
cms-lab agent-context --preset all
cms-lab agent-context --preset claude
cms-lab agent-context --preset gemini
cms-lab agent-context --preset copilot
cms-lab agent-context --force
cms-lab agent-context --no-agents-md
cms-lab agent-context --out .cms-lab
```

The default preset writes `AGENTS.md`, `.cms-lab/agent-context.md`, and
`.cms-lab/agent-prompt.md`. Tool-specific presets can also write `CLAUDE.md`,
`GEMINI.md`, `.github/copilot-instructions.md`, and
`.github/prompts/cms-lab-fix.prompt.md`.

The generated files point agents to the cms-lab GitHub repository, npm package,
docs, local command examples, configured route patterns, and safe project facts
without including tokens, raw CMS payloads, private URLs, webhook URLs, or local
absolute paths.

## Tested With

The public test matrix lives at
[`/docs/tested-with`](https://cmslab.afaqrashid.com/docs/tested-with). It lists
only paths covered by a fixture, adapter test, public demo, or repeatable smoke
test, and it marks adapter maturity limits explicitly.

Current coverage includes Prismic with Next.js App Router, Strapi v4 with
Next.js Pages Router, Strapi single types, and adapter fixture checks for
Directus, WordPress, Contentful, and Sanity.

See
[`/docs/bug-examples`](https://cmslab.afaqrashid.com/docs/bug-examples) for the
ordinary CMS failures cms-lab is built to catch.

See [`/docs/comparison`](https://cmslab.afaqrashid.com/docs/comparison) for how
cms-lab fits with link checkers, Playwright, Lighthouse CI, and custom route
crawls.

See [`/docs/troubleshooting`](https://cmslab.afaqrashid.com/docs/troubleshooting)
for common first-run failures and fixes.

See [`/docs/large-catalogs`](https://cmslab.afaqrashid.com/docs/large-catalogs)
for baseline, filtering, and concurrency guidance on larger CMS inventories.

## Checks

cms-lab currently checks:

- CMS documents that cannot produce a configured route
- Expected CMS routes that return `404`
- Expected CMS routes that return `5xx`
- Route probes that fail after the site is reachable
- Missing SEO titles and descriptions
- Missing or placeholder image alt text
- Custom required fields declared in `checks.fields.required`

The scanner keeps the original CMS payload in `document.data`, preserves public permalinks when a CMS exposes them, uses slug-like fields as `uid` where available, and treats non-public entries such as drafts, archived content, and scheduled WordPress posts as `draft`.

## Output And Privacy

By default, `--json` redacts raw CMS document data, document URLs, document UIDs, and absolute project paths. Use `--include-sensitive-output` only for private automation that needs full payloads.

Report outputs:

- `--report` writes `.cms-lab/report.html`
- `--markdown` writes `.cms-lab/summary.md`
- `--junit` writes `.cms-lab/junit.xml`
- `--slack-webhook` sends a compact redacted Slack summary

Slack summaries include counts and diagnostic codes. They do not include CMS tokens, webhook URLs, raw CMS payloads, local project paths, or full JSON output.

## Exit Behavior

`cms-lab scan` exits:

- `0` when the scan completed under the configured failure threshold
- `1` when diagnostics exceed the threshold
- `2` for config, load, or validation errors
- `3` when the CMS is unreachable or authentication fails
- `4` when the site is unreachable
- `130` when interrupted

Use `--fail-on never` when you want artifacts without failing the job. Use `--strict` when warnings and info diagnostics should fail CI.

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

Run the docs site locally:

```sh
pnpm site:dev
```

Run the public Prismic smoke fixture:

```sh
pnpm build
pnpm live:doctor
pnpm live:scan
pnpm smoke:pack:live
```

`pnpm smoke:pack` packs the publishable packages, installs them into a clean temporary app, and runs the installed `cms-lab` binary. `pnpm smoke:pack:live` does the same package smoke and then scans the public Prismic fixture.

## Repository

```txt
packages/core       config, types, diagnostics, checks
packages/cli        cms-lab binary and output
packages/next       Next.js project detection
packages/prismic    Prismic adapter
packages/strapi     Strapi adapter
packages/directus   Directus adapter
packages/wordpress  WordPress adapter
packages/contentful Contentful adapter
packages/sanity     Sanity adapter
packages/reporter   local HTML report renderer
apps/site           marketing site and docs
test-fixtures/      public Prismic fixture
```

## Launch And Maintenance

Read [CHANGELOG.md](./CHANGELOG.md) and
[GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version release history.

Read the [versioning and stability policy](https://cmslab.afaqrashid.com/docs/versioning)
before using cms-lab as a strict deploy gate in a production project.

Read [LAUNCH.md](./LAUNCH.md) for the release checklist, npm publish flow, post-release verification, and launch-day notes.

Read [TESTING.md](./TESTING.md) for local tester workflows. Read [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), [SUPPORT.md](./SUPPORT.md), and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before opening public issues or PRs.

cms-lab is MIT licensed. See [LICENSE](./LICENSE).
