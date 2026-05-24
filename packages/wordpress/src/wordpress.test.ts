import {
  fetchWordPressDocuments,
  normalizeWordPressItem,
} from "@cms-lab/wordpress";

test("fetchWordPressDocuments normalizes WordPress REST posts and pages", async () => {
  const calls: string[] = [];

  const documents = await fetchWordPressDocuments(
    {
      provider: "wordpress",
      url: "http://localhost:8080",
      contentTypes: [
        { type: "page", endpoint: "pages" },
        { type: "post", endpoint: "posts" },
      ],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));

        const parsed = new URL(String(url));
        const rows = parsed.pathname.endsWith("/pages")
          ? [
              {
                id: 11,
                slug: "home",
                title: { rendered: "Home" },
                meta_title: "Home",
                meta_description: "Home page",
                status: "publish",
              },
            ]
          : [
              {
                id: 12,
                slug: "hello-world",
                title: { rendered: "Hello world" },
                meta_title: "Hello",
                meta_description: "Hello post",
                status: "draft",
              },
            ];

        return Response.json(rows, {
          headers: { "x-wp-totalpages": "1" },
        });
      },
    },
  );

  expect(calls).toHaveLength(2);
  expect(calls[0]).toContain("/wp-json/wp/v2/pages");
  expect(calls[1]).toContain("/wp-json/wp/v2/posts");
  expect(documents.map((document) => document.uid)).toEqual([
    "home",
    "hello-world",
  ]);
  expect(documents.map((document) => document.type)).toEqual(["page", "post"]);
  expect(documents.map((document) => document.status)).toEqual([
    "published",
    "draft",
  ]);
});

test("fetchWordPressDocuments paginates using x-wp-totalpages", async () => {
  const calls: string[] = [];

  const documents = await fetchWordPressDocuments(
    {
      provider: "wordpress",
      url: "http://localhost:8080",
      contentTypes: [{ type: "page", endpoint: "pages" }],
    },
    {
      fetch: async (url) => {
        calls.push(String(url));
        const page = new URL(String(url)).searchParams.get("page");

        return Response.json(
          [
            {
              id: Number(page),
              slug: `page-${page}`,
              title: { rendered: `Page ${page}` },
              status: "publish",
            },
          ],
          { headers: { "x-wp-totalpages": "2" } },
        );
      },
    },
  );

  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain("page=2");
  expect(documents.map((document) => document.uid)).toEqual([
    "page-1",
    "page-2",
  ]);
});

test("fetchWordPressDocuments scans pages and posts by default", async () => {
  const calls: string[] = [];

  const documents = await fetchWordPressDocuments(
    { provider: "wordpress", url: "http://localhost:8080" },
    {
      fetch: async (url) => {
        calls.push(String(url));
        const parsed = new URL(String(url));
        const type = parsed.pathname.endsWith("/pages") ? "page" : "post";

        return Response.json(
          [
            {
              id: type === "page" ? 1 : 2,
              slug: `${type}-default`,
              status: "publish",
            },
          ],
          { headers: { "x-wp-totalpages": "1" } },
        );
      },
    },
  );

  expect(calls).toHaveLength(2);
  expect(calls[0]).toContain("/wp-json/wp/v2/pages");
  expect(calls[1]).toContain("/wp-json/wp/v2/posts");
  expect(documents.map((document) => document.type)).toEqual(["page", "post"]);
  expect(documents.map((document) => document.uid)).toEqual([
    "page-default",
    "post-default",
  ]);
});

test("normalizeWordPressItem keeps permalink, SEO, and media fields while treating non-published status as draft", () => {
  expect(
    normalizeWordPressItem("post", {
      id: 45,
      slug: "scheduled-post",
      status: "future",
      link: "https://example.com/scheduled-post/",
      yoast_head_json: {
        title: "Scheduled post",
        description: "Scheduled description",
      },
      featured_image: {
        source_url: "https://example.com/featured.jpg",
        alt_text: "Featured image",
      },
    }),
  ).toEqual({
    id: "45",
    type: "post",
    uid: "scheduled-post",
    url: "https://example.com/scheduled-post/",
    status: "draft",
    data: {
      id: 45,
      slug: "scheduled-post",
      status: "future",
      link: "https://example.com/scheduled-post/",
      yoast_head_json: {
        title: "Scheduled post",
        description: "Scheduled description",
      },
      featured_image: {
        source_url: "https://example.com/featured.jpg",
        alt_text: "Featured image",
      },
    },
  });
});

test("fetchWordPressDocuments reports HTTP failures", async () => {
  await expect(
    fetchWordPressDocuments(
      { provider: "wordpress", url: "http://localhost:8080" },
      {
        fetch: async () => new Response("server error", { status: 500 }),
      },
    ),
  ).rejects.toThrow("WordPress request failed with HTTP 500");
});
