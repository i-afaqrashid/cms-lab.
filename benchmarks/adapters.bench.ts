import { bench, describe } from "vitest";
import { fetchDirectusDocuments } from "@cms-lab/directus";
import { fetchStrapiDocuments } from "@cms-lab/strapi";
import { fetchWordPressDocuments } from "@cms-lab/wordpress";

const options = {
  time: 250,
  iterations: 8,
  warmupTime: 50,
  warmupIterations: 3,
};

const pageSize = 100;
const itemCount = 1000;
const strapiPages = paginate(createRows(itemCount), pageSize);
const directusPages = paginate(createRows(itemCount), pageSize);
const wordpressPages = paginate(
  createRows(itemCount).map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status === "draft" ? "draft" : "publish",
    title: { rendered: row.title },
    meta_title: row.meta_title,
    meta_description: row.meta_description,
  })),
  pageSize,
);

describe("cms adapters", () => {
  bench(
    "Strapi: fetch and normalize 1,000 REST documents",
    async () => {
      await fetchStrapiDocuments(
        {
          provider: "strapi",
          url: "http://localhost:1337",
          collections: [{ type: "page", endpoint: "pages" }],
        },
        {
          fetch: async (url) => {
            const page = Number(
              new URL(String(url)).searchParams.get("pagination[page]") ?? "1",
            );

            return Response.json({
              data: strapiPages[page - 1] ?? [],
              meta: { pagination: { page, pageCount: strapiPages.length } },
            });
          },
        },
      );
    },
    options,
  );

  bench(
    "Directus: fetch and normalize 1,000 REST items",
    async () => {
      await fetchDirectusDocuments(
        {
          provider: "directus",
          url: "http://localhost:8055",
          collections: [{ type: "page", collection: "pages" }],
        },
        {
          fetch: async (url) => {
            const page = Number(new URL(String(url)).searchParams.get("page"));

            return Response.json({ data: directusPages[page - 1] ?? [] });
          },
        },
      );
    },
    options,
  );

  bench(
    "WordPress: fetch and normalize 1,000 REST pages",
    async () => {
      await fetchWordPressDocuments(
        {
          provider: "wordpress",
          url: "http://localhost:8080",
          contentTypes: [{ type: "page", endpoint: "pages" }],
        },
        {
          fetch: async (url) => {
            const page = Number(new URL(String(url)).searchParams.get("page"));

            return Response.json(wordpressPages[page - 1] ?? [], {
              headers: { "x-wp-totalpages": String(wordpressPages.length) },
            });
          },
        },
      );
    },
    options,
  );
});

function createRows(count: number): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    documentId: `doc-${index + 1}`,
    slug: `page-${index + 1}`,
    status: index % 10 === 0 ? "draft" : "published",
    title: `Page ${index + 1}`,
    meta_title: `Page ${index + 1}`,
    meta_description: `Benchmark page ${index + 1}`,
    hero_image: {
      url: `https://images.example/page-${index + 1}.jpg`,
      alt: `Page ${index + 1} hero`,
      dimensions: { width: 1200, height: 630 },
    },
  }));
}

function paginate<T>(rows: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }
  return pages;
}
