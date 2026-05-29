import { redactSensitive, retryDelayMs, scanDocuments } from "@cms-lab/core";

const baseConfig = {
  site: { url: "http://localhost:3000" },
  framework: { type: "next" as const, router: "app" as const },
  cms: { provider: "prismic" as const, repositoryName: "demo" },
  routes: [
    {
      type: "page",
      pattern: "/:uid",
      getPath: (doc: { uid?: string }) => `/${doc.uid}`,
    },
  ],
};

test("scanDocuments reports route failures and content diagnostics", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {
          meta_title: "About",
          meta_description: "",
          hero_image: { url: "https://images.example/about.jpg", alt: "" },
        },
      },
      {
        id: "doc-2",
        type: "page",
        status: "published",
        data: {
          meta_title: "Untitled",
          meta_description: "No uid page",
          hero_image: { url: "https://images.example/no-uid.jpg", alt: "Hero" },
        },
      },
    ],
    fetch: async (url) => {
      if (String(url).endsWith("/about")) {
        return new Response("missing", { status: 404 });
      }
      return new Response("ok");
    },
  });

  expect(result.summary).toEqual({ errors: 2, warnings: 2, info: 0 });
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
    "CMS-UID-MISSING",
    "CMS-ROUTE-404",
    "SEO-META-MISSING",
    "A11Y-IMG-ALT",
  ]);
});

test("scanDocuments summarizes repeated diagnostics by content type and route pattern", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: {
        seo: false,
        a11y: false,
        images: false,
        fields: {
          required: [{ type: "page", path: "headline", severity: "warning" }],
        },
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: { headline: "" },
      },
      {
        id: "page-2",
        type: "page",
        uid: "contact",
        status: "published",
        data: { headline: "" },
      },
    ],
    fetch: async (url) => {
      if (String(url).endsWith("/about") || String(url).endsWith("/contact")) {
        return new Response("missing", { status: 404 });
      }

      return new Response("ok");
    },
  });

  expect(result.diagnosticGroups).toEqual([
    {
      key: "error:CMS-ROUTE-404:page:/:uid",
      severity: "error",
      code: "CMS-ROUTE-404",
      count: 2,
      type: "page",
      routePattern: "/:uid",
      label: "page /:uid",
      examples: ["/about", "/contact"],
    },
    {
      key: "warning:CMS-FIELD-MISSING:page",
      severity: "warning",
      code: "CMS-FIELD-MISSING",
      count: 2,
      type: "page",
      label: "page",
      examples: ["data.headline"],
    },
  ]);
});

test("scanDocuments treats 5xx route responses as errors", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "broken",
        status: "published",
        data: { meta_title: "Broken", meta_description: "Broken page" },
      },
    ],
    fetch: async (url) => {
      if (String(url).endsWith("/broken")) {
        return new Response("server error", { status: 500 });
      }

      return new Response("ok");
    },
  });

  expect(result.summary.errors).toBe(1);
  expect(result.diagnostics[0]).toMatchObject({
    severity: "error",
    code: "CMS-ROUTE-500",
    path: "/broken",
  });
});

test("scanDocuments preserves site URL query parameters on route probes", async () => {
  const requestedUrls: string[] = [];

  const result = await scanDocuments({
    config: {
      ...baseConfig,
      site: { url: "http://localhost:3000/?preview=enabled" },
    },
    project: {
      framework: "next",
      router: "pages",
      rootDir: "/site",
      pagesDir: "/site/pages",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "about",
        status: "published",
        data: { meta_title: "About", meta_description: "About page" },
      },
    ],
    fetch: async (url) => {
      requestedUrls.push(String(url));
      return new Response("ok");
    },
  });

  expect(result.summary.errors).toBe(0);
  expect(requestedUrls).toEqual([
    "http://localhost:3000/?preview=enabled",
    "http://localhost:3000/about?preview=enabled",
  ]);
});

test("scanDocuments uses site.healthPath for the reachability probe only", async () => {
  const requestedUrls: string[] = [];

  const result = await scanDocuments({
    config: {
      ...baseConfig,
      site: {
        url: "http://localhost:3000/?preview=enabled",
        healthPath: "/en",
      },
    },
    project: {
      framework: "next",
      router: "pages",
      rootDir: "/site",
      pagesDir: "/site/pages",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "about",
        status: "published",
        data: { meta_title: "About", meta_description: "About page" },
      },
    ],
    fetch: async (url) => {
      requestedUrls.push(String(url));
      return new Response("ok");
    },
  });

  expect(result.summary.errors).toBe(0);
  expect(requestedUrls).toEqual([
    "http://localhost:3000/en?preview=enabled",
    "http://localhost:3000/about?preview=enabled",
  ]);
});

