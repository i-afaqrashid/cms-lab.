import { fetchSanityDocuments, normalizeSanityDocument } from "@cms-lab/sanity";

test("fetchSanityDocuments queries Sanity document types", async () => {
  const calls: Array<{ url: string; authorization?: string }> = [];

  const documents = await fetchSanityDocuments(
    {
      provider: "sanity",
      projectId: "project123",
      dataset: "production",
      apiVersion: "2025-02-19",
      token: "read-token",
      contentTypes: [{ type: "article", documentType: "post" }],
    },
    {
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          authorization: (init?.headers as Record<string, string>)
            ?.Authorization,
        });

        return Response.json({
          result: [
            {
              _id: "post-1",
              _type: "post",
              slug: { current: "launch" },
              title: "Launch",
              seo: { title: "Launch", description: "Launch notes" },
            },
            {
              _id: "drafts.post-2",
              _type: "post",
              uid: "draft",
              title: "Draft",
            },
          ],
        });
      },
    },
  );

  expect(documents).toEqual([
    {
      id: "post-1",
      type: "article",
      uid: "launch",
      status: "published",
      data: {
        _id: "post-1",
        _type: "post",
        slug: { current: "launch" },
        title: "Launch",
        seo: { title: "Launch", description: "Launch notes" },
      },
    },
    {
      id: "drafts.post-2",
      type: "article",
      uid: "draft",
      status: "draft",
      data: {
        _id: "drafts.post-2",
        _type: "post",
        uid: "draft",
        title: "Draft",
      },
    },
  ]);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toContain(
    "https://project123.api.sanity.io/v2025-02-19/data/query/production",
  );
  expect(calls[0]?.url).toContain("query=*%5B_type+%3D%3D+%24type%5D");
  expect(calls[0]?.url).toContain("%24type=%22post%22");
  expect(calls[0]?.url).toContain("perspective=published");
  expect(calls[0]?.authorization).toBe("Bearer read-token");
});

test("fetchSanityDocuments can use the API CDN", async () => {
  const urls: string[] = [];

  await fetchSanityDocuments(
    {
      provider: "sanity",
      projectId: "project123",
      dataset: "production",
      useCdn: true,
      contentTypes: [{ type: "page", documentType: "page" }],
    },
    {
      fetch: async (url) => {
        urls.push(String(url));
        return Response.json({ result: [] });
      },
    },
  );

  expect(urls[0]).toContain("https://project123.apicdn.sanity.io/");
});

test("normalizeSanityDocument supports slug strings and draft ids", () => {
  expect(
    normalizeSanityDocument("page", {
      _id: "drafts.page-home",
      _type: "page",
      slug: "home",
      image: { asset: { _ref: "image-id" }, alt: "Home" },
    }),
  ).toEqual({
    id: "drafts.page-home",
    type: "page",
    uid: "home",
    status: "draft",
    data: {
      _id: "drafts.page-home",
      _type: "page",
      slug: "home",
      image: { asset: { _ref: "image-id" }, alt: "Home" },
    },
  });
});

test("normalizeSanityDocument supports configured uid and url fields", () => {
  expect(
    normalizeSanityDocument(
      {
        type: "article",
        documentType: "post",
        uidField: "routing.handle",
        urlField: "seo.canonical",
      },
      {
        _id: "post-custom-route",
        _type: "post",
        slug: { current: "ignored-slug" },
        routing: {
          handle: "custom-article",
        },
        seo: {
          canonical: "https://example.com/blog/custom-article",
        },
      },
    ),
  ).toMatchObject({
    id: "post-custom-route",
    type: "article",
    uid: "custom-article",
    url: "https://example.com/blog/custom-article",
    status: "published",
  });
});

test("fetchSanityDocuments reports HTTP failures", async () => {
  await expect(
    fetchSanityDocuments(
      {
        provider: "sanity",
        projectId: "project123",
        dataset: "production",
        contentTypes: [{ type: "page", documentType: "page" }],
      },
      {
        fetch: async () => new Response("forbidden", { status: 403 }),
      },
    ),
  ).rejects.toThrow("Sanity request failed with HTTP 403");
});

test("fetchSanityDocuments hydrates altText from referenced image assets", async () => {
  const queries: string[] = [];

  const documents = await fetchSanityDocuments(
    {
      provider: "sanity",
      projectId: "project123",
      dataset: "production",
      contentTypes: [{ type: "page", documentType: "page" }],
    },
    {
      fetch: async (url) => {
        const href = String(url);
        queries.push(href);

        if (href.includes("sanity.imageAsset")) {
          return Response.json({
            result: [
              {
                _id: "image-cat-100x100-jpg",
                altText: "A grey cat napping in the sun",
                description: undefined,
                title: undefined,
              },
              {
                _id: "image-dog-200x200-jpg",
                altText: undefined,
                description: "Golden retriever on a beach",
                title: undefined,
              },
            ],
          });
        }

        return Response.json({
          result: [
            {
              _id: "page-1",
              _type: "page",
              slug: { current: "home" },
              hero: {
                _type: "image",
                asset: { _ref: "image-cat-100x100-jpg", _type: "reference" },
              },
              gallery: [
                {
                  _type: "image",
                  asset: { _ref: "image-dog-200x200-jpg", _type: "reference" },
                },
              ],
            },
          ],
        });
      },
    },
  );

  expect(queries).toHaveLength(2);
  expect(queries[1]).toContain("sanity.imageAsset");
  expect(queries[1]).toContain(encodeURIComponent("image-cat-100x100-jpg"));

  const data = documents[0]?.data as {
    hero: { asset: Record<string, unknown> };
    gallery: Array<{ asset: Record<string, unknown> }>;
  };
  expect(data.hero.asset.altText).toBe("A grey cat napping in the sun");
  expect(data.gallery[0]?.asset.description).toBe(
    "Golden retriever on a beach",
  );
});

test("fetchSanityDocuments skips the asset hydration query when no image refs exist", async () => {
  const queries: string[] = [];

  await fetchSanityDocuments(
    {
      provider: "sanity",
      projectId: "project123",
      dataset: "production",
      contentTypes: [{ type: "page", documentType: "page" }],
    },
    {
      fetch: async (url) => {
        queries.push(String(url));
        return Response.json({
          result: [
            {
              _id: "page-1",
              _type: "page",
              slug: { current: "no-images" },
              body: "All text, no pictures.",
            },
          ],
        });
      },
    },
  );

  expect(queries).toHaveLength(1);
  expect(queries[0]).not.toContain("sanity.imageAsset");
});

test("fetchSanityDocuments preserves pre-resolved altText on the asset reference", async () => {
  const documents = await fetchSanityDocuments(
    {
      provider: "sanity",
      projectId: "project123",
      dataset: "production",
      contentTypes: [{ type: "page", documentType: "page" }],
    },
    {
      fetch: async (url) => {
        const href = String(url);
        if (href.includes("sanity.imageAsset")) {
          return Response.json({
            result: [
              {
                _id: "image-cat-100x100-jpg",
                altText: "From asset doc",
              },
            ],
          });
        }
        return Response.json({
          result: [
            {
              _id: "page-1",
              _type: "page",
              slug: { current: "pre-resolved" },
              hero: {
                _type: "image",
                asset: {
                  _ref: "image-cat-100x100-jpg",
                  _type: "reference",
                  altText: "Pre-resolved in user query",
                },
              },
            },
          ],
        });
      },
    },
  );

  const data = documents[0]?.data as {
    hero: { asset: Record<string, unknown> };
  };
  expect(data.hero.asset.altText).toBe("Pre-resolved in user query");
});
