# @cms-lab/contentful

Contentful adapter for cms-lab.

```ts
cms: {
  provider: "contentful",
  spaceId: "my-space",
  environment: "master",
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
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

The adapter reads Contentful Content Delivery API entries, paginates with
`limit` and `skip`, and normalizes them into cms-lab `CMSDocument` objects.
Top-level localized fields are flattened to the default locale when possible so
route mappings can use common fields such as `doc.uid` or `doc.data.slug`.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from normalized `document.data`.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
