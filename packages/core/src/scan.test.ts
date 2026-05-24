import { scanDocuments } from "@cms-lab/core";

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