test("scanDocuments uses site.healthUrl when a dedicated health URL is configured", async () => {
  const requestedUrls: string[] = [];

  await scanDocuments({
    config: {
      ...baseConfig,
      site: {
        url: "http://localhost:3000",
        healthUrl: "http://localhost:3000/en/health",
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    fetch: async (url) => {
      requestedUrls.push(String(url));
      return new Response("ok");
    },
  });

  expect(requestedUrls).toEqual(["http://localhost:3000/en/health"]);
});

test("scanDocuments rejects protocol-relative routes before probing", async () => {
  const probedUrls: string[] = [];

  const result = await scanDocuments({
    config: {
      ...baseConfig,
      routes: [
        {
          type: "page",
          pattern: "/:uid",
          getPath: (doc: { uid?: string }) => `/${doc.uid}`,
        },
      ],
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "/169.254.169.254/latest/meta-data",
        status: "published",
        data: { meta_title: "Unsafe", meta_description: "Unsafe path" },
      },
    ],
    fetch: async (url) => {
      probedUrls.push(String(url));
      return new Response("ok");
    },
  });

  expect(probedUrls).toEqual(["http://localhost:3000/"]);
  expect(result.summary.errors).toBe(1);
  expect(result.diagnostics[0]).toMatchObject({
    severity: "error",
    code: "CMS-ROUTE-INVALID",
    message:
      "Route for document doc-1 must resolve to a same-origin path starting with a single /",
  });
});

test("scanDocuments redacts route query strings from diagnostics", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      routes: [
        {
          type: "page",
          pattern: "/:uid",
          getPath: () => "/preview?token=secret-person-token",
        },
      ],
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "preview",
        status: "published",
        data: { meta_title: "Preview", meta_description: "Preview page" },
      },
    ],
    fetch: async (url) => {
      if (String(url).includes("/preview?token=secret-person-token")) {
        return new Response("missing", { status: 404 });
      }

      return new Response("ok");
    },
  });

  expect(result.summary.errors).toBe(1);
  expect(result.diagnostics[0]).toMatchObject({
    code: "CMS-ROUTE-404",
    path: "/preview?[redacted]",
    message: "Route /preview?[redacted] returned 404",
  });
  expect(JSON.stringify(result.diagnostics)).not.toContain(
    "secret-person-token",
  );
});

test("scanDocuments redacts route resolver error messages", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      routes: [
        {
          type: "page",
          pattern: "/:uid",
          getPath: () => {
            throw new Error(
              "preview failed?token=secret-route-token Bearer secret-bearer",
            );
          },
        },
      ],
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "preview",
        status: "published",
        data: { meta_title: "Preview", meta_description: "Preview page" },
      },
    ],
    filters: { only: ["routes"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.summary.errors).toBe(1);
  expect(result.diagnostics[0]).toMatchObject({
    severity: "error",
    code: "CMS-ROUTE-RESOLVE",
    message: "preview failed?token=[redacted] Bearer [redacted]",
  });
  expect(JSON.stringify(result.diagnostics)).not.toContain(
    "secret-route-token",
  );
  expect(JSON.stringify(result.diagnostics)).not.toContain("secret-bearer");
});

test("scanDocuments treats a non-OK site root as unreachable", async () => {
  await expect(
    scanDocuments({
      config: baseConfig,
      project: {
        framework: "next",
        router: "app",
        rootDir: "/site",
        appDir: "/site/app",
      },
      documents: [
        {
          id: "doc-1",
          type: "page",
          uid: "about",
          status: "published",
          data: {},
        },
      ],
      fetch: async () => new Response("server error", { status: 500 }),
    }),
  ).rejects.toThrow(/HTTP 500/);
});

test("scanDocuments redacts sensitive site URL values from unreachable errors", async () => {
  await expect(
    scanDocuments({
      config: {
        ...baseConfig,
        site: {
          url: "http://user:pass@localhost:3000/?token=secret-site-token",
        },
      },
      project: {
        framework: "next",
        router: "app",
        rootDir: "/site",
        appDir: "/site/app",
      },
      documents: [
        {
          id: "doc-1",
          type: "page",
          uid: "about",
          status: "published",
          data: {},
        },
      ],
      fetch: async () => new Response("server error", { status: 500 }),
    }),
  ).rejects.toThrow(
    "Site http://[redacted]@localhost:3000/?[redacted] returned HTTP 500",
  );

  await expect(
    scanDocuments({
      config: {
        ...baseConfig,
        site: {
          url: "http://user:pass@localhost:3000/?token=secret-site-token",
        },
      },
      project: {
        framework: "next",
        router: "app",
        rootDir: "/site",
        appDir: "/site/app",
      },
      documents: [
        {
          id: "doc-1",
          type: "page",
          uid: "about",
          status: "published",
          data: {},
        },
      ],
      fetch: async () => new Response("server error", { status: 500 }),
    }),
  ).rejects.not.toThrow(/secret-site-token|user:pass/);
});

