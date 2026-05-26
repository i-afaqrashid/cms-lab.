# @cms-lab/core

Core config, types, diagnostics, route resolution, and scan orchestration for cms-lab.

```ts
import { defineConfig, scanDocuments, strapiRelationSlug } from "@cms-lab/core";
```

Most users should install `cms-lab` and use the CLI. This package is public for
typed config files, tests, and adapter/report integrations.

`scanDocuments` understands the shared `CMSDocument` contract plus provider
field shapes from the bundled adapters. SEO checks recognize common Prismic,
Strapi, Directus, WordPress, Contentful, and Sanity SEO fields, while image
checks recognize native alt fields such as Strapi `alternativeText`, Directus
file `description`, WordPress `alt_text`, Contentful asset descriptions, and
Sanity image `alt` fields.

`readCmsDataPath` is exported for adapters that need to read dotted paths from
normalized CMS payloads, for example custom `uidField` and `urlField` mapping.

`strapiRelationSlug` and `strapiRelationValue` help Strapi route mappings read
relation values from both Strapi v4 `data.attributes` payloads and newer flat
REST payloads:

```ts
routes: [
  {
    type: "article",
    pattern: "/blog/:topic/:slug",
    getPath: (doc) => {
      const topic = strapiRelationSlug(doc.data, "topic") ?? "uncategorized";
      return `/blog/${topic}/${doc.uid}`;
    },
  },
];
```

`site.healthPath` and `site.healthUrl` let `doctor` and the initial scan health
probe hit a known-good page or endpoint while normal route probes still use
`site.url`.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
