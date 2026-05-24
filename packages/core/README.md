# @cms-lab/core

Core config, types, diagnostics, route resolution, and scan orchestration for cms-lab.

```ts
import { defineConfig, scanDocuments } from "@cms-lab/core";
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

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
