import { fetchPayloadDocuments, normalizePayloadDoc } from "@cms-lab/payload";

test("fetchPayloadDocuments normalizes Payload docs and uses the REST path", async () => {
  const calls: string[] = [];

  const documents = await fetchPayloadDocuments(
    {
      provider: "payload",
      url: "http://localhost:3000",
      collections: [{ type: "page", collection: "pages", uidField: "slug" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        return Response.json({
          docs: [
            {
              id: "65f1",
              slug: "home",
              title: "Home",
              meta: { title: "Home", description: "Home page" },
            },
          ],
          hasNextPage: false,
        });
      },
    },
  );

  expect(calls[0]).toContain("/api/pages");
  expect(calls[0]).toContain("limit=100");
  expect(calls[0]).toContain("page=1");
  expect(documents).toEqual([
    {
      id: "65f1",
      type: "page",
      uid: "home",
      status: "published",
      data: {
        id: "65f1",
        slug: "home",
        title: "Home",
        meta: { title: "Home", description: "Home page" },
      },
    },
  ]);
});

test("fetchPayloadDocuments paginates while hasNextPage is true", async () => {
  const calls: string[] = [];

  const documents = await fetchPayloadDocuments(
    {
      provider: "payload",
      url: "http://localhost:3000",
      apiPath: "/api",
      collections: [{ type: "post", collection: "posts" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));
        const page = new URL(String(url)).searchParams.get("page");

        if (page === "1") {
          return Response.json({
            docs: Array.from({ length: 100 }, (_, index) => ({
              id: index + 1,
              slug: `post-${index + 1}`,
            })),
            hasNextPage: true,
          });
        }

        return Response.json({
          docs: [{ id: 101, slug: "post-101", _status: "draft" }],
          hasNextPage: false,
        });
      },
    },
  );

  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain("page=2");
  expect(documents).toHaveLength(101);
  expect(documents[100]).toMatchObject({
    id: "101",
    uid: "post-101",
    status: "draft",
  });
});

test("normalizePayloadDoc treats only explicit draft status as draft", () => {
  expect(normalizePayloadDoc("page", { id: 1, slug: "a" }).status).toBe(
    "published",
  );
  expect(
    normalizePayloadDoc("page", { id: 2, slug: "b", _status: "published" })
      .status,
  ).toBe("published");
  expect(
    normalizePayloadDoc("page", { id: 3, slug: "c", _status: "draft" }).status,
  ).toBe("draft");
});

test("normalizePayloadDoc maps configured uid and url fields and keeps media", () => {
  expect(
    normalizePayloadDoc(
      {
        type: "page",
        collection: "pages",
        uidField: "routing.handle",
        urlField: "routing.path",
      },
      {
        id: "doc-7",
        slug: "ignored",
        routing: { handle: "custom-page", path: "/custom-page" },
        hero: {
          url: "/media/hero.jpg",
          alt: "",
          mimeType: "image/jpeg",
          filename: "hero.jpg",
        },
        meta: { title: "Custom", description: "Custom page" },
      },
    ),
  ).toMatchObject({
    id: "doc-7",
    type: "page",
    uid: "custom-page",
    url: "/custom-page",
    status: "published",
  });
});

test("normalizePayloadDoc can mark relation-heavy collections as non-routable", () => {
  expect(
    normalizePayloadDoc(
      {
        type: "pricing",
        collection: "pricing",
        uidField: "id",
        routable: false,
      },
      { id: 4521, menu_item: 873, branch: 14, price: 289 },
    ),
  ).toMatchObject({
    id: "4521",
    type: "pricing",
    uid: "4521",
    routable: false,
    status: "published",
  });
});

test("fetchPayloadDocuments sends JWT auth and reports HTTP failures", async () => {
  let authorization: string | null = null;

  await expect(
    fetchPayloadDocuments(
      {
        provider: "payload",
        url: "http://localhost:3000",
        token: "payload-jwt",
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
  ).rejects.toThrow("Payload request failed with HTTP 401");

  expect(authorization).toBe("JWT payload-jwt");
});

test("fetchPayloadDocuments sends a token that already includes a scheme verbatim", async () => {
  let authorization: string | null = null;

  await fetchPayloadDocuments(
    {
      provider: "payload",
      url: "http://localhost:3000",
      token: "users API-Key abc123",
      collections: [{ type: "page", collection: "pages" }],
    },
    {
      fetch: async (_url, init) => {
        authorization =
          (init?.headers as Record<string, string> | undefined)
            ?.Authorization ?? null;
        return Response.json({ docs: [], hasNextPage: false });
      },
    },
  );

  expect(authorization).toBe("users API-Key abc123");
});
