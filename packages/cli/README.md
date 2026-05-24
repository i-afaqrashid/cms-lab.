# cms-lab

CLI for catching CMS-driven Next.js failures before deploy.

```sh
npx cms-lab scan
```

## Commands

```sh
cms-lab init
cms-lab doctor
cms-lab doctor --debug --verbose 2
cms-lab scan --report
cms-lab scan --markdown
cms-lab scan --junit
cms-lab scan --slack-webhook "$CMS_LAB_SLACK_WEBHOOK"
cms-lab scan --debug
cms-lab scan --json
cms-lab scan --json --include-sensitive-output
cms-lab scan --max-warnings 0
cms-lab scan --strict
cms-lab explain CMS-ROUTE-404
```

## Scope

cms-lab supports Next.js App Router projects using Prismic, Strapi, Directus,
and WordPress. It validates configured CMS route mappings, route reachability,
UID gaps, SEO metadata, image alt text, and project-specific required fields.

Debug logs use stderr and support `--debug` plus `--verbose <0|1|2|3>`, so JSON
scan output remains clean on stdout. Raw CMS document `data` is redacted from
`--json` output, along with document URLs, UIDs, and absolute project paths,
unless `--include-sensitive-output` is passed explicitly.

CI strictness can be raised with `--fail-on warning`, `--max-warnings <count>`,
`--max-info <count>`, or `--strict`.

Exports include local HTML (`--report`), Markdown (`--markdown`), JUnit XML
(`--junit`), and redacted Slack incoming webhook summaries
(`--slack-webhook <url>`). Slack notifications send counts and diagnostic codes
only, never raw CMS payloads, local paths, or webhook URLs.

## Config

Create `cms-lab.config.ts` in the target Next.js project. Import
`defineConfig` from `@cms-lab/core`.

See the repository README for full setup, CI, and live Prismic testing.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
