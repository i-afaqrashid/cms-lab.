# @cms-lab/directus

Directus adapter for cms-lab.

```ts
cms: {
  provider: "directus",
  url: "http://localhost:8055",
  token: process.env.DIRECTUS_TOKEN,
  collections: [
    {
      type: "page",
      collection: "pages",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}
```

The adapter reads Directus REST items and normalizes them into cms-lab
`CMSDocument` objects. It keeps native SEO/file fields in `document.data`, uses
`id`, `uid`, or `slug` as stable identity values, and treats non-published
statuses such as archived content as `draft`.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from `document.data`.

Use `routable: false` for relation-heavy collections that should be checked for
fields but should not create route-unmapped diagnostics:

```ts
collections: [
  { type: "menu_item", collection: "menu_items", uidField: "slug" },
  {
    type: "pricing",
    collection: "item_branch_pricing",
    uidField: "id",
    routable: false,
  },
];
```

Use `checks.relationships` for simple cross-collection minimums:

```ts
checks: {
  relationships: [
    {
      from: "menu_item",
      to: "pricing",
      where: { fromField: "id", toField: "menu_item_id" },
      min: 1,
      severity: "warning",
    },
  ],
}
```

See the public [adapter maturity matrix](https://cmslab.afaqrashid.com/docs/tested-with)
for current test coverage and known limits.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
