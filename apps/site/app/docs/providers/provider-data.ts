export type ProviderDoc = {
  slug: string;
  name: string;
  packageName: string;
  summary: string;
  config: string;
  fieldMapping: string;
  caveats: string[];
};

export const providerDocs: ProviderDoc[] = [
  {
    slug: "prismic",
    name: "Prismic",
    packageName: "@cms-lab/prismic",
    summary:
      "Use Prismic when document types have UIDs or route resolver URLs that map cleanly to Next.js routes.",
    config: `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName: "my-repo",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => "/" + doc.uid },
    {
      type: "blog_post",
      pattern: "/blog/:uid",
      getPath: (doc) => "/blog/" + doc.uid,
    },
  ],
});`,
    fieldMapping: `// Prismic exposes uid and url directly when available.
routes: [
  { type: "page", pattern: "/:uid", getPath: (doc) => doc.url ?? "/" + doc.uid },
];`,
    caveats: [
      "The adapter reads the repository API v2 master ref and published documents.",
      "Draft preview refs and Prismic migration API checks are not part of the default scan yet.",
      "Custom route logic should live in getPath when Prismic URL output is not enough.",
    ],
  },
  {
    slug: "strapi",
    name: "Strapi",
    packageName: "@cms-lab/strapi",
    summary:
      "Use Strapi when collections and single types drive pages, layouts, or locale-specific content.",
    config: `import { defineConfig, strapiRelationSlug } from "@cms-lab/core";

export default defineConfig({
  site: {
    url: "http://localhost:3000",
    healthPath: "/en",
  },
  framework: { type: "next", router: "pages" },
  cms: {
    provider: "strapi",
    url: "http://localhost:1337",
    token: process.env.STRAPI_TOKEN,
    locale: "en",
    collections: [
      { type: "page", endpoint: "pages", uidField: "slug" },
      { type: "article", endpoint: "articles", uidField: "slug" },
    ],
    singleTypes: [{ type: "navbar", endpoint: "navbar" }],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => "/" + doc.uid },
    {
      type: "article",
      pattern: "/blog/:topic/:slug",
      getPath: (doc) => {
        const topic = strapiRelationSlug(doc.data, "topic") ?? "uncategorized";
        return "/blog/" + topic + "/" + doc.uid;
      },
    },
  ],
});`,
    fieldMapping: `cms: {
  provider: "strapi",
  collections: [
    {
      type: "product",
      endpoint: "products",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}`,
    caveats: [
      "The adapter requests populate=* and paginates collection responses.",
      "Single types are scanned for content diagnostics but are non-routable by default.",
      "Deep cross-document business rules are tracked separately from route and field checks.",
    ],
  },
  {
    slug: "directus",
    name: "Directus",
    packageName: "@cms-lab/directus",
    summary:
      "Use Directus when explicit collections hold route fields, SEO fields, and catalog content.",
    config: `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "directus",
    url: "http://localhost:8055",
    token: process.env.DIRECTUS_TOKEN,
    collections: [
      { type: "branch", collection: "branches", uidField: "slug" },
      { type: "menu_item", collection: "menu_items", uidField: "slug" },
      { type: "category", collection: "menu_categories", uidField: "slug" },
      { type: "pricing", collection: "item_branch_pricing", uidField: "id", routable: false },
    ],
  },
  routes: [
    { type: "branch", pattern: "/branches/:slug", getPath: (doc) => "/branches/" + doc.uid },
    { type: "menu_item", pattern: "/menu/:slug", getPath: (doc) => "/menu/" + doc.uid },
  ],
});`,
    fieldMapping: `cms: {
  provider: "directus",
  collections: [
    {
      type: "page",
      collection: "pages",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}`,
    caveats: [
      "Collections are explicit; cms-lab does not discover every Directus collection automatically.",
      "Run cms-lab init --cms directus --router pages for a starter config.",
      "Status handling uses common status values such as published, publish, and live.",
      "Use routable: false for relation-heavy collections that should be checked for fields without producing route-unmapped diagnostics.",
    ],
  },
  {
    slug: "payload",
    name: "Payload",
    packageName: "@cms-lab/payload",
    summary:
      "Use Payload when collections live in the same Next.js app and expose route, SEO, and media fields over the REST API.",
    config: `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "payload",
    url: "http://localhost:3000",
    apiPath: "/api",
    token: process.env.PAYLOAD_TOKEN,
    collections: [
      { type: "page", collection: "pages", uidField: "slug" },
      { type: "post", collection: "posts", uidField: "slug" },
    ],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => "/" + doc.uid },
    {
      type: "post",
      pattern: "/blog/:slug",
      getPath: (doc) => "/blog/" + doc.uid,
    },
  ],
});`,
    fieldMapping: `cms: {
  provider: "payload",
  collections: [
    {
      type: "page",
      collection: "pages",
      uidField: "slug",
      urlField: "seo.canonical",
    },
    // Relation-heavy collections can be checked without route probing.
    { type: "pricing", collection: "pricing", uidField: "id", routable: false },
  ],
}`,
    caveats: [
      "Reads the REST API at {url}{apiPath}/{collection}; apiPath defaults to /api.",
      "token is sent in the Authorization header (verbatim if it already has a scheme, otherwise as JWT), so both JWT and API-key auth work.",
      "Payload's _status draft flag maps onto the cms-lab published/draft status.",
      "Run cms-lab init --cms payload for a starter config.",
    ],
  },
  {
    slug: "wordpress",
    name: "WordPress",
    packageName: "@cms-lab/wordpress",
    summary:
      "Use WordPress when REST API pages, posts, or custom endpoints map to a Next.js frontend.",
    config: `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "wordpress",
    url: "http://localhost:8080",
    contentTypes: [
      { type: "page", endpoint: "pages" },
      { type: "post", endpoint: "posts" },
      { type: "case_study", endpoint: "case-studies", uidField: "acf.slug" },
    ],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => "/" + doc.uid },
    { type: "post", pattern: "/blog/:slug", getPath: (doc) => "/blog/" + doc.uid },
  ],
});`,
    fieldMapping: `cms: {
  provider: "wordpress",
  contentTypes: [
    {
      type: "post",
      endpoint: "posts",
      uidField: "acf.handle",
      urlField: "acf.permalink",
    },
  ],
}`,
    caveats: [
      "The adapter reads WordPress REST API pages/posts by default and supports custom endpoints.",
      "Scheduled, draft, pending, and private statuses are treated as draft.",
      "Custom fields must be exposed through REST before cms-lab can read them.",
    ],
  },
  {
    slug: "contentful",
    name: "Contentful",
    packageName: "@cms-lab/contentful",
    summary:
      "Use Contentful when content types expose slug-like fields and a delivery token can read entries.",
    config: `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "contentful",
    spaceId: "my-space",
    environment: "master",
    accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
    contentTypes: [
      { type: "page", contentType: "page", uidField: "slug" },
      { type: "article", contentType: "article", uidField: "routing.slug" },
    ],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => "/" + doc.uid },
    { type: "article", pattern: "/blog/:slug", getPath: (doc) => "/blog/" + doc.uid },
  ],
});`,
    fieldMapping: `cms: {
  provider: "contentful",
  contentTypes: [
    {
      type: "page",
      contentType: "page",
      uidField: "routing.slug",
      urlField: "routing.url",
    },
  ],
}`,
    caveats: [
      "The adapter uses the Content Delivery API and paginates entries.",
      "Top-level localized field objects are flattened to a default locale when possible.",
      "Reference expansion and preview API scans are not built in yet.",
    ],
  },
  {
    slug: "sanity",
    name: "Sanity",
    packageName: "@cms-lab/sanity",
    summary:
      "Use Sanity when document types expose slug fields and can be queried through the HTTP Query API.",
    config: `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "sanity",
    projectId: "my-project",
    dataset: "production",
    apiVersion: "2025-02-19",
    token: process.env.SANITY_READ_TOKEN,
    contentTypes: [
      { type: "page", documentType: "page", uidField: "slug.current" },
      { type: "article", documentType: "post", uidField: "slug.current" },
    ],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => "/" + doc.uid },
    { type: "article", pattern: "/blog/:slug", getPath: (doc) => "/blog/" + doc.uid },
  ],
});`,
    fieldMapping: `cms: {
  provider: "sanity",
  contentTypes: [
    {
      type: "article",
      documentType: "post",
      uidField: "slug.current",
      urlField: "seo.canonical",
    },
  ],
}`,
    caveats: [
      "cms-lab runs one query per configured document type.",
      "The perspective defaults to published unless configured otherwise.",
      "Custom GROQ projections and reference expansion are not built in yet.",
    ],
  },
];

export function getProviderDoc(slug: string): ProviderDoc | undefined {
  return providerDocs.find((provider) => provider.slug === slug);
}
