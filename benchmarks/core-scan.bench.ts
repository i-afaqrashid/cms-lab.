import { bench, describe } from "vitest";
import {
  scanDocuments,
  type CMSDocument,
  type CmsLabConfig,
  type ProjectInfo,
} from "@cms-lab/core";

const options = {
  time: 250,
  iterations: 8,
  warmupTime: 50,
  warmupIterations: 3,
};

const config: CmsLabConfig = {
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: { provider: "prismic", repositoryName: "benchmark" },
  routes: [{ type: "page", pattern: "/:uid", getPath: (doc) => `/${doc.uid}` }],
  checks: {
    fields: {
      required: [{ type: "page", path: "title" }],
    },
  },
};

const project: ProjectInfo = {
  framework: "next",
  router: "app",
  rootDir: "/benchmark-site",
  appDir: "/benchmark-site/app",
};

const documents = createDocuments(500);

describe("core scan", () => {
  bench(
    "scanDocuments: 500 routed pages with route, SEO, image, and field checks",
    async () => {
      await scanDocuments({
        config,
        project,
        documents,
        concurrency: 32,
        retries: 0,
        fetch: async () => new Response("ok"),
      });
    },
    options,
  );
});

function createDocuments(count: number): CMSDocument[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `page-${index}`,
    type: "page",
    uid: `page-${index}`,
    status: "published",
    data: {
      title: `Page ${index}`,
      meta_title: `Page ${index}`,
      meta_description: `Benchmark page ${index}`,
      hero_image: {
        url: `https://images.example/page-${index}.jpg`,
        alt: `Page ${index} hero`,
        dimensions: { width: 1200, height: 630 },
      },
    },
  }));
}
