# @cms-lab/sanity

Sanity adapter for cms-lab.

```ts
cms: {
  provider: "sanity",
  projectId: "my-project",
  dataset: "production",
  apiVersion: "2025-02-19",
  token: process.env.SANITY_READ_TOKEN,
  contentTypes: [{ type: "page", documentType: "page" }],
}
```

The adapter reads Sanity documents through the HTTP Query API, one configured
document type at a time, and normalizes them into cms-lab `CMSDocument` objects.
Documents whose `_id` starts with `drafts.` are marked as drafts.
