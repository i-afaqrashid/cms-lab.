# @cms-lab/wordpress

WordPress REST adapter for cms-lab.

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

The adapter reads WordPress REST API content and normalizes it into cms-lab
`CMSDocument` objects. It preserves WordPress SEO plugin JSON and media fields
in `document.data`, stores the REST `link` as `document.url`, uses `slug` as the
UID when available, and treats scheduled, draft, pending, and private content as
`draft`.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from `document.data`.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
