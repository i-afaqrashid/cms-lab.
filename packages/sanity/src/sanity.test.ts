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
