# cms-lab Launch Post Drafts

These are starting points. Edit them in your own voice before posting, and adapt each community post to that community. Do not ask for upvotes, stars, or fake engagement.

## Hacker News

Title:

```txt
Show HN: cms-lab - catch broken Next.js CMS pages before deploy
```

Post/comment:

```txt
I built cms-lab, a local CLI for catching CMS-driven Next.js failures before deploy.

It reads a config file, fetches content from headless CMS providers, maps documents to the routes your app expects, probes the running site, and reports issues like broken routes, missing required fields, missing SEO fields, and empty image alt text.

It currently supports Prismic, Strapi, Directus, WordPress, Contentful, and Sanity adapters, with terminal, JSON, Markdown, JUnit, Slack, and local HTML report output.

Try it:

npx @cms-lab/cli scan --ci --report

If your app uses a localized route like /en as the real healthy entrypoint,
cms-lab now supports that with site.healthPath while keeping page route checks
explicit.

The thing I want most is real setup feedback: CMS provider, Next.js router type, config shape, and the first diagnostic that helped or confused you.
```

## Product Hunt

Tagline:

```txt
Catch CMS bugs before deploy
```

Description:

```txt
cms-lab is an open-source CLI that checks headless CMS content against the routes and fields your Next.js app expects. Run it locally or in CI to catch broken CMS pages, missing required fields, SEO gaps, and image alt text issues before release.
```

First comment:

```txt
I built cms-lab for teams shipping Next.js sites backed by headless CMS content.

The CLI runs locally in your project. It does not require a hosted cms-lab account. It fetches content from the CMS you configure, checks mapped routes and fields, then writes terminal, JSON, Markdown, JUnit, Slack, and HTML report output.

I am looking for feedback from people using Prismic, Strapi, Directus, WordPress, Contentful, or Sanity with Next.js.

The tested-with matrix is public in the docs so people can see which adapter paths have fixture or smoke-test coverage.
```

## Prismic Community

```txt
I built cms-lab, a local CLI that checks Prismic content against the Next.js routes and fields your app expects.

It can catch things like:

- a published document whose mapped route returns 404 or 500
- missing fields your template assumes exist
- missing SEO title/description fields
- empty image alt text inside CMS data

Try:

npx @cms-lab/cli scan --ci --report

I am looking for real Prismic + Next.js setups that break it or produce confusing diagnostics. Useful feedback: router type, content type shape, route mapping, and the first diagnostic you saw.
```

## Strapi Community

```txt
I built cms-lab, a local CLI for checking Strapi content against the Next.js routes and fields your app expects before deploy.

It scans configured collections, maps entries to expected URLs, probes the site, and reports broken routes, missing fields, SEO gaps, and image alt text issues.

Try:

npx @cms-lab/cli scan --ci --report

I am especially looking for feedback from Strapi projects with nested slug fields, dynamic zones, or custom SEO objects.

There is now a Strapi Pages Router starter config:

cms-lab init --cms strapi --router pages
```

## Directus Community

```txt
I built cms-lab, a local CLI that checks Directus items against the Next.js routes and fields your app expects.

It is config-first: you tell it which collections map to which URLs, and it reports route failures, missing fields, SEO gaps, and image alt text issues before deploy.

Try:

npx @cms-lab/cli scan --ci --report

I am looking for Directus feedback around nested fields, custom permalink fields, and collection-specific route mapping.
```

## Contentful Community

```txt
I built cms-lab, a local CLI for checking Contentful entries against the Next.js routes and fields your app expects.

It fetches configured content types, maps entries to URLs, probes the running site, and writes terminal/CI/report output for broken routes, missing fields, SEO gaps, and image alt text issues.

Try:

npx @cms-lab/cli scan --ci --report

I am looking for feedback from Contentful projects with localized fields, custom slug fields, and SEO field groups.
```

## Sanity Community

```txt
I built cms-lab, a local CLI for checking Sanity documents against the Next.js routes and fields your app expects.

It can scan configured document types, map them to expected URLs, probe the site, and report broken routes, missing required fields, SEO gaps, and image alt text issues.

Try:

npx @cms-lab/cli scan --ci --report

I am looking for Sanity feedback around GROQ projections, slug paths, portable text/image fields, and route mapping.
```

## LinkedIn

```txt
I shipped cms-lab, an open-source CLI for catching CMS-driven Next.js bugs before deploy.

It runs locally or in CI, fetches content from the CMS you configure, checks mapped routes and required fields, and writes terminal, JSON, Markdown, JUnit, Slack, and HTML report output.

Useful for teams using Next.js with Prismic, Strapi, Directus, WordPress, Contentful, or Sanity.

Try:

npx @cms-lab/cli scan --ci --report

I am looking for real setup feedback, especially from teams with messy CMS route mapping.
```

## X

```txt
I built cms-lab: an open-source CLI that catches CMS-driven Next.js bugs before deploy.

It checks mapped routes, required fields, SEO fields, and image alt text, then writes terminal/CI/local HTML report output.

npx @cms-lab/cli scan --ci --report
```

## Dev.to / Blog Outline

Title:

```txt
Catch broken CMS pages before deploying a Next.js site
```

Outline:

1. The problem: CMS content can break pages without code changing.
2. Common failures: route 404s, route 500s, missing required fields, SEO gaps, empty alt text.
3. Config-first route mapping.
4. Run the app locally or against staging.
5. Run `npx @cms-lab/cli scan --ci --report`.
6. Read terminal and HTML report output.
7. Add the GitHub Actions snippet.
8. What cms-lab does not do yet.
9. Ask for real CMS setup feedback.

## Feedback Request

Use this as the ask across posts:

```txt
If you try it, the most useful feedback is:

- CMS provider
- Next.js router type
- route mapping shape
- first diagnostic you saw
- whether the fix was obvious
```
