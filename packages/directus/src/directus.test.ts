import {
  fetchDirectusDocuments,
  normalizeDirectusItem,
} from "@cms-lab/directus";

test("fetchDirectusDocuments normalizes Directus items", async () => {
  const calls: string[] = [];

  const documents = await fetchDirectusDocuments(
    {
      provider: "directus",
      url: "http://localhost:8055",
      collections: [{ type: "page", collection: "pages" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        return Response.json({
          data: [
            {
              id: 7,
              slug: "directus-home",
              title: "Directus Home",
              meta_title: "Directus Home",
              meta_description: "Directus home page",
            },
          ],
        });
      },
    },
  );

  expect(calls[0]).toContain("/items/pages");
  expect(calls[0]).toContain("limit=100");
  expect(documents).toEqual([
    {
      id: "7",
      type: "page",
      uid: "directus-home",
      status: "published",
      data: {
        id: 7,
        slug: "directus-home",
        title: "Directus Home",
        meta_title: "Directus Home",
        meta_description: "Directus home page",
      },
    },
  ]);
});

test("fetchDirectusDocuments paginates until an empty page", async () => {
  const calls: string[] = [];

  const documents = await fetchDirectusDocuments(
    {
      provider: "directus",
      url: "http://localhost:8055",
      collections: [{ type: "page", collection: "pages" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        const page = new URL(String(url)).searchParams.get("page");
        if (page === "1") {
          return Response.json({
            data: Array.from({ length: 100 }, (_, index) => ({
              id: index + 1,
              slug: `page-${index + 1}`,
            })),
          });
        }

        if (page === "2") {
          return Response.json({
            data: [{ id: 101, slug: "page-101", status: "draft" }],
          });
        }

        return Response.json({ data: [] });
      },
    },
  );

  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain("page=2");
  expect(documents).toHaveLength(101);
  expect(documents[100]).toMatchObject({
    id: "101",
    uid: "page-101",
    status: "draft",
  });
});

test("fetchDirectusDocuments accepts uid-based items without numeric ids", async () => {
  const documents = await fetchDirectusDocuments(
    {
      provider: "directus",
      url: "http://localhost:8055",
      collections: [{ type: "landing_page", collection: "landing_pages" }],
    },
    {
      fetch: async () =>
        Response.json({
          data: [
            {
              uid: "launch",
              title: "Launch",
              status: "published",
            },
          ],
        }),
    },
  );

  expect(documents).toEqual([
    {
      id: "launch",
      type: "landing_page",
      uid: "launch",
      status: "published",
      data: {
        uid: "launch",
        title: "Launch",
        status: "published",
      },
    },
  ]);
});

test("normalizeDirectusItem keeps rich SEO and file fields while treating archived content as draft", () => {
  expect(
    normalizeDirectusItem("page", {
      id: "directus-page-1",
      slug: "landing",
      status: "archived",
      seo: {
        title: "Landing",
        description: "Landing page",
      },
      hero: {
        type: "image/jpeg",
        filename_download: "landing.jpg",
        description: "Landing hero",
      },
    }),
  ).toEqual({
    id: "directus-page-1",
    type: "page",
    uid: "landing",
    status: "draft",
    data: {
      id: "directus-page-1",
      slug: "landing",
      status: "archived",
      seo: {
        title: "Landing",
        description: "Landing page",
      },
      hero: {
        type: "image/jpeg",
        filename_download: "landing.jpg",
        description: "Landing hero",
      },
    },
  });
});

test("fetchDirectusDocuments sends bearer tokens and reports HTTP failures", async () => {
  let authorization: string | null = null;

  await expect(
    fetchDirectusDocuments(
      {
        provider: "directus",
        url: "http://localhost:8055",
        token: "directus-token",
        collections: [{ type: "page", collection: "pages" }],
      },
      {
        fetch: async (_url, init) => {
          authorization =
            init?.headers instanceof Headers
              ? init.headers.get("authorization")
              : ((init?.headers as Record<string, string> | undefined)
                  ?.Authorization ?? null);

          return new Response("unauthorized", { status: 401 });
        },
      },
    ),
  ).rejects.toThrow("Directus request failed with HTTP 401");

  expect(authorization).toBe("Bearer directus-token");
});
