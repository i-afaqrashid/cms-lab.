import {
  fetchContentfulDocuments,
  normalizeContentfulEntry,
} from "@cms-lab/contentful";

test("fetchContentfulDocuments normalizes Contentful entries and paginates", async () => {
  const calls: Array<{ url: string; authorization?: string }> = [];

  const documents = await fetchContentfulDocuments(
    {
      provider: "contentful",
      spaceId: "space123",
      accessToken: "delivery-token",
      contentTypes: [{ type: "article", contentType: "blogPost" }],
    },
    {
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          authorization: (init?.headers as Record<string, string>)
            ?.Authorization,
        });

        if (String(url).includes("skip=0")) {
          return Response.json({
            skip: 0,
            limit: 2,
            total: 3,
            items: [
              {
                sys: {
                  id: "entry-1",
                  contentType: { sys: { id: "blogPost" } },
                  updatedAt: "2026-01-01T00:00:00Z",
                },
                fields: {
                  slug: "launch",
                  title: "Launch",
                  metaDescription: "Launch notes",
                },
              },
              {
                sys: {
                  id: "entry-2",
                  contentType: { sys: { id: "blogPost" } },
                  updatedAt: "2026-01-02T00:00:00Z",
                },
                fields: { uid: "about", title: "About" },
              },
            ],
          });
        }

        return Response.json({
          skip: 2,
          limit: 2,
          total: 3,
          items: [
            {
              sys: {
                id: "entry-3",
                contentType: { sys: { id: "blogPost" } },
              },
              fields: { slug: "draftish", title: "Draftish" },
            },
          ],
        });
      },
    },
  );

  expect(documents).toEqual([
    {
      id: "entry-1",
      type: "article",
      uid: "launch",
      status: "published",
      data: {
        slug: "launch",
        title: "Launch",
        metaDescription: "Launch notes",
      },
    },
    {
      id: "entry-2",
      type: "article",
      uid: "about",
      status: "published",
      data: { uid: "about", title: "About" },
    },
    {
      id: "entry-3",
      type: "article",
      uid: "draftish",
      status: "draft",
      data: { slug: "draftish", title: "Draftish" },
    },
  ]);
  expect(calls).toHaveLength(2);
  expect(calls[0]?.url).toContain(
    "https://cdn.contentful.com/spaces/space123/environments/master/entries",
  );
  expect(calls[0]?.url).toContain("content_type=blogPost");
  expect(calls[0]?.url).toContain("limit=100");
  expect(calls[0]?.authorization).toBe("Bearer delivery-token");
  expect(calls[1]?.url).toContain("skip=2");
});

test("normalizeContentfulEntry flattens localized top-level fields", () => {
  expect(
    normalizeContentfulEntry("page", {
      sys: {
        id: "entry-localized",
        contentType: { sys: { id: "page" } },
        publishedVersion: 3,
      },
      fields: {
        slug: { "en-US": "home", "de-DE": "startseite" },
        meta_title: { "en-US": "Home" },
        heroImage: {
          fields: {
            file: { url: "//images.ctfassets.net/space/image.png" },
            description: "Home hero",
          },
        },
      },
    }),
  ).toEqual({
    id: "entry-localized",
    type: "page",
    uid: "home",
    status: "published",
    data: {
      slug: "home",
      meta_title: "Home",
      heroImage: {
        fields: {
          file: { url: "//images.ctfassets.net/space/image.png" },
          description: "Home hero",
        },
      },
    },
  });
});

test("normalizeContentfulEntry supports configured uid and url fields", () => {
  expect(
    normalizeContentfulEntry(
      {
        type: "page",
        contentType: "page",
        uidField: "routing.handle",
        urlField: "routing.path",
      },
      {
        sys: {
          id: "entry-custom-route",
          contentType: { sys: { id: "page" } },
          publishedVersion: 3,
        },
        fields: {
          slug: "ignored-slug",
          routing: {
            handle: "custom-page",
            path: "/custom-page",
          },
        },
      },
    ),
  ).toMatchObject({
    id: "entry-custom-route",
    type: "page",
    uid: "custom-page",
    url: "/custom-page",
    status: "published",
  });
});

test("fetchContentfulDocuments reports HTTP failures", async () => {
  await expect(
    fetchContentfulDocuments(
      {
        provider: "contentful",
        spaceId: "space123",
        accessToken: "delivery-token",
        contentTypes: [{ type: "page", contentType: "page" }],
      },
      {
        fetch: async () => new Response("unauthorized", { status: 401 }),
      },
    ),
  ).rejects.toThrow("Contentful request failed with HTTP 401");
});
