# @cms-lab/payload

Payload CMS adapter for cms-lab.

```ts
cms: {
  provider: "payload",
  url: "http://localhost:3000",
  apiPath: "/api",
  token: process.env.PAYLOAD_TOKEN,
  collections: [
    { type: "page", collection: "pages", uidField: "slug" },
    { type: "post", collection: "posts", uidField: "slug" },
  ],
}
```

The adapter reads the Payload REST API (`{url}{apiPath}/{collection}`) and
normalizes each document into a cms-lab `CMSDocument`. It keeps native SEO and
media fields in `document.data`, uses `id`, `slug`, or `_id` as stable identity
values, and maps Payload's `_status` draft flag onto the cms-lab
`published`/`draft` status.

`apiPath` defaults to `/api`. Because Payload self-hosts inside the Next.js app,
`url` is usually the same origin as your site.

Use `uidField` or `urlField` when your project stores route values in custom
fields. Both options read dotted paths from `document.data`.

Use `routable: false` for relation-heavy collections that should be checked for
fields but should not create route-unmapped diagnostics:

```ts
{ type: "pricing", collection: "pricing", uidField: "id", routable: false }
```

## Auth

`token` is sent in the `Authorization` header. If it already includes a scheme
(it contains whitespace) it is sent verbatim, which covers Payload API keys
(`users API-Key <key>`). Otherwise it is sent as a JWT (`JWT <token>`).

## SEO and media

SEO checks read the common `meta.title` / `meta.description` fields used by the
Payload SEO plugin. Image alt checks inspect upload/media objects (those with a
`url` plus an image `mimeType`, an image filename, or an `alt` field) and report
missing or placeholder `alt` text.
