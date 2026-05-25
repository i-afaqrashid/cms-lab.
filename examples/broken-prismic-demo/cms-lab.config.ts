import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: {
    url:
      process.env.CMS_LAB_DEMO_SITE_URL ??
      "https://nextjs-starter-prismic-blog.vercel.app",
  },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName:
      process.env.CMS_LAB_DEMO_PRISMIC_REPOSITORY ??
      "nextjs-starter-prismic-blog",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => "/" + doc.uid },
    {
      type: "article",
      pattern: "/articles/:uid",
      getPath: (doc) => "/broken-article-route/" + doc.uid,
    },
  ],
  checks: {
    fields: {
      required: [
        {
          type: "article",
          path: "launchChecklist.approvedBy",
          severity: "warning",
        },
      ],
    },
  },
});
