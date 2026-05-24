# cms-lab Full Project Roadmap

## Summary

Build `cms-lab` as a public npm CLI for catching headless CMS + Next.js failures before deploy. The roadmap optimizes for `npx cms-lab scan` first, then expands into reports, adapters, CI, and a stable plugin API. Chosen defaults: public npm CLI, config-first route mapping, pnpm workspaces only, and externally generated HTML/CSS/assets for all public visual surfaces.

## Architecture And Code Paths

Target structure:

```txt
cms-lab/
  packages/
    core/
    cli/
    next/
    prismic/
    strapi/
    shopify/
    reporter/
  apps/
    site/
  examples/
    next-prismic/
    next-strapi/
    next-shopify/
  test-fixtures/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

Primary scan flow:

```txt
@cms-lab/cli
  -> load cms-lab.config.ts
  -> validate config with @cms-lab/core
  -> detect Next.js project via @cms-lab/next
  -> fetch/normalize CMS docs via adapter
  -> resolve expected routes from config
  -> probe local site URLs
  -> run checks
  -> aggregate diagnostics
  -> emit terminal + JSON now, HTML later
```

Core public interfaces:

```ts
type CMSDocument = {
  id: string
  type: string
  uid?: string
  url?: string
  status: 'published' | 'draft'
  data: unknown
}

type Diagnostic = {
  severity: 'error' | 'warning' | 'info'
  code: string
  message: string
  path?: string
  source?: string
}

type ScanResult = {
  project: ProjectInfo
  documents: CMSDocument[]
  diagnostics: Diagnostic[]
  summary: {
    errors: number
    warnings: number
    info: number
  }
}
```

Config stays source-of-truth for CMS route mapping:

```ts
export default defineConfig({
  site: { url: 'http://localhost:3000' },
  framework: { type: 'next', router: 'app' },
  cms: {
    provider: 'prismic',
    repositoryName: 'my-repo',
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: 'page', pattern: '/:uid', getPath: (doc) => `/${doc.uid}` },
    { type: 'blog_post', pattern: '/blog/:uid', getPath: (doc) => `/blog/${doc.uid}` },
  ],
})
```

## Roadmap

Phase 0: Foundation

- Create pnpm workspace, TypeScript config, Vitest setup, ESLint/Prettier, package export conventions, and CLI package wiring.
- Use Node package `exports` intentionally so public imports stay stable.
- Use `c12` for `cms-lab.config.ts` loading.
- Use Commander for CLI commands and typed options.

Phase 1: CLI

- Ship `npx cms-lab scan --url http://localhost:3000`.
- Support Next.js App Router + Prismic only.
- Implement config-first route checks.
- Detect reachable site, expected routes, 404 routes, missing UID, missing SEO fields, and missing image alt text.
- Output terminal summary and JSON report.
- Keep HTML reports, dashboard, Strapi, Shopify, and docs UI out of the first CLI pass.

Phase 2: v0.2 Reports And Public Site

- Add `@cms-lab/reporter` HTML report output.
- Add `apps/site` for generated HTML/CSS/assets from external AI design files.
- Add landing page, docs pages, example screenshots, social preview, and report visual templates.
- Keep CLI/report logic separate from site/design files.

Phase 3: v0.3 Strapi Adapter

- Add `@cms-lab/strapi`.
- Support REST first; GraphQL can follow only if demand exists.
- Normalize Strapi records into `CMSDocument`.
- Check required fields, slugs, relations, and route existence.

Phase 4: v0.4 Shopify Adapter

- Add `@cms-lab/shopify`.
- Check products, collections, handles, SEO fields, images, alt text, and expected storefront routes.
- Treat Shopify as commerce content validation, not full storefront testing.

Phase 5: v0.5 CI

- Add `cms-lab scan --ci`.
- Exit non-zero on errors.
- Add GitHub Action docs and example workflow.
- Preserve JSON output for CI annotation later.

Phase 6: Stability

- Add preview/draft mode checker.
- Add broken internal link checks.
- Add CMS schema drift detection.
- Stabilize adapter/plugin API.
- Publish a stable release only after Prismic + Strapi + reporter + CI behavior are stable.

## External AI Design Prompt

Use this prompt with your design-generation tool:

```txt
Create production-ready static HTML/CSS/assets for an open-source developer tool called cms-lab.

Product:
cms-lab is a CLI that scans headless CMS content and Next.js routes to catch broken CMS-driven pages before deploy. The main command is `npx cms-lab scan`.

Audience:
Next.js developers, freelancers, agencies, marketing site teams, e-commerce teams, and headless CMS teams using Prismic, Strapi, Shopify, Sanity, or similar tools.

Design output:
Generate static HTML files, CSS, and assets only. Do not generate React, Next.js, Vue, or framework-specific code. Use clean semantic HTML and organized CSS that can later be moved into the project.

Required files:
- landing.html
- docs-overview.html
- docs-scan-command.html
- report-success.html
- report-errors.html
- assets/
- screenshots/
- social-preview source asset

Required surfaces:
1. Landing page for cms-lab
2. Documentation overview page
3. Scan command documentation page
4. HTML report success state
5. HTML report error/warning state
6. GitHub/social preview visual
7. Screenshot-style mockups of terminal and report output

Content requirements:
- Primary headline: "Catch CMS bugs before deploy"
- Main command: `npx cms-lab scan`
- Mention Next.js, Prismic, Strapi, Shopify, headless CMS, route checks, missing SEO fields, image alt text, and CI.
- Include realistic terminal output with errors and warnings.
- Include clear install, usage, example output, and roadmap sections.
- Keep copy concise and developer-focused.

Visual direction:
Professional open-source developer tool. Practical, technical, credible, and agency-friendly. Avoid SaaS marketing fluff, fake dashboards, oversized decorative hero cards, and generic gradients. The CLI and report output should be the main visual signal.

Constraints:
- Static assets must be local.
- No external JS dependencies.
- No tracking scripts.
- No remote fonts unless also providing a system-font fallback.
- HTML should be easy to inspect and convert later.
```

## Test Plan

- Unit tests for config loading, route resolution, diagnostics, severity counts, and output formatting.
- Adapter tests using fixtures before live CMS tests.
- Next.js detector tests against fixture App Router projects.
- CLI tests for `scan`, `--url`, `--config`, `--json`, and `--ci`.
- Integration tests with `examples/next-prismic` once CLI behavior is stable.
- Report snapshot tests start in v0.2 after generated design files exist.

## Assumptions

- Full roadmap is wanted now; detailed task-by-task implementation planning comes later.
- `cms-lab` is a public npm package first, not just a portfolio demo.
- Routes are config-first; auto-detection validates and assists later.
- pnpm workspaces are enough initially; Turborepo is deferred.
- AI-generated design files are static HTML/CSS/assets for all public surfaces.
- Technical grounding references: Next.js App Router, Route Handlers, and `generateStaticParams` docs; Prismic route resolver/custom type docs; pnpm workspace support; Node package exports; c12 config loading; Commander CLI docs.
