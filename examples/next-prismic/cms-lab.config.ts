import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: {
    url: "http://localhost:3000",
  },
  framework: {
    type: "next",
    router: "app",
  },
  cms: {
    provider: "prismic",
    repositoryName: process.env.PRISMIC_REPOSITORY_NAME ?? "your-prismic-repo",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN || undefined,
  },
  routes: [
    {
      type: "page",
      pattern: "/:uid",
      getPath: (doc) => `/${doc.uid}`,
    },
    {
      type: "blog_post",
      pattern: "/blog/:uid",
      getPath: (doc) => `/blog/${doc.uid}`,
    },
  ],
});