test("scanDocuments can limit scanned documents by content type", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      routes: [
        ...baseConfig.routes,
        {
          type: "blog_post",
          pattern: "/blog/:uid",
          getPath: (doc: { uid?: string }) => `/blog/${doc.uid}`,
        },
      ],
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: { meta_title: "About", meta_description: "About page" },
      },
      {
        id: "post-1",
        type: "blog_post",
        uid: "missing-post",
        status: "published",
        data: { meta_title: "", meta_description: "" },
      },
    ],
    filters: { types: ["page"] },
    fetch: async (url) => {
      if (String(url) === "http://localhost:3000/") {
        return new Response("ok");
      }

      if (String(url).endsWith("/about")) {
        return new Response("ok");
      }

      return new Response("missing", { status: 404 });
    },
  });

  expect(result.documents.map((document) => document.id)).toEqual(["page-1"]);
  expect(result.diagnostics).toEqual([]);
});

test("scanDocuments can run only selected check groups", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {
          meta_title: "",
          meta_description: "",
          hero_image: { url: "https://images.example/about.jpg", alt: "" },
        },
      },
    ],
    filters: { only: ["routes"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.diagnostics).toEqual([]);
  expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0 });
});

test("scanDocuments runs image alt checks when only a11y is selected", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {
          meta_title: "About",
          meta_description: "About page",
          hero_image: { url: "https://images.example/about.jpg", alt: "" },
        },
      },
    ],
    filters: { only: ["a11y"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
    "A11Y-IMG-ALT",
  ]);
});

test("scanDocuments honors SEO and image sub-check switches", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: {
        routes: false,
        seo: { metaTitle: false, metaDescription: true },
        a11y: { imgAlt: false },
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {
          meta_title: "",
          meta_description: "",
          hero_image: { url: "https://images.example/about.jpg", alt: "" },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(result.diagnostics).toEqual([
    {
      severity: "warning",
      code: "SEO-META-MISSING",
      message: "Document page-1 is missing meta_description",
      source: "prismic:page#page-1",
    },
  ]);
});

test("scanDocuments recognizes provider-specific SEO fields", async () => {
  const cases = [
    {
      cms: {
        provider: "prismic" as const,
        repositoryName: "demo",
      },
      data: {
        seo_title: "Prismic SEO title",
        seo_description: "Prismic SEO description",
      },
    },
    {
      cms: {
        provider: "strapi" as const,
        url: "http://localhost:1337",
        collections: [{ type: "page", endpoint: "pages" }],
      },
      data: {
        seo: {
          metaTitle: "Strapi SEO title",
          metaDescription: "Strapi SEO description",
        },
      },
    },
    {
      cms: {
        provider: "directus" as const,
        url: "http://localhost:8055",
        collections: [{ type: "page", collection: "pages" }],
      },
      data: {
        seo: {
          title: "Directus SEO title",
          description: "Directus SEO description",
        },
      },
    },
    {
      cms: {
        provider: "wordpress" as const,
        url: "http://localhost:8080",
      },
      data: {
        yoast_head_json: {
          title: "WordPress SEO title",
          description: "WordPress SEO description",
        },
      },
    },
  ];

  for (const { cms, data } of cases) {
    const result = await scanDocuments({
      config: {
        ...baseConfig,
        cms,
        checks: { routes: false, a11y: false, images: false, fields: false },
      },
      project: {
        framework: "next",
        router: "app",
        rootDir: "/site",
        appDir: "/site/app",
      },
      documents: [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data,
        },
      ],
      fetch: async () => new Response("ok"),
    });

    expect(result.diagnostics).toEqual([]);
  }
});

test("scanDocuments reports provider-specific image alt gaps with provider sources", async () => {
  const cases = [
    {
      cms: {
        provider: "strapi" as const,
        url: "http://localhost:1337",
        collections: [{ type: "page", endpoint: "pages" }],
      },
      data: {
        cover: {
          url: "/uploads/cover.jpg",
          alternativeText: "",
        },
      },
      expectedSource: "strapi:page#page-1",
      expectedPath: "data.cover",
    },
    {
      cms: {
        provider: "directus" as const,
        url: "http://localhost:8055",
        collections: [{ type: "page", collection: "pages" }],
      },
      data: {
        hero: {
          type: "image/jpeg",
          filename_download: "hero.jpg",
          description: "picture",
        },
      },
      expectedSource: "directus:page#page-1",
      expectedPath: "data.hero",
    },
    {
      cms: {
        provider: "wordpress" as const,
        url: "http://localhost:8080",
      },
      data: {
        featured_image: {
          source_url: "https://example.com/featured.jpg",
          alt_text: "",
        },
      },
      expectedSource: "wordpress:page#page-1",
      expectedPath: "data.featured_image",
    },
  ];

  for (const { cms, data, expectedSource, expectedPath } of cases) {
    const result = await scanDocuments({
      config: {
        ...baseConfig,
        cms,
        checks: { routes: false, seo: false, fields: false },
      },
      project: {
        framework: "next",
        router: "app",
        rootDir: "/site",
        appDir: "/site/app",
      },
      documents: [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data,
        },
      ],
      fetch: async () => new Response("ok"),
    });

    expect(result.diagnostics).toEqual([
      {
        severity: "warning",
        code: "A11Y-IMG-ALT",
        message: `Image field ${expectedPath} is missing useful alt text`,
        source: expectedSource,
      },
    ]);
  }
});

