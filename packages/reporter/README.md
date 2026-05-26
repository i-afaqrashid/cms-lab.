# @cms-lab/reporter

HTML report rendering for cms-lab scan results.

```ts
import { renderHtmlReport } from "@cms-lab/reporter";
```

The CLI uses this package for `cms-lab scan --report`. The generated report is a
self-contained HTML file with grouped diagnostics and client-side filters.

Use the share privacy mode when rendering a report that may be attached to a
public issue:

```ts
renderHtmlReport(result, { privacy: "share" });
```

Share-safe reports keep diagnostic codes, severity, route paths, and field paths
visible, but redact CMS source IDs and local project paths.

## Release History

See the repository [changelog](https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md)
and [GitHub Releases](https://github.com/i-afaqrashid/cms-lab/releases) for
version-by-version notes.

## Open Source

MIT licensed. See the repository [license](https://github.com/i-afaqrashid/cms-lab/blob/main/LICENSE), [contributing guide](https://github.com/i-afaqrashid/cms-lab/blob/main/CONTRIBUTING.md), and [support guide](https://github.com/i-afaqrashid/cms-lab/blob/main/SUPPORT.md).
