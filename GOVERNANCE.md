# Governance

cms-lab is maintainer-led. Maintainers make final decisions on scope, releases, package ownership, issue triage, and merge readiness.

## Decision Making

Project decisions are guided by:

- Does it help catch CMS-driven Next.js failures before deploy?
- Can it be tested locally or against a real CMS fixture?
- Does it keep CLI output, JSON output, and reports honest?
- Does it avoid leaking credentials or private CMS data?
- Is the maintenance cost reasonable for the project size?

Maintainers may ask for smaller PRs, additional tests, clearer docs, or a narrower scope before merging.

## Release Ownership

Only maintainers publish npm packages or create official releases.

Release candidates should pass:

```sh
pnpm release:check
```

Version changes, changelog entries, and package publishing should happen in explicit release PRs.

## Adapter Ownership

CMS adapters must have a clear maintenance path. New adapters should include:

- Config schema coverage.
- Normalization tests.
- Error handling tests.
- Real or realistic fixture coverage.
- Docs showing required CMS permissions and supported endpoints.

Adapters can be marked experimental in docs until they have enough real-world coverage.

## Conduct

All project spaces are covered by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
