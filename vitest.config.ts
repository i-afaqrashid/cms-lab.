import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    environment: "node",
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
  },
  resolve: {
    alias: {
      "@cms-lab/core": new URL("./packages/core/src/index.ts", import.meta.url)
        .pathname,
      "@cms-lab/contentful": new URL(
        "./packages/contentful/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/directus": new URL(
        "./packages/directus/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/next": new URL("./packages/next/src/index.ts", import.meta.url)
        .pathname,
      "@cms-lab/payload": new URL(
        "./packages/payload/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/prismic": new URL(
        "./packages/prismic/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/reporter": new URL(
        "./packages/reporter/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/sanity": new URL(
        "./packages/sanity/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/strapi": new URL(
        "./packages/strapi/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/wordpress": new URL(
        "./packages/wordpress/src/index.ts",
        import.meta.url,
      ).pathname,
      "@cms-lab/cli": new URL("./packages/cli/src/index.ts", import.meta.url)
        .pathname,
    },
  },
});
