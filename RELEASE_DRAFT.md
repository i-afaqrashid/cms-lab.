# GitHub Release Template

Use this template after the release PR is merged and the `vX.Y.Z` tag exists.
The GitHub release body should match the same version entry in
`CHANGELOG.md`.

## Title

```txt
vX.Y.Z
```

## Body

````md
## Highlights

- Short user-facing change.
- Short user-facing change.
- Short user-facing change.

## Install

```sh
npx @cms-lab/cli@latest --version
npx @cms-lab/cli scan
```

## Published Packages

- `@cms-lab/cli`
- `@cms-lab/core`
- `@cms-lab/next`
- `@cms-lab/prismic`
- `@cms-lab/strapi`
- `@cms-lab/directus`
- `@cms-lab/wordpress`
- `@cms-lab/contentful`
- `@cms-lab/sanity`
- `@cms-lab/reporter`

## Verification

- GitHub publish workflow completed successfully.
- npm shows `X.Y.Z` as latest for all public packages.
- `npx -y @cms-lab/cli@latest --version` returns `X.Y.Z`.

## Changelog

See [`CHANGELOG.md`](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md).
````

## Checklist

- Copy the matching `CHANGELOG.md` entry.
- Mention package availability honestly if a tag was partial or superseded.
- Keep install commands scoped to `@cms-lab/cli`.
- Do not mention private URLs, local paths, internal notes, or secrets.
- Verify npm before saying packages are published.
