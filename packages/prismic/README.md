# @cms-lab/prismic

Prismic REST adapter for cms-lab.

```ts
import { fetchPrismicDocuments } from "@cms-lab/prismic";
```

The adapter reads Prismic REST API v2 refs, paginates documents, and normalizes
records into cms-lab `CMSDocument` values. Private repositories can use
`PRISMIC_ACCESS_TOKEN` through the main cms-lab config.

Native Prismic fields stay in `document.data`; the core scanner recognizes
common Prismic SEO fields and image `alt` values during content checks.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
