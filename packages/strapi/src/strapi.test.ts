import { fetchStrapiDocuments, normalizeStrapiItem } from "@cms-lab/strapi";

test("fetchStrapiDocuments normalizes Strapi REST documents", async () => {
  const calls: string[] = [];

  const documents = await fetchStrapiDocuments(
    {
      provider: "strapi",
      url: "http://localhost:1337",
      collections: [{ type: "page", endpoint: "pages" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        return Response.json({
          data: [
            {
              id: 1,
              documentId: "strapi-page-1",
              slug: "about",
              title: "About",
              meta_title: "About",
              meta_description: "About page",
              publishedAt: null,
            },
          ],
          meta: { pagination: { page: 1, pageCount: 1 } },
        });
      },
    },
  );

  expect(calls[0]).toContain("/api/pages");
  expect(calls[0]).toContain("pagination%5BpageSize%5D=100");
  expect(documents).toEqual([
    {
      id: "strapi-page-1",
      type: "page",
      uid: "about",
      entryKind: "collection",
      status: "draft",
      data: {
        id: 1,
        documentId: "strapi-page-1",
        slug: "about",
        title: "About",
        meta_title: "About",
        meta_description: "About page",
        publishedAt: null,
      },
    },
  ]);
});

test("fetchStrapiDocuments supports Strapi v4 attributes payloads", async () => {
  const documents = await fetchStrapiDocuments(
    {
      provider: "strapi",
      url: "http://localhost:1337",
      collections: [{ type: "article", endpoint: "articles" }],
    },
    {
      fetch: async () =>
        Response.json({
          data: [
            {
              id: 42,
              attributes: {
                slug: "v4-article",
                title: "Strapi v4 Article",
                meta_title: "Strapi v4 Article",
                meta_description: "From attributes",
                publishedAt: "2026-05-23T00:00:00.000Z",
              },
            },
          ],
          meta: { pagination: { page: 1, pageCount: 1 } },
        }),
    },
  );

  expect(documents).toEqual([
    {
      id: "42",
      type: "article",
      uid: "v4-article",
      entryKind: "collection",
      status: "published",
      data: {
        id: 42,
        slug: "v4-article",
        title: "Strapi v4 Article",
        meta_title: "Strapi v4 Article",
        meta_description: "From attributes",
        publishedAt: "2026-05-23T00:00:00.000Z",
      },
    },
  ]);
});

test("fetchStrapiDocuments fetches and normalizes Strapi single types as non-routable documents", async () => {
  const calls: string[] = [];

  const documents = await fetchStrapiDocuments(
    {
      provider: "strapi",
      url: "http://localhost:1337",
      singleTypes: [{ type: "navbar", endpoint: "navbar" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        return Response.json({
          data: {
            id: 3,
            attributes: {
              title: "Main navigation",
              meta_title: "Navigation",
              meta_description: "Global site navigation",
              publishedAt: "2026-05-26T00:00:00.000Z",
            },
          },
        });
      },
    },
  );

  expect(calls).toEqual(["http://localhost:1337/api/navbar?populate=*"]);
  expect(documents).toEqual([
    {
      id: "3",
      type: "navbar",
      entryKind: "single",
      status: "published",
      routable: false,
      data: {
        id: 3,
        title: "Main navigation",
        meta_title: "Navigation",
        meta_description: "Global site navigation",
        publishedAt: "2026-05-26T00:00:00.000Z",
      },
    },
  ]);
});

test("fetchStrapiDocuments adds Strapi locale query params for collections and single types", async () => {
  const calls: string[] = [];

  await fetchStrapiDocuments(
    {
      provider: "strapi",
      url: "http://localhost:1337",
      locale: "en",
      collections: [
        { type: "page", endpoint: "pages" },
        { type: "article", endpoint: "articles", locale: "all" },
      ],
      singleTypes: [{ type: "navbar", endpoint: "navbar" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        if (String(url).includes("/api/navbar")) {
          return Response.json({ data: { id: 1, publishedAt: null } });
        }

        return Response.json({
          data: [],
          meta: { pagination: { page: 1, pageCount: 1 } },
        });
      },
    },
  );

  expect(calls).toEqual([
    "http://localhost:1337/api/pages?pagination%5BpageSize%5D=100&pagination%5Bpage%5D=1&populate=*&locale=en",
    "http://localhost:1337/api/articles?pagination%5BpageSize%5D=100&pagination%5Bpage%5D=1&populate=*&locale=all",
    "http://localhost:1337/api/navbar?populate=*&locale=en",
  ]);
});

test("normalizeStrapiItem keeps rich SEO and media fields while treating non-published status as draft", () => {
  expect(
    normalizeStrapiItem("article", {
      id: 7,
      documentId: "strapi-article-7",
      slug: "launch",
      status: "archived",
      seo: {
        metaTitle: "Launch",
        metaDescription: "Launch notes",
      },
      cover: {
        url: "/uploads/launch.jpg",
        alternativeText: "Launch cover",
      },
    }),
  ).toEqual({
    id: "strapi-article-7",
    type: "article",
    uid: "launch",
    status: "draft",
    data: {
      id: 7,
      documentId: "strapi-article-7",
      slug: "launch",
      status: "archived",
      seo: {
        metaTitle: "Launch",
        metaDescription: "Launch notes",
      },
      cover: {
        url: "/uploads/launch.jpg",
        alternativeText: "Launch cover",
      },
    },
  });
});

test("normalizeStrapiItem supports configured uid and url fields", () => {
  expect(
    normalizeStrapiItem(
      {
        type: "article",
        endpoint: "articles",
        uidField: "routing.handle",
        urlField: "routing.path",
      },
      {
        id: 12,
        slug: "ignored-slug",
        routing: {
          handle: "custom-handle",
          path: "/articles/custom-handle",
        },
        publishedAt: "2026-05-23T00:00:00.000Z",
      },
    ),
  ).toMatchObject({
    id: "12",
    type: "article",
    uid: "custom-handle",
    url: "/articles/custom-handle",
    status: "published",
  });
});

test("fetchStrapiDocuments uses numeric ids and slugs when documentId is absent", async () => {
  const documents = await fetchStrapiDocuments(
    {
      provider: "strapi",
      url: "http://localhost:1337",
      collections: [{ type: "page", endpoint: "///api-pages///" }],
    },
    {
      fetch: async (url) => {
        expect(String(url)).toContain("/api/api-pages");

        return Response.json({
          data: [
            {
              id: 25,
              slug: "numeric-id-page",
              title: "Numeric id page",
              publishedAt: "2026-05-23T00:00:00.000Z",
            },
          ],
          meta: { pagination: { page: 1, pageCount: 1 } },
        });
      },
    },
  );

  expect(documents).toEqual([
    {
      id: "25",
      type: "page",
      uid: "numeric-id-page",
      entryKind: "collection",
      status: "published",
      data: {
        id: 25,
        slug: "numeric-id-page",
        title: "Numeric id page",
        publishedAt: "2026-05-23T00:00:00.000Z",
      },
    },
  ]);
});

test("fetchStrapiDocuments sends bearer tokens and reports HTTP failures", async () => {
  let authorization: string | null = null;

  await expect(
    fetchStrapiDocuments(
      {
        provider: "strapi",
        url: "http://localhost:1337",
        token: "strapi-token",
        collections: [{ type: "page", endpoint: "pages" }],
      },
      {
        fetch: async (_url, init) => {
          authorization =
            init?.headers instanceof Headers
              ? init.headers.get("authorization")
              : ((init?.headers as Record<string, string> | undefined)
                  ?.Authorization ?? null);

          return new Response("forbidden", { status: 403 });
        },
      },
    ),
  ).rejects.toThrow("Strapi request failed with HTTP 403");

  expect(authorization).toBe("Bearer strapi-token");
});