test("scanDocuments ignores Strapi derived image formats when the parent media has alt text", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      cms: {
        provider: "strapi" as const,
        url: "http://localhost:1337",
        collections: [{ type: "page", endpoint: "pages" }],
      },
      checks: { routes: false, seo: false, fields: false },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {
          cover: {
            url: "/uploads/cover.jpg",
            alternativeText: "Rocket launch cover",
            mime: "image/jpeg",
            formats: {
              thumbnail: {
                url: "/uploads/thumbnail_cover.jpg",
                mime: "image/jpeg",
              },
              small: {
                url: "/uploads/small_cover.jpg",
                mime: "image/jpeg",
              },
            },
          },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(result.diagnostics).toEqual([]);
});

test("scanDocuments reports unrouted CMS document types as info", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "settings-1",
        type: "settings",
        status: "published",
        data: { meta_title: "Settings", meta_description: "Site settings" },
      },
    ],
    filters: { only: ["routes"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 1 });
  expect(result.diagnostics).toEqual([
    {
      severity: "info",
      code: "CMS-ROUTE-UNMAPPED",
      message:
        "Document settings-1 of type settings has no configured route mapping",
      source: "prismic:settings#settings-1",
    },
  ]);
});

test("scanDocuments does not report unmapped routes for non-routable CMS documents", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "navbar-1",
        type: "navbar",
        status: "published",
        routable: false,
        data: { meta_title: "Navbar", meta_description: "Global navigation" },
      },
    ],
    filters: { only: ["routes"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0 });
  expect(result.diagnostics).toEqual([]);
});

test("scanDocuments reports configured required field diagnostics", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: {
        routes: false,
        seo: false,
        a11y: false,
        images: false,
        fields: {
          required: [
            { type: "page", path: "headline" },
            { type: "page", path: "hero.cta_label", severity: "warning" },
          ],
        },
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: { headline: "", hero: { cta_label: "" } },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(result.summary).toEqual({ errors: 1, warnings: 1, info: 0 });
  expect(result.diagnostics).toEqual([
    {
      severity: "error",
      code: "CMS-FIELD-MISSING",
      message: "Document page-1 is missing required field data.headline",
      path: "data.headline",
      source: "prismic:page#page-1",
    },
    {
      severity: "warning",
      code: "CMS-FIELD-MISSING",
      message: "Document page-1 is missing required field data.hero.cta_label",
      path: "data.hero.cta_label",
      source: "prismic:page#page-1",
    },
  ]);
});

test("scanDocuments reports configured relationship diagnostics", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      cms: {
        provider: "directus",
        url: "http://localhost:8055",
        collections: [
          { type: "menu_item", collection: "menu_items" },
          {
            type: "pricing",
            collection: "item_branch_pricing",
            routable: false,
          },
        ],
      },
      checks: {
        routes: false,
        seo: false,
        a11y: false,
        images: false,
        fields: false,
        relationships: [
          {
            from: "menu_item",
            to: "pricing",
            where: { fromField: "id", toField: "menu_item_id" },
            min: 1,
            severity: "warning",
          },
        ],
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "item-1",
        type: "menu_item",
        uid: "burger",
        status: "published",
        data: { id: 10, name: "Burger" },
      },
      {
        id: "item-2",
        type: "menu_item",
        uid: "fries",
        status: "published",
        data: { id: 20, name: "Fries" },
      },
      {
        id: "pricing-1",
        type: "pricing",
        status: "published",
        routable: false,
        data: { id: 1, menu_item_id: 20, price: 12 },
      },
    ],
    filters: { only: ["relationships"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.summary).toEqual({ errors: 0, warnings: 1, info: 0 });
  expect(result.diagnostics).toEqual([
    {
      severity: "warning",
      code: "CMS-RELATIONSHIP-MISSING",
      message:
        "Document item-1 of type menu_item has 0 pricing records matching id -> menu_item_id; expected at least 1",
      path: "relationships.menu_item.pricing",
      source: "directus:menu_item#item-1",
    },
  ]);
});

test("scanDocuments limits concurrent route probes", async () => {
  let activeRequests = 0;
  let maxActiveRequests = 0;

  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: Array.from({ length: 5 }, (_, index) => ({
      id: `page-${index}`,
      type: "page",
      uid: `page-${index}`,
      status: "published" as const,
      data: {
        meta_title: `Page ${index}`,
        meta_description: `Page ${index}`,
      },
    })),
    concurrency: 2,
    fetch: async () => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeRequests -= 1;
      return new Response("ok");
    },
  });

  expect(result.summary.errors).toBe(0);
  expect(maxActiveRequests).toBeLessThanOrEqual(2);
});

