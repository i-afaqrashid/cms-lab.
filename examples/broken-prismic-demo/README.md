# Broken Prismic Demo

This is a no-secret demo for launch posts and local smoke testing. It uses the public Prismic starter repository and intentionally includes bad route and field expectations so `cms-lab` produces visible diagnostics.

Run from this folder after building the workspace, or use the published package after the next release:

```sh
npx @cms-lab/cli doctor
npx @cms-lab/cli scan --ci --report --markdown --junit --json --fail-on never
```

Expected behavior:

- `doctor` exits `0`
- `scan --fail-on never` exits `0`
- the scan writes `.cms-lab/report.html`
- diagnostics include broken article routes and missing configured fields

The demo does not need `PRISMIC_ACCESS_TOKEN`. You can override the public target with:

```sh
CMS_LAB_DEMO_SITE_URL=https://example.com \
CMS_LAB_DEMO_PRISMIC_REPOSITORY=your-repo \
npx @cms-lab/cli scan --ci --report --fail-on never
```
