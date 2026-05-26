import { formatPrettyResult } from "./output.js";
import type { ScanResult } from "@cms-lab/core";

test("formatPrettyResult shows repeated diagnostic groups without hiding rows", () => {
  const result: ScanResult = {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/site",
      appDir: "/site/app",
    },
    documents: [],
    diagnostics: [
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /about returned 404",
        path: "/about",
        source: "prismic:page#1",
      },
      {
        severity: "error",
        code: "CMS-ROUTE-404",
        message: "Route /contact returned 404",
        path: "/contact",
        source: "prismic:page#2",
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

  const output = formatPrettyResult(result);

  expect(output).toContain("repeated");
  expect(output).toContain("page /:uid - CMS-ROUTE-404 x2");
  expect(output).toContain("/about, /contact");
  expect(output).toContain("CMS-ROUTE-404 /about");
  expect(output).toContain("CMS-ROUTE-404 /contact");
});