test("scanDocuments reports a route probe network failure as a diagnostic", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "unstable",
        status: "published",
        data: {
          meta_title: "Unstable",
          meta_description: "Unstable page",
        },
      },
    ],
    fetch: async (url) => {
      if (String(url).endsWith("/unstable")) {
        throw new Error(
          "socket hang up?token=secret-token Bearer header-token",
        );
      }

      return new Response("ok");
    },
  });

  expect(result.summary.errors).toBe(1);
  expect(result.diagnostics[0]).toMatchObject({
    severity: "error",
    code: "CMS-ROUTE-ERROR",
    path: "/unstable",
    message:
      "Route /unstable could not be fetched: socket hang up?token=[redacted] Bearer [redacted]",
  });
  expect(result.diagnostics[0].message).not.toContain("secret-token");
  expect(result.diagnostics[0].message).not.toContain("header-token");
});

test("scanDocuments retries transient route probe failures", async () => {
  let attempts = 0;

  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "flaky",
        status: "published",
        data: {
          meta_title: "Flaky",
          meta_description: "Flaky page",
        },
      },
    ],
    retries: 1,
    sleep: async () => {},
    fetch: async (url) => {
      if (String(url).endsWith("/flaky")) {
        attempts += 1;
        if (attempts === 1) {
          return new Response("server error", { status: 503 });
        }
      }

      return new Response("ok");
    },
  });

  expect(attempts).toBe(2);
  expect(result.diagnostics).toEqual([]);
});

test("retryDelayMs honours Retry-After seconds and caps at 30s", () => {
  const headers = (value: string) =>
    new Response("", { headers: { "Retry-After": value } });

  expect(retryDelayMs(0, headers("2"))).toBe(2000);
  expect(retryDelayMs(0, headers("0"))).toBe(0);
  // 60 seconds is over the 30s cap
  expect(retryDelayMs(0, headers("60"))).toBe(30_000);
});

test("retryDelayMs honours Retry-After HTTP-date", () => {
  const futureSeconds = 5;
  const future = new Date(Date.now() + futureSeconds * 1000).toUTCString();
  const response = new Response("", { headers: { "Retry-After": future } });
  const delay = retryDelayMs(0, response);
  // Allow a small clock skew window: 4s..6s
  expect(delay).toBeGreaterThanOrEqual(3_500);
  expect(delay).toBeLessThanOrEqual(6_500);
});

test("retryDelayMs falls back to exponential backoff when no header is present", () => {
  // attempt 0: base 250 + jitter [0..250) -> [250..500)
  const d0 = retryDelayMs(0);
  expect(d0).toBeGreaterThanOrEqual(250);
  expect(d0).toBeLessThan(500);

  // attempt 1: base 500 + jitter -> [500..750)
  const d1 = retryDelayMs(1);
  expect(d1).toBeGreaterThanOrEqual(500);
  expect(d1).toBeLessThan(750);

  // attempt 4: base 4000 + jitter -> [4000..4250)
  const d4 = retryDelayMs(4);
  expect(d4).toBeGreaterThanOrEqual(4000);
  expect(d4).toBeLessThan(4250);

  // attempt 10 would explode without the cap; ensure we cap at 8000
  expect(retryDelayMs(10)).toBe(8_000);
});

test("scanDocuments waits Retry-After before a 429 retry", async () => {
  const sleepCalls: number[] = [];
  let attempts = 0;

  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "rate-limited",
        status: "published",
        data: { meta_title: "Rate", meta_description: "Rate-limited page" },
      },
    ],
    retries: 1,
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
    fetch: async (url) => {
      if (String(url).endsWith("/rate-limited")) {
        attempts += 1;
        if (attempts === 1) {
          return new Response("slow down", {
            status: 429,
            headers: { "Retry-After": "2" },
          });
        }
      }

      return new Response("ok");
    },
  });

  expect(attempts).toBe(2);
  expect(sleepCalls).toEqual([2000]);
  expect(result.diagnostics).toEqual([]);
});

test("scanDocuments backs off with growing delays on repeated 503", async () => {
  const sleepCalls: number[] = [];
  let attempts = 0;

  await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-1",
        type: "page",
        uid: "down",
        status: "published",
        data: { meta_title: "Down", meta_description: "Down page" },
      },
    ],
    retries: 2,
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
    fetch: async (url) => {
      if (String(url).endsWith("/down")) {
        attempts += 1;
        return new Response("server error", { status: 503 });
      }

      return new Response("ok");
    },
  });

  // 1 initial attempt + 2 retries = 3 attempts, so 2 sleeps between them
  expect(attempts).toBe(3);
  expect(sleepCalls).toHaveLength(2);
  expect(sleepCalls[1]).toBeGreaterThan(sleepCalls[0]);
});

