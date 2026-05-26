# @cms-lab/sanity

Sanity adapter for cms-lab.

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

The adapter reads Sanity documents through the HTTP Query API, one configured
document type at a time, and normalizes them into cms-lab `CMSDocument` objects.
Documents whose `_id` starts with `drafts.` are marked as drafts.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from `document.data`.

See the public [adapter maturity matrix](https://cmslab.afaqrashid.com/docs/tested-with)
for current test coverage and known limits.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
