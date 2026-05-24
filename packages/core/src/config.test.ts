import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, loadCmsLabConfig, validateConfig } from "@cms-lab/core";

test("defineConfig preserves config shape for typed user configs", () => {
  const config = defineConfig({
    site: { url: "http://localhost:3000" },
    framework: { type: "next", router: "app" },
    cms: { provider: "prismic", repositoryName: "demo" },
    routes: [
      { type: "page", pattern: "/:uid", getPath: (doc) => `/${doc.uid}` },
    ],
  });

  expect(config.cms.provider).toBe("prismic");
  expect(
    config.routes[0]?.getPath({
      id: "1",
      type: "page",
      uid: "about",
      status: "published",
      data: {},
    }),
  ).toBe("/about");
});

test("validateConfig accepts local CMS provider configs", () => {
  const base = {
    site: { url: "http://localhost:3000" },
    framework: { type: "next", router: "app" },
    routes: [{ type: "page", pattern: "/:uid", getPath: () => "/about" }],
  };

  expect(
    validateConfig({
      ...base,
      cms: {
        provider: "strapi",
        url: "http://localhost:1337",
        collections: [{ type: "page", endpoint: "pages" }],
      },
    }).cms.provider,
  ).toBe("strapi");

  expect(
    validateConfig({
      ...base,
      cms: {
        provider: "directus",
        url: "http://localhost:8055",
        collections: [{ type: "page", collection: "pages" }],
      },
    }).cms.provider,
  ).toBe("directus");

  expect(
    validateConfig({
      ...base,
      cms: {
        provider: "wordpress",
        url: "http://localhost:8080",
      },
    }).cms.provider,
  ).toBe("wordpress");
});

test("validateConfig accepts required field check rules", () => {
  const config = validateConfig({
    site: { url: "http://localhost:3000" },
    framework: { type: "next", router: "app" },
    cms: { provider: "prismic", repositoryName: "demo" },
    routes: [{ type: "page", pattern: "/:uid", getPath: () => "/about" }],
    checks: {
      fields: {
        required: [
          { type: "page", path: "headline" },
          { type: "page", path: "hero.cta_label", severity: "warning" },
        ],
      },
    },
  });

  expect(config.checks?.fields).toEqual({
    required: [
      { type: "page", path: "headline" },
      { type: "page", path: "hero.cta_label", severity: "warning" },
    ],
  });
});

test("validateConfig rejects unsupported SEO check sub-options", () => {
  expect(() =>
    validateConfig({
      site: { url: "http://localhost:3000" },
      framework: { type: "next", router: "app" },
      cms: { provider: "prismic", repositoryName: "demo" },
      routes: [{ type: "page", pattern: "/:uid", getPath: () => "/about" }],
      checks: {
        seo: { ogImage: true },
      },
    }),
  ).toThrow(/checks\.seo|Invalid input/);
});

test("validateConfig rejects unknown config keys instead of silently dropping them", () => {
  expect(() =>
    validateConfig({
      site: { url: "http://localhost:3000", extra: true },
      framework: { type: "next", router: "app" },
      cms: { provider: "prismic", repositoryName: "demo" },
      routes: [{ type: "page", pattern: "/:uid", getPath: () => "/about" }],
      chcks: { seo: false },
    }),
  ).toThrow(/Unrecognized key|extra|chcks/);
});

test("loadCmsLabConfig loads a TypeScript config file", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-config-"));
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  const result = await loadCmsLabConfig({ cwd, configPath });

  expect(result.configFile).toBe(configPath);
  expect(result.config.cms.provider).toBe("prismic");
  if (result.config.cms.provider !== "prismic") {
    throw new Error("Expected prismic config");
  }
  expect(result.config.cms.repositoryName).toBe("demo");
});