test("redactSensitive scrubs URL query token shapes", () => {
  const input =
    "GET https://api.example.com/?access_token=alpha&token=beta&password=gamma&secret=delta&api_key=eps&api-key=zeta&apikey=eta&x-api-key=theta&authorization=iota";
  const out = redactSensitive(input);

  for (const value of [
    "alpha",
    "beta",
    "gamma",
    "delta",
    "eps",
    "zeta",
    "eta",
    "theta",
    "iota",
  ]) {
    expect(out).not.toContain(value);
  }
  expect(out).toContain("access_token=[redacted]");
  expect(out).toContain("token=[redacted]");
  expect(out).toContain("password=[redacted]");
  expect(out).toContain("secret=[redacted]");
  expect(out).toContain("api_key=[redacted]");
  expect(out).toContain("api-key=[redacted]");
  expect(out).toContain("apikey=[redacted]");
  expect(out).toContain("x-api-key=[redacted]");
  expect(out).toContain("authorization=[redacted]");
});

test("redactSensitive scrubs Bearer headers and basic auth in URLs", () => {
  const out = redactSensitive(
    "Bearer abc123.def-456_789 from https://user:hunter2@example.com/path",
  );
  expect(out).not.toContain("abc123.def-456_789");
  expect(out).not.toContain("hunter2");
  expect(out).toContain("Bearer [redacted]");
  expect(out).toContain("https://[redacted]@example.com");
});

test("redactSensitive scrubs JWT tokens that are not prefixed with Bearer", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
  const out = redactSensitive(`token: ${jwt} captured`);
  expect(out).not.toContain(jwt);
  expect(out).toContain("[redacted]");
  expect(out).toContain("captured");
});

test("redactSensitive scrubs Stripe-style sk_/pk_/rk_ keys", () => {
  // Constructed via concatenation so GitHub Push Protection does not flag
  // these synthetic fixtures as real Stripe keys.
  const inputs = [
    "sk" + "_live_" + "FIXTUREFIXTUREFIXTURE001",
    "sk" + "_test_" + "FIXTUREFIXTUREFIXTURE002",
    "pk" + "_live_" + "FIXTUREFIXTUREFIXTURE003",
    "rk" + "_live_" + "FIXTUREFIXTUREFIXTURE004",
  ];
  for (const key of inputs) {
    const out = redactSensitive(`leaked: ${key}`);
    expect(out, key).not.toContain(key);
    expect(out, key).toContain("[redacted]");
  }
});

test("redactSensitive scrubs OpenAI / Anthropic style sk- keys", () => {
  // Constructed via concatenation so secret scanners do not flag fixtures.
  const inputs = [
    "sk-" + "proj-" + "FIXTUREFIXTUREFIXTUREFIXTURE01",
    "sk-" + "ant-" + "FIXTUREFIXTUREFIXTUREFIXTURE02",
  ];
  for (const key of inputs) {
    const out = redactSensitive(`leaked: ${key}`);
    expect(out, key).not.toContain(key);
  }
});

test("redactSensitive scrubs GitHub PATs", () => {
  // Constructed via concatenation so GitHub Push Protection does not flag
  // these synthetic fixtures as real PATs.
  const inputs = [
    "ghp" + "_" + "FIXTUREFIXTUREFIXTUREFIXTUREfix01",
    "gho" + "_" + "FIXTUREFIXTUREFIXTUREFIXTUREfix02",
    "ghs" + "_" + "FIXTUREFIXTUREFIXTUREFIXTUREfix03",
    "ghu" + "_" + "FIXTUREFIXTUREFIXTUREFIXTUREfix04",
    "ghr" + "_" + "FIXTUREFIXTUREFIXTUREFIXTUREfix05",
    "github" + "_pat_" + "FIXTUREFIXTUREFIXTUREFIXTURE_fix06",
  ];
  for (const key of inputs) {
    const out = redactSensitive(`see ${key} now`);
    expect(out, key).not.toContain(key);
  }
});

test("redactSensitive leaves harmless text alone", () => {
  const text =
    "Scan complete. 0 errors, 2 warnings. Site http://example.com responded with HTTP 200.";
  expect(redactSensitive(text)).toBe(text);
});

