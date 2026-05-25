# cms-lab Growth And Distribution Plan

This is a practical launch and growth plan for cms-lab. The goal is useful distribution: get real Next.js and headless CMS developers to try the CLI, report real setups, and adopt it in CI. Do not use fake stars, vote rings, mass posting, or repeated copied posts.

## Current Position

- Repository: `i-afaqrashid/cms-lab`
- Package users should install after the next release: `@cms-lab/cli`
- Current launch command:

```sh
npx @cms-lab/cli scan
```

- Site: `https://cmslab.afaqrashid.com`
- License: MIT
- Maintainer: Afaq Rashid
- Main promise: catch CMS bugs before deploy.

Safe repo metadata already improved:

- GitHub Discussions enabled.
- Extra repository topics added: `headless-cms`, `content-validation`, `cms-testing`, `nextjs-app-router`, `pages-router`, `seo`, `accessibility`, `ci`.

## Reality Check

cms-lab should not launch like a generic SaaS landing page. It is a developer tool. The launch needs proof:

1. A real command people can run.
2. A demo that catches a real broken CMS route/content issue.
3. A clean report screenshot.
4. A small, honest scope statement.
5. Fast maintainer replies when people test it.

The project should spread through useful artifacts: CI failures, report screenshots, copyable config examples, CMS-specific docs, and developer community feedback.

## Public CLI Command

npm rejected the unscoped `cms-lab` package because it is too similar to an existing package named `cmslab`. Use the scoped package as the public one-off command:

```sh
npx @cms-lab/cli scan
```

Keep launch copy consistent:

- `@cms-lab/cli` is the npm package.
- `cms-lab` is the installed binary name.
- One-off runs should use `npx @cms-lab/cli ...`.
- Installed project scripts can use `cms-lab ...`.

## Demo Requirement

Create one public demo that works with no secrets.

It should show:

- A Next.js app.
- CMS-like content or a public CMS fixture.
- One broken route.
- One missing SEO title/description.
- One missing image alt text.
- One passing page.
- Terminal output.
- HTML report output.
- CI-friendly exit behavior.

Minimum demo commands:

```sh
npm install
npx @cms-lab/cli scan --ci --report
npx @cms-lab/cli scan --ci --json
npx @cms-lab/cli doctor
```

The demo is the thing to share on Hacker News, Product Hunt, CMS forums, and social posts. Do not send people to a vague landing page first.

## Repo Presentation

Before broader launch:

- Add a GitHub social preview image.
- Create a GitHub Release for the current public version.
- Keep README short and command-first.
- Add a report screenshot near the top of the README.
- Pin or start one Discussion: "Share your CMS setup / ask for adapter help."
- Add a clear "Works with" section for Prismic, Strapi, Directus, WordPress, Contentful, and Sanity.
- Keep claims factual. Avoid fake usage numbers, fake stars, or exaggerated production claims.

## Launch Assets

Prepare these assets before posting anywhere:

1. Short demo GIF/video.
2. Terminal screenshot.
3. HTML report screenshot.
4. CI failure screenshot.
5. Copyable config example.
6. HN post draft.
7. Product Hunt copy.
8. CMS community forum posts.
9. LinkedIn/X short post.
10. Dev.to or personal blog article.

The strongest visual story:

> CMS content exists, but the Next.js route is broken. cms-lab catches it before deploy.

## Channel Strategy

### 1. GitHub

Purpose: credibility and contributor funnel.

Actions:

- Keep repository topics specific.
- Use Discussions for support and feedback.
- Keep issues for real bugs/features.
- Add labels for `adapter`, `docs`, `good first issue`, and `feedback`.
- Create a GitHub Release with a short changelog.
- Make the README command-first.

### 2. npm

Purpose: install conversion.

Actions:

- Publish `cms-lab` wrapper package.
- Keep `@cms-lab/cli` metadata strong.
- Add npm keywords for discoverability.
- Make sure package README says exactly how to scan.

Recommended keywords:

```txt
cms
headless-cms
nextjs
prismic
strapi
directus
wordpress
contentful
sanity
cli
testing
ci
seo
accessibility
content-validation
```

### 3. Hacker News

Purpose: technical feedback and early credibility.

Post only when the demo is tryable.

Suggested title:

```txt
Show HN: cms-lab - catch broken Next.js CMS pages before deploy
```

First comment should include:

- Why it exists.
- What it checks.
- What CMS adapters exist.
- How to run it.
- What feedback you want.

Do not ask for upvotes.

### 4. Product Hunt

Purpose: broad visibility after technical proof exists.

Launch after:

- GitHub README is polished.
- npm command is simple.
- demo is live.
- screenshots are ready.
- GitHub Release exists.

Ask people to try it and comment. Do not ask for upvotes.

### 5. CMS Communities

Purpose: reach people with the exact pain.

Targets:

- Prismic community.
- Strapi community.
- Directus community.
- Contentful community.
- Sanity community.
- WordPress/headless WordPress circles.

Tone:

```txt
I built a local CLI that checks CMS content against the routes and fields a Next.js app expects. It currently supports [provider]. I am looking for real setups that break it. Here is the config and demo.
```

Do not paste identical posts everywhere. Adapt each post to the CMS.

### 6. Next.js Developer Channels

Purpose: reach framework users who own the deploy pipeline.

Post topics:

- "How to catch broken CMS routes before deploy in Next.js"
- "Testing headless CMS content in CI"
- "Failing a PR when Prismic/Strapi content breaks a page"

Useful channels:

- Personal blog.
- Dev.to.
- LinkedIn.
- X.
- Reddit only where rules allow project posts.
- Next.js-related Discords/forums if allowed.

### 7. AI Agent Distribution

Purpose: make coding agents suggest the right tool when they detect a CMS-driven Next.js app.

Existing wedge:

```sh
cms-lab agent-context
```

Improve docs for:

- Codex
- Claude Code
- Cursor
- Gemini
- Copilot
- OpenCode

The agent docs should tell the agent:

- When cms-lab applies.
- How to read project routes/config.
- How to run scan safely.
- How to interpret diagnostics.
- How to avoid leaking secrets.

## Content Plan

Create focused docs/articles for search intent:

1. Test Prismic routes in Next.js before deploy.
2. Validate Strapi content in CI.
3. Catch missing CMS SEO fields before release.
4. Find broken CMS image alt text.
5. Generate local HTML reports for CMS content checks.
6. Next.js Pages Router CMS route testing.
7. Next.js App Router CMS route testing.
8. Headless CMS content validation in GitHub Actions.

Each article must include:

- Real config.
- Real command.
- Real output.
- One screenshot.
- No inflated claims.

## Feature Ideas That Help Distribution

These features are worth considering because they make cms-lab easier to share or adopt:

1. GitHub Action wrapper: `cms-lab/action`.
2. Redacted report mode for sharing screenshots safely.
3. `cms-lab init --cms prismic --framework next`.
4. `cms-lab demo` to scaffold a broken demo locally.
5. Provider-specific starter configs.
6. Report badge for README/CI.
7. `--github-annotations` output.
8. Better Slack summary templates.
9. Public examples for each CMS adapter.

## Launch Timeline

### Day 0

- Standardize launch copy on `npx @cms-lab/cli`.
- Add GitHub social preview image.
- Create public demo.
- Add report screenshot to README.
- Create GitHub Release.

### Days 1-2

- Test fresh install from npm.
- Run demo on a clean machine/temp folder.
- Ask 3-5 real developers privately to try it.
- Fix confusing docs or install friction immediately.

### Days 3-5

- Post in CMS communities one by one.
- Ask for real setup feedback.
- Open issues for real gaps found by testers.
- Reply quickly.

### Week 2

- Do Show HN.
- Publish the personal blog/Dev.to article.
- Share concise posts on LinkedIn/X.

### Week 3+

- Product Hunt launch.
- Add GitHub Action wrapper if demand appears.
- Expand provider-specific checks based on real feedback.

## Success Metrics

Track weekly:

- npm downloads.
- GitHub stars.
- GitHub clones/views.
- Docs visits.
- Issues opened by real users.
- Discussions opened by real users.
- Number of CMS configs shared by users.
- Number of CI installs reported.

Good 14-day target:

- 5 real users try it.
- 3 real setup reports.
- 1 external issue or PR.
- 1 CMS community thread with useful feedback.
- 1 public example someone can clone.

Good 30-day target:

- 100+ npm downloads/week.
- 25+ GitHub stars.
- 5+ real GitHub issues/discussions.
- 2+ provider-specific improvements shipped from feedback.

## What Not To Do

- Do not buy stars.
- Do not ask for upvotes.
- Do not spam identical posts.
- Do not claim enterprise usage unless it exists.
- Do not claim "production proven" without public proof.
- Do not expose client URLs, private paths, or secrets.
- Do not make the landing page the main proof. The demo and CLI output are the proof.

## Source Notes

- npm package metadata uses fields such as description, keywords, homepage, repository, bugs, license, and author: https://docs.npmjs.com/cli/v9/configuring-npm/package-json/
- GitHub supports custom social preview images for better link presentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
- Hacker News Show HN guidance emphasizes tryable work and prohibits vote solicitation: https://news.ycombinator.com/showhn.html
- Product Hunt launch guidance says to ask people to visit/comment, not upvote: https://www.producthunt.com/launch
- Open Source Guides recommend clear community practices and contributor-friendly onboarding: https://opensource.guide/building-community/
- Prismic community: https://community.prismic.io/
- Strapi community: https://strapi.io/community
- Contentful developer community reference: https://www.contentful.com/blog/discord-contentful-developer-community/
