import {
  renderJUnitReport,
  renderMarkdownSummary,
  renderSlackPayload,
} from "./exporters.js";
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

test("custom rule diagnostics flow through markdown, JUnit, and Slack", () => {
  const result: ScanResult = {
    project: { framework: "next", router: "app", rootDir: "/site" },
    documents: [
      { id: "doc-1", type: "menu_item", status: "published", data: {} },
    ],
    diagnostics: [
      {
        severity: "error",
        code: "CUSTOM-RULE",
        message: "Menu item price must be greater than 0",
        path: "data.price",
        source: "directus:menu_item#doc-1",
      },
    ],
    summary: { errors: 1, warnings: 0, info: 0 },
  };

  const markdown = renderMarkdownSummary(result, "failed");
  expect(markdown).toContain("CUSTOM-RULE");
  expect(markdown).toContain("Menu item price must be greater than 0");

  const junit = renderJUnitReport(result);
  expect(junit).toContain('classname="cms-lab.custom"');
  expect(junit).toContain('name="CUSTOM-RULE"');
  expect(junit).toContain("<failure");

  const slack = renderSlackPayload(result, "failed");
  expect(slack.text).toContain("CUSTOM-RULE");
});
