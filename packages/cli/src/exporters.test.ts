import { renderMarkdownSummary } from "./exporters.js";
import type { ScanResult } from "@cms-lab/core";

test("renderMarkdownSummary includes repeated diagnostic groups", () => {
  const result: ScanResult = {
    project: { framework: "next", router: "app", rootDir: "/site" },
    documents: [],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /about returned 404",
        path: "/about",
      },
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /contact returned 404",
        path: "/contact",
      },
    ],
    diagnosticGroups: [
      {
        key: "error:CMS-ROUTE-404:page:/:uid",
        severity: "error",
        code: "CMS-ROUTE-404",
        count: 2,
        type: "page",
        routePattern: "/:uid",
        label: "page /:uid",
        examples: ["/about", "/contact"],
      },
    ],
    summary: { errors: 2, warnings: 0, info: 0 },
  };

  const markdown = renderMarkdownSummary(result, "failed");

  expect(markdown).toContain("## Repeated Findings");
  expect(markdown).toContain(
    "| page /:uid | CMS-ROUTE-404 | 2 | /about, /contact |",
  );
});