test("scanDocuments flags WordPress block-editor img tags missing alt", async () => {
  const wordpressConfig = {
    site: { url: "http://localhost:3000" },
    framework: { type: "next" as const, router: "app" as const },
    cms: {
      provider: "wordpress" as const,
      url: "http://localhost:8080",
    },
    routes: [
      {
        type: "post",
        pattern: "/blog/:uid",
        getPath: (doc: { uid?: string }) => `/blog/${doc.uid}`,
      },
    ],
  };

  const result = await scanDocuments({
    config: wordpressConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "post-1",
        type: "post",
        uid: "hello-world",
        status: "published",
        data: {
          meta_title: "Hello",
          meta_description: "Hello world post",
          content: {
            rendered:
              '<p>Hello there.</p>\n<figure class="wp-block-image"><img src="https://example.com/cat.jpg" alt=""/></figure>\n<p>And again:</p>\n<figure class="wp-block-image"><img src="https://example.com/dog.jpg" alt="image"/></figure>\n<figure class="wp-block-image"><img src="https://example.com/bird.jpg" alt="A goldfinch on a branch"/></figure>',
          },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  const altDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.code === "A11Y-IMG-ALT",
  );

  // Two missing-or-placeholder alts (cat blank, dog "image"); bird is fine.
  expect(altDiagnostics).toHaveLength(2);
  expect(altDiagnostics[0].message).toContain("data.content.rendered[0].alt");
  expect(altDiagnostics[1].message).toContain("data.content.rendered[1].alt");
});

test("scanDocuments flags soft-404 bodies when checks.routes.soft404 is configured", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: {
        routes: {
          soft404: {
            strings: ["Page not found"],
            titlePattern: "^404",
          },
        },
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc-missing-content",
        type: "page",
        uid: "ghost",
        status: "published",
        data: { meta_title: "Ghost", meta_description: "ghost page" },
      },
      {
        id: "doc-404-title",
        type: "page",
        uid: "stale",
        status: "published",
        data: { meta_title: "Stale", meta_description: "stale page" },
      },
      {
        id: "doc-fine",
        type: "page",
        uid: "real",
        status: "published",
        data: { meta_title: "Real", meta_description: "real page" },
      },
    ],
    fetch: async (url) => {
      const href = String(url);
      if (href.endsWith("/ghost")) {
        return new Response(
          "<html><body><h1>Page not found</h1></body></html>",
        );
      }
      if (href.endsWith("/stale")) {
        return new Response(
          "<html><head><title>404 - Stale post</title></head><body>oops</body></html>",
        );
      }
      return new Response(
        "<html><head><title>Real page</title></head><body>welcome</body></html>",
      );
    },
  });

  const soft404 = result.diagnostics.filter(
    (diagnostic) => diagnostic.code === "CMS-ROUTE-SOFT-404",
  );
  expect(soft404).toHaveLength(2);
  expect(soft404.map((d) => d.path).sort()).toEqual(["/ghost", "/stale"]);
});

test("scanDocuments leaves soft-404 detection off when not configured", async () => {
  const result = await scanDocuments({
    config: baseConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "doc",
        type: "page",
        uid: "ghost",
        status: "published",
        data: { meta_title: "Ghost", meta_description: "ghost page" },
      },
    ],
    fetch: async () =>
      new Response("<html><body><h1>Page not found</h1></body></html>"),
  });

  expect(
    result.diagnostics.filter(
      (diagnostic) => diagnostic.code === "CMS-ROUTE-SOFT-404",
    ),
  ).toEqual([]);
});

