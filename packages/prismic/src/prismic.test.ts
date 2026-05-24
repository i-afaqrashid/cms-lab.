import {
  fetchPrismicDocuments,
  normalizePrismicDocument,
} from "@cms-lab/prismic";

test("normalizePrismicDocument converts Prismic API records to CMSDocument", () => {
  const document = normalizePrismicDocument({
    id: "Yabc",
    type: "blog_post",
    uid: "hello",
    url: "/blog/hello",
    data: { meta_title: "Hello" },
  });

  expect(document).toEqual({
    id: "Yabc",
    type: "blog_post",
    uid: "hello",
    url: "/blog/hello",
    status: "published",
    data: { meta_title: "Hello" },
  });
});

test("fetchPrismicDocuments fetches all pages from the Prismic REST API", async () => {
  const calls: string[] = [];
  const documents = await fetchPrismicDocuments(
    {
      provider: "prismic",
      repositoryName: "demo",
      endpoint: "https://demo.cdn.prismic.io/api/v2",
      accessToken: "secret",
    },
    {
      fetch: async (url, init) => {
        calls.push(String(url));
        expect(init?.headers).toMatchObject({ Accept: "application/json" });
        expect(init?.headers).not.toHaveProperty("Authorization");

        const parsed = new URL(String(url));
        expect(parsed.searchParams.get("access_token")).toBe("secret");

        if (parsed.pathname === "/api/v2") {
          return Response.json({
            refs: [{ id: "master", ref: "ref-1", isMasterRef: true }],
            forms: {
              everything: {
                action: "https://demo.cdn.prismic.io/api/v2/documents/search",
              },
            },
          });
        }

        expect(parsed.searchParams.get("ref")).toBe("ref-1");
        expect(parsed.searchParams.get("pageSize")).toBe("100");

        if (parsed.searchParams.get("page") === "1") {
          return Response.json({
            page: 1,
            total_pages: 2,
            results: [{ id: "1", type: "page", uid: "home", data: {} }],
          });
        }

        return Response.json({
          page: 2,
          total_pages: 2,
          results: [{ id: "2", type: "page", uid: "about", data: {} }],
        });
      },
    },
  );

  expect(calls).toHaveLength(3);
  expect(documents.map((document) => document.uid)).toEqual(["home", "about"]);
});

test("fetchPrismicDocuments redacts access tokens from fetch errors", async () => {
  await expect(
    fetchPrismicDocuments(
      {
        provider: "prismic",
        repositoryName: "demo",
        endpoint: "https://demo.cdn.prismic.io/api/v2",
        accessToken: "secret-token",
      },
      {
        fetch: async (url) => {
          throw new Error(`Failed to fetch ${String(url)}`);
        },
      },
    ),
  ).rejects.toThrow(/access_token=\[redacted\]/);

  await expect(
    fetchPrismicDocuments(
      {
        provider: "prismic",
        repositoryName: "demo",
        endpoint: "https://demo.cdn.prismic.io/api/v2",
        accessToken: "secret-token",
      },
      {
        fetch: async (url) => {
          throw new Error(`Failed to fetch ${String(url)}`);
        },
      },
    ),
  ).rejects.not.toThrow(/secret-token/);
});
