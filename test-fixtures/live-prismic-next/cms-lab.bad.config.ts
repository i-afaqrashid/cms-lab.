import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: {
    url:
      process.env.CMS_LAB_LIVE_SITE_URL ??
      "https://nextjs-starter-prismic-blog.vercel.app",
  },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName:
      process.env.CMS_LAB_LIVE_PRISMIC_REPOSITORY ??
      "nextjs-starter-prismic-blog",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    {
      type: "page",
      pattern: "/broken-page-route/:uid",
      getPath: (doc) => `/broken-page-route/${doc.uid}`,
    },
    {
      type: "article",
      pattern: "/broken-article-route/:uid",
      getPath: (doc) => `/broken-article-route/${doc.uid}`,
    },
  ],
  checks: {
    fields: {
      required: [
        {
          type: "page",
          path: "launch_ready_marker",
          severity: "warning",
        },
        {
          type: "article",
          path: "launch_ready_marker",
          severity: "warning",
        },
      ],
    },
  },
});
