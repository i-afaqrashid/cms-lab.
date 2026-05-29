#!/usr/bin/env node
// Renders the HTML report for a fixed ScanResult and writes it to
// assets/launch/report-fixture.html. CI re-runs this and fails on an
// unexpected diff, so a reporter change that would silently rot the README
// screenshot is caught at review time. The volatile "generated" timestamp is
// normalized so the committed fixture stays deterministic.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Import the built reporter by path: this script is a repo-internal tool run
// after `pnpm build`, and the repo root is not a workspace member that can
// resolve "@cms-lab/reporter" by name.
import { renderHtmlReport } from "../packages/reporter/dist/index.js";

const TIMESTAMP_PLACEHOLDER = "1970-01-01T00:00:00.000Z";

const result = {
  project: {
    framework: "next",
    router: "app",
    rootDir: "/project",
    appDir: "/project/app",
  },
  documents: [
    { id: "home", type: "page", uid: "home", status: "published", data: {} },
    {
      id: "about",
      type: "page",
      uid: "about",
      status: "published",
      data: {},
    },
    {
      id: "launch",
      type: "post",
      uid: "launch",
      status: "published",
      data: {},
    },
  ],
  diagnostics: [
    {
      severity: "error",
      code: "CMS-ROUTE-404",
      message: "Route /about returned 404",
      path: "/about",
      source: "prismic:page#about",
    },
    {
      severity: "error",
      code: "CMS-ROUTE-404",
      message: "Route /blog/launch returned 404",
      path: "/blog/launch",
      source: "prismic:post#launch",
    },
    {
      severity: "warning",
      code: "SEO-META-MISSING",
      message: "Document home is missing meta_title, meta_description",
      source: "prismic:page#home",
    },
    {
      severity: "warning",
      code: "A11Y-IMG-ALT",
      message: "Image field data.hero is missing useful alt text",
      source: "prismic:page#home",
    },
    {
      severity: "info",
      code: "CMS-ROUTE-UNMAPPED",
      message:
        "Document settings of type settings has no configured route mapping",
      source: "prismic:settings#settings",
    },
  ],
  diagnosticGroups: [
    {
      key: "error:CMS-ROUTE-404:page",
      severity: "error",
      code: "CMS-ROUTE-404",
      count: 2,
      type: "page",
      label: "page",
      examples: ["/about", "/blog/launch"],
    },
  ],
  summary: { errors: 2, warnings: 2, info: 1 },
};

const html = renderHtmlReport(result).replaceAll(
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
  TIMESTAMP_PLACEHOLDER,
);

const outputPath = fileURLToPath(
  new URL("../assets/launch/report-fixture.html", import.meta.url),
);
writeFileSync(outputPath, html);
process.stdout.write(`Wrote ${outputPath}\n`);
