# @cms-lab/contentful

Contentful adapter for cms-lab.

```ts
cms: {
  provider: "contentful",
  spaceId: "my-space",
  environment: "master",
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
  contentTypes: [{ type: "page", contentType: "page" }],
}
```

The adapter reads Contentful Content Delivery API entries, paginates with
`limit` and `skip`, and normalizes them into cms-lab `CMSDocument` objects.
Top-level localized fields are flattened to the default locale when possible so
route mappings can use common fields such as `doc.uid` or `doc.data.slug`.
