# @cms-lab/strapi

Strapi adapter for cms-lab.

```ts
cms: {
  provider: "strapi",
  url: "http://localhost:1337",
  token: process.env.STRAPI_TOKEN,
  locale: "en",
  collections: [
    {
      type: "page",
      endpoint: "pages",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
  singleTypes: [
    {
      type: "navbar",
      endpoint: "navbar",
    },
  ],
}
```

The adapter reads Strapi REST collection and single-type responses and
normalizes them into cms-lab `CMSDocument` objects. It supports Strapi v4
`attributes` payloads and newer flat REST payloads, keeps native SEO/media
fields in `document.data`, uses `documentId`, `slug`, or numeric `id` as stable
identity values, and treats non-published statuses as `draft`.

Single types are marked as non-routable by default. cms-lab still runs field,
SEO, and image-alt checks on them, but it does not report missing route mappings
for layout or site-wide content such as navbars, footers, and homepage sections.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from `document.data`.

Set `cms.locale` to fetch all configured collections and single types for a
locale. Individual collection or single-type entries can override it with their
own `locale` value.

For Next.js Pages Router projects, start with:

```sh
cms-lab init --cms strapi --router pages
```

The generated config includes collection routes, single types, and
`strapiRelationSlug` for relation-based URL segments.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