test("scanDocuments accepts Sanity asset-level altText when field alt is blank", async () => {
  const sanityConfig = {
    site: { url: "http://localhost:3000" },
    framework: { type: "next" as const, router: "app" as const },
    cms: {
      provider: "sanity" as const,
      projectId: "demo",
      dataset: "production",
      contentTypes: [{ type: "page", documentType: "page" }],
    },
    routes: [
      {
        type: "page",
        pattern: "/:uid",
        getPath: (doc: { uid?: string }) => `/${doc.uid}`,
      },
    ],
  };

  const result = await scanDocuments({
    config: sanityConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-1",
        type: "page",
        uid: "asset-alt",
        status: "published",
        data: {
          meta_title: "Asset alt",
          meta_description: "asset alt page",
          hero: {
            _type: "image",
            asset: {
              _ref: "image-cat-100x100-jpg",
              altText: "Cat napping in sun",
            },
            // No field-level alt; asset-level altText should rescue it.
          },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(
    result.diagnostics.filter(
      (diagnostic) => diagnostic.code === "A11Y-IMG-ALT",
    ),
  ).toEqual([]);
});

test("scanDocuments still flags Sanity images with no field or asset alt", async () => {
  const sanityConfig = {
    site: { url: "http://localhost:3000" },
    framework: { type: "next" as const, router: "app" as const },
    cms: {
      provider: "sanity" as const,
      projectId: "demo",
      dataset: "production",
      contentTypes: [{ type: "page", documentType: "page" }],
    },
    routes: [
      {
        type: "page",
        pattern: "/:uid",
        getPath: (doc: { uid?: string }) => `/${doc.uid}`,
      },
    ],
  };

  const result = await scanDocuments({
    config: sanityConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "page-2",
        type: "page",
        uid: "no-alt",
        status: "published",
        data: {
          meta_title: "No alt",
          meta_description: "page with no alt anywhere",
          hero: {
            _type: "image",
            asset: { _ref: "image-cat-100x100-jpg" },
          },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(
    result.diagnostics.filter(
      (diagnostic) => diagnostic.code === "A11Y-IMG-ALT",
    ),
  ).toHaveLength(1);
});

test("scanDocuments leaves WordPress posts with usable alt text silent", async () => {
  const wordpressConfig = {
    site: { url: "http://localhost:3000" },
    framework: { type: "next" as const, router: "app" as const },
    cms: {
      provider: "wordpress" as const,
      url: "http://localhost:8080",
    },
    routes: [
      {
        type: "post",
        pattern: "/blog/:uid",
        getPath: (doc: { uid?: string }) => `/blog/${doc.uid}`,
      },
    ],
  };

  const result = await scanDocuments({
    config: wordpressConfig,
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "post-2",
        type: "post",
        uid: "alt-ok",
        status: "published",
        data: {
          meta_title: "Alt OK",
          meta_description: "All good",
          content: {
            rendered:
              "<p>Intro.</p><figure><img src=\"https://example.com/a.jpg\" alt='A close-up of green leaves'></figure>",
          },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(
    result.diagnostics.filter(
      (diagnostic) => diagnostic.code === "A11Y-IMG-ALT",
    ),
  ).toEqual([]);
});

test("scanDocuments surfaces custom rule diagnostics in the result", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: {
        routes: false,
        seo: false,
        a11y: false,
        images: false,
        fields: false,
        custom: [
          {
            code: "MENU-PRICE",
            type: "page",
            path: "price",
            assert: { gt: 0 },
            message: "price must be > 0",
          },
        ],
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "ok",
        type: "page",
        uid: "a",
        status: "published",
        data: { price: 9 },
      },
      {
        id: "bad",
        type: "page",
        uid: "b",
        status: "published",
        data: { price: 0 },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  const custom = result.diagnostics.filter((d) => d.code === "MENU-PRICE");
  expect(custom).toEqual([
    {
      severity: "error",
      code: "MENU-PRICE",
      message: "price must be > 0",
      path: "data.price",
      source: "prismic:page#bad",
    },
  ]);
  expect(result.summary.errors).toBe(1);
});

test("scanDocuments skips custom rules when filtered out via --skip", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: {
        routes: false,
        custom: [{ type: "page", path: "price", assert: { gt: 0 } }],
      },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "bad",
        type: "page",
        uid: "b",
        status: "published",
        data: { price: 0 },
      },
    ],
    filters: { skip: ["custom"] },
    fetch: async () => new Response("ok"),
  });

  expect(result.diagnostics.filter((d) => d.code === "CUSTOM-RULE")).toEqual(
    [],
  );
});

test("scanDocuments flags Payload media missing alt and SEO meta", async () => {
  const result = await scanDocuments({
    config: {
      site: { url: "http://localhost:3000" },
      framework: { type: "next" as const, router: "app" as const },
      cms: {
        provider: "payload" as const,
        url: "http://localhost:3000",
        collections: [{ type: "page", collection: "pages", uidField: "slug" }],
      },
      routes: [
        {
          type: "page",
          pattern: "/:slug",
          getPath: (doc: { uid?: string }) => `/${doc.uid}`,
        },
      ],
      checks: { routes: false },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "p1",
        type: "page",
        uid: "home",
        status: "published",
        data: {
          meta: { title: "Home", description: "Welcome" },
          hero: {
            url: "/media/hero.jpg",
            mimeType: "image/jpeg",
            filename: "hero.jpg",
            alt: "",
          },
        },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(result.diagnostics.map((d) => d.code)).toContain("A11Y-IMG-ALT");
  expect(
    result.diagnostics.filter((d) => d.code === "SEO-META-MISSING"),
  ).toEqual([]);
});

test("scanDocuments flags two published documents that resolve to the same route", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: { seo: false, a11y: false, images: false, fields: false },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      {
        id: "winner",
        type: "page",
        uid: "about",
        status: "published",
        data: {},
      },
      {
        id: "loser",
        type: "page",
        uid: "about",
        status: "published",
        data: {},
      },
      // Draft sharing the same slug must NOT be flagged.
      { id: "draft", type: "page", uid: "about", status: "draft", data: {} },
    ],
    fetch: async () => new Response("ok"),
  });

  const dupes = result.diagnostics.filter(
    (d) => d.code === "CMS-ROUTE-DUPLICATE",
  );
  expect(dupes).toHaveLength(1);
  expect(dupes[0]).toMatchObject({
    severity: "error",
    code: "CMS-ROUTE-DUPLICATE",
    path: "/about",
    source: "prismic:page#loser",
  });
  expect(dupes[0].message).toContain("winner");
});

test("scanDocuments does not flag duplicates across distinct paths", async () => {
  const result = await scanDocuments({
    config: {
      ...baseConfig,
      checks: { seo: false, a11y: false, images: false, fields: false },
    },
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [
      { id: "a", type: "page", uid: "about", status: "published", data: {} },
      { id: "b", type: "page", uid: "contact", status: "published", data: {} },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(
    result.diagnostics.filter((d) => d.code === "CMS-ROUTE-DUPLICATE"),
  ).toEqual([]);
});
