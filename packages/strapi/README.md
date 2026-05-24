# @cms-lab/strapi

Strapi adapter for cms-lab.

```ts
cms: {
  provider: "strapi",
  url: "http://localhost:1337",
  token: process.env.STRAPI_TOKEN,
  collections: [
    {
      type: "page",
      endpoint: "pages",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}
```

The adapter reads Strapi REST collection responses and normalizes them into
cms-lab `CMSDocument` objects. It supports Strapi v4 `attributes` payloads and
newer flat REST payloads, keeps native SEO/media fields in `document.data`, uses
`documentId`, `slug`, or numeric `id` as stable identity values, and treats
non-published statuses as `draft`.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from `document.data`.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
